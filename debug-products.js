const mongoose = require('mongoose');
const Product = require('./models/Product');

async function checkProducts() {
    try {
        await mongoose.connect('mongodb+srv://hh1889748:697Bvs8dy55jB7YI@cluster0.4hbschb.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0');
        console.log('Connected to MongoDB');
        
        const products = await Product.find();
        console.log('Total products:', products.length);
        if (products.length > 0) {
            console.log('Sample product:', JSON.stringify(products[0], null, 2));
        } else {
            console.log('No products found in database');
        }
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

checkProducts();
