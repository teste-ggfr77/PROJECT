const Product = require('../models/Product');
const Category = require('../models/Category');
const PageContent = require('../models/PageContent');
const Order = require('../models/Order');
const fs = require('fs');
const path = require('path');

// Get random trending products for search overlay
async function getTrendingProducts() {
    try {
        // Get 6 random products
        const products = await Product.aggregate([
            { $sample: { size: 6 } },
            { $project: {
                name: 1,
                price: 1,
                image: 1
            }}
        ]);
        return products;
    } catch (error) {
        console.error('Error getting trending products:', error);
        return [];
    }
}

exports.homepage = async (req, res) => {
    try {
        console.log('Homepage requested');
        const isPreview = req.query.preview === 'true';
        
        // Fetch page contents - in preview mode, get all contents
        const pageContents = await PageContent.find(
            isPreview ? {} : { isActive: true }
        ).sort('order').lean();
        
        console.log('Found page contents:', pageContents.length);
        
        // Get trending products for the header
        const trendingProducts = await getTrendingProducts();

        // Ensure each content has the required properties
        const processedContents = pageContents.map(content => ({
            ...content,
            spacing: content.spacing || {},
            responsive: content.responsive || {},
            layout: content.layout || 'default',
            animation: content.animation || '',
            customClass: content.customClass || ''
        }));

        // Set headers for preview mode to prevent caching
        if (isPreview) {
            res.setHeader('X-Frame-Options', 'SAMEORIGIN');
            res.setHeader('Cache-Control', 'no-store, must-revalidate');
        }
        
        // Pass the page contents to the view with necessary data
        res.render('index', { 
            pageContents: processedContents,
            trendingProducts,
            title: 'Home',
            isPreview,
            layout: isPreview ? false : 'layouts/main' // Disable layout in preview mode if needed
        });

    } catch (error) {
        console.error('Error in homepage:', error);
        if (req.query.preview === 'true') {
            res.status(500).send('Error loading preview: ' + error.message);
        } else {
            res.render('error', { 
                error: 'Error loading homepage',
                details: process.env.NODE_ENV === 'development' ? error.message : null
            });
        }
    }
};

exports.viewProduct = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) return res.status(404).send("Product not found");

        // Fetch related products based on category and attributes
        const relatedProducts = await Product.find({
            category: product.category,
            _id: { $ne: product._id },
        }).limit(4); // Limit to 4 related products

        // Get trending products for the header
        const trendingProducts = await getTrendingProducts();

        res.render('product-details', { 
            product,
            relatedProducts,
            trendingProducts,
            title: product.name
        });
    } catch (error) {
        console.error('Error viewing product:', error);
        res.status(500).render('error', { error });
    }
};

exports.products = async (req, res) => {
    try {
        console.log('Products page requested');
        
        const page = parseInt(req.query.page) || 1;
        const limit = 12;
        const skip = (page - 1) * limit;
        const sort = req.query.sort || 'newest';

        // Handle multiple category filtering
        let categoryFilter = {};
        if (req.query.category) {
            const categories = req.query.category.split(',');
            categoryFilter = { category: { $in: categories } };
        }

        // Set up sorting options
        let sortOptions = {};
        if (sort === 'price-low') {
            sortOptions.price = 1;
        } else if (sort === 'price-high') {
            sortOptions.price = -1;
        } else { // newest
            sortOptions.createdAt = -1;
        }

        // Get trending products for the header
        const trendingProducts = await getTrendingProducts();

        // Fetch filtered products
        const products = await Product.find(categoryFilter)
            .sort(sortOptions)
            .skip(skip)
            .limit(limit);

        // Get total count for pagination
        const total = await Product.countDocuments(categoryFilter);
        
        // Get all categories
        const categories = await Category.find().sort({ name: 1 });

        if (categories.length === 0) {
            await Category.insertMany([
                { name: 'Electronics' },
                { name: 'Sports' },
                { name: 'Home' }
            ]);
        }

        res.render('products', { 
            products,
            categories: await Category.find().sort({ name: 1 }),
            currentPage: page,
            pages: Math.ceil(total / limit),
            total,
            query: req.query || {},
            sort,
            trendingProducts
        });
    } catch (error) {
        console.error('Error in products page:', error);
        res.status(500).render('error', { error });
    }
};

