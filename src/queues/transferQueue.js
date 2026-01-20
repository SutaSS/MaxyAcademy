const Queue = require('bull');
const TransferService = require('../services/transferService');

const transferQueue = new Queue('transfer', process.env.REDIS_URL || 'redis://127.0.0.1:6379', {
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 2000
        },
        removeOnComplete: false,
        removeOnFail: false
    }
});

// Process transfer jobs
transferQueue.process(async (job) => {
    console.log(`Processing transfer job ${job.id}:`, job.data);
    
    try {
        const result = await TransferService.processTransfer(job.data);
        console.log(`Transfer job ${job.id} completed successfully`);
        return result;
    } catch (error) {
        console.error(`Transfer job ${job.id} failed:`, error.message);
        throw error;
    }
});

// Event listeners
transferQueue.on('completed', (job, result) => {
    console.log(`✓ Job ${job.id} completed with result:`, result);
});

transferQueue.on('failed', (job, err) => {
    console.error(`✗ Job ${job.id} failed with error:`, err.message);
});

transferQueue.on('stalled', (job) => {
    console.warn(`⚠ Job ${job.id} has stalled`);
});

const addTransferJob = async (transferData) => {
    try {
        const job = await transferQueue.add(transferData);
        console.log(`Transfer job ${job.id} added to queue`);
        return job;
    } catch (error) {
        console.error('Error adding transfer job to queue:', error);
        throw error;
    }
};

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('Closing transfer queue...');
    await transferQueue.close();
});

module.exports = { transferQueue, addTransferJob };
