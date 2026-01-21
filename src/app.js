const express = require('express');
const routes = require('./routes');
const { errorHandler, notFound } = require('./middleware/errorMiddleware');

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Routes
app.use('/', routes);

// 404 handler - must be after all routes
app.use(notFound);

// Global error handling middleware - must be last
app.use(errorHandler);

module.exports = app;
