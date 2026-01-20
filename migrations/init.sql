-- Users Table
CREATE TABLE IF NOT EXISTS users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone_number VARCHAR(15) UNIQUE NOT NULL,
    address TEXT,
    pin VARCHAR(255) NOT NULL,
    balance DECIMAL(15,2) DEFAULT 0,
    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Transactions Table
CREATE TABLE IF NOT EXISTS transactions (
    transaction_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(user_id),
    transaction_type VARCHAR(20) NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    remarks TEXT,
    balance_before DECIMAL(15,2) NOT NULL,
    balance_after DECIMAL(15,2) NOT NULL,
    target_user_id UUID REFERENCES users(user_id),
    status VARCHAR(20) DEFAULT 'SUCCESS',
    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Transfer Queue Table
CREATE TABLE IF NOT EXISTS transfer_queue (
    queue_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transfer_id UUID,
    from_user_id UUID REFERENCES users(user_id),
    to_user_id UUID,
    amount DECIMAL(15,2) NOT NULL,
    remarks TEXT,
    status VARCHAR(20) DEFAULT 'PENDING',
    retry_count INT DEFAULT 0,
    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_date TIMESTAMP
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_phone ON users(phone_number);
CREATE INDEX IF NOT EXISTS idx_transaction_user ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transaction_date ON transactions(created_date);
CREATE INDEX IF NOT EXISTS idx_queue_status ON transfer_queue(status);
CREATE INDEX IF NOT EXISTS idx_queue_created ON transfer_queue(created_date);
