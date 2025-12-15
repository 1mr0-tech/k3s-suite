const { exec } = require('child_process');

const runMinikubeCommand = (command) => {
    return new Promise((resolve, reject) => {
        exec(`minikube ${command}`, (error, stdout, stderr) => {
            if (error) {
                console.warn(`Minikube command '${command}' error:`, error.message);
                // Minikube status returns non-zero if not running, which isn't always a "system error"
                // but for start/stop it might be.
            }
            resolve({ error, stdout, stderr });
        });
    });
};

exports.getStatus = async () => {
    // 'minikube status -o json' gives structured output
    const { error, stdout, stderr } = await runMinikubeCommand('status -o json');
    try {
        if (stdout) {
            return JSON.parse(stdout);
        }
    } catch (e) {
        console.error('Failed to parse minikube status JSON', e);
    }

    // Fallback or if not running
    if (error) {
        // If "Stopped" or "Paused", minikube status might exit 1 or 7, etc.
        // We can return a specific object
        return { host: 'Stopped', kubelet: 'Stopped', apiserver: 'Stopped' };
    }
    return { status: 'Unknown', details: stderr };
};

exports.start = async () => {
    const { error, stdout, stderr } = await runMinikubeCommand('start');
    if (error) throw new Error(stderr || error.message);
    return stdout;
};

exports.stop = async () => {
    const { error, stdout, stderr } = await runMinikubeCommand('stop');
    if (error) throw new Error(stderr || error.message);
    return stdout;
};
