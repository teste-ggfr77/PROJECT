require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const Product = require('./models/Product');
const Order = require('./models/Order');
const User = require('./models/User');

async function debugStats() {
    try {
        console.log('Connecting to database...');
        await connectDB();
        
        // Get counts
        const [totalProducts, totalOrders, totalUsers, totalRevenueAgg] = await Promise.all([
            Product.countDocuments(),
            Order.countDocuments(),
            User.countDocuments(),
            Order.aggregate([
                { $group: { _id: null, total: { $sum: "$total" } } }
            ])
        ]);

        console.log('\nDatabase Statistics:');
        console.log('------------------');
        console.log('Total Products:', totalProducts);
        console.log('Total Orders:', totalOrders);
        console.log('Total Users:', totalUsers);
        console.log('Total Revenue:', totalRevenueAgg[0]?.total || 0);

        // Sample data from each collection
        console.log('\nSample Products:');
        const products = await Product.find().limit(2);
        console.log(JSON.stringify(products, null, 2));

        console.log('\nSample Orders:');
        const orders = await Order.find().limit(2);
        console.log(JSON.stringify(orders, null, 2));

        console.log('\nSample Users:');
        const users = await User.find().limit(2);
        console.log(JSON.stringify(users, null, 2));

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\nDatabase connection closed');
    }
}

debugStats();
