const pool = require('../config/database');

class DashboardController {
    // Get all transactions statistics
    static async getAllTransactionsStats(req, res) {
        try {
            const query = `
                SELECT 
                    COUNT(*) FILTER (WHERE transaction_type = 'CREDIT' AND target_user_id IS NULL) as topup_count,
                    COUNT(*) FILTER (WHERE transaction_type = 'CREDIT' AND target_user_id IS NOT NULL) as transfer_in_count,
                    COUNT(*) FILTER (WHERE transaction_type = 'DEBIT' AND target_user_id IS NULL) as payment_count,
                    COUNT(*) FILTER (WHERE transaction_type = 'DEBIT' AND target_user_id IS NOT NULL) as transfer_out_count,
                    COUNT(*) as total,
                    SUM(CASE WHEN transaction_type = 'CREDIT' THEN amount ELSE 0 END) as total_credit,
                    SUM(CASE WHEN transaction_type = 'DEBIT' THEN amount ELSE 0 END) as total_debit
                FROM transactions
            `;
            
            const result = await pool.query(query);
            const stats = result.rows[0];
            
            res.status(200).json({
                status: 'success',
                data: {
                    topup: parseInt(stats.topup_count),
                    transfer_in: parseInt(stats.transfer_in_count),
                    payment: parseInt(stats.payment_count),
                    transfer_out: parseInt(stats.transfer_out_count),
                    total: parseInt(stats.total),
                    total_credit: parseFloat(stats.total_credit || 0),
                    total_debit: parseFloat(stats.total_debit || 0)
                }
            });
        } catch (error) {
            res.status(500).json({
                status: 'error',
                message: error.message
            });
        }
    }
    
    // Get all transactions with details
    static async getAllTransactions(req, res) {
        try {
            const { type, limit = 100 } = req.query;
            
            let query = `
                SELECT 
                    t.transaction_id,
                    t.user_id,
                    u.first_name || ' ' || u.last_name as user_name,
                    t.transaction_type,
                    t.amount,
                    t.remarks,
                    t.balance_before,
                    t.balance_after,
                    t.target_user_id,
                    u2.first_name || ' ' || u2.last_name as target_user_name,
                    t.status,
                    t.created_date,
                    CASE 
                        WHEN t.transaction_type = 'CREDIT' AND t.target_user_id IS NULL THEN 'TOP UP'
                        WHEN t.transaction_type = 'CREDIT' AND t.target_user_id IS NOT NULL THEN 'TRANSFER IN'
                        WHEN t.transaction_type = 'DEBIT' AND t.target_user_id IS NULL THEN 'PAYMENT'
                        WHEN t.transaction_type = 'DEBIT' AND t.target_user_id IS NOT NULL THEN 'TRANSFER OUT'
                        ELSE 'UNKNOWN'
                    END as category
                FROM transactions t
                LEFT JOIN users u ON t.user_id = u.user_id
                LEFT JOIN users u2 ON t.target_user_id = u2.user_id
            `;
            
            const params = [];
            if (type) {
                if (type === 'TOPUP') {
                    query += ` WHERE t.transaction_type = 'CREDIT' AND t.target_user_id IS NULL`;
                } else if (type === 'PAYMENT') {
                    query += ` WHERE t.transaction_type = 'DEBIT' AND t.target_user_id IS NULL`;
                } else if (type === 'TRANSFER') {
                    query += ` WHERE t.target_user_id IS NOT NULL`;
                } else if (type === 'CREDIT' || type === 'DEBIT') {
                    query += ` WHERE t.transaction_type = $1`;
                    params.push(type);
                }
            }
            
            query += ` ORDER BY t.created_date DESC LIMIT $${params.length + 1}`;
            params.push(limit);
            
            const result = await pool.query(query, params);
            
            res.status(200).json({
                status: 'success',
                data: result.rows
            });
        } catch (error) {
            res.status(500).json({
                status: 'error',
                message: error.message
            });
        }
    }
    
    // Get queue statistics
    static async getQueueStats(req, res) {
        try {
            const query = `
                SELECT 
                    COUNT(*) FILTER (WHERE status = 'PENDING') as pending,
                    COUNT(*) FILTER (WHERE status = 'SUCCESS') as success,
                    COUNT(*) FILTER (WHERE status = 'FAILED') as failed,
                    COUNT(*) as total
                FROM transfer_queue
            `;
            
            const result = await pool.query(query);
            const stats = result.rows[0];
            
            res.status(200).json({
                status: 'success',
                data: {
                    pending: parseInt(stats.pending),
                    success: parseInt(stats.success),
                    failed: parseInt(stats.failed),
                    total: parseInt(stats.total)
                }
            });
        } catch (error) {
            res.status(500).json({
                status: 'error',
                message: error.message
            });
        }
    }
    
    // Get recent transfers from queue
    static async getQueueTransfers(req, res) {
        try {
            const { status, limit = 50 } = req.query;
            
            let query = `
                SELECT 
                    tq.transfer_id,
                    tq.from_user_id,
                    u1.first_name || ' ' || u1.last_name as from_user_name,
                    tq.to_user_id,
                    u2.first_name || ' ' || u2.last_name as to_user_name,
                    tq.amount,
                    tq.remarks,
                    tq.status,
                    tq.retry_count,
                    tq.created_date,
                    tq.processed_date
                FROM transfer_queue tq
                LEFT JOIN users u1 ON tq.from_user_id = u1.user_id
                LEFT JOIN users u2 ON tq.to_user_id = u2.user_id
            `;
            
            const params = [];
            if (status) {
                query += ` WHERE tq.status = $1`;
                params.push(status);
            }
            
            query += ` ORDER BY tq.created_date DESC LIMIT $${params.length + 1}`;
            params.push(limit);
            
            const result = await pool.query(query, params);
            
            res.status(200).json({
                status: 'success',
                data: result.rows
            });
        } catch (error) {
            res.status(500).json({
                status: 'error',
                message: error.message
            });
        }
    }
    
    // Retry failed transfer
    static async retryTransfer(req, res) {
        try {
            const { transfer_id } = req.params;
            
            const query = `
                UPDATE transfer_queue 
                SET status = 'PENDING', retry_count = 0
                WHERE transfer_id = $1 AND status = 'FAILED'
                RETURNING *
            `;
            
            const result = await pool.query(query, [transfer_id]);
            
            if (result.rows.length === 0) {
                return res.status(404).json({
                    status: 'error',
                    message: 'Transfer not found or not in FAILED status'
                });
            }
            
            res.status(200).json({
                status: 'success',
                message: 'Transfer queued for retry',
                data: result.rows[0]
            });
        } catch (error) {
            res.status(500).json({
                status: 'error',
                message: error.message
            });
        }
    }
}

module.exports = DashboardController;
