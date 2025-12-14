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
        const repositories = stdout.split('\n').filter(repo => repo.length > 0);
        callback(null, repositories);
    });
}

module.exports = {
    getRepositories
};
