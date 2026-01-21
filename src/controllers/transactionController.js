const UserModel = require('../models/userModel');
const TransactionModel = require('../models/transactionModel');
const asyncHandler = require('../utils/asyncHandler');
const { ValidationError, InsufficientBalanceError, NotFoundError } = require('../utils/customErrors');

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

        // Deduct from sender first
        await UserModel.updateBalance(user_id, amount, false);
        const balance_after = balance_before - parseFloat(amount);

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

        // Credit to receiver directly (without queue)
        const target_balance_before = parseFloat(targetUser.balance);
        await UserModel.updateBalance(target_user, amount, true);
        const target_balance_after = target_balance_before + parseFloat(amount);

        // Create credit transaction for receiver
        await TransactionModel.create({
            user_id: target_user,
            transaction_type: 'CREDIT',
            amount,
            remarks: remarks || '',
            balance_before: target_balance_before,
            balance_after: target_balance_after,
            target_user_id: user_id
        });

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