exports.profile = async (req, res) => {
    if (!req.session.user) {
        return res.redirect('/auth/login');
    }
    
    try {
        const user = req.session.user;
        const orders = await Order.find({ user: user._id })
            .sort({ createdAt: -1 })
            .limit(5);

        res.render('profile', {
            title: 'Your Profile',
            user,
            orders,
            messages: {
                success: req.flash('success'),
                error: req.flash('error')
            }
        });
    } catch (error) {
        console.error('Profile error:', error);
        req.flash('error', 'Error loading profile');
        res.redirect('/');
    }
};

exports.footwear = async (req, res) => {
    try {
        // Get trending products for the header
        const trendingProducts = await getTrendingProducts();
        
        res.render('footwear', {
            title: 'Footwear - Built for Performance',
            trendingProducts
        });
    } catch (error) {
        console.error('Error in footwear page:', error);
        res.status(500).render('error', { error });
    }
};

exports.apparel = async (req, res) => {
    try {
        // Get trending products for the header
        const trendingProducts = await getTrendingProducts();
        
        // Get apparel products from database
        const menApparel = await Product.find({ 
            category: { $regex: /men.*apparel|apparel.*men|men.*tops|men.*shorts|men.*pants|men.*hoodies/i }
        }).limit(8);
        
        const womenApparel = await Product.find({ 
            category: { $regex: /women.*apparel|apparel.*women|women.*tops|women.*leggings|women.*shorts|women.*sports-bras/i }
        }).limit(8);
        
        res.render('apparel', {
            title: 'Apparel - Train Hard, Look Good',
            trendingProducts,
            menApparel,
            womenApparel
        });
    } catch (error) {
        console.error('Error in apparel page:', error);
        res.status(500).render('error', { error });
    }
};

exports.accessories = async (req, res) => {
    try {
        // Get trending products for the header
        const trendingProducts = await getTrendingProducts();
        
        // Get accessories products from database
        const menAccessories = await Product.find({ 
            category: { $regex: /men.*accessories|accessories.*men|men.*bags|men.*caps|men.*belts|men.*gloves/i }
        }).limit(8);
        
        const womenAccessories = await Product.find({ 
            category: { $regex: /women.*accessories|accessories.*women|women.*bags|women.*caps|women.*belts|women.*gloves/i }
        }).limit(8);
        
        res.render('accessories', {
            title: 'Accessories - Complete Your Look',
            trendingProducts,
            menAccessories,
            womenAccessories
        });
    } catch (error) {
        console.error('Error in accessories page:', error);
        res.status(500).render('error', { error });
    }
};

exports.trainers = async (req, res) => {
    try {
        const gender = req.query.gender === 'women' ? 'women' : 'men';
        const category = gender === 'women' ? 'women-trainers' : 'men-trainers';
        const products = await Product.find({ category }).lean();
        res.render('trainers', {
            title: `NOBULL | Footwear Built for Performance: In and Out of the Gym`,
            gender,
            products
        });
    } catch (error) {
        res.status(500).render('error', { error });
    }
};

exports.womenRunning = async (req, res) => {
    try {
        const products = await Product.find({ category: 'women-running' }).lean();
        res.render('running-section', {
            title: "Women's Running",
            products,
            gender: 'women'
        });
    } catch (err) {
        res.status(500).render('error', {
            message: 'Error loading women\'s running products',
            error: { status: 500 }
        });
    }
};

exports.running = async (req, res) => {
    const gender = req.params.gender;
    let category;
    
    if (gender === 'women') {
        category = 'women-running';
    } else if (gender === 'men' || gender === 'man') {
        category = 'men-running';
    } else {
        return res.status(404).render('error', { message: 'Section not found', error: { status: 404 } });
    }
    try {
        const products = await Product.find({ category }).lean();
        res.render('running-section', {
            title: `${gender === 'women' ? "Women's" : "Men's"} Running`,
            products,
            gender: gender === 'women' ? 'women' : 'men'
        });
    } catch (err) {
        res.status(500).render('error', { message: 'Error loading running products', error: { status: 500 } });
    }
};

