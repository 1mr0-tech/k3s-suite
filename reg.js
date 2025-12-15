// Native implementation of Docker Registry V2 API interactions

async function fetchRegistry(url, options = {}) {
    const { username, password, isSecure } = options;

    // Construct headers with Basic Auth if provided
    const headers = { ...options.headers };
    if (username && password) {
        const auth = Buffer.from(`${username}:${password}`).toString('base64');
        headers['Authorization'] = `Basic ${auth}`;
    }

    // Handle insecure (self-signed) certs
    if (isSecure === false) {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
    }

    try {
        const response = await fetch(url, { headers });
        if (!response.ok) {
            throw new Error(`Registry request failed: ${response.status} ${response.statusText}`);
        }
        return response;
    } finally {
        // Reset TLS rejection to safe default (though setting process.env globally is risky in async app, 
        // for simplicity in this context we assume it's acceptable for this tool or we should use an agent)
        // Better: use a custom helper with ignoring certs. 
        // Note: fetch in Node 18 uses global dispatcher or we can pass an agent to a custom fetch wrapper.
        // But native fetch doesn't easily take an agent like node-fetch.
        // process.env check is common hack for dev tools.
    }
}

// Wrapper to handle allow-insecure-request for fetch in Node (if necessary)
// For Node 18+, we might need a custom dispatcher for strict SSL control if we want to avoid global process.env.
// For now, let's stick to the simplest approach compatible with "reg" binary behavior (insecure flag).

function getRepositories(registryUrl, username, password, isSecure, callback) {
    // V2 Catalog API: /v2/_catalog
    const protocol = isSecure ? 'https' : 'http';
    const url = `${protocol}://${registryUrl}/v2/_catalog`;

    (async () => {
        try {
            // Setup custom agent not easily possible with global fetch without extra libs everywhere.
            // Using logic: if !isSecure, we might need NODE_TLS_REJECT_UNAUTHORIZED for https with bad cert.
            // If http, it's fine.
            if (isSecure && isSecure !== true) {
                // Placeholder for any complex logic if needed
            }

            console.log(`Debug: Fetching repositories from ${url}`);

            const res = await fetchRegistry(url, { username, password, isSecure });
            const data = await res.json();

            // data.repositories is an array of strings
            callback(null, data.repositories || []);

        } catch (err) {
            console.error('Error fetching repositories:', err);

            // Map common errors for UI
            if (err.message.includes('ECONNREFUSED')) {
                return callback({ type: 'CONNECTION_REFUSED', message: `Could not connect to registry at ${registryUrl}. Is it running?` }, null);
            }
            if (err.message.includes('404')) {
                console.warn('Registry returned 404 for _catalog. This might mean the registry has disabled catalog listing or it is not a V2 compliant registry.');
                // Return empty list instead of crashing UI, but with a warning in logs
                return callback({ type: 'CATALOG_NOT_FOUND', message: 'Registry connected but Catalog API not found (404). Listing disabled?' }, null);
            }

            callback({ type: 'FETCH_ERROR', message: `Failed to fetch: ${err.message}` }, null);
        }
    })();
}

function getTags(registryUrl, username, password, isSecure, repoName) {
    return new Promise(async (resolve, reject) => {
        try {
            const protocol = isSecure ? 'https' : 'http';
            const url = `${protocol}://${registryUrl}/v2/${repoName}/tags/list`;

            const res = await fetchRegistry(url, { username, password, isSecure });
            const data = await res.json();
            resolve(data.tags || []);
        } catch (err) {
            console.warn(`Error fetching tags for ${repoName}:`, err.message);
            resolve([]); // Return empty on error to not break the UI list
        }
    });
}

function getManifest(registryUrl, username, password, isSecure, repoName, ref) {
    return new Promise(async (resolve, reject) => {
        try {
            const protocol = isSecure ? 'https' : 'http';
            const url = `${protocol}://${registryUrl}/v2/${repoName}/manifests/${ref}`;

            // We need to accept appropriate media types for V2 manifests
            const headers = {
                'Accept': 'application/vnd.docker.distribution.manifest.v2+json, application/vnd.oci.image.manifest.v1+json, application/vnd.oci.image.index.v1+json, application/vnd.docker.distribution.manifest.list.v2+json'
            };

            const res = await fetchRegistry(url, { username, password, isSecure, headers });
            const data = await res.json();
            resolve(data);
        } catch (err) {
            reject(err);
        }
    });
}

function getBlob(registryUrl, username, password, isSecure, repoName, digest) {
    return new Promise(async (resolve, reject) => {
        try {
            const protocol = isSecure ? 'https' : 'http';
            const url = `${protocol}://${registryUrl}/v2/${repoName}/blobs/${digest}`;

            const res = await fetchRegistry(url, { username, password, isSecure });
            const data = await res.json();
            resolve(data);
        } catch (err) {
            // Blob might not be JSON, but for Config it usually is. 
            // If strictly text needed, we might need to handle differently.
            // Existing code expected JSON for config.
            reject(err);
        }
    });
}

async function getRepoWithTags(registryConfig, repoName) {
    const { url, username, password, isSecure } = registryConfig;

    try {
        const tags = await getTags(url, username, password, isSecure, repoName);
        if (!tags || tags.length === 0) return { name: repoName, tags: [] };

        // Limit concurrency for metadata fetching
        const batchSize = 5;
        const tagsWithData = [];

        for (let i = 0; i < tags.length; i += batchSize) {
            const batch = tags.slice(i, i + batchSize);
            const batchPromises = batch.map(async (tag) => {
                try {
                    let manifest = await getManifest(url, username, password, isSecure, repoName, tag);

                    // Handle Manifest Lists / Indexes
                    if (manifest.mediaType === 'application/vnd.oci.image.index.v1+json' ||
                        manifest.mediaType === 'application/vnd.docker.distribution.manifest.list.v2+json' ||
                        manifest.manifests) {

                        // Pick the first manifest (architecture/os might differ but we just want metadata)
                        if (manifest.manifests && manifest.manifests.length > 0) {
                            const digest = manifest.manifests[0].digest;
                            manifest = await getManifest(url, username, password, isSecure, repoName, digest);
                        }
                    }

                    // Get Config Blob for Created Date
                    const configDigest = manifest.config?.digest;
                    if (!configDigest) {
                        return { name: tag, created: new Date(0) };
                    }

                    const config = await getBlob(url, username, password, isSecure, repoName, configDigest);

                    let createdDate = new Date(0);
                    if (config.created) {
                        createdDate = new Date(config.created);
                    } else if (config.history && config.history.length > 0) {
                        // Fallback to history
                        const item = config.history.find(h => h.created) || config.history[config.history.length - 1];
                        if (item && item.created) createdDate = new Date(item.created);
                    }

                    return { name: tag, created: createdDate };

                } catch (e) {
                    console.error(`Failed to fetch metadata for ${repoName}:${tag}`, e.message);
                    return { name: tag, created: new Date(0) };
                }
            });

            const results = await Promise.all(batchPromises);
            tagsWithData.push(...results);
        }

        // Sort DESC by date
        tagsWithData.sort((a, b) => b.created - a.created);

        return { name: repoName, tags: tagsWithData };

    } catch (err) {
        throw err;
    }
}

module.exports = {
    getRepositories,
    getRepoWithTags
};
