const express = require('express');
const router = express.Router();
const k8sController = require('../controllers/k8s.controller');

router.get('/contexts', k8sController.getContexts);
router.post('/contexts/current', k8sController.setContext);

router.get('/nodes', k8sController.getNodes);
router.get('/deployments', k8sController.getDeployments);
router.get('/pods', k8sController.getPods);
router.get('/services', k8sController.getServices);
router.get('/ingresses', k8sController.getIngresses);
router.get('/daemonsets', k8sController.getDaemonSets);
router.get('/statefulsets', k8sController.getStatefulSets);
router.get('/jobs', k8sController.getJobs);
router.get('/cronjobs', k8sController.getCronJobs);
router.get('/configmaps', k8sController.getConfigMaps);
router.get('/secrets', k8sController.getSecrets);
router.get('/namespaces', k8sController.getNamespaces);

router.get('/pods/:namespace/:name/logs', k8sController.getPodLogs);

// YAML ops
router.get('/yaml/:type/:namespace/:name', k8sController.getYaml);
router.post('/yaml', k8sController.updateYaml);
router.post('/resources/apply', k8sController.applyResource);

// Deprecated individual YAML routes (supporting legacy frontend if needed, but we can redirect or just keep them)
// The frontend seems to use /api/nodes/:name/yaml specifically? 
// Checking index.js... yes, /api/nodes/:name/yaml, /api/deployments/:namespace/:name/yaml etc.
// I should add those specific routes to match existing API exactly or update frontend.
// The Plan didn't specify updating frontend, so API compatibility is key.
// I will map them to the generic controller method or specific ones.

// Specific legacy routes
// nodes/:name/yaml -> type=node, namespace=undefined (controller handles name only for node)
router.get('/nodes/:name/yaml', (req, res) => {
    req.params.type = 'node';
    req.params.namespace = 'default'; // unused for node
    k8sController.getYaml(req, res);
});
router.get('/deployments/:namespace/:name/yaml', (req, res) => { req.params.type = 'deployment'; k8sController.getYaml(req, res); });
router.get('/pods/:namespace/:name/yaml', (req, res) => { req.params.type = 'pod'; k8sController.getYaml(req, res); });
router.get('/services/:namespace/:name/yaml', (req, res) => { req.params.type = 'service'; k8sController.getYaml(req, res); });
router.get('/ingresses/:namespace/:name/yaml', (req, res) => { req.params.type = 'ingress'; k8sController.getYaml(req, res); });
router.get('/daemonsets/:namespace/:name/yaml', (req, res) => { req.params.type = 'daemonset'; k8sController.getYaml(req, res); });
router.get('/statefulsets/:namespace/:name/yaml', (req, res) => { req.params.type = 'statefulset'; k8sController.getYaml(req, res); });
router.get('/jobs/:namespace/:name/yaml', (req, res) => { req.params.type = 'job'; k8sController.getYaml(req, res); });
router.get('/cronjobs/:namespace/:name/yaml', (req, res) => { req.params.type = 'cronjob'; k8sController.getYaml(req, res); });
router.get('/configmaps/:namespace/:name/yaml', (req, res) => { req.params.type = 'configmap'; k8sController.getYaml(req, res); });
router.get('/secrets/:namespace/:name/yaml', (req, res) => { req.params.type = 'secret'; k8sController.getYaml(req, res); });

// Update routes (PUT /api/deployments/:namespace/:name/yaml)
// Using express.text() middleware should be in app.js or specific here.
router.put('/deployments/:namespace/:name/yaml', express.text({ type: 'text/yaml' }), async (req, res) => {
    req.body = { type: 'deployment', namespace: req.params.namespace, name: req.params.name, yaml: req.body };
    k8sController.updateYaml(req, res);
});
router.put('/services/:namespace/:name/yaml', express.text({ type: 'text/yaml' }), async (req, res) => {
    req.body = { type: 'service', namespace: req.params.namespace, name: req.params.name, yaml: req.body };
    k8sController.updateYaml(req, res);
});
router.put('/ingresses/:namespace/:name/yaml', express.text({ type: 'text/yaml' }), async (req, res) => {
    req.body = { type: 'ingress', namespace: req.params.namespace, name: req.params.name, yaml: req.body };
    k8sController.updateYaml(req, res);
});


// Otterize / Network Map
router.get('/network-map', k8sController.getNetworkMap);
router.get('/otterize/status', k8sController.getOtterizeStatus);
router.post('/otterize/install', k8sController.installOtterize);

module.exports = router;
