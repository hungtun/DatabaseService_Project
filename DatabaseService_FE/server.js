const express = require("express");
const { createProxyMiddleware } = require("http-proxy-middleware");
const path = require("path");
const cors = require("cors");

const app = express();
const PORT = 5500;
const BACKEND_URL = "http://10.0.4.123:5003"; // Private IP of BE EC2

// Enable CORS for all routes
app.use(cors());

// Debug middleware - log all requests
app.use((req, res, next) => {
  console.log(`[REQUEST] ${req.method} ${req.url}`);
  next();
});

// Proxy middleware for API requests - MUST be before static files and body parser
// Don't parse body for /api routes - let proxy forward raw body stream
// All requests to /api/* will be forwarded to backend
app.use(
  "/api",
  createProxyMiddleware({
    target: BACKEND_URL,
    changeOrigin: true,
    pathRewrite: {
      "^/api": "/api", // Keep the /api prefix
    },
    // Important: Don't parse body here, let proxy handle it
    // Forward all HTTP methods
    onProxyReq: (proxyReq, req, res) => {
      // Log proxy requests for debugging
      console.log(
        `[PROXY] ${req.method} ${req.url} -> ${BACKEND_URL}${req.url}`
      );
      // Log Content-Type header
      if (req.headers["content-type"]) {
        console.log(`[PROXY] Content-Type: ${req.headers["content-type"]}`);
      }
    },
    onProxyRes: (proxyRes, req, res) => {
      // Log proxy responses for debugging
      console.log(
        `[PROXY] Response: ${proxyRes.statusCode} ${proxyRes.statusMessage} for ${req.url}`
      );
      // Log response headers
      console.log(
        `[PROXY] Response Headers:`,
        JSON.stringify(proxyRes.headers, null, 2)
      );
    },
    onError: (err, req, res) => {
      console.error(`[PROXY ERROR] ${err.message} for ${req.url}`);
      console.error(`[PROXY ERROR] Stack:`, err.stack);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error: `Proxy error: ${err.message}`,
        });
      }
    },
    // Timeout settings
    timeout: 30000,
    proxyTimeout: 30000,
  })
);

// Serve static files (HTML, CSS, JS)
app.use(express.static(path.join(__dirname)));

// Default route - serve index.html
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// Start server
app.listen(PORT, "0.0.0.0", () => {
  console.log(`=================================`);
  console.log(`Frontend Server Started`);
  console.log(`=================================`);
  console.log(`Server running on: http://0.0.0.0:${PORT}`);
  console.log(`Backend proxy: ${BACKEND_URL}`);
  console.log(`API endpoint: http://0.0.0.0:${PORT}/api`);
  console.log(`=================================`);
});
