const UserModel = require('../models/userModel');
const TransactionModel = require('../models/transactionModel');
const asyncHandler = require('../utils/asyncHandler');
const { ValidationError, InsufficientBalanceError, NotFoundError } = require('../utils/customErrors');
const { v4: uuidv4 } = require('uuid');

class TransactionController {
    static topUp = asyncHandler(async (req, res) => {
        const { amount } = req.body;
        const user_id = req.user.user_id;

        // Validate amount
        if (!amount || amount <= 0) {
            throw new ValidationError('Invalid amount');
        }

        // Validate amount is a number
        if (isNaN(amount)) {
            throw new ValidationError('Amount must be a number');
        }

        const user = await UserModel.findById(user_id);
        if (!user) {
            throw new NotFoundError('User not found');
        }

        const balance_before = parseFloat(user.balance);
        
        await UserModel.updateBalance(user_id, amount, true);
        const balance_after = balance_before + parseFloat(amount);

        const transaction = await TransactionModel.create({
            user_id,
            transaction_type: 'CREDIT',
            amount,
            remarks: '',
            balance_before,
            balance_after,
            target_user_id: null
        });

        res.status(200).json({
            status: 'SUCCESS',
            result: {
                top_up_id: transaction.transaction_id,
                amount_top_up: parseFloat(amount),
                balance_before,
                balance_after,
                created_date: transaction.created_date
            }
        });
    });

    static payment = asyncHandler(async (req, res) => {
        const { amount, remarks } = req.body;
        const user_id = req.user.user_id;

        // Validate amount
        if (!amount || amount <= 0) {
            throw new ValidationError('Invalid amount');
        }

        // Validate amount is a number
        if (isNaN(amount)) {
            throw new ValidationError('Amount must be a number');
        }

        const user = await UserModel.findById(user_id);
        if (!user) {
            throw new NotFoundError('User not found');
        }

        const balance_before = parseFloat(user.balance);

        if (balance_before < amount) {
            throw new InsufficientBalanceError('Balance is not enough');
        }

        await UserModel.updateBalance(user_id, amount, false);
        const balance_after = balance_before - parseFloat(amount);

        const transaction = await TransactionModel.create({
            user_id,
            transaction_type: 'DEBIT',
            amount,
            remarks: remarks || '',
            balance_before,
            balance_after,
            target_user_id: null
        });

        res.status(200).json({
            status: 'SUCCESS',
            result: {
                payment_id: transaction.transaction_id,
                amount: parseFloat(amount),
                remarks: remarks || '',
                balance_before,
                balance_after,
                created_date: transaction.created_date
            }
        });
    });

    static transfer = asyncHandler(async (req, res) => {
        const { target_user, amount, remarks } = req.body;
        const user_id = req.user.user_id;

        // Validate amount
        if (!amount || amount <= 0) {
            throw new ValidationError('Invalid amount');
        }

        // Validate amount is a number
        if (isNaN(amount)) {
            throw new ValidationError('Amount must be a number');
        }

        // Validate target user
        if (!target_user) {
            throw new ValidationError('Target user is required');
        }

        // Prevent self-transfer
        if (user_id === target_user) {
            throw new ValidationError('Cannot transfer to yourself');
        }

        const user = await UserModel.findById(user_id);
        if (!user) {
            throw new NotFoundError('User not found');
        }

        const balance_before = parseFloat(user.balance);

        if (balance_before < amount) {
            throw new InsufficientBalanceError('Balance is not enough');
        }

        const targetUser = await UserModel.findById(target_user);
        if (!targetUser) {
            throw new NotFoundError('Target user not found');
        }

        const transfer_id = uuidv4();

        // Deduct from sender first
        await UserModel.updateBalance(user_id, amount, false);
        const balance_after = balance_before - parseFloat(amount);

        console.log('Creating DEBIT transaction for TRANSFER (sender)...', {
            user_id,
            amount,
            target_user_id: target_user
        });

        // Create debit transaction for sender
        const transaction = await TransactionModel.create({
            user_id,
            transaction_type: 'DEBIT',
            amount,
            remarks: remarks || '',
            balance_before,
            balance_after,
            target_user_id: target_user
        });

        console.log('Transfer DEBIT transaction created:', transaction.transaction_id);
        
        // VERIFY: Query database to confirm transaction exists
        const pool = require('../config/database');
        const verifyQuery = await pool.query(
            'SELECT transaction_id, transaction_type, amount FROM transactions WHERE transaction_id = $1',
            [transaction.transaction_id]
        );
        console.log('DATABASE VERIFICATION - Transaction exists:', verifyQuery.rows);

        // Add to queue for BACKGROUND processing
        await TransactionModel.addToQueue({
            transfer_id: transfer_id,
            from_user_id: user_id,
            to_user_id: target_user,
            amount: parseFloat(amount),
            remarks: remarks || ''
        });

        console.log('Transfer added to queue:', transfer_id);

        res.status(200).json({
            status: 'SUCCESS',
            result: {
                transfer_id: transaction.transaction_id,
                amount: parseFloat(amount),
                remarks: remarks || '',
                balance_before,
                balance_after,
                created_date: transaction.created_date
            }
        });
    });

    static getTransactions = asyncHandler(async (req, res) => {
        const user_id = req.user.user_id;
        const transactions = await TransactionModel.getByUserId(user_id);

        res.status(200).json({
            status: 'SUCCESS',
            result: transactions
        });
    });
}

module.exports = TransactionController;
