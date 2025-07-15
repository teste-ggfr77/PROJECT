const path = require('path');
const bcrypt = require('bcryptjs');
const Product = require('../models/Product');
const Order = require('../models/Order');
const User = require('../models/User');
const Contact = require('../models/Contact');
const Newsletter = require('../models/Newsletter');

exports.editProductForm = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            req.flash('error', 'Product not found');
            return res.redirect('/admin/dashboard');
        }
        const categories = await require('../models/Category').find().sort({ name: 1 });
        res.render('admin/edit-product', { 
            product, 
            categories,
            messages: {
                success: req.flash('success'),
                error: req.flash('error')
            }
        });
    } catch (error) {
        console.error('Error loading edit product form:', error);
        req.flash('error', 'Error loading product');
        res.redirect('/admin/dashboard');
    }
};

exports.editProduct = async (req, res, next) => {
    try {
        console.log('Edit product request:', {
            body: req.body,
            file: req.file,
            productId: req.params.id
        });

        const productId = req.params.id;
        const { name, description, price, colors, sizes, category, quantity } = req.body;

        // Validate product exists
        const existingProduct = await Product.findById(productId);
        if (!existingProduct) {
            req.flash('error', 'Product not found');
            return res.redirect('/admin/dashboard');
        }

        // Input validation
        if (!name?.trim() || !description?.trim() || !price || !category) {
            req.flash('error', 'Please fill in all required fields');
            return res.redirect(`/admin/edit-product/${productId}`);
        }

        // Prepare update data
        const updateData = {
            name: name.trim(),
            description: description.trim(),
            price: parseFloat(price),
            colors: colors ? colors.split(',').map(c => c.trim()).filter(Boolean) : [],
            sizes: sizes ? sizes.split(',').map(s => s.trim()).filter(Boolean) : [],
            category: category.trim(),
            quantity: parseInt(quantity) || 0
        };

        // Handle image upload
        if (req.file) {
            const fs = require('fs').promises;
            const oldPath = req.file.path;
            const newPath = path.join(__dirname, '../public/uploads/', req.file.filename);
            
            try {
                await fs.mkdir(path.dirname(newPath), { recursive: true });
                await fs.rename(oldPath, newPath);
                
                // Delete old image if it exists
                if (existingProduct.image?.startsWith('/uploads/')) {
                    const oldImagePath = path.join(__dirname, '../public', existingProduct.image);
                    await fs.unlink(oldImagePath).catch(err => 
                        console.error('Error deleting old image:', err)
                    );
                }
                
                updateData.image = '/uploads/' + req.file.filename;
            } catch (err) {
                console.error('Image processing error:', err);
                req.flash('error', 'Failed to process image upload');
                return res.redirect(`/admin/edit-product/${productId}`);
            }
        }

        // Handle additional photos upload
        if (req.files && Array.isArray(req.files) && req.files.length > 0) {
            const fs = require('fs').promises;
            const newAdditionalPhotos = [];
            
            for (const file of req.files) {
                if (file.fieldname === 'additionalPhotos') {
                    const oldPath = file.path;
                    const newPath = path.join(__dirname, '../public/uploads/', file.filename);
                    
                    try {
                        await fs.mkdir(path.dirname(newPath), { recursive: true });
                        await fs.rename(oldPath, newPath);
                        newAdditionalPhotos.push('/uploads/' + file.filename);
                    } catch (err) {
                        console.error('Error processing additional photo:', err);
                    }
                }
            }
            
            if (newAdditionalPhotos.length > 0) {
                // Add new photos to existing ones
                updateData.additionalPhotos = [
                    ...(existingProduct.additionalPhotos || []),
                    ...newAdditionalPhotos
                ];
            }
        }

        // Update product
        const updatedProduct = await Product.findByIdAndUpdate(
            productId,
            updateData,
            { 
                new: true, 
                runValidators: true,
                context: 'query'
            }
        );

        if (!updatedProduct) {
            req.flash('error', 'Failed to update product');
            return res.redirect(`/admin/edit-product/${productId}`);
        }

        console.log('Product updated successfully:', updatedProduct);
        req.flash('success', 'Product updated successfully');
        res.redirect(`/admin/edit-product/${productId}`);

    } catch (error) {
        console.error('Product update error:', error);
        next(error);
    }
};

