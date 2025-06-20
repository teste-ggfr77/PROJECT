require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const PromoCode = require('./models/PromoCode');

const debugPromoCodes = async () => {
    try {
        await connectDB();
        console.log('Connected to database');
        
        const promoCodes = await PromoCode.find();
        if (promoCodes.length === 0) {
            console.log('No promo codes found in the database');
        } else {
            console.log('Found promo codes:');
            promoCodes.forEach(promo => {
                console.log(`- Code: ${promo.code}`);
                console.log(`  Type: ${promo.discountType}`);
                console.log(`  Value: ${promo.discountValue}`);
                console.log(`  Expiry: ${promo.expiryDate || 'No expiry'}`);
                console.log(`  Usage: ${promo.usedCount}/${promo.usageLimit}`);
                console.log('---');
            });
        }
        
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

debugPromoCodes();
