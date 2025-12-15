const registryService = require('../services/registry.service');
// const harborService = require('../services/harbor.service'); // Helper for Harbor specific if needed

// In-memory store for registry configuration
let registryConfig = {
    url: '',
    username: '',
    password: '',
    isSecure: false,
    timezone: 'UTC',
    type: 'generic' // 'generic' or 'harbor'
};

exports.getConfig = (req, res) => {
    res.json(registryConfig);
};

exports.updateConfig = (req, res) => {
    const { url, username, password, isSecure, type, timezone } = req.body;
    if (!url) {
        return res.status(400).json({ error: 'URL is required' });
    }
    registryConfig.url = url;
    registryConfig.username = username || '';
    registryConfig.password = password || '';
    registryConfig.isSecure = isSecure === undefined ? false : isSecure;
    registryConfig.timezone = timezone || 'UTC';
    registryConfig.type = type || 'generic';

    res.json({ message: 'Registry configuration updated', config: registryConfig });
};

exports.getRepositories = (req, res) => {
    // If type is harbor, we might use a different service function later.
    // For now, assuming reg.js works for basic auth registries including Harbor if V2.
    // TODO: Use harborService if type is 'harbor' and we implement specific API calls.

    registryService.getRepositories(
        registryConfig.url,
        registryConfig.username,
        registryConfig.password,
        registryConfig.isSecure,
        (err, repos) => {
            if (err) {
                return res.status(500).json({ error: 'Failed to get repositories', details: err });
            }
            res.json(repos);
        }
    );
};

exports.getTags = async (req, res) => {
    const repoName = req.params.name;
    try {
        const data = await registryService.getRepoWithTags(registryConfig, repoName);
        res.json(data);
    } catch (err) {
        console.error('Error fetching tags:', err);
        res.status(500).json({ error: 'Failed to fetch tags', details: err.message });
    }
};