exports.viewOrders = async (req, res) => {
    try {
        const Order = require('../models/Order');
        const orders = await Order.find()
            .populate('user', 'name email')
            .populate('items.product')
            .sort({ createdAt: -1 }); // Most recent orders first
        
        // Don't filter out guest orders - show all orders
        // Add flags to identify guest orders vs registered user orders
        const ordersWithFlags = orders.map(order => ({
            ...order.toObject(),
            isGuestOrder: !order.user,
            customerDisplayName: order.customerName || (order.user ? order.user.name : 'Guest Customer')
        }));
        
        res.render('admin/view-orders', { orders: ordersWithFlags });
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).render('error', { 
            message: 'Error loading orders',
            error: { status: 500, message: error.message }
        });
    }
};

exports.viewOrderDetail = async (req, res) => {
    try {
        console.log('viewOrderDetail - Debug info:', {
            params: req.params,
            url: req.url,
            originalUrl: req.originalUrl,
            route: req.route,
            method: req.method,
            baseUrl: req.baseUrl
        });
        
        const orderId = req.params.id;
        console.log('Extracted order ID:', orderId);
        
        if (!orderId) {
            console.log('No order ID found in params');
            return res.status(400).render('error', { 
                message: 'Order ID is required.',
                error: { status: 400, message: 'Order ID is required.' }
            });
        }
        
        // Validate MongoDB ObjectId format
        const mongoose = require('mongoose');
        if (!mongoose.Types.ObjectId.isValid(orderId)) {
            console.log('Invalid ObjectId format:', orderId);
            return res.status(400).render('error', { 
                message: 'Invalid order ID format.',
                error: { status: 400, message: 'Invalid order ID format.' }
            });
        }
        
        const order = await require('../models/Order').findById(orderId).populate('items.product user');
        console.log('Found order:', order ? 'Yes' : 'No');
        
        if (!order) {
            console.log('Order not found in database');
            return res.status(404).render('error', { 
                message: 'Order not found.',
                error: { status: 404, message: 'Order not found.' }
            });
        }
        
        // Debug order details
        console.log('Order details:', {
            orderId: order._id,
            userId: order.user ? order.user._id : 'null',
            userExists: !!order.user,
            customerName: order.customerName,
            phone: order.phone,
            shippingAddress: order.shippingAddress,
            orderStatus: order.status,
            orderTotal: order.total,
            itemsCount: order.items ? order.items.length : 0
        });
        
        if (!order.user) {
            console.log('Order found but no user account - this is likely a guest order');
            console.log('Guest order details:', {
                customerName: order.customerName,
                phone: order.phone,
                shippingAddress: order.shippingAddress
            });
            
            // This is a guest order, render it with guest order flag
            const guestOrder = {
                ...order.toObject(),
                user: null,
                isGuestOrder: true
            };
            
            console.log('Rendering guest order detail page');
            return res.render('admin/view-order-detail', { 
                order: guestOrder
            });
        }
        
        console.log('Rendering order detail page for order:', order._id);
        res.render('admin/view-order-detail', { order });
    } catch (error) {
        console.error('Error viewing order detail:', error);
        res.status(500).render('error', { 
            message: 'Error loading order details',
            error: { status: 500, message: error.message }
        });
    }
};

exports.addCategoryForm = (req, res) => {
    res.render('admin/add-category', { csrfToken: req.csrfToken() });
};

exports.addCategory = async (req, res) => {
    const { name } = req.body;
    await require('../models/Category').create({ name });
    res.redirect('/admin/categories');
};

exports.viewCategories = async (req, res) => {
    const categories = await require('../models/Category').find();
    res.render('admin/categories', { categories });
};

