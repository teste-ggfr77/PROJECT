// Script to create an admin user with the specified email and password
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const connectDB = require('../config/db');
const User = require('../models/User');

const email = 'sabils@admin.pt';
const password = 'e0KWp$Rtm.047+=eXdrsYN@';
const name = 'Admin';

async function createAdmin() {
    await connectDB();
    const existing = await User.findOne({ email });
    if (existing) {
        if (!existing.isAdmin) {
            existing.isAdmin = true;
            existing.password = await bcrypt.hash(password, 10);
            await existing.save();
            console.log('Existing user updated to admin.');
        } else {
            console.log('Admin user already exists.');
        }
        mongoose.connection.close();
        return;
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const admin = new User({
        name,
        email,
        password: hashedPassword,
        isAdmin: true
    });
    await admin.save();
    console.log('Admin user created successfully.');
    mongoose.connection.close();
}

createAdmin().catch(err => {
    console.error('Error creating admin user:', err);
    mongoose.connection.close();
});
