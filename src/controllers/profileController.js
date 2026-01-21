const UserModel = require('../models/userModel');
const asyncHandler = require('../utils/asyncHandler');
const { ValidationError, NotFoundError } = require('../utils/customErrors');

class ProfileController {
    static updateProfile = asyncHandler(async (req, res) => {
        const { first_name, last_name, address } = req.body;
        const user_id = req.user.user_id;

        // Validate at least one field is provided
        if (!first_name && !last_name && !address) {
            throw new ValidationError('At least one field must be provided for update');
        }

        // Get current user data
        const currentUser = await UserModel.findById(user_id);
        if (!currentUser) {
            throw new NotFoundError('User not found');
        }

        // Use current values if not provided
        const updateData = {
            first_name: first_name || currentUser.first_name,
            last_name: last_name || currentUser.last_name,
            address: address !== undefined ? address : currentUser.address
        };

        const updatedUser = await UserModel.updateProfile(user_id, updateData);

        res.status(200).json({
            status: 'SUCCESS',
            result: updatedUser
        });
    });
}

module.exports = ProfileController;
