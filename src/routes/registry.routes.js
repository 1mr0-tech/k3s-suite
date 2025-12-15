const express = require('express');
const router = express.Router();
const registryController = require('../controllers/registry.controller');

router.get('/config/registry', registryController.getConfig);
router.post('/config/registry', registryController.updateConfig);
router.get('/repositories', registryController.getRepositories);
router.get('/repositories/:name/tags', registryController.getTags);

module.exports = router;
