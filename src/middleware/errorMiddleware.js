const { AppError } = require('../utils/customErrors');

/**
 * Development error response with full stack trace
 */
const sendErrorDev = (err, res) => {
    res.status(err.statusCode).json({
        status: err.status,
        error: err,
        message: err.message,
        stack: err.stack
    });
};

/**
 * Production error response - hide implementation details
 */
const sendErrorProd = (err, res) => {
    // Operational, trusted error: send message to client
    if (err.isOperational) {
        res.status(err.statusCode).json({
            status: err.status,
            message: err.message
        });
    } 
    // Programming or unknown error: don't leak error details
    else {
        console.error('ERROR 💥', err);
        res.status(500).json({
            status: 'error',
            message: 'Something went wrong!'
        });
    }
};

/**
 * Handle PostgreSQL unique constraint violation
 */
const handleDuplicateFieldsDB = (err) => {
    if (err.code === '23505') {
        const field = err.constraint || 'field';
        const message = `Duplicate value for ${field}. Please use another value.`;
        return new AppError(message, 409);
    }
    return err;
};

/**
 * Handle PostgreSQL foreign key constraint violation
 */
const handleForeignKeyConstraintDB = (err) => {
    if (err.code === '23503') {
        const message = 'Invalid reference to related resource';
        return new AppError(message, 400);
    }
    return err;
};

/**
 * Handle JWT errors
 */
const handleJWTError = () => {
    return new AppError('Invalid token. Please log in again.', 401);
};

const handleJWTExpiredError = () => {
    return new AppError('Your token has expired. Please log in again.', 401);
};

/**
 * Global error handling middleware
 */
const errorHandler = (err, req, res, next) => {
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';

    if (process.env.NODE_ENV === 'development') {
        sendErrorDev(err, res);
    } else if (process.env.NODE_ENV === 'production') {
        let error = { ...err };
        error.message = err.message;
        error.name = err.name;

        // Handle specific error types
        if (err.code === '23505') error = handleDuplicateFieldsDB(err);
        if (err.code === '23503') error = handleForeignKeyConstraintDB(err);
        if (err.name === 'JsonWebTokenError') error = handleJWTError();
        if (err.name === 'TokenExpiredError') error = handleJWTExpiredError();

        sendErrorProd(error, res);
    } else {
        // Default to development mode if NODE_ENV not set
        sendErrorDev(err, res);
    }
};

/**
 * Handle 404 errors for undefined routes
 */
const notFound = (req, res, next) => {
    const err = new AppError(`Cannot find ${req.originalUrl} on this server`, 404);
    next(err);
};

module.exports = {
    errorHandler,
    notFound
};