exports.dashboard = async (req, res) => {
    try {
        console.log('Fetching dashboard data...');
        
        const [products, orders, users, totalOrders, totalProducts, totalUsers, totalRevenueAgg] = await Promise.all([
            Product.find().sort({ createdAt: -1 }).limit(5),
            Order.find().populate('user').sort({ createdAt: -1 }).limit(5),
            User.find().sort({ createdAt: -1 }).limit(5),
            Order.countDocuments(),
            Product.countDocuments(),
            User.countDocuments(),
            Order.aggregate([
                { $group: { _id: null, total: { $sum: "$total" } } }
            ])
        ]);

        const totalRevenue = totalRevenueAgg[0]?.total ? totalRevenueAgg[0].total.toFixed(2) : '0.00';
        
        // Log the values being passed to the template
        console.log('Dashboard Statistics:', {
            totalProducts,
            totalOrders,
            totalUsers,
            totalRevenue,
            productsCount: products.length,
            ordersCount: orders.length,
            usersCount: users.length
        });

        // Convert values to numbers to ensure proper rendering
        const templateData = {
            products,
            orders,
            users,
            totalOrders: Number(totalOrders),
            totalProducts: Number(totalProducts),
            totalUsers: Number(totalUsers),
            totalRevenue: totalRevenue.toString()
        };

        res.render('admin/dashboard', templateData);
    } catch (error) {
        console.error('Dashboard error:', error);
        res.render('error', { 
            message: 'Error loading dashboard',
            error: { status: 500, message: error.message }
        });
    }
};

exports.viewProducts = async (req, res) => {
    try {
        console.log('viewProducts method called');
        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const skip = (page - 1) * limit;

        const totalProducts = await Product.countDocuments();
        const totalPages = Math.ceil(totalProducts / limit);

        const products = await Product.find()
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const categories = await require('../models/Category').find().sort({ name: 1 });

        console.log('Products data:', {
            totalProducts,
            productsCount: products.length,
            categoriesCount: categories.length
        });

        res.render('admin/products', {
            title: 'Manage Products',
            products,
            categories,
            currentPage: page,
            totalPages,
            csrfToken: req.csrfToken(),
            messages: {
                success: req.flash('success'),
                error: req.flash('error')
            }
        });
    } catch (error) {
        console.error('Error getting products:', error);
        req.flash('error', 'Error loading products');
        res.redirect('/admin/dashboard');
    }
};

exports.addProductForm = async (req, res) => {
    const categories = await require('../models/Category').find().sort({ name: 1 });
    res.render('admin/add-product', { 
        categories,
        csrfToken: req.csrfToken(),
        messages: {
            success: req.flash('success'),
            error: req.flash('error')
        }
    });
};

