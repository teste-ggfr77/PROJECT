// Script to remove the default admin@example.com user
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');

const email = 'admin@example.com';

async function removeDefaultAdmin() {
    await connectDB();
    const user = await User.findOne({ email });
    if (user) {
        await User.deleteOne({ email });
        console.log('Removed user with email:', email);
    } else {
        console.log('No user found with email:', email);
    }
    mongoose.connection.close();
}

removeDefaultAdmin().catch(err => {
    console.error('Error removing user:', err);
    mongoose.connection.close();
});
