const app = require('./src/app');

// Port configuration
const port = process.env.PORT || 3001;

// Start server
app.listen(port, () => {
    console.log(`k3s-suite app listening at http://localhost:${port}`);
    console.log(`Minikube support: Enabled at /api/system/minikube`);
});
