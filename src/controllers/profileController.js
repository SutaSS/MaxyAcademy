const UserModel = require('../models/userModel');

class ProfileController {
    static async updateProfile(req, res) {
        try {
            const { first_name, last_name, address } = req.body;
            const user_id = req.user.user_id;

            // Validate at least one field is provided
            if (!first_name && !last_name && !address) {
                return res.status(400).json({ message: 'At least one field must be provided for update' });
            }

            // Get current user data
            const currentUser = await UserModel.findById(user_id);
            if (!currentUser) {
                return res.status(404).json({ message: 'User not found' });
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
        } catch (error) {
            console.error('Update profile error:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }
}

module.exports = ProfileController;
