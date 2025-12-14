const express = require('express');
const path = require('path');
const app = express();
const port = 3001;

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const k8s = require('./k8s');

const reg = require('./reg');
const { exec } = require('child_process');

let currentContext = null; // Store currently selected context

// In-memory store for registry configuration
let registryConfig = {
    url: '',
    username: '',
    password: '',
    isSecure: false // Default to false (non-SSL) as requested
};

app.get('/api/config/registry', (req, res) => {
    res.json(registryConfig);
});

app.post('/api/config/registry', express.json(), (req, res) => {
    const { url, username, password, isSecure } = req.body;
    if (!url) {
        return res.status(400).json({ error: 'URL is required' });
    }
    registryConfig.url = url;
    registryConfig.username = username || '';
    registryConfig.password = password || '';
    registryConfig.isSecure = isSecure === undefined ? false : isSecure;
    registryConfig.timezone = req.body.timezone || 'UTC';
    res.json({ message: 'Registry URL updated', config: registryConfig });
});

app.post('/api/resources/apply', express.json(), (req, res) => {
    const { yaml, context, namespace } = req.body;
    if (!yaml) return res.status(400).json({ error: 'YAML content required' });

    // Use currentContext if not provided
    const ctx = context || currentContext;
    if (!ctx) return res.status(400).json({ error: 'No context selected' });

    console.log(`Applying resource to context: ${ctx}, namespace: ${namespace || 'default/yaml-specified'}`);

    // Using kubectl apply via stdin
    // Assuming kubectl is in PATH (checked by prereq script)
    // Add namespace flag if provided
    const nsFlag = namespace ? ` -n "${namespace}"` : '';
    const child = exec(`kubectl apply -f - --context="${ctx}"${nsFlag}`, (error, stdout, stderr) => {
        if (error) {
            console.error(`kubectl error: ${error.message}`);
            return res.status(500).json({ error: 'Failed to apply resource', details: stderr || error.message });
        }
        res.json({ message: 'Resource applied successfully', output: stdout });
    });

    // Write YAML to stdin
    child.stdin.write(yaml);
    child.stdin.end();
});

app.get('/api/contexts', (req, res) => {
    try {
        const data = k8s.getContexts();
        // If currentContext is not set, use the default from config
        if (!currentContext) {
            currentContext = data.currentContext;
        }
        res.json({
            contexts: data.contexts,
            currentContext: currentContext
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed to listing contexts', details: err });
    }
});

app.post('/api/contexts/current', express.json(), (req, res) => {
    const { context } = req.body;
    if (context) {
        currentContext = context;
        res.json({ message: 'Context updated', currentContext });
    } else {
        res.status(400).json({ error: 'Context name required' });
    }
});

app.get('/api/nodes', async (req, res) => {
    try {
        const nodes = await k8s.getNodes(currentContext);
        res.json(nodes);
    } catch (err) {
        res.status(500).json({ error: 'Failed to get nodes' });
    }
});

app.get('/api/deployments', async (req, res) => {
    try {
        const deployments = await k8s.getDeployments(currentContext);
        res.json(deployments);
    } catch (err) {
        res.status(500).json({ error: 'Failed to get deployments' });
    }
});

app.get('/api/pods', async (req, res) => {
    try {
        const pods = await k8s.getPods(currentContext);
        res.json(pods);
    } catch (err) {
        res.status(500).json({ error: 'Failed to get pods' });
    }
});

app.get('/api/services', async (req, res) => {
    try {
        const services = await k8s.getServices(currentContext);
        res.json(services);
    } catch (err) {
        res.status(500).json({ error: 'Failed to get services' });
    }
});

app.get('/api/ingresses', async (req, res) => {
    try {
        const ingresses = await k8s.getIngresses(currentContext);
        res.json(ingresses);
    } catch (err) {
        res.status(500).json({ error: 'Failed to get ingresses' });
    }
});

app.get('/api/daemonsets', async (req, res) => {
    try {
        const daemonsets = await k8s.getDaemonSets(currentContext);
        res.json(daemonsets);
    } catch (err) {
        res.status(500).json({ error: 'Failed to get daemonsets' });
    }
});

app.get('/api/statefulsets', async (req, res) => {
    try {
        const statefulsets = await k8s.getStatefulSets(currentContext);
        res.json(statefulsets);
    } catch (err) {
        res.status(500).json({ error: 'Failed to get statefulsets' });
    }
});

app.get('/api/jobs', async (req, res) => {
    try {
        const jobs = await k8s.getJobs(currentContext);
        res.json(jobs);
    } catch (err) {
        res.status(500).json({ error: 'Failed to get jobs' });
    }
});

app.get('/api/cronjobs', async (req, res) => {
    try {
        const cronjobs = await k8s.getCronJobs(currentContext);
        res.json(cronjobs);
    } catch (err) {
        res.status(500).json({ error: 'Failed to get cronjobs' });
    }
});

app.get('/api/configmaps', async (req, res) => {
    try {
        const configmaps = await k8s.getConfigMaps(currentContext);
        res.json(configmaps);
    } catch (err) {
        res.status(500).json({ error: 'Failed to get configmaps' });
    }
});

app.get('/api/secrets', async (req, res) => {
    try {
        const secrets = await k8s.getSecrets(currentContext);
        res.json(secrets);
    } catch (err) {
        res.status(500).json({ error: 'Failed to get secrets' });
    }
});

app.get('/api/repositories', (req, res) => {
    reg.getRepositories(registryConfig.url, registryConfig.username, registryConfig.password, registryConfig.isSecure, (err, repos) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to get repositories', details: err });
        }
        res.json(repos);
    });
});