// Updated addProduct function for handling multiple color images
exports.addProduct = async (req, res) => {
    try {
        console.log('Add product request:', {
            body: req.body,
            files: req.files ? req.files.length : 0,
            file: req.file ? req.file.filename : 'none'
        });

        if (req.fileValidationError) {
            req.flash('error', req.fileValidationError);
            return res.redirect('/admin/add-product');
        }

        if (!req.file) {
            req.flash('error', 'Product image is required');
            return res.redirect('/admin/add-product');
        }

        const { name, description, price, sizes, category, quantity, colorsData } = req.body;

        // Client-side validation backup
        if (!name || !description || !price || !category || !quantity) {
            req.flash('error', 'All required fields must be filled');
            return res.redirect('/admin/add-product');
        }

        // Main image is already in the correct location (public/uploads)
        console.log('Main image processed:', req.file.filename);

        // Process color data and images
        let colorVariants = [];
        let colorNames = [];
        
        if (colorsData) {
            try {
                const parsedColorsData = JSON.parse(colorsData);
                console.log('Parsed colors data:', parsedColorsData);
                
                colorNames = parsedColorsData.map(color => color.name);
                
                // Process color-specific images from req.files
                if (req.files && Array.isArray(req.files) && req.files.length > 0) {
                    console.log('Processing color images:', req.files.length);
                    
                    for (const colorData of parsedColorsData) {
                        const colorImages = [];
                        
                        // Look for uploaded files for this color
                        for (const file of req.files) {
                            if (file.fieldname.startsWith(`colorImages_${colorData.name}_`)) {
                                const colorImagePath = path.join(__dirname, '../public/uploads/', file.filename);
                                try {
                                    await fs.mkdir(path.dirname(colorImagePath), { recursive: true });
                                    await fs.rename(file.path, colorImagePath);
                                    colorImages.push('/uploads/' + file.filename);
                                    console.log(`Processed color image for ${colorData.name}:`, file.filename);
                                } catch (err) {
                                    console.error('Error processing color image:', err);
                                }
                            }
                        }
                        
                        colorVariants.push({
                            name: colorData.name,
                            images: colorImages
                        });
                    }
                } else {
                    console.log('No color images to process');
                    // Create color variants without images
                    for (const colorData of parsedColorsData) {
                        colorVariants.push({
                            name: colorData.name,
                            images: []
                        });
                    }
                }
            } catch (err) {
                console.error('Error parsing colors data:', err);
            }
        }

        // Process additional photos
        let additionalPhotos = [];
        if (req.files && Array.isArray(req.files) && req.files.length > 0) {
            console.log('Processing additional photos...');
            
            for (const file of req.files) {
                if (file.fieldname.startsWith('additionalPhotos_')) {
                    const additionalPhotoPath = path.join(__dirname, '../public/uploads/', file.filename);
                    try {
                        await fs.mkdir(path.dirname(additionalPhotoPath), { recursive: true });
                        await fs.rename(file.path, additionalPhotoPath);
                        additionalPhotos.push('/uploads/' + file.filename);
                        console.log('Processed additional photo:', file.filename);
                    } catch (err) {
                        console.error('Error processing additional photo:', err);
                    }
                }
            }
        }

        console.log('Final color variants:', colorVariants);
        console.log('Final additional photos:', additionalPhotos);
        
        const Product = require('../models/Product');
        const product = new Product({
            name: name.trim(),
            description: description.trim(),
            price: parseFloat(price),
            colors: colorNames,
            colorVariants: colorVariants,
            sizes: sizes ? sizes.split(',').map(s => s.trim()).filter(s => s) : [],
            category,
            quantity: parseInt(quantity),
            image: '/uploads/' + req.file.filename,
            additionalPhotos: additionalPhotos
        });

        await product.save();
        console.log('Product saved successfully:', product._id);

        // Create notification for new product
        try {
            const notificationCtrl = require('./notificationController');
            await notificationCtrl.createProductNotification(product, 'created');
        } catch (notificationError) {
            console.error('Error creating product notification:', notificationError);
            // Don't fail the product creation if notification fails
        }

        req.flash('success', `Product "${product.name}" added successfully with ${colorVariants.length} color variants and ${additionalPhotos.length} additional photos`);
        res.redirect('/admin/dashboard');
    } catch (error) {
        console.error('Error adding product:', error);
        
        // Clean up uploaded files if they exist
        if (req.file) {
            try {
                await require('fs').promises.unlink(req.file.path).catch(() => {});
            } catch (err) {
                console.error('Error deleting failed main upload:', err);
            }
        }
        if (req.files && Array.isArray(req.files)) {
            for (const file of req.files) {
                try {
                    await require('fs').promises.unlink(file.path).catch(() => {});
                } catch (err) {
                    console.error('Error deleting failed color upload:', err);
                }
            }
        }
        
        req.flash('error', error.message || 'Error adding product');
        res.redirect('/admin/add-product');
    }
}

exports.deleteProduct = async (req, res) => {
    try {
        console.log('Delete product request:', {
            method: req.method,
            productId: req.params.id,
            body: req.body,
            query: req.query
        });

        const productId = req.params.id;
        const product = await Product.findById(productId);
        
        if (!product) {
            console.log('Product not found:', productId);
            req.flash('error', 'Product not found');
            return res.redirect('/admin/products');
        }

        console.log('Found product to delete:', product.name);

        // Delete the product's image file if it exists
        if (product.image && product.image.startsWith('/uploads/')) {
            const fs = require('fs').promises;
            const imagePath = path.join(__dirname, '../public', product.image);
            try {
                await fs.unlink(imagePath);
                console.log('Deleted product image:', imagePath);
            } catch (err) {
                console.error('Error deleting product image:', err);
            }
        }

        await Product.findByIdAndDelete(productId);
        console.log('Product deleted successfully:', productId);
        
        req.flash('success', 'Product deleted successfully');
        res.redirect('/admin/products');
    } catch (error) {
        console.error('Error deleting product:', error);
        req.flash('error', 'Error deleting product');
        res.redirect('/admin/products');
    }
};

exports.loginForm = (req, res) => {
    // Check if user is already logged in
    if (req.session && req.session.user && req.session.isAdmin) {
        return res.redirect('/admin/dashboard');
    }
    
    res.render('admin/login', {
        csrfToken: req.csrfToken(),
        messages: {
            error: req.flash('error'),
            success: req.flash('success')
        }
    });
};