exports.training = async (req, res) => {
    const gender = req.params.gender;
    let category;
    let view;
    if (gender === 'women') {
        category = 'women-training';
        view = 'women-training';
    } else if (gender === 'men' || gender === 'man') {
        category = 'men-training';
        view = 'men-training';
    } else {
        return res.status(404).render('error', { message: 'Section not found', error: { status: 404 } });
    }
    try {
        const products = await Product.find({ category }).lean();
        res.render(view, { products });
    } catch (err) {
        res.status(500).render('error', { message: 'Error loading training products', error: { status: 500 } });
    }
};

exports.genderPage = async (req, res) => {
    const gender = req.params.gender;
    let products = [];
    let sectionTitle = '';
    let sectionSubtitle = '';

    try {
        // Fetch products from DB by category (case-insensitive)
        products = await Product.find({ category: new RegExp('^' + gender + '$', 'i') }).lean();
        if (gender === 'women' || gender === 'woman') {
            sectionTitle = "Women's Collection";
            sectionSubtitle = 'Performance-driven gear for women.';
        } else if (gender === 'men' || gender === 'man') {
            sectionTitle = "Men's Collection";
            sectionSubtitle = 'Performance-driven gear for men.';
        } else {
            return res.status(404).render('error', { message: 'Section not found', error: { status: 404 } });
        }
    } catch (err) {
        return res.status(500).render('error', { message: 'Could not load products', error: err });
    }

    res.render('gender-section', {
        title: sectionTitle,
        subtitle: sectionSubtitle,
        products
    });
};

exports.genderApparel = async (req, res) => {
    const gender = req.params.gender;
    let category;
    let sectionTitle = '';
    let sectionSubtitle = '';
    
    if (gender === 'women') {
        category = new RegExp('women.*apparel|apparel.*women|women.*tops|women.*leggings|women.*shorts|women.*sports-bras', 'i');
        sectionTitle = "Women's Apparel";
        sectionSubtitle = 'Performance-driven apparel for women.';
    } else if (gender === 'men' || gender === 'man') {
        category = new RegExp('men.*apparel|apparel.*men|men.*tops|men.*shorts|men.*pants|men.*hoodies', 'i');
        sectionTitle = "Men's Apparel";
        sectionSubtitle = 'Performance-driven apparel for men.';
    } else {
        return res.status(404).render('error', { message: 'Section not found', error: { status: 404 } });
    }
    
    try {
        const products = await Product.find({ category }).lean();
        const trendingProducts = await getTrendingProducts();
        
        res.render('gender-apparel', {
            title: sectionTitle,
            subtitle: sectionSubtitle,
            products,
            gender: gender === 'women' ? 'women' : 'men',
            trendingProducts
        });
    } catch (err) {
        res.status(500).render('error', { message: 'Error loading apparel products', error: { status: 500 } });
    }
};

exports.genderTops = async (req, res) => {
    const gender = req.params.gender;
    let category;
    let sectionTitle = '';
    
    if (gender === 'women') {
        category = new RegExp('women.*tops|tops.*women', 'i');
        sectionTitle = "Women's Tops";
    } else if (gender === 'men' || gender === 'man') {
        category = new RegExp('men.*tops|tops.*men', 'i');
        sectionTitle = "Men's Tops";
    } else {
        return res.status(404).render('error', { message: 'Section not found', error: { status: 404 } });
    }
    
    try {
        const products = await Product.find({ category }).lean();
        const trendingProducts = await getTrendingProducts();
        
        res.render('apparel-category', {
            title: sectionTitle,
            products,
            gender: gender === 'women' ? 'women' : 'men',
            category: 'tops',
            trendingProducts
        });
    } catch (err) {
        res.status(500).render('error', { message: 'Error loading tops', error: { status: 500 } });
    }
};