app.get('/api/repositories/:name/tags', async (req, res) => {
    const repoName = req.params.name;
    try {
        const data = await reg.getRepoWithTags(registryConfig, repoName);
        res.json(data);
    } catch (err) {
        console.error('Error fetching tags:', err);
        res.status(500).json({ error: 'Failed to fetch tags', details: err.message });
    }
});

app.get('/api/namespaces', async (req, res) => {
    try {
        const namespaces = await k8s.getNamespaces(currentContext);
        res.json(namespaces);
    } catch (err) {
        res.status(500).json({ error: 'Failed to get namespaces' });
    }
});

app.get('/api/pods/:namespace/:name/logs', async (req, res) => {
    try {
        const context = req.header('x-k8s-context');
        const { namespace, name } = req.params;
        const tail = req.query.tail ? parseInt(req.query.tail) : 100;

        // Validate context
        if (!context) {
            return res.status(400).json({ error: 'Missing x-k8s-context header' });
        }

        const logs = await k8s.getPodLogs(namespace, name, context, tail);
        res.send(logs); // Send raw text
    } catch (err) {
        console.error('Error fetching pod logs:', err);
        res.status(500).json({ error: 'Failed to fetch pod logs' });
    }
});

app.get('/api/nodes/:name/yaml', async (req, res) => {
    try {
        const name = req.params.name;
        const yaml = await k8s.getNodeYaml(name);
        res.type('text/yaml').send(yaml);
    } catch (err) {
        res.status(500).json({ error: `Failed to get YAML for node ${req.params.name}` });
    }
});

app.get('/api/deployments/:namespace/:name/yaml', async (req, res) => {
    try {
        const { namespace, name } = req.params;
        const yaml = await k8s.getDeploymentYaml(namespace, name);
        res.type('text/yaml').send(yaml);
    } catch (err) {
        res.status(500).json({ error: `Failed to get YAML for deployment ${req.params.name}` });
    }
});

app.get('/api/yaml/:type/:namespace/:name', async (req, res) => {
    const { type, namespace, name } = req.params;
    try {
        let yamlStr = '';
        switch (type) {
            case 'node': yamlStr = await k8s.getNodeYaml(name, currentContext); break;
            case 'deployment': yamlStr = await k8s.getDeploymentYaml(namespace, name, currentContext); break;
            case 'pod': yamlStr = await k8s.getPodYaml(namespace, name, currentContext); break;
            case 'service': yamlStr = await k8s.getServiceYaml(namespace, name, currentContext); break;
            case 'ingress': yamlStr = await k8s.getIngressYaml(namespace, name, currentContext); break;
            case 'daemonset': yamlStr = await k8s.getDaemonSetYaml(namespace, name, currentContext); break;
            case 'statefulset': yamlStr = await k8s.getStatefulSetYaml(namespace, name, currentContext); break;
            case 'job': yamlStr = await k8s.getJobYaml(namespace, name, currentContext); break;
            case 'cronjob': yamlStr = await k8s.getCronJobYaml(namespace, name, currentContext); break;
            case 'configmap': yamlStr = await k8s.getConfigMapYaml(namespace, name, currentContext); break;
            case 'secret': yamlStr = await k8s.getSecretYaml(namespace, name, currentContext); break;
            default: return res.status(400).json({ error: 'Invalid type' });
        }
        res.json({ yaml: yamlStr });
    } catch (err) {
        res.status(500).json({ error: 'Failed to get YAML', details: err });
    }
});

