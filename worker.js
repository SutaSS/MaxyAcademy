require('dotenv').config();
const pool = require('./src/config/database');
const UserModel = require('./src/models/userModel');
const TransactionModel = require('./src/models/transactionModel');

let isProcessing = false;

// Background worker untuk memproses transfer queue
async function processTransferQueue() {
    if (isProcessing) return;
    
    isProcessing = true;
    
    try {
        // Ambil pending transfers dari queue
        const query = `
            SELECT * FROM transfer_queue 
            WHERE status = 'PENDING' AND retry_count < 3
            ORDER BY created_date ASC
            LIMIT 10
        `;
        
        const result = await pool.query(query);
        const pendingTransfers = result.rows;
        
        if (pendingTransfers.length === 0) {
            console.log(`[${new Date().toISOString()}] No pending transfers`);
            isProcessing = false;
            return;
        }
        
        console.log(`[${new Date().toISOString()}] Processing ${pendingTransfers.length} pending transfer(s)...`);
        
        for (const transfer of pendingTransfers) {
            await processTransfer(transfer);
        }
        
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Error processing queue:`, error.message);
    } finally {
        isProcessing = false;
    }
}

async function processTransfer(transfer) {
    const { transfer_id, from_user_id, to_user_id, amount, remarks } = transfer;
    
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        console.log(`[${new Date().toISOString()}] Processing transfer ${transfer_id}: ${amount} from user ${from_user_id} to ${to_user_id}`);
        
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
        
        // Update queue status to SUCCESS
        await client.query(
            'UPDATE transfer_queue SET status = $1, processed_date = CURRENT_TIMESTAMP WHERE transfer_id = $2',
            ['SUCCESS', transfer_id]
        );
        
        await client.query('COMMIT');
        
        console.log(`[${new Date().toISOString()}] ✓ Transfer ${transfer_id} completed successfully`);
        
    } catch (error) {
        await client.query('ROLLBACK');
        
        console.error(`[${new Date().toISOString()}] ✗ Transfer ${transfer_id} failed:`, error.message);
        
        // Increment retry count
        await pool.query(
            'UPDATE transfer_queue SET retry_count = retry_count + 1, status = CASE WHEN retry_count + 1 >= 3 THEN \'FAILED\' ELSE \'PENDING\' END WHERE transfer_id = $1',
            [transfer_id]
        );
        
    } finally {
        client.release();
    }
}

// Run worker setiap 5 detik
const INTERVAL = 5000; // 5 seconds
console.log(`
╔════════════════════════════════════════╗
║   MaxyAcademy Background Worker        ║
║   Processing transfer queue...         ║
║   Interval: ${INTERVAL/1000}s                         ║
╚════════════════════════════════════════╝
`);

setInterval(processTransferQueue, INTERVAL);

// Process immediately on start
processTransferQueue();

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('\nSIGTERM signal received: closing worker...');
    await pool.end();
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log('\nSIGINT signal received: closing worker...');
    await pool.end();
    process.exit(0);
});
