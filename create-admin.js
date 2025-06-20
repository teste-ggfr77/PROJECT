const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

// User schema (simplified)
const userSchema = new mongoose.Schema({
    name: String,
    email: String,
    password: String,
    isAdmin: { type: Boolean, default: false }
});

const User = mongoose.model('User', userSchema);

async function createAdmin() {
    try {
        // Check if admin already exists
        const existingAdmin = await User.findOne({ email: 'admin@example.com' });
        
        if (existingAdmin) {
            console.log('Admin user already exists');
            console.log('Email: admin@example.com');
            console.log('Password: admin123');
            process.exit(0);
        }

        // Create admin user
        const hashedPassword = await bcrypt.hash('admin123', 10);
        
        const admin = new User({
            name: 'Admin User',
            email: 'admin@example.com',
            password: hashedPassword,
            isAdmin: true
        });

        await admin.save();
        
        console.log('Admin user created successfully!');
        console.log('Email: admin@example.com');
        console.log('Password: admin123');
        console.log('You can now log in at /admin/login');
        
    } catch (error) {
        console.error('Error creating admin user:', error);
    } finally {
        mongoose.connection.close();
    }
}

createAdmin();