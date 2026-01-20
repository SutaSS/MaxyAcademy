const UserModel = require('../models/userModel');
const jwt = require('jsonwebtoken');

class AuthController {
    static async register(req, res) {
        try {
            const { first_name, last_name, phone_number, address, pin } = req.body;

            // Validate required fields
            if (!first_name || !last_name || !phone_number || !pin) {
                return res.status(400).json({ message: 'All required fields must be provided' });
            }

            // Check if user already exists
            const existingUser = await UserModel.findByPhoneNumber(phone_number);
            if (existingUser) {
                return res.status(400).json({ message: 'Phone Number already registered' });
            }

            const user = await UserModel.create({ first_name, last_name, phone_number, address, pin });

            res.status(200).json({
                status: 'SUCCESS',
                result: user
            });
        } catch (error) {
            console.error('Register error:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }

    static async login(req, res) {
        try {
            const { phone_number, pin } = req.body;

            // Validate required fields
            if (!phone_number || !pin) {
                return res.status(400).json({ message: 'Phone number and pin are required' });
            }

            const isValid = await UserModel.verifyPin(phone_number, pin);
            if (!isValid) {
                return res.status(400).json({ message: "Phone number and pin doesn't match." });
            }

            const user = await UserModel.findByPhoneNumber(phone_number);

            const access_token = jwt.sign(
                { user_id: user.user_id, phone_number: user.phone_number },
                process.env.JWT_SECRET,
                { expiresIn: process.env.JWT_EXPIRES_IN }
            );

            const refresh_token = jwt.sign(
                { user_id: user.user_id },
                process.env.JWT_SECRET,
                { expiresIn: '7d' }
            );

            res.status(200).json({
                status: 'SUCCESS',
                result: {
                    access_token,
                    refresh_token
                }
            });
        } catch (error) {
            console.error('Login error:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }
}

module.exports = AuthController;