app.get('/api/pods/:namespace/:name/yaml', async (req, res) => {
    try {
        const { namespace, name } = req.params;
        const yaml = await k8s.getPodYaml(namespace, name, currentContext);
        res.type('text/yaml').send(yaml);
    } catch (err) {
        res.status(500).json({ error: `Failed to get YAML for pod ${req.params.name}` });
    }
});

app.get('/api/services/:namespace/:name/yaml', async (req, res) => {
    try {
        const { namespace, name } = req.params;
        const yaml = await k8s.getServiceYaml(namespace, name, currentContext);
        res.type('text/yaml').send(yaml);
    } catch (err) {
        res.status(500).json({ error: `Failed to get YAML for service ${req.params.name}` });
    }
});

app.get('/api/ingresses/:namespace/:name/yaml', async (req, res) => {
    try {
        const { namespace, name } = req.params;
        const yaml = await k8s.getIngressYaml(namespace, name, currentContext);
        res.type('text/yaml').send(yaml);
    } catch (err) {
        res.status(500).json({ error: `Failed to get YAML for ingress ${req.params.name}` });
    }
});

app.get('/api/daemonsets/:namespace/:name/yaml', async (req, res) => {
    try {
        const { namespace, name } = req.params;
        const yaml = await k8s.getDaemonSetYaml(namespace, name, currentContext);
        res.type('text/yaml').send(yaml);
    } catch (err) {
        res.status(500).json({ error: `Failed to get YAML for daemonset ${req.params.name}` });
    }
});

app.get('/api/statefulsets/:namespace/:name/yaml', async (req, res) => {
    try {
        const { namespace, name } = req.params;
        const yaml = await k8s.getStatefulSetYaml(namespace, name, currentContext);
        res.type('text/yaml').send(yaml);
    } catch (err) {
        res.status(500).json({ error: `Failed to get YAML for statefulset ${req.params.name}` });
    }
});

app.get('/api/jobs/:namespace/:name/yaml', async (req, res) => {
    try {
        const { namespace, name } = req.params;
        const yaml = await k8s.getJobYaml(namespace, name, currentContext);
        res.type('text/yaml').send(yaml);
    } catch (err) {
        res.status(500).json({ error: `Failed to get YAML for job ${req.params.name}` });
    }
});

app.get('/api/cronjobs/:namespace/:name/yaml', async (req, res) => {
    try {
        const { namespace, name } = req.params;
        const yaml = await k8s.getCronJobYaml(namespace, name, currentContext);
        res.type('text/yaml').send(yaml);
    } catch (err) {
        res.status(500).json({ error: `Failed to get YAML for cronjob ${req.params.name}` });
    }
});

app.get('/api/configmaps/:namespace/:name/yaml', async (req, res) => {
    try {
        const { namespace, name } = req.params;
        const yaml = await k8s.getConfigMapYaml(namespace, name, currentContext);
        res.type('text/yaml').send(yaml);
    } catch (err) {
        res.status(500).json({ error: `Failed to get YAML for configmap ${req.params.name}` });
    }
});

app.get('/api/secrets/:namespace/:name/yaml', async (req, res) => {
    try {
        const { namespace, name } = req.params;
        const yaml = await k8s.getSecretYaml(namespace, name, currentContext);
        res.type('text/yaml').send(yaml);
    } catch (err) {
        res.status(500).json({ error: `Failed to get YAML for secret ${req.params.name}` });
    }
});

app.use('/api/deployments/:namespace/:name/yaml', express.text({ type: 'text/yaml' }));
app.put('/api/deployments/:namespace/:name/yaml', async (req, res) => {
    try {
        const { namespace, name } = req.params;
        const yaml = req.body;
        await k8s.updateDeployment(namespace, name, yaml, currentContext);
        res.json({ message: 'Deployment updated successfully' });
    } catch (err) {
        res.status(500).json({ error: `Failed to update deployment ${req.params.name}` });
    }
});

app.use('/api/services/:namespace/:name/yaml', express.text({ type: 'text/yaml' }));
app.put('/api/services/:namespace/:name/yaml', async (req, res) => {
    try {
        const { namespace, name } = req.params;
        const yaml = req.body;
        await k8s.updateService(namespace, name, yaml, currentContext);
        res.json({ message: 'Service updated successfully' });
    } catch (err) {
        res.status(500).json({ error: `Failed to update service ${req.params.name}` });
    }
});