exports.logout = async (req, res) => {
try {
// Simple logout - just destroy the session
if (req.session) {
// Clear user data first
req.session.user = null;

// Destroy the session
req.session.destroy((err) => {
if (err) {
console.error('Session destruction error:', err);
}
// Clear the session cookie
res.clearCookie('connect.sid', { path: '/' });
res.redirect('/admin/login');
});
} else {
// No session, just clear cookie and redirect
res.clearCookie('connect.sid', { path: '/' });
res.redirect('/admin/login');
}
} catch (error) {
console.error('Logout error:', error);
res.redirect('/admin/login');
}
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        console.log('Login attempt:', { email });
        
        const user = await User.findOne({ email, isAdmin: true });
        console.log('Found user:', user ? 'Yes' : 'No');
        
        if (!user) {
            console.log('No admin user found with this email');
            req.flash('error', 'Invalid email or password');
            return res.redirect('/admin/login');
        }
        
        const isValidPassword = await bcrypt.compare(password, user.password);
        console.log('Password valid:', isValidPassword);
        
        if (!isValidPassword) {
            console.log('Invalid password');
            req.flash('error', 'Invalid email or password');
            return res.redirect('/admin/login');
        }

        // Set up the session
        req.session.regenerate((err) => {
            if (err) {
                console.error('Session regeneration error:', err);
                return res.redirect('/admin/login');
            }

            req.session.user = user;
            req.session.isAdmin = true;
            
            // Save the session before redirection
            req.session.save((err) => {
                if (err) {
                    console.error('Session save error:', err);
                    req.flash('error', 'Login failed. Please try again.');
                    return res.redirect('/admin/login');
                }
                req.flash('success', 'Welcome back, ' + user.name + '!');
                res.redirect('/admin/dashboard');
            });
        });
    } catch (error) {
        console.error('Admin login error:', error);
        req.flash('error', 'An error occurred. Please try again.');
        res.redirect('/admin/login');
    }
};

exports.updateOrderStatus = async (req, res) => {
    try {
        console.log('Updating order status:', {
            orderId: req.params.id,
            newStatus: req.body.status,
            body: req.body
        });
        
        const { id } = req.params;
        const { status } = req.body;
        
        // Validate status
        const validStatuses = ['processing', 'shipped', 'delivered', 'cancelled', 'completed'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ 
                success: false, 
                error: 'Invalid status. Must be one of: ' + validStatuses.join(', ') 
            });
        }
        
        const Order = require('../models/Order');
        const updatedOrder = await Order.findByIdAndUpdate(
            id, 
            { status }, 
            { new: true }
        );
        
        if (!updatedOrder) {
            return res.status(404).json({ 
                success: false, 
                error: 'Order not found' 
            });
        }
        
        console.log('Order status updated successfully:', {
            orderId: id,
            oldStatus: updatedOrder.status,
            newStatus: status
        });
        
        res.json({ success: true, order: updatedOrder });
    } catch (error) {
        console.error('Error updating order status:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to update order status: ' + error.message 
        });
    }
};

exports.getContacts = async (req, res) => {
    try {
        const [contacts, newsletters] = await Promise.all([
            Contact.find().sort({ createdAt: -1 }),
            Newsletter.find({ isActive: true }).sort({ subscribedAt: -1 })
        ]);
        
        res.render('admin/contacts', {
            contacts,
            newsletters,
            csrfToken: req.csrfToken(),
            messages: req.flash()
        });
    } catch (error) {
        console.error('Error fetching contacts:', error);
        req.flash('error', 'Error loading contacts');
        res.redirect('/admin/dashboard');
    }
};

// User Management
exports.getUsers = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const skip = (page - 1) * limit;

        const totalUsers = await User.countDocuments();
        const totalPages = Math.ceil(totalUsers / limit);

        const users = await User.find()
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        res.render('admin/users', {
            title: 'User Management',
            users,
            currentPage: page,
            totalPages,
            messages: {
                success: req.flash('success'),
                error: req.flash('error')
            }
        });
    } catch (error) {
        console.error('Error getting users:', error);
        req.flash('error', 'Error loading users');
        res.redirect('/admin/dashboard');
    }
};

