const minikubeService = require('../services/minikube.service');

exports.getMinikubeStatus = async (req, res) => {
    try {
        const status = await minikubeService.getStatus();
        res.json(status);
    } catch (err) {
        res.status(500).json({ error: 'Failed to get Minikube status', details: err.message });
    }
};

exports.startMinikube = async (req, res) => {
    try {
        const output = await minikubeService.start();
        res.json({ message: 'Minikube started', output });
    } catch (err) {
        res.status(500).json({ error: 'Failed to start Minikube', details: err.message });
    }
};

exports.stopMinikube = async (req, res) => {
    try {
        const output = await minikubeService.stop();
        res.json({ message: 'Minikube stopped', output });
    } catch (err) {
        res.status(500).json({ error: 'Failed to stop Minikube', details: err.message });
    }
};
