const express = require('express');
const path = require('path');

const app = express();

// Middleware
app.use(express.static(path.join(__dirname, '../public')));
app.use(express.json());

// Routes
const registryRoutes = require('./routes/registry.routes');
const k8sRoutes = require('./routes/k8s.routes');
const systemRoutes = require('./routes/system.routes');

app.use('/api', registryRoutes);
app.use('/api', k8sRoutes);
app.use('/api/system', systemRoutes);

// Catch-all for checking if we hit index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something broke!', details: err.message });
});

module.exports = app;
