const express = require('express');
const router = express.Router();
const path = require('path');
const AuthController = require('../controllers/authController');
const TransactionController = require('../controllers/transactionController');
const ProfileController = require('../controllers/profileController');
const DashboardController = require('../controllers/dashboardController');
const authenticateToken = require('../middleware/authMiddleware');

// Health check
router.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK', message: 'Server is running' });
});

// Dashboard routes (no auth required for monitoring)
router.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, '../views/dashboard.html'));
});
router.get('/dashboard/stats', DashboardController.getQueueStats);
router.get('/dashboard/transfers', DashboardController.getQueueTransfers);
router.post('/dashboard/retry/:transfer_id', DashboardController.retryTransfer);
// All transactions routes
router.get('/dashboard/all-stats', DashboardController.getAllTransactionsStats);
router.get('/dashboard/all-transactions', DashboardController.getAllTransactions);

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
