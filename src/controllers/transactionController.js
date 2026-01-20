const UserModel = require('../models/userModel');
const TransactionModel = require('../models/transactionModel');
const { addTransferJob } = require('../queues/transferQueue');
const { v4: uuidv4 } = require('uuid');

class TransactionController {
    static async topUp(req, res) {
        try {
            const { amount } = req.body;
            const user_id = req.user.user_id;

            // Validate amount
            if (!amount || amount <= 0) {
                return res.status(400).json({ message: 'Invalid amount' });
            }

            const user = await UserModel.findById(user_id);
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
        } catch (error) {
            console.error('Top up error:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }

    static async payment(req, res) {
        try {
            const { amount, remarks } = req.body;
            const user_id = req.user.user_id;

            // Validate amount
            if (!amount || amount <= 0) {
                return res.status(400).json({ message: 'Invalid amount' });
            }

            const user = await UserModel.findById(user_id);
            const balance_before = parseFloat(user.balance);

            if (balance_before < amount) {
                return res.status(400).json({ message: 'Balance is not enough' });
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
        } catch (error) {
            console.error('Payment error:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }

    static async transfer(req, res) {
        try {
            const { target_user, amount, remarks } = req.body;
            const user_id = req.user.user_id;

            // Validate amount
            if (!amount || amount <= 0) {
                return res.status(400).json({ message: 'Invalid amount' });
            }

            // Validate target user
            if (!target_user) {
                return res.status(400).json({ message: 'Target user is required' });
            }

            // Prevent self-transfer
            if (user_id === target_user) {
                return res.status(400).json({ message: 'Cannot transfer to yourself' });
            }

            const user = await UserModel.findById(user_id);
            const balance_before = parseFloat(user.balance);

            if (balance_before < amount) {
                return res.status(400).json({ message: 'Balance is not enough' });
            }

            const targetUser = await UserModel.findById(target_user);
            if (!targetUser) {
                return res.status(400).json({ message: 'Target user not found' });
            }

            const transfer_id = uuidv4();

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

            // Add to queue for background processing (credit to receiver)
            await addTransferJob({
                transfer_id: transaction.transaction_id,
                from_user_id: user_id,
                to_user_id: target_user,
                amount: parseFloat(amount),
                remarks: remarks || ''
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
        } catch (error) {
            console.error('Transfer error:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }

    static async getTransactions(req, res) {
        try {
            const user_id = req.user.user_id;
            const transactions = await TransactionModel.getByUserId(user_id);

            res.status(200).json({
                status: 'SUCCESS',
                result: transactions
            });
        } catch (error) {
            console.error('Get transactions error:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }
}

module.exports = TransactionController;
