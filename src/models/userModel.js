const pool = require('../config/database');
const bcrypt = require('bcryptjs');

class UserModel {
    static async create(userData) {
        const { first_name, last_name, phone_number, address, pin } = userData;
        const hashedPin = await bcrypt.hash(pin, 10);
        
        const query = `
            INSERT INTO users (first_name, last_name, phone_number, address, pin)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING user_id, first_name, last_name, phone_number, address, created_date
        `;
        
        const result = await pool.query(query, [first_name, last_name, phone_number, address, hashedPin]);
        return result.rows[0];
    }

    static async findByPhoneNumber(phone_number) {
        const query = 'SELECT * FROM users WHERE phone_number = $1';
        const result = await pool.query(query, [phone_number]);
        return result.rows[0];
    }

    static async findById(user_id) {
        const query = 'SELECT * FROM users WHERE user_id = $1';
        const result = await pool.query(query, [user_id]);
        return result.rows[0];
    }

    static async updateProfile(user_id, updateData) {
        const { first_name, last_name, address } = updateData;
        const query = `
            UPDATE users 
            SET first_name = $1, last_name = $2, address = $3, updated_date = CURRENT_TIMESTAMP
            WHERE user_id = $4
            RETURNING user_id, first_name, last_name, address, updated_date
        `;
        
        const result = await pool.query(query, [first_name, last_name, address, user_id]);
        return result.rows[0];
    }

    static async updateBalance(user_id, amount, isCredit = true) {
        const operator = isCredit ? '+' : '-';
        const query = `
            UPDATE users 
            SET balance = balance ${operator} $1
            WHERE user_id = $2
            RETURNING balance
        `;
        
        const result = await pool.query(query, [amount, user_id]);
        return result.rows[0];
    }

    static async verifyPin(phone_number, pin) {
        const user = await this.findByPhoneNumber(phone_number);
        if (!user) return false;
        
        return await bcrypt.compare(pin, user.pin);
    }

    static async getBalanceWithLock(client, user_id) {
        const query = 'SELECT balance FROM users WHERE user_id = $1 FOR UPDATE';
        const result = await client.query(query, [user_id]);
        return result.rows[0];
    }
}

module.exports = UserModel;
