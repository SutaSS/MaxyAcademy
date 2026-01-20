const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/authController');
const TransactionController = require('../controllers/transactionController');
const ProfileController = require('../controllers/profileController');
const authenticateToken = require('../middleware/authMiddleware');

// Health check
router.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK', message: 'Server is running' });
});

// Auth routes (public)
router.post('/register', AuthController.register);
router.post('/login', AuthController.login);

// Protected routes (require authentication)
router.post('/topup', authenticateToken, TransactionController.topUp);
router.post('/pay', authenticateToken, TransactionController.payment);
router.post('/transfer', authenticateToken, TransactionController.transfer);
router.get('/transactions', authenticateToken, TransactionController.getTransactions);
router.put('/profile', authenticateToken, ProfileController.updateProfile);

module.exports = router;