app.use('/api/ingresses/:namespace/:name/yaml', express.text({ type: 'text/yaml' }));
app.put('/api/ingresses/:namespace/:name/yaml', async (req, res) => {
    try {
        const { namespace, name } = req.params;
        const yaml = req.body;
        await k8s.updateIngress(namespace, name, yaml, currentContext);
        res.json({ message: 'Ingress updated successfully' });
    } catch (err) {
        res.status(500).json({ error: `Failed to update ingress ${req.params.name}` });
    }
});

app.post('/api/yaml', express.json(), async (req, res) => {
    const { type, namespace, name, yaml } = req.body;
    try {
        if (type === 'deployment') {
            await k8s.updateDeployment(namespace, name, yaml, currentContext);
        } else if (type === 'service') {
            await k8s.updateService(namespace, name, yaml, currentContext);
        } else if (type === 'ingress') {
            await k8s.updateIngress(namespace, name, yaml, currentContext);
        } else {
            return res.status(400).json({ error: 'Update not supported for this type' });
        }
        res.json({ message: 'Updated successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update YAML', details: err });
    }
});

app.get('/api/network-map', async (req, res) => {
    try {
        const namespace = req.query.namespace || 'all';
        // Nodes: Services (representing workloads)
        // Edges: ClientIntents
        const services = await k8s.getServices(currentContext);
        const intents = await k8s.getClientIntents(namespace, currentContext);

        // Filter services if namespace is selected
        let nodes = services.items;
        if (namespace !== 'all') {
            nodes = nodes.filter(s => s.metadata.namespace === namespace);
        }

        // Simplify nodes for Vis.js
        const mapNodes = nodes.map(svc => ({
            id: `${svc.metadata.namespace}/${svc.metadata.name}`,
            label: svc.metadata.name,
            group: svc.metadata.namespace,
            title: `Namespace: ${svc.metadata.namespace}`,
            shape: 'box'
        }));

        // Simplify edges from ClientIntents
        const mapEdges = [];
        if (intents && intents.items) {
            intents.items.forEach(intent => {
                const sourceNs = intent.metadata.namespace;
                const sourceName = intent.spec.service.name; // v1alpha3 use 'service.name' usually

                // Intents can have multiple calls
                if (intent.spec.calls) {
                    intent.spec.calls.forEach(call => {
                        const targetName = call.name;
                        // Target might be in same NS or different (if full name used, logic complex)
                        // Assuming simplifed view: same NS or explicit logic needed for cross-ns
                        // Otterize validation often requires explicit NS if cross
                        const targetNs = sourceNs; // Simplification for now

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
});

app.post('/api/otterize/install', (req, res) => {
    // Basic installer using Helm
    const cmd = `helm repo add otterize https://helm.otterize.com && \
                 helm repo update && \
                 helm upgrade --install otterize otterize/otterize-kubernetes -n otterize-system --create-namespace --wait`;

    // We run async but return immediate ID or status? 
    // For simplicity, let's wait (could timeout) or send 202
    // Given 'wait' flag, it might take time. Let's not use wait in exec if possible to avoid hanging request?
    // User wants instructions to install CLI locally. This runs in-cluster components.
    // Let's run it.
    console.log('Installing Otterize...');
    exec(cmd, (error, stdout, stderr) => {
        if (error) {
            console.error(`exec error: ${error}`);
            // If response not sent yet? We shouldn't block.
            // Let's send 200 "Started" and let user refresh map to see if it works later.
            return;
        }
        console.log(`stdout: ${stdout}`);
        console.error(`stderr: ${stderr}`);
    });

    res.json({ message: 'Installation started. This may take a few minutes.' });
});

app.get('/api/otterize/status', async (req, res) => {
    try {
        const isInstalled = await k8s.checkOtterizeStatus(currentContext);
        res.json({ installed: isInstalled });
    } catch (err) {
        res.status(500).json({ error: 'Failed to check status', details: err.message });
    }
});

app.listen(port, () => {
    console.log(`k3s-suite app listening at http://localhost:${port}`);
    try {
        const ctx = k8s.getContexts();
        console.log('Available Kubernetes Contexts:', ctx.contexts);
        console.log('Current Context:', ctx.currentContext);
    } catch (e) {
        console.error('Failed to load initial k8s contexts:', e.message);
    }
});
