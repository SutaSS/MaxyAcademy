const UserModel = require('../models/userModel');
const jwt = require('jsonwebtoken');
const asyncHandler = require('../utils/asyncHandler');
const { ValidationError, ConflictError, AuthenticationError } = require('../utils/customErrors');

class AuthController {
    static register = asyncHandler(async (req, res) => {
        const { first_name, last_name, phone_number, address, pin } = req.body;

        // Validate required fields
        if (!first_name || !last_name || !phone_number || !pin) {
            throw new ValidationError('All required fields must be provided');
        }

        // Validate phone number format
        if (!/^[0-9]{10,15}$/.test(phone_number)) {
            throw new ValidationError('Invalid phone number format');
        }

        // Validate PIN format (should be 6 digits)
        if (!/^[0-9]{6}$/.test(pin)) {
            throw new ValidationError('PIN must be 6 digits');
        }

        // Check if user already exists
        const existingUser = await UserModel.findByPhoneNumber(phone_number);
        if (existingUser) {
            throw new ConflictError('Phone Number already registered');
        }

        const user = await UserModel.create({ first_name, last_name, phone_number, address, pin });

        res.status(200).json({
            status: 'SUCCESS',
            result: user
        });
    });

    static login = asyncHandler(async (req, res) => {
        const { phone_number, pin } = req.body;

        // Validate required fields
        if (!phone_number || !pin) {
            throw new ValidationError('Phone number and pin are required');
        }

        const isValid = await UserModel.verifyPin(phone_number, pin);
        if (!isValid) {
            throw new AuthenticationError("Phone number and pin doesn't match.");
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
    });
}

module.exports = AuthController;
