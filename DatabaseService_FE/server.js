const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 5500;
const BACKEND_URL = 'http://10.0.4.123:5003'; // Private IP of BE EC2

// Enable CORS for all routes
app.use(cors());

// Proxy middleware for API requests
// All requests to /api/* will be forwarded to backend
app.use('/api', createProxyMiddleware({
    target: BACKEND_URL,
    changeOrigin: true,
    pathRewrite: {
        '^/api': '/api' // Keep the /api prefix
    },
    onProxyReq: (proxyReq, req, res) => {
        // Log proxy requests for debugging
        console.log(`[PROXY] ${req.method} ${req.url} -> ${BACKEND_URL}${req.url}`);
    },
    onProxyRes: (proxyRes, req, res) => {
        // Log proxy responses for debugging
        console.log(`[PROXY] Response: ${proxyRes.statusCode} for ${req.url}`);
    },
    onError: (err, req, res) => {
        console.error(`[PROXY ERROR] ${err.message} for ${req.url}`);
        res.status(500).json({
            success: false,
            error: 'Proxy error: Cannot connect to backend server'
        });
    }
}));

// Serve static files (HTML, CSS, JS)
app.use(express.static(path.join(__dirname)));

// Default route - serve index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`=================================`);
    console.log(`Frontend Server Started`);
    console.log(`=================================`);
    console.log(`Server running on: http://0.0.0.0:${PORT}`);
    console.log(`Backend proxy: ${BACKEND_URL}`);
    console.log(`API endpoint: http://0.0.0.0:${PORT}/api`);
    console.log(`=================================`);
});

