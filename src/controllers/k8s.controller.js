const k8sService = require('../services/k8s.service');
const { exec } = require('child_process');

let currentContext = null;

// Initialize context (try to get from service)
try {
    const data = k8sService.getContexts();
    currentContext = data.currentContext;
} catch (e) {
    console.warn('Could not initialize k8s context', e.message);
}

exports.getContexts = (req, res) => {
    try {
        const data = k8sService.getContexts();
        if (!currentContext) currentContext = data.currentContext;
        res.json({ contexts: data.contexts, currentContext });
    } catch (err) {
        res.status(500).json({ error: 'Failed to list contexts', details: err.message });
    }
};

exports.setContext = (req, res) => {
    const { context } = req.body;
    if (context) {
        currentContext = context;
        res.json({ message: 'Context updated', currentContext });
    } else {
        res.status(400).json({ error: 'Context name required' });
    }
};

exports.getNodes = async (req, res) => {
    try {
        const nodes = await k8sService.getNodes(currentContext);
        res.json(nodes);
    } catch (err) {
        res.status(500).json({ error: 'Failed to get nodes' });
    }
};

// Generic resource fetcher helper
const fetchResource = async (res, method) => {
    try {
        const data = await method(currentContext);
        res.json(data);
    } catch (err) {
        const name = method.name.replace('get', '');
        res.status(500).json({ error: `Failed to get ${name}`, details: err.message });
    }
};

exports.getDeployments = (req, res) => fetchResource(res, k8sService.getDeployments);
exports.getPods = (req, res) => fetchResource(res, k8sService.getPods);
exports.getServices = (req, res) => fetchResource(res, k8sService.getServices);
exports.getIngresses = (req, res) => fetchResource(res, k8sService.getIngresses);
exports.getDaemonSets = (req, res) => fetchResource(res, k8sService.getDaemonSets);
exports.getStatefulSets = (req, res) => fetchResource(res, k8sService.getStatefulSets);
exports.getJobs = (req, res) => fetchResource(res, k8sService.getJobs);
exports.getCronJobs = (req, res) => fetchResource(res, k8sService.getCronJobs);
exports.getConfigMaps = (req, res) => fetchResource(res, k8sService.getConfigMaps);
exports.getSecrets = (req, res) => fetchResource(res, k8sService.getSecrets);
exports.getNamespaces = (req, res) => fetchResource(res, k8sService.getNamespaces);

exports.getPodLogs = async (req, res) => {
    try {
        const context = req.header('x-k8s-context') || currentContext;
        const { namespace, name } = req.params;
        const tail = req.query.tail ? parseInt(req.query.tail) : 100;

        if (!context) return res.status(400).json({ error: 'No context available' });

        const logs = await k8sService.getPodLogs(namespace, name, context, tail);
        res.send(logs);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch pod logs' });
    }
};

exports.getYaml = async (req, res) => {
    const { type, namespace, name } = req.params;
    try {
        let yamlStr = '';
        switch (type) {
            case 'node': yamlStr = await k8sService.getNodeYaml(name, currentContext); break;
            case 'deployment': yamlStr = await k8sService.getDeploymentYaml(namespace, name, currentContext); break;
            case 'pod': yamlStr = await k8sService.getPodYaml(namespace, name, currentContext); break;
            case 'service': yamlStr = await k8sService.getServiceYaml(namespace, name, currentContext); break;
            case 'ingress': yamlStr = await k8sService.getIngressYaml(namespace, name, currentContext); break;
            case 'daemonset': yamlStr = await k8sService.getDaemonSetYaml(namespace, name, currentContext); break;
            case 'statefulset': yamlStr = await k8sService.getStatefulSetYaml(namespace, name, currentContext); break;
            case 'job': yamlStr = await k8sService.getJobYaml(namespace, name, currentContext); break;
            case 'cronjob': yamlStr = await k8sService.getCronJobYaml(namespace, name, currentContext); break;
            case 'configmap': yamlStr = await k8sService.getConfigMapYaml(namespace, name, currentContext); break;
            case 'secret': yamlStr = await k8sService.getSecretYaml(namespace, name, currentContext); break;
            default: return res.status(400).json({ error: 'Invalid type' });
        }
        res.json({ yaml: yamlStr });
    } catch (err) {
        res.status(500).json({ error: 'Failed to get YAML', details: err.message });
    }
};