exports.genderShorts = async (req, res) => {
    const gender = req.params.gender;
    let category;
    let sectionTitle = '';
    
    if (gender === 'women') {
        category = new RegExp('women.*shorts|shorts.*women', 'i');
        sectionTitle = "Women's Shorts";
    } else if (gender === 'men' || gender === 'man') {
        category = new RegExp('men.*shorts|shorts.*men', 'i');
        sectionTitle = "Men's Shorts";
    } else {
        return res.status(404).render('error', { message: 'Section not found', error: { status: 404 } });
    }
    
    try {
        const products = await Product.find({ category }).lean();
        const trendingProducts = await getTrendingProducts();
        
        res.render('apparel-category', {
            title: sectionTitle,
            products,
            gender: gender === 'women' ? 'women' : 'men',
            category: 'shorts',
            trendingProducts
        });
    } catch (err) {
        res.status(500).render('error', { message: 'Error loading shorts', error: { status: 500 } });
    }
};

exports.genderPants = async (req, res) => {
    const gender = req.params.gender;
    let category;
    let sectionTitle = '';
    
    if (gender === 'women') {
        category = new RegExp('women.*pants|pants.*women', 'i');
        sectionTitle = "Women's Pants";
    } else if (gender === 'men' || gender === 'man') {
        category = new RegExp('men.*pants|pants.*men', 'i');
        sectionTitle = "Men's Pants";
    } else {
        return res.status(404).render('error', { message: 'Section not found', error: { status: 404 } });
    }
    
    try {
        const products = await Product.find({ category }).lean();
        const trendingProducts = await getTrendingProducts();
        
        res.render('apparel-category', {
            title: sectionTitle,
            products,
            gender: gender === 'women' ? 'women' : 'men',
            category: 'pants',
            trendingProducts
        });
    } catch (err) {
        res.status(500).render('error', { message: 'Error loading pants', error: { status: 500 } });
    }
};

exports.genderLeggings = async (req, res) => {
    const gender = req.params.gender;
    let category;
    let sectionTitle = '';
    
    if (gender === 'women') {
        category = new RegExp('women.*leggings|leggings.*women', 'i');
        sectionTitle = "Women's Leggings";
    } else {
        return res.status(404).render('error', { message: 'Section not found', error: { status: 404 } });
    }
    
    try {
        const products = await Product.find({ category }).lean();
        const trendingProducts = await getTrendingProducts();
        
        res.render('apparel-category', {
            title: sectionTitle,
            products,
            gender: 'women',
            category: 'leggings',
            trendingProducts
        });
    } catch (err) {
        res.status(500).render('error', { message: 'Error loading leggings', error: { status: 500 } });
    }
};

exports.genderSportsBras = async (req, res) => {
    const gender = req.params.gender;
    let category;
    let sectionTitle = '';
    
    if (gender === 'women') {
        category = new RegExp('women.*sports-bras|sports-bras.*women|women.*bras|bras.*women', 'i');
        sectionTitle = "Women's Sports Bras";
    } else {
        return res.status(404).render('error', { message: 'Section not found', error: { status: 404 } });
    }
    
    try {
        const products = await Product.find({ category }).lean();
        const trendingProducts = await getTrendingProducts();
        
        res.render('apparel-category', {
            title: sectionTitle,
            products,
            gender: 'women',
            category: 'sports-bras',
            trendingProducts
        });
    } catch (err) {
        res.status(500).render('error', { message: 'Error loading sports bras', error: { status: 500 } });
    }
};

exports.genderHoodies = async (req, res) => {
    const gender = req.params.gender;
    let category;
    let sectionTitle = '';
    
    if (gender === 'women') {
        category = new RegExp('women.*hoodies|hoodies.*women', 'i');
        sectionTitle = "Women's Hoodies";
    } else if (gender === 'men' || gender === 'man') {
        category = new RegExp('men.*hoodies|hoodies.*men', 'i');
        sectionTitle = "Men's Hoodies";
    } else {
        return res.status(404).render('error', { message: 'Section not found', error: { status: 404 } });
    }
    
    try {
        const products = await Product.find({ category }).lean();
        const trendingProducts = await getTrendingProducts();
        
        res.render('apparel-category', {
            title: sectionTitle,
            products,
            gender: gender === 'women' ? 'women' : 'men',
            category: 'hoodies',
            trendingProducts
        });
    } catch (err) {
        res.status(500).render('error', { message: 'Error loading hoodies', error: { status: 500 } });
    }
};

