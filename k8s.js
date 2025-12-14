const k8s = require('@kubernetes/client-node');
const yaml = require('js-yaml');

// Helper to get a fresh client instance with latest config
function getClient(ApiConstructor, contextName) {
    const kc = new k8s.KubeConfig();
    kc.loadFromDefault();
    if (contextName) {
        kc.setCurrentContext(contextName);
    }
    return kc.makeApiClient(ApiConstructor);
}

function getContexts() {
    const kc = new k8s.KubeConfig();
    kc.loadFromDefault();
    return {
        contexts: kc.contexts.map(c => c.name),
        currentContext: kc.currentContext
    };
}

// Removed static clients to ensure config is re-read on each request
// const k8sApi = kc.makeApiClient(k8s.CoreV1Api);
// const appsV1Api = kc.makeApiClient(k8s.AppsV1Api);
// const networkingV1Api = kc.makeApiClient(k8s.NetworkingV1Api);
// const batchV1Api = kc.makeApiClient(k8s.BatchV1Api);

async function getNodes(contextName) {
    try {
        const k8sApi = getClient(k8s.CoreV1Api, contextName);
        const res = await k8sApi.listNode();
        return res.body;
    } catch (err) {
        console.error('Error listing nodes:', err);
        throw err;
    }
}

async function getDeployments(contextName) {
    try {
        const appsV1Api = getClient(k8s.AppsV1Api, contextName);
        const res = await appsV1Api.listDeploymentForAllNamespaces();
        return res.body;
    } catch (err) {
        console.error('Error listing deployments:', err);
        throw err;
    }
}

async function getPods(contextName) {
    try {
        const k8sApi = getClient(k8s.CoreV1Api, contextName);
        const res = await k8sApi.listPodForAllNamespaces();
        return res.body;
    } catch (err) {
        console.error('Error listing pods:', err);
        throw err;
    }
}

async function getServices(contextName) {
    try {
        const k8sApi = getClient(k8s.CoreV1Api, contextName);
        const res = await k8sApi.listServiceForAllNamespaces();
        return res.body;
    } catch (err) {
        console.error('Error listing services:', err);
        throw err;
    }
}

async function getIngresses(contextName) {
    try {
        const networkingV1Api = getClient(k8s.NetworkingV1Api, contextName);
        const res = await networkingV1Api.listIngressForAllNamespaces();
        return res.body;
    } catch (err) {
        console.error('Error listing ingresses:', err);
        throw err;
    }
}

async function getDaemonSets(contextName) {
    try {
        const appsV1Api = getClient(k8s.AppsV1Api, contextName);
        const res = await appsV1Api.listDaemonSetForAllNamespaces();
        return res.body;
    } catch (err) {
        console.error('Error listing daemonsets:', err);
        throw err;
    }
}

async function getStatefulSets(contextName) {
    try {
        const appsV1Api = getClient(k8s.AppsV1Api, contextName);
        const res = await appsV1Api.listStatefulSetForAllNamespaces();
        return res.body;
    } catch (err) {
        console.error('Error listing statefulsets:', err);
        throw err;
    }
}

async function getJobs(contextName) {
    try {
        const batchV1Api = getClient(k8s.BatchV1Api, contextName);
        const res = await batchV1Api.listJobForAllNamespaces();
        return res.body;
    } catch (err) {
        console.error('Error listing jobs:', err);
        throw err;
    }
}

async function getCronJobs(contextName) {
    try {
        const batchV1Api = getClient(k8s.BatchV1Api, contextName);
        const res = await batchV1Api.listCronJobForAllNamespaces();
        return res.body;
    } catch (err) {
        console.error('Error listing cronjobs:', err);
        throw err;
    }
}

async function getConfigMaps(contextName) {
    try {
        const k8sApi = getClient(k8s.CoreV1Api, contextName);
        const res = await k8sApi.listConfigMapForAllNamespaces();
        return res.body;
    } catch (err) {
        console.error('Error listing configmaps:', err);
        throw err;
    }
}

async function getSecrets(contextName) {
    try {
        const k8sApi = getClient(k8s.CoreV1Api, contextName);
        const res = await k8sApi.listSecretForAllNamespaces();
        return res.body;
    } catch (err) {
        console.error('Error listing secrets:', err);
        throw err;
    }
}

async function getNodeYaml(name, contextName) {
    try {
        const k8sApi = getClient(k8s.CoreV1Api, contextName);
        const res = await k8sApi.readNode(name);
        return yaml.dump(res.body);
    } catch (err) {
        console.error(`Error getting YAML for node ${name}:`, err);
        throw err;
    }
}

async function getDeploymentYaml(namespace, name, contextName) {
    try {
        const appsV1Api = getClient(k8s.AppsV1Api, contextName);
        const res = await appsV1Api.readNamespacedDeployment(name, namespace);
        return yaml.dump(res.body);
    } catch (err) {
        console.error(`Error getting YAML for deployment ${name} in namespace ${namespace}:`, err);
        throw err;
    }
}

async function getPodYaml(namespace, name, contextName) {
    try {
        const k8sApi = getClient(k8s.CoreV1Api, contextName);
        const res = await k8sApi.readNamespacedPod(name, namespace);
        return yaml.dump(res.body);
    } catch (err) {
        console.error(`Error getting YAML for pod ${name} in namespace ${namespace}:`, err);
        throw err;
    }
}