exports.getUserDetails = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            req.flash('error', 'User not found');
            return res.redirect('/admin/users');
        }

        const orders = await Order.find({ user: user._id })
            .sort({ createdAt: -1 })
            .limit(5);

        res.render('admin/user-profiles', {
            title: 'User Details',
            user,
            orders,
            messages: {
                success: req.flash('success'),
                error: req.flash('error')
            }
        });
    } catch (error) {
        console.error('Error getting user details:', error);
        req.flash('error', 'Error loading user details');
        res.redirect('/admin/users');
    }
};

exports.makeAdmin = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            req.flash('error', 'User not found');
            return res.redirect('/admin/users');
        }

        user.isAdmin = true;
        await user.save();

        req.flash('success', 'User has been made an admin');
        res.redirect('/admin/users');
    } catch (error) {
        console.error('Error making admin:', error);
        req.flash('error', 'Error updating user role');
        res.redirect('/admin/users');
    }
};

exports.deleteUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            req.flash('error', 'User not found');
            return res.redirect('/admin/users');
        }

        if (user.isAdmin) {
            req.flash('error', 'Cannot delete admin users');
            return res.redirect('/admin/users');
        }

        await User.deleteOne({ _id: user._id });
        req.flash('success', 'User deleted successfully');
        res.redirect('/admin/users');
    } catch (error) {
        console.error('Error deleting user:', error);
        req.flash('error', 'Error deleting user');
        res.redirect('/admin/users');
    }
};

exports.deleteCategory = async (req, res) => {
    try {
        await require('../models/Category').findByIdAndDelete(req.params.id);
        res.redirect('/admin/categories');
    } catch (err) {
        res.status(500).render('error', { 
            message: 'Could not delete category', 
            error: { status: 500, message: err.message }
        });
    }
};

// Remove additional photo from product
exports.removeAdditionalPhoto = async (req, res) => {
    try {
        const productId = req.params.id;
        const { photoIndex, photoUrl } = req.body;

        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ success: false, error: 'Product not found' });
        }

        if (!product.additionalPhotos || photoIndex >= product.additionalPhotos.length) {
            return res.status(400).json({ success: false, error: 'Invalid photo index' });
        }

        // Remove the photo from the array
        product.additionalPhotos.splice(photoIndex, 1);
        await product.save();

        // Delete the physical file
        if (photoUrl && photoUrl.startsWith('/uploads/')) {
            const fs = require('fs').promises;
            const imagePath = path.join(__dirname, '../public', photoUrl);
            try {
                await fs.unlink(imagePath);
                console.log('Deleted additional photo file:', imagePath);
            } catch (err) {
                console.error('Error deleting additional photo file:', err);
            }
        }

        res.json({ success: true, message: 'Photo removed successfully' });
    } catch (error) {
        console.error('Error removing additional photo:', error);
        res.status(500).json({ success: false, error: 'Failed to remove photo' });
    }
};

// Remove color variant image from product
exports.removeColorImage = async (req, res) => {
    try {
        const productId = req.params.id;
        const { variantIndex, imageIndex, imageUrl } = req.body;

        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ success: false, error: 'Product not found' });
        }

        if (!product.colorVariants || variantIndex >= product.colorVariants.length) {
            return res.status(400).json({ success: false, error: 'Invalid variant index' });
        }

        const variant = product.colorVariants[variantIndex];
        if (!variant.images || imageIndex >= variant.images.length) {
            return res.status(400).json({ success: false, error: 'Invalid image index' });
        }

        // Remove the image from the variant's images array
        variant.images.splice(imageIndex, 1);
        await product.save();

        // Delete the physical file
        if (imageUrl && imageUrl.startsWith('/uploads/')) {
            const fs = require('fs').promises;
            const imagePath = path.join(__dirname, '../public', imageUrl);
            try {
                await fs.unlink(imagePath);
                console.log('Deleted color variant image file:', imagePath);
            } catch (err) {
                console.error('Error deleting color variant image file:', err);
            }
        }

        res.json({ success: true, message: 'Color image removed successfully' });
    } catch (error) {
        console.error('Error removing color image:', error);
        res.status(500).json({ success: false, error: 'Failed to remove color image' });
    }
};