exports.lifestyle = async (req, res) => {
    const gender = req.params.gender;
    let category;
    let view;
    if (gender === 'women') {
        category = 'women-lifestyle';
        view = 'women-lifestyle';
    } else if (gender === 'men' || gender === 'man') {
        category = 'men-lifestyle';
        view = 'men-lifestyle';
    } else {
        return res.status(404).render('error', { message: 'Section not found', error: { status: 404 } });
    }
    try {
        // Find products by category (uploaded from product page)
        const products = await Product.find({ category }).lean();
        res.render(view, {
            products
        });
    } catch (err) {
        res.status(500).render('error', { message: 'Error loading lifestyle products', error: { status: 500 } });
    }
};

exports.newArrivals = async (req, res) => {
    try {
        // Get last 7 days of products
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const newProducts = await Product.find({
            createdAt: { $gte: sevenDaysAgo }
        })
        .sort({ createdAt: -1 })
        .lean();

        // Get trending products for recommendations
        const trendingProducts = await getTrendingProducts();

        res.render('new-arrivals', {
            title: 'New Arrivals',
            products: newProducts,
            trendingProducts,
            subtitle: 'Latest Releases and Fresh Drops'
        });
    } catch (err) {
        console.error('Error loading new arrivals:', err);
        res.status(500).render('error', {
            message: 'Error loading new arrivals',
            error: { status: 500 }
        });
    }
};

// Search products
exports.searchProducts = async (req, res) => {
    try {
        const { q: query } = req.query;
        
        if (!query) {
            return res.json({
                success: true,
                products: [],
                message: 'Please enter a search term'
            });
        }

        // Create a regex pattern for case-insensitive search
        const searchPattern = new RegExp(query, 'i');

        // Search in product name, description, and category
        const products = await Product.find({
            $or: [
                { name: searchPattern },
                { description: searchPattern },
                { category: searchPattern }
            ]
        })
        .select('name price image description category')
        .limit(12); // Limit to 12 results

        // Get trending products
        const trendingProducts = products.length < 6 ? await getTrendingProducts() : [];

        res.json({
            success: true,
            products,
            trendingProducts,
            resultsCount: products.length
        });
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({
            success: false,
            message: 'Error performing search',
            error: error.message
        });
    }
};

