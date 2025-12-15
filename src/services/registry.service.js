const { exec } = require('child_process');

function getRepositories(registryUrl, username, password, isSecure, callback) {
    let flags = ' -k'; // Always allow insecure certs for local dev
    if (!isSecure) flags += ' --force-non-ssl'; // Allow HTTP if not secure
    if (username) flags += ` -u ${username}`;
    if (password) flags += ` -p ${password}`;

    // Construct command: reg ls [FLAGS] [URL]
    const cmd = registryUrl ? `reg ls ${flags} ${registryUrl}` : 'reg ls';
    exec(cmd, (error, stdout, stderr) => {
        if (error) {
            console.error(`exec error: ${error}`);
            // Check if command is not found
            if (error.message.includes('command not found') || error.code === 127) {
                return callback({ type: 'NOT_INSTALLED', message: 'reg command not found' }, null);
            }
            // Check for HTTP response to HTTPS client error
            if (error.message.includes('server gave HTTP response to HTTPS client') || stderr.includes('server gave HTTP response to HTTPS client')) {
                return callback({ type: 'HTTPS_MISMATCH', message: 'Registry is HTTP but accessed as HTTPS' }, null);
            }
            return callback({ type: 'EXEC_ERROR', message: error.message, stderr: stderr }, null);
        }
        if (stderr) {
            console.error(`stderr: ${stderr}`);
        }

        // Filter and clean output
        const repositories = stdout.split('\n')
            .map(line => line.trim())
            .filter(line => {
                if (line.length === 0) return false;
                if (line.startsWith('Repositories for')) return false;
                if (line.startsWith('REPO')) return false; // Covers 'REPO TAGS' with any spacing
                if (line.startsWith('INFO[')) return false; // Filter logs if in stdout
                if (line.includes('Pushed:')) return false; // Output from verbose mode?
                return true;
            })
            .map(line => {
                // If line contains spaces/tags (e.g. "repo tag1, tag2"), take first part
                return line.split(/\s+/)[0]; // Split by any whitespace
            })
            // Extra safety: Docker repo names must be lowercase. Filter out headers or garbage that slipped through.
            .filter(name => /^[a-z0-9]+(?:[._-][a-z0-9]+)*$/.test(name) || name.includes('/'))
            // Unique
            .filter((value, index, self) => self.indexOf(value) === index);

        callback(null, repositories);
    });
}

module.exports = {
    getRepositories,
    getRepoWithTags
};

function getTags(registryUrl, username, password, isSecure, repoName) {
    return new Promise((resolve, reject) => {
        let flags = ' -k';
        if (!isSecure) flags += ' --force-non-ssl';
        if (username) flags += ` -u ${username}`;
        if (password) flags += ` -p ${password}`;

        // reg tags [FLAGS] URL/REPO
        const cmd = `reg tags ${flags} ${registryUrl}/${repoName}`;
        exec(cmd, (error, stdout, stderr) => {
            if (error) {
                // If 404 or empty, might just have no tags
                console.warn(`Error fetching tags for ${repoName}: ${error.message}`);
                return resolve([]);
            }
            // Handle raw output which might also include headers if verbose
            const tags = stdout.split('\n')
                .map(t => t.trim())
                .filter(t => {
                    if (t.length === 0) return false;
                    if (t.startsWith('Repositories for')) return false;
                    if (t.startsWith('REPO')) return false;
                    if (t.startsWith('INFO[')) return false;
                    return true;
                });

            resolve(tags);
        });
    });
}

function getManifest(registryUrl, username, password, isSecure, repoName, ref) {
    return new Promise((resolve, reject) => {
        let flags = ' -k';
        if (!isSecure) flags += ' --force-non-ssl';
        if (username) flags += ` -u ${username}`;
        if (password) flags += ` -p ${password}`;

        // IMPORTANT: If ref is a digest (starts with sha256:), use @ separator.
        // Otherwise use : for tags.
        const separator = ref.startsWith('sha256:') ? '@' : ':';
        const cmd = `reg manifest ${flags} ${registryUrl}/${repoName}${separator}${ref}`;

        exec(cmd, { maxBuffer: 1024 * 1024 * 5 }, (error, stdout, stderr) => {
            if (error) return reject(error);
            try {
                const json = JSON.parse(stdout);
                resolve(json);
            } catch (e) {
                reject(e);
            }
        });
    });
}

function getBlob(registryUrl, username, password, isSecure, repoName, digest) {
    return new Promise((resolve, reject) => {
        let flags = ' -k';
        if (!isSecure) flags += ' --force-non-ssl';
        if (username) flags += ` -u ${username}`;
        if (password) flags += ` -p ${password}`;

        // reg layer [FLAGS] URL/REPO DIGEST
        // Note: reg layer outputs the content.
        // Digest here usually implies @ but reg layer syntax is: reg layer [OPTIONS] <ref> <digest>
        // But checking `reg layer --help`: usage: reg layer [OPTIONS] <registry/repo> <digest>
        // So space separator is correct for `reg layer`.
        const cmd = `reg layer ${flags} ${registryUrl}/${repoName} ${digest}`;
        exec(cmd, { maxBuffer: 1024 * 1024 * 5 }, (error, stdout, stderr) => {
            if (error) return reject(error);
            try {
                // If it's a JSON blob (config), parse it
                const json = JSON.parse(stdout);
                resolve(json);
            } catch (e) {
                // If not json, return raw? For config it should be json
                resolve(stdout);
            }
        });
    });
}

async function getRepoWithTags(registryConfig, repoName) {
    const { url, username, password, isSecure } = registryConfig;

    try {
        const tags = await getTags(url, username, password, isSecure, repoName);
        if (tags.length === 0) return { name: repoName, tags: [] };

        // For each tag, we need the creation date.
        // Limit concurrency to avoid spawning too many processes?
        // Let's do batches or just Promise.all if < 50.

        const tagPromises = tags.map(async (tag) => {
            try {
                let manifest = await getManifest(url, username, password, isSecure, repoName, tag);

                // If Index, resolve to specific manifest
                if (manifest.mediaType === 'application/vnd.oci.image.index.v1+json' || manifest.manifests) {
                    // Pick first manifest
                    const digest = manifest.manifests[0].digest;
                    manifest = await getManifest(url, username, password, isSecure, repoName, digest);
                }

                // Now we expect an image manifest with config
                const configDigest = manifest.config?.digest;
                if (!configDigest) {
                    return { name: tag, created: new Date(0) }; // Unknown
                }

                const config = await getBlob(url, username, password, isSecure, repoName, configDigest);

                let createdDate = new Date(0);
                if (config.created) {
                    createdDate = new Date(config.created);
                } else if (config.history && config.history.length > 0) {
                    // Fallback to history
                    // Find the last history item with 'created' or just the last one
                    const item = config.history.find(h => h.created) || config.history[config.history.length - 1];
                    if (item && item.created) createdDate = new Date(item.created);
                }

                return { name: tag, created: createdDate };

            } catch (e) {
                console.error(`Failed to fetch metadata for ${repoName}:${tag}`, e.message);
                return { name: tag, created: new Date(0) };
            }
        });

        const tagsWithData = await Promise.all(tagPromises);

        // Sort DESC
        tagsWithData.sort((a, b) => b.created - a.created);

        return { name: repoName, tags: tagsWithData };

    } catch (err) {
        throw err;
    }
}
