const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.DATABASE_URL, {
            dbName: 'ecommerce',
            useNewUrlParser: true,
            useUnifiedTopology: true,
            retryWrites: true,
            ssl: true,
            tls: true,
            tlsAllowInvalidCertificates: false,
            tlsAllowInvalidHostnames: false,
            minPoolSize: 1,
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 10000,
            heartbeatFrequencyMS: 5000,
            retryReads: true,
            w: 'majority'
        });
        
        // Add connection event handlers
        mongoose.connection.on('connected', () => {
            console.log('MongoDB connected successfully to database:', conn.connection.name);
        });

        mongoose.connection.on('error', (err) => {
            console.error('MongoDB connection error:', err);
        });

        mongoose.connection.on('disconnected', () => {
            console.log('MongoDB disconnected');
        });

        // Handle process termination
        process.on('SIGINT', async () => {
            await mongoose.connection.close();
            console.log('MongoDB connection closed through app termination');
            process.exit(0);
        });

        return conn;
    } catch (err) {
        console.error('MongoDB connection error:', err.message);
        console.log('Please make sure:');
        console.log('1. Your MongoDB Atlas cluster is running');
        console.log('2. Your IP address is whitelisted in MongoDB Atlas');
        console.log('3. Your connection string in .env is correct');
        console.log('4. Your network connection is stable');
        process.exit(1);
    }
};

module.exports = connectDB;