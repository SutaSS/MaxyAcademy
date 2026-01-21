const jwt = require('jsonwebtoken');
const { AuthenticationError } = require('../utils/customErrors');

const authenticateToken = (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
            throw new AuthenticationError('Access token is required');
        }

        jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
            if (err) {
                if (err.name === 'TokenExpiredError') {
                    throw new AuthenticationError('Token has expired');
                } else if (err.name === 'JsonWebTokenError') {
                    throw new AuthenticationError('Invalid token');
                }
                throw new AuthenticationError('Token verification failed');
            }
            
            req.user = user;
            next();
        });
    } catch (error) {
        next(error);
    }
};

module.exports = authenticateToken;
