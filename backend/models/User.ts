import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

export type UserRole = 'Admin' | 'Staffs' | 'Students' | 'SuperAdmin';

interface IUser extends mongoose.Document {
  nameID: string;
  username: string;
  password?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  role: UserRole;
  department: string;
  groups: string[];
  created: Date;
  updated: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const userSchema = new mongoose.Schema({
  nameID: { type: String, required: true, unique: true },
  username: { type: String, required: true, unique: true },
  password: { type: String },
  email: { type: String, required: true },
  firstName: String,
  lastName: String,
  department: String,
  role: { 
    type: String, 
    enum: ['Admin', 'Staffs', 'Students', 'SuperAdmin'],
    default: 'Students'
  },
  groups: [String],
  created: { type: Date, default: Date.now },
  updated: { type: Date, default: Date.now }
});

// Add comparePassword method to the schema
userSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  if (!this.password) return false;
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    return false;
  }
};

export default mongoose.model<IUser>('User', userSchema);