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
        const { name, description, price, colors, category, quantity } = req.body;

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
        // Filter out orders with missing user
        const filteredOrders = orders.filter(order => order.user);
        res.render('admin/view-orders', { orders: filteredOrders });
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).render('error', { error });
    }
};

exports.viewOrderDetail = async (req, res) => {
    const order = await require('../models/Order').findById(req.params.id).populate('items.product user');
    if (!order || !order.user) {
        return res.status(404).render('error', { message: 'Order or user not found.' });
    }
    res.render('admin/view-order-detail', { order });
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
        res.render('error', { error });
    }
};

exports.addProductForm = async (req, res) => {
    const categories = await require('../models/Category').find().sort({ name: 1 });
    res.render('admin/add-product', { categories });
};

exports.addProduct = async (req, res) => {
    try {
        if (req.fileValidationError) {
            req.flash('error', req.fileValidationError);
            return res.redirect('/admin/add-product');
        }

        if (!req.file) {
            req.flash('error', 'Product image is required');
            return res.redirect('/admin/add-product');
        }

        const { name, description, price, colors, category, quantity } = req.body;

        // Client-side validation backup
        if (!name || !description || !price || !category || !quantity) {
            req.flash('error', 'All required fields must be filled');
            return res.redirect('/admin/add-product');
        }

        // Move file from temp to final location
        const fs = require('fs').promises;
        const oldPath = req.file.path;
        const newPath = path.join(__dirname, '../public/uploads/', req.file.filename);
        
        try {
            await fs.mkdir(path.dirname(newPath), { recursive: true });
            await fs.rename(oldPath, newPath);
        } catch (err) {
            console.error('Error processing image:', err);
            req.flash('error', 'Error uploading image');
            return res.redirect('/admin/add-product');
        }
        
        const product = new Product({
            name: name.trim(),
            description: description.trim(),
            price: parseFloat(price),
            colors: colors ? colors.split(',').map(c => c.trim()).filter(c => c) : [],
            category,
            quantity: parseInt(quantity),
            image: '/uploads/' + req.file.filename
        });

        await product.save();
        req.flash('success', 'Product added successfully');
        res.redirect('/admin');
    } catch (error) {
        console.error('Error adding product:', error);
        // Clean up uploaded file if it exists
        if (req.file) {
            try {
                await fs.unlink(req.file.path);
            } catch (err) {
                console.error('Error deleting failed upload:', err);
            }
        }
        req.flash('error', error.message || 'Error adding product');
        res.redirect('/admin/add-product');
    }
};

exports.deleteProduct = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            req.flash('error', 'Product not found');
            return res.redirect('/admin');
        }

        // Delete the product's image file if it exists
        if (product.image && product.image.startsWith('/uploads/')) {
            const fs = require('fs').promises;
            const imagePath = path.join(__dirname, '../public', product.image);
            try {
                await fs.unlink(imagePath);
            } catch (err) {
                console.error('Error deleting product image:', err);
            }
        }

        await Product.findByIdAndDelete(req.params.id);
        req.flash('success', 'Product deleted successfully');
        res.redirect('/admin');
    } catch (error) {
        console.error('Error deleting product:', error);
        req.flash('error', 'Error deleting product');
        res.redirect('/admin');
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
        if (req.session) {
            req.session.destroy((err) => {
                if (err) {
                    console.error('Session destruction error:', err);
                    return res.redirect('/admin/dashboard');
                }
                
                // Clear the session cookie
                res.clearCookie('connect.sid');
                
                // Redirect to login page
                res.redirect('/admin/login');
            });
        } else {
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
        const { id } = req.params;
        const { status } = req.body;
        
        const Order = require('../models/Order');
        await Order.findByIdAndUpdate(id, { status });
        
        res.json({ success: true });
    } catch (error) {
        console.error('Error updating order status:', error);
        res.status(500).json({ error: 'Failed to update order status' });
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
        res.status(500).render('error', { message: 'Could not delete category', error: err });
    }
};