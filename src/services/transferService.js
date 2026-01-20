const pool = require('../config/database');
const UserModel = require('../models/userModel');
const TransactionModel = require('../models/transactionModel');

class TransferService {
    static async processTransfer(transferData) {
        const { transfer_id, from_user_id, to_user_id, amount, remarks } = transferData;
        
        const client = await pool.connect();
        
        try {
            await client.query('BEGIN');

            // Add to queue table
            await TransactionModel.addToQueue({
                transfer_id,
                from_user_id,
                to_user_id,
                amount,
                remarks
            });

            // Get target user with lock
            const targetUser = await client.query(
                'SELECT balance FROM users WHERE user_id = $1 FOR UPDATE',
                [to_user_id]
            );

            if (targetUser.rows.length === 0) {
                throw new Error('Target user not found');
            }

            const target_balance_before = parseFloat(targetUser.rows[0].balance);

            // Update target user balance
            await client.query(
                'UPDATE users SET balance = balance + $1 WHERE user_id = $2',
                [amount, to_user_id]
            );

            const target_balance_after = target_balance_before + parseFloat(amount);

            // Create credit transaction for target user
            await client.query(
                `INSERT INTO transactions (user_id, transaction_type, amount, remarks, balance_before, balance_after, target_user_id, status)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, 'SUCCESS')`,
                [to_user_id, 'CREDIT', amount, remarks, target_balance_before, target_balance_after, from_user_id]
            );

            // Update queue status
            await client.query(
                'UPDATE transfer_queue SET status = $1, processed_date = CURRENT_TIMESTAMP WHERE transfer_id = $2',
                ['SUCCESS', transfer_id]
            );

            await client.query('COMMIT');

            return { success: true, transfer_id };
        } catch (error) {
            await client.query('ROLLBACK');
            
            // Log error and update retry count
            console.error('Transfer processing error:', error);
            
            await TransactionModel.incrementRetryCount(transfer_id);
            
            throw error;
        } finally {
            client.release();
        }
    }
}

module.exports = TransferService;