async function getServiceYaml(namespace, name, contextName) {
    try {
        const k8sApi = getClient(k8s.CoreV1Api, contextName);
        const res = await k8sApi.readNamespacedService(name, namespace);
        return yaml.dump(res.body);
    } catch (err) {
        console.error(`Error getting YAML for service ${name} in namespace ${namespace}:`, err);
        throw err;
    }
}

async function getIngressYaml(namespace, name, contextName) {
    try {
        const networkingV1Api = getClient(k8s.NetworkingV1Api, contextName);
        const res = await networkingV1Api.readNamespacedIngress(name, namespace);
        return yaml.dump(res.body);
    } catch (err) {
        console.error(`Error getting YAML for ingress ${name} in namespace ${namespace}:`, err);
        throw err;
    }
}

async function getDaemonSetYaml(namespace, name, contextName) {
    try {
        const appsV1Api = getClient(k8s.AppsV1Api, contextName);
        const res = await appsV1Api.readNamespacedDaemonSet(name, namespace);
        return yaml.dump(res.body);
    } catch (err) {
        console.error(`Error getting YAML for daemonset ${name} in namespace ${namespace}:`, err);
        throw err;
    }
}

async function getStatefulSetYaml(namespace, name, contextName) {
    try {
        const appsV1Api = getClient(k8s.AppsV1Api, contextName);
        const res = await appsV1Api.readNamespacedStatefulSet(name, namespace);
        return yaml.dump(res.body);
    } catch (err) {
        console.error(`Error getting YAML for statefulset ${name} in namespace ${namespace}:`, err);
        throw err;
    }
}

async function getJobYaml(namespace, name, contextName) {
    try {
        const batchV1Api = getClient(k8s.BatchV1Api, contextName);
        const res = await batchV1Api.readNamespacedJob(name, namespace);
        return yaml.dump(res.body);
    } catch (err) {
        console.error(`Error getting YAML for job ${name} in namespace ${namespace}:`, err);
        throw err;
    }
}

async function getCronJobYaml(namespace, name, contextName) {
    try {
        const batchV1Api = getClient(k8s.BatchV1Api, contextName);
        const res = await batchV1Api.readNamespacedCronJob(name, namespace);
        return yaml.dump(res.body);
    } catch (err) {
        console.error(`Error getting YAML for cronjob ${name} in namespace ${namespace}:`, err);
        throw err;
    }
}

async function getConfigMapYaml(namespace, name, contextName) {
    try {
        const k8sApi = getClient(k8s.CoreV1Api, contextName);
        const res = await k8sApi.readNamespacedConfigMap(name, namespace);
        return yaml.dump(res.body);
    } catch (err) {
        console.error(`Error getting YAML for configmap ${name} in namespace ${namespace}:`, err);
        throw err;
    }
}

async function getSecretYaml(namespace, name, contextName) {
    try {
        const k8sApi = getClient(k8s.CoreV1Api, contextName);
        const res = await k8sApi.readNamespacedSecret(name, namespace);
        return yaml.dump(res.body);
    } catch (err) {
        console.error(`Error getting YAML for secret ${name} in namespace ${namespace}:`, err);
        throw err;
    }
}

async function getNamespaces(contextName) {
    try {
        const k8sApi = getClient(k8s.CoreV1Api, contextName);
        const res = await k8sApi.listNamespace();
        return res.body;
    } catch (err) {
        console.error('Error listing namespaces:', err);
        throw err;
    }
}

async function updateDeployment(namespace, name, yamlString, contextName) {
    try {
        const appsV1Api = getClient(k8s.AppsV1Api, contextName);
        const spec = yaml.load(yamlString);
        const res = await appsV1Api.replaceNamespacedDeployment(name, namespace, spec);
        return res.body;
    } catch (err) {
        console.error(`Error updating deployment ${name} in namespace ${namespace}:`, err);
        throw err;
    }
}

async function updateService(namespace, name, yamlString, contextName) {
    try {
        const k8sApi = getClient(k8s.CoreV1Api, contextName);
        const spec = yaml.load(yamlString);
        const res = await k8sApi.replaceNamespacedService(name, namespace, spec);
        return res.body;
    } catch (err) {
        console.error(`Error updating service ${name} in namespace ${namespace}:`, err);
        throw err;
    }
}

async function updateIngress(namespace, name, yamlString, contextName) {
    try {
        const networkingV1Api = getClient(k8s.NetworkingV1Api, contextName);
        const spec = yaml.load(yamlString);
        const res = await networkingV1Api.replaceNamespacedIngress(name, namespace, spec);
        return res.body;
    } catch (err) {
        console.error(`Error updating ingress ${name} in namespace ${namespace}:`, err);
        throw err;
    }
}

module.exports = {
    getNodes,
    getDeployments,
    getPods,
    getServices,
    getIngresses,
    getDaemonSets,
    getStatefulSets,
    getJobs,
    getCronJobs,
    getConfigMaps,
    getSecrets,
    getNodeYaml,
    getDeploymentYaml,
    getPodYaml,
    getServiceYaml,
    getIngressYaml,
    getDaemonSetYaml,
    getStatefulSetYaml,
    getJobYaml,
    getCronJobYaml,
    getConfigMapYaml,
    getSecretYaml,
    getNamespaces,
    updateDeployment,
    updateService,
    updateIngress,
    getContexts
};
