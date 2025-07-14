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

        const fs = require('fs').promises;
        const path = require('path');
        
        // Process main product image
        const oldPath = req.file.path;
        const newPath = path.join(__dirname, '../public/uploads/', req.file.filename);
        
        try {
            await fs.mkdir(path.dirname(newPath), { recursive: true });
            await fs.rename(oldPath, newPath);
        } catch (err) {
            console.error('Error processing main image:', err);
            req.flash('error', 'Error uploading main image');
            return res.redirect('/admin/add-product');
        }

        // Process color data and images
        let colorVariants = [];
        let colorNames = [];
        
        if (colorsData) {
            try {
                const parsedColorsData = JSON.parse(colorsData);
                console.log('Parsed colors data:', parsedColorsData);
                
                colorNames = parsedColorsData.map(color => color.name);
                
                // Process color-specific images from req.files
                if (req.files && req.files.length > 0) {
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
                }
            } catch (err) {
                console.error('Error parsing colors data:', err);
            }
        }

        console.log('Final color variants:', colorVariants);
        
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
            image: '/uploads/' + req.file.filename
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

        req.flash('success', `Product "${product.name}" added successfully with ${colorVariants.length} color variants`);
        res.redirect('/admin');
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
        if (req.files) {
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
};