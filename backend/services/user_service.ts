import User, { UserRole } from '../models/User';

interface CreateUserParams {
    nameID: string;
    username?: string;
    email?: string;
    firstName?: string;
    lastName?: string;
    role: UserRole;
    groups?: string[];
}

// Create a new user
export const createUser = async (params: CreateUserParams) => {
    try {
        const user = new User({
            nameID: params.nameID,
            username: params.username || 'guest',
            email: params.email || 'guest@localhost',
            firstName: params.firstName || 'Guest',
            lastName: params.lastName || 'User',
            role: params.role,
            groups: params.groups || []
        });
        return await user.save();
    } catch (error) {
        console.error('Error creating user:', error);
        return null;
    }
};

export const getUserbynameID = async (nameID: string) => {
    try {
        return await User.findOne({ nameID });
    } catch (error) {
        console.error('Error finding user:', error);
        return null;
    }
};

// Read a user by ID
export const getUserById = async (id: string) => {
    try {
        const user = await User.findById(id);
        if (!user) {
            throw new Error('User not found');
        }
        return user;
    } catch (error:any) {
        throw new Error(`Error fetching user: ${error.message}`);
    }
};

// Update a user by ID
export const updateUserById = async (id: string, updateData: any) => {
    try {
        const user = await User.findByIdAndUpdate(id, updateData, { new: true });
        if (!user) {
            throw new Error('User not found');
        }
        return user;
    } catch (error:any) {
        throw new Error(`Error updating user: ${error.message}`);
    }
};

export const updateUserBynameID = async (nameID: string, updateData: Partial<CreateUserParams>) => {
    try {
        const user = await User.findOne({nameID});
        if (!user) {
            throw new Error('User not found');
        }
        if (updateData.username) user.username = updateData.username;
        if (updateData.email) user.email = updateData.email;
        if (updateData.firstName) user.firstName = updateData.firstName;
        if (updateData.lastName) user.lastName = updateData.lastName;
        if (updateData.groups) user.groups = updateData.groups;
        if (updateData.role) user.role = updateData.role;
        user.updated = new Date();
        await user.save();
        return user;
    } catch (error:any) {
        throw new Error(`Error updating user: ${error.message}`);
    }
}

// Delete a user by ID
export const deleteUserById = async (id: string) => {
    try {
        const user = await User.findByIdAndDelete(id);
        if (!user) {
            throw new Error('User not found');
        }
        return user;
    } catch (error:any) {
        throw new Error(`Error deleting user: ${error.message}`);
    }
};