// API endpoint for trainers products by gender
exports.getTrainersJson = async (req, res) => {
    try {
        const gender = req.query.gender === 'women' ? 'women' : 'men';
        const category = gender === 'women' ? 'women-trainers' : 'men-trainers';
        const products = await Product.find({ category }).select('name price image description category').lean();
        res.json({
            success: true,
            gender,
            products
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error loading trainers', error: error.message });
    }
};

// API endpoint for outwork products by gender
exports.getOutworkJson = async (req, res) => {
    try {
        const gender = req.query.gender === 'women' ? 'women' : 'men';
        const category = `${gender}-outwork`;
        const products = await Product.find({ category })
            .select('name price image description category')
            .lean();
        
        res.json({
            success: true,
            gender,
            products
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error loading outwork products',
            error: error.message
        });
    }
};

// Render outwork page
exports.outwork = async (req, res) => {
    try {
        const gender = req.query.gender === 'women' ? 'women' : 'men';
        const category = `${gender}-outwork`;
        const products = await Product.find({ category }).lean();
        
        res.render('outwork', {
            title: `NOBULL | ${gender === 'women' ? "Women's" : "Men's"} Outwork Collection`,
            gender,
            products
        });
    } catch (error) {
        res.status(500).render('error', { error });
    }
};

// API endpoint for drive products by gender
exports.getDriveJson = async (req, res) => {
    try {
        const gender = req.query.gender === 'women' ? 'women' : 'men';
        const category = `${gender}-drive`;
        const products = await Product.find({ category })
            .select('name price image description category')
            .lean();
        
        res.json({
            success: true,
            gender,
            products
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error loading drive products',
            error: error.message
        });
    }
};

// Render drive page
exports.drive = async (req, res) => {
    try {
        const gender = req.query.gender === 'women' ? 'women' : 'men';
        const category = `${gender}-drive`;
        const products = await Product.find({ category }).lean();
        
        res.render('drive', {
            title: `NOBULL | ${gender === 'women' ? "Women's" : "Men's"} Drive Collection`,
            gender,
            products
        });
    } catch (error) {
        res.status(500).render('error', { error });
    }
};

// API endpoint for allday products by gender
exports.getAlldayJson = async (req, res) => {
    try {
        const gender = req.query.gender === 'women' ? 'women' : 'men';
        const category = `${gender}-allday`;
        const products = await Product.find({ category })
            .select('name price image description category')
            .lean();
        
        res.json({
            success: true,
            gender,
            products
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error loading allday products',
            error: error.message
        });
    }
};

// Render allday page
exports.allday = async (req, res) => {
    try {
        const gender = req.query.gender === 'women' ? 'women' : 'men';
        const category = `${gender}-allday`;
        const products = await Product.find({ category }).lean();
        
        res.render('allday', {
            title: `NOBULL | ${gender === 'women' ? "Women's" : "Men's"} Allday Collection`,
            gender,
            products
        });
    } catch (error) {
        res.status(500).render('error', { error });
    }
};

// API endpoint for journey products by gender
exports.getJourneyJson = async (req, res) => {
    try {
        const gender = req.query.gender === 'women' ? 'women' : 'men';
        const category = `${gender}-journey`;
        const products = await Product.find({ category })
            .select('name price image description category')
            .lean();
        
        res.json({
            success: true,
            gender,
            products
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error loading journey products',
            error: error.message
        });
    }
};

// Render journey page
exports.journey = async (req, res) => {
    try {
        const gender = req.query.gender === 'women' ? 'women' : 'men';
        const category = `${gender}-journey`;
        const products = await Product.find({ category }).lean();
        
        res.render('journey', {
            title: `NOBULL | ${gender === 'women' ? "Women's" : "Men's"} Journey Collection`,
            gender,
            products
        });
    } catch (error) {
        res.status(500).render('error', { error });
    }
};

exports.returns = async (req, res) => {
    try {
        res.render('returns', {
            title: 'Returns & Exchanges'
        });
    } catch (error) {
        console.error('Error rendering returns page:', error);
        res.status(500).render('error', {
            message: 'Error loading returns page',
            error: process.env.NODE_ENV === 'development' ? error : {}
        });
    }
};

// Static company/legal/essential pages
exports.fitGuarantee = (req, res) => res.render('fit-guarantee', { title: 'Fit Guarantee' });
exports.faq = (req, res) => res.render('faq', { title: 'Frequently Asked Questions' });
exports.careers = (req, res) => res.render('careers', { title: 'Careers' });
exports.press = (req, res) => res.render('press', { title: 'Press & Media' });
exports.athletes = (req, res) => res.render('athletes', { title: 'Athletes & Ambassadors' });
exports.sustainability = (req, res) => res.render('sustainability', { title: 'Sustainability' });
exports.privacy = (req, res) => res.render('privacy', { title: 'Privacy Policy' });
exports.terms = (req, res) => res.render('terms', { title: 'Terms of Service' });
exports.accessibility = (req, res) => res.render('accessibility', { title: 'Accessibility Statement' });
exports.training = (req, res) => res.render('training', { title: 'Training Programs' });
exports.community = (req, res) => res.render('community', { title: 'Community' });
exports.blog = (req, res) => res.render('blog', { title: 'Blog & News' });
exports.help = (req, res) => res.render('help', { title: 'Help Center' });
exports.trackOrder = (req, res) => res.render('track-order', { title: 'Track Order' });
exports.giftCards = (req, res) => res.render('gift-cards', { title: 'Gift Cards' });
exports.studentDiscount = (req, res) => res.render('student-discount', { title: 'Student Discount' });
exports.militaryDiscount = (req, res) => res.render('military-discount', { title: 'Military Discount' });
exports.wholesale = (req, res) => res.render('wholesale', { title: 'Wholesale/B2B' });
exports.affiliate = (req, res) => res.render('affiliate', { title: 'Affiliate Program' });