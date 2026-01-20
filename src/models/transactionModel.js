const pool = require('../config/database');

class TransactionModel {
    static async create(transactionData) {
        const { user_id, transaction_type, amount, remarks, balance_before, balance_after, target_user_id } = transactionData;
        
        const query = `
            INSERT INTO transactions (user_id, transaction_type, amount, remarks, balance_before, balance_after, target_user_id, status)
            VALUES ($1, $2, $3, $4, $5, $6, $7, 'SUCCESS')
            RETURNING *
        `;
        
        const result = await pool.query(query, [user_id, transaction_type, amount, remarks || '', balance_before, balance_after, target_user_id]);
        return result.rows[0];
    }

    static async getByUserId(user_id) {
        const query = `
            SELECT 
                CASE 
                    WHEN transaction_type = 'DEBIT' AND target_user_id IS NOT NULL THEN transaction_id
                    ELSE NULL
                END as transfer_id,
                CASE 
                    WHEN transaction_type = 'DEBIT' AND target_user_id IS NULL THEN transaction_id
                    ELSE NULL
                END as payment_id,
                CASE 
                    WHEN transaction_type = 'CREDIT' AND target_user_id IS NULL THEN transaction_id
                    ELSE NULL
                END as top_up_id,
                status,
                user_id,
                transaction_type,
                amount,
                remarks,
                balance_before,
                balance_after,
                created_date
            FROM transactions
            WHERE user_id = $1
            ORDER BY created_date DESC
        `;
        
        const result = await pool.query(query, [user_id]);
        return result.rows;
    }

    static async addToQueue(transferData) {
        const { transfer_id, from_user_id, to_user_id, amount, remarks } = transferData;
        
        const query = `
            INSERT INTO transfer_queue (transfer_id, from_user_id, to_user_id, amount, remarks)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `;
        
        const result = await pool.query(query, [transfer_id, from_user_id, to_user_id, amount, remarks || '']);
        return result.rows[0];
    }

    static async updateQueueStatus(transfer_id, status) {
        const query = `
            UPDATE transfer_queue 
            SET status = $1, processed_date = CURRENT_TIMESTAMP
            WHERE transfer_id = $2
            RETURNING *
        `;
        
        const result = await pool.query(query, [status, transfer_id]);
        return result.rows[0];
    }

    static async incrementRetryCount(transfer_id) {
        const query = `
            UPDATE transfer_queue 
            SET retry_count = retry_count + 1, status = 'FAILED'
            WHERE transfer_id = $1
            RETURNING *
        `;
        
        const result = await pool.query(query, [transfer_id]);
        return result.rows[0];
    }
}

module.exports = TransactionModel;
