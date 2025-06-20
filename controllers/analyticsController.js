const Order = require('../models/Order');
const User = require('../models/User');
const Product = require('../models/Product');

exports.dashboard = async (req, res) => {
    try {
        // Basic metrics
        const totalOrders = await Order.countDocuments();
        const totalRevenue = await Order.aggregate([
            { $group: { _id: null, total: { $sum: "$total" } } }
        ]);

        // Product analytics
        const mostSoldProduct = await Order.aggregate([
            { $unwind: "$items" },
            { 
                $group: { 
                    _id: "$items.product", 
                    count: { $sum: "$items.quantity" },
                    revenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } }
                } 
            },
            { $sort: { count: -1 } },
            { $limit: 1 }
        ]);

        // Get product details for most sold item
        const productDetails = mostSoldProduct[0]?._id ? 
            await Product.findById(mostSoldProduct[0]._id).select('name image') :
            null;

        // User analytics
        const recentUsers = await User.find()
            .select('name email createdAt')
            .sort({ createdAt: -1 })
            .limit(5);

        const totalUsers = await User.countDocuments();
        
        // Monthly sales analytics
        const monthlySales = await Order.aggregate([
            {
                $group: {
                    _id: { $month: "$createdAt" },
                    total: { $sum: "$total" },
                    count: { $sum: 1 },
                    avgOrderValue: { $avg: "$total" }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // Calculate key metrics
        const currentMonth = new Date().getMonth() + 1;
        const thisMonthSales = monthlySales.find(m => m._id === currentMonth)?.total || 0;
        const lastMonthSales = monthlySales.find(m => m._id === (currentMonth === 1 ? 12 : currentMonth - 1))?.total || 0;
        const growthRate = lastMonthSales ? ((thisMonthSales - lastMonthSales) / lastMonthSales * 100).toFixed(1) : 0;

        const averageOrderValue = totalOrders ? (totalRevenue[0]?.total || 0) / totalOrders : 0;

        res.render('admin/analytics', {
            totalOrders,
            totalRevenue: totalRevenue[0]?.total || 0,
            mostSoldProduct: {
                ...productDetails?.toObject(),
                count: mostSoldProduct[0]?.count || 0,
                revenue: mostSoldProduct[0]?.revenue || 0
            },
            recentUsers,
            monthlySales,
            metrics: {
                totalUsers,
                growthRate,
                averageOrderValue,
                thisMonthSales,
                lastMonthSales
            }
        });
    } catch (error) {
        console.error('Analytics Error:', error);
        res.status(500).render('error', { 
            error: 'Failed to load analytics dashboard',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });    }
};