exports.applyResource = (req, res) => {
    const { yaml, context, namespace } = req.body;
    if (!yaml) return res.status(400).json({ error: 'YAML content required' });

    const ctx = context || currentContext;
    if (!ctx) return res.status(400).json({ error: 'No context selected' });

    console.log(`Applying resource to context: ${ctx}, namespace: ${namespace || 'default/yaml-specified'}`);

    const nsFlag = namespace ? ` -n "${namespace}"` : '';
    const child = exec(`kubectl apply -f - --context="${ctx}"${nsFlag}`, (error, stdout, stderr) => {
        if (error) {
            console.error(`kubectl error: ${error.message}`);
            return res.status(500).json({ error: 'Failed to apply resource', details: stderr || error.message });
        }
        res.json({ message: 'Resource applied successfully', output: stdout });
    });

    child.stdin.write(yaml);
    child.stdin.end();
};

exports.updateYaml = async (req, res) => {
    const { type, namespace, name, yaml } = req.body;
    try {
        if (type === 'deployment') {
            await k8sService.updateDeployment(namespace, name, yaml, currentContext);
        } else if (type === 'service') {
            await k8sService.updateService(namespace, name, yaml, currentContext);
        } else if (type === 'ingress') {
            await k8sService.updateIngress(namespace, name, yaml, currentContext);
        } else {
            return res.status(400).json({ error: 'Update not supported for this type' });
        }
        res.json({ message: 'Updated successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update YAML', details: err.message });
    }
};

// Network Map
exports.getNetworkMap = async (req, res) => {
    try {
        const namespace = req.query.namespace || 'all';
        const services = await k8sService.getServices(currentContext);
        const intents = await k8sService.getClientIntents(namespace, currentContext);

        let nodes = services.items;
        if (namespace !== 'all') {
            nodes = nodes.filter(s => s.metadata.namespace === namespace);
        }

        const mapNodes = nodes.map(svc => ({
            id: `${svc.metadata.namespace}/${svc.metadata.name}`,
            label: svc.metadata.name,
            group: svc.metadata.namespace,
            title: `Namespace: ${svc.metadata.namespace}`,
            shape: 'box'
        }));

        const mapEdges = [];
        if (intents && intents.items) {
            intents.items.forEach(intent => {
                const sourceNs = intent.metadata.namespace;
                const sourceName = intent.spec.service.name;
                if (intent.spec.calls) {
                    intent.spec.calls.forEach(call => {
                        const targetName = call.name;
                        // Simplified network map logic
                        const targetNs = sourceNs;
                        mapEdges.push({
                            from: `${sourceNs}/${sourceName}`,
                            to: `${targetNs}/${targetName}`,
                            arrows: 'to',
                            color: { color: 'green' }
                        });
                    });
                }
            });
        }
        res.json({ nodes: mapNodes, edges: mapEdges });
    } catch (err) {
        res.status(500).json({ error: 'Failed to generate network map', details: err.message });
    }
};

exports.installOtterize = (req, res) => {
    const cmd = `helm repo add otterize https://helm.otterize.com && \
                  helm repo update && \
                  helm upgrade --install otterize otterize/otterize-kubernetes -n otterize-system --create-namespace --wait`;

    console.log('Installing Otterize...');
    exec(cmd, (error, stdout, stderr) => {
        if (error) {
            console.error(`exec error: ${error}`);
            return;
        }
        console.log(`stdout: ${stdout}`);
        console.error(`stderr: ${stderr}`);
    });

    res.json({ message: 'Installation started. This may take a few minutes.' });
};

exports.getOtterizeStatus = async (req, res) => {
    try {
        const isInstalled = await k8sService.checkOtterizeStatus(currentContext);
        res.json({ installed: isInstalled });
    } catch (err) {
        res.status(500).json({ error: 'Failed to check status', details: err.message });
    }
};
