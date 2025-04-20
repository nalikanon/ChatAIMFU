import { connectDB } from '../lib/mongodb';
import User from '../models/User';
import bcrypt from 'bcrypt';

async function createAdminUser() {
  try {
    await connectDB();

    const hashedPassword = await bcrypt.hash('superadmin123', 10);
    
    const adminUser = new User({
      username: 'superadmin',
      password: hashedPassword,
      isAdmin: true,
      groups: ['SuperAdmin'],
      email: 'superadmin@mfu.ac.th',
      firstName: 'Super',
      lastName: 'Admin',
      nameID: 'superadmin',
      role: 'SuperAdmin'
    });

    await adminUser.save();
    console.log('Admin user created successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error creating admin user:', error);
    process.exit(1);
  }
}

createAdminUser(); 