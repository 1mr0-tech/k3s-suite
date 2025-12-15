const express = require('express');
const router = express.Router();
const systemController = require('../controllers/system.controller');

router.get('/minikube/status', systemController.getMinikubeStatus);
router.post('/minikube/start', systemController.startMinikube);
router.post('/minikube/stop', systemController.stopMinikube);

module.exports = router;
