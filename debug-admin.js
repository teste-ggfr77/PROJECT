require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./config/db');

const debugAdmin = async () => {
    try {
        await connectDB();
        const User = require('./models/User');
        
        console.log('Looking for admin users...');
        const adminUsers = await User.find({ isAdmin: true });
        
        if (adminUsers.length === 0) {
            console.log('No admin users found in the database');
        } else {
            console.log('Found admin users:');
            adminUsers.forEach(admin => {
                console.log(`- Email: ${admin.email}, Name: ${admin.name}, IsAdmin: ${admin.isAdmin}`);
            });
        }
        
        process.exit(0);    } catch (error) {
        console.error('Error details:', {
            message: error.message,
            stack: error.stack
        });
        process.exit(1);
    }
};

debugAdmin();
