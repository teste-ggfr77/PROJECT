const PageContent = require('../models/PageContent');
const cloudinary = require('../config/cloudinary.config');
const fs = require('fs');
const util = require('util');
const unlinkFile = util.promisify(fs.unlink);

// Helper function to upload multiple images
async function uploadMultipleImages(files) {
    const uploadedUrls = [];
    for (const file of files) {
        try {
            const result = await cloudinary.uploader.upload(file.path);
            uploadedUrls.push(result.secure_url);
            await unlinkFile(file.path);
        } catch (error) {
            console.error('Error uploading file to Cloudinary:', error);
            throw error;
        }
    }
    return uploadedUrls;
}

exports.getPageContents = async (req, res) => {
    try {
        const contents = await PageContent.find().sort({ order: 1 });
        res.render('admin/page-contents', {
            title: 'Manage Page Content',
            contents,
            csrfToken: req.csrfToken()
        });
    } catch (error) {
        console.error(error);
        req.flash('error', 'Error fetching page contents');
        res.redirect('/admin/dashboard');
    }
};

exports.addContent = async (req, res) => {
    try {
        const {
            type, title, subtitle, description,
            buttonText, buttonLink,
            backgroundColor, textColor,
            layout, customClass
        } = req.body;

        // Validate required fields
        if (!type || !title) {
            return res.status(400).json({
                success: false,
                error: 'Type and title are required fields'
            });
        }

        let imageUrl = '';
        let additionalImageUrls = [];
        let tempFiles = [];

        try {
            // Get the maximum order number
            const maxOrderContent = await PageContent.findOne().sort('-order');
            const order = maxOrderContent ? maxOrderContent.order + 1 : 1;

            if (req.files) {
                if (req.files.image) {
                    tempFiles.push(req.files.image[0].path);
                    try {
                        const result = await cloudinary.uploader.upload(req.files.image[0].path);
                        imageUrl = result.secure_url;
                        await unlinkFile(req.files.image[0].path);
                        tempFiles = tempFiles.filter(path => path !== req.files.image[0].path);
                    } catch (uploadError) {
                        console.error('Error uploading main image:', uploadError);
                        throw new Error('Failed to upload main image');
                    }
                }

                if (req.files.additionalImages) {
                    tempFiles.push(...req.files.additionalImages.map(f => f.path));
                    try {
                        additionalImageUrls = await uploadMultipleImages(req.files.additionalImages);
                        // Remove successfully uploaded files from tempFiles
                        tempFiles = tempFiles.filter(path => 
                            !req.files.additionalImages.some(f => f.path === path)
                        );
                    } catch (uploadError) {
                        console.error('Error uploading additional images:', uploadError);
                        throw new Error('Failed to upload additional images');
                    }
                }
            }

            const content = new PageContent({
                type,
                title,
                subtitle,
                description,
                imageUrl,
                additionalImages: additionalImageUrls,
                buttonText,
                buttonLink,
                backgroundColor,
                textColor,
                layout,
                customClass,
                order,
                status: 'active'
            });

            try {
                await content.save();
                res.json({ success: true, content });
            } catch (saveError) {
                console.error('Error saving content to database:', saveError);
                // If save fails, try to clean up uploaded images
                if (imageUrl) {
                    try {
                        const publicId = imageUrl.split('/').pop().split('.')[0];
                        await cloudinary.uploader.destroy(publicId);
                    } catch (cleanupError) {
                        console.error('Error cleaning up main image after save failure:', cleanupError);
                    }
                }
                for (const url of additionalImageUrls) {
                    try {
                        const publicId = url.split('/').pop().split('.')[0];
                        await cloudinary.uploader.destroy(publicId);
                    } catch (cleanupError) {
                        console.error('Error cleaning up additional image after save failure:', cleanupError);
                    }
                }
                throw new Error('Failed to save content');
            }
        } catch (error) {
            // Clean up any remaining temporary files
            for (const filePath of tempFiles) {
                try {
                    await unlinkFile(filePath);
                } catch (cleanupError) {
                    console.error('Error cleaning up temporary file:', cleanupError, filePath);
                }
            }
            throw error;
        }
    } catch (error) {
        console.error('Content creation error:', error);
        const errorMessage = error.message || 'Error adding content';
        res.status(500).json({ 
            success: false, 
            error: errorMessage,
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

exports.updateContent = async (req, res) => {
    try {
        const contentId = req.params.id;
        if (!contentId) {
            return res.status(400).json({ success: false, error: 'Content ID is required' });
        }

        const {
            type, title, subtitle, description,
            buttonText, buttonLink,
            backgroundColor, textColor,
            layout, customClass,
            status
        } = req.body;

        const content = await PageContent.findById(contentId);
        if (!content) {
            return res.status(404).json({ success: false, error: 'Content not found' });
        }

        let imageUrl = content.imageUrl;
        let additionalImageUrls = content.additionalImages;

        if (req.files) {
            try {
                if (req.files.image) {
                    if (content.imageUrl) {
                        try {
                            const publicId = content.imageUrl.split('/').pop().split('.')[0];
                            await cloudinary.uploader.destroy(publicId);
                        } catch (cloudinaryError) {
                            console.error('Error deleting old image from Cloudinary:', cloudinaryError);
                            // Continue with upload even if delete fails
                        }
                    }
                    
                    try {
                        const result = await cloudinary.uploader.upload(req.files.image[0].path);
                        imageUrl = result.secure_url;
                        await unlinkFile(req.files.image[0].path);
                    } catch (uploadError) {
                        console.error('Error uploading new image to Cloudinary:', uploadError);
                        throw new Error('Failed to upload new image');
                    }
                }

                if (req.files.additionalImages) {
                    try {
                        // Delete existing additional images
                        for (const url of content.additionalImages) {
                            try {
                                const publicId = url.split('/').pop().split('.')[0];
                                await cloudinary.uploader.destroy(publicId);
                            } catch (deleteError) {
                                console.error('Error deleting additional image from Cloudinary:', deleteError);
                                // Continue with next deletion even if one fails
                            }
                        }
                        additionalImageUrls = await uploadMultipleImages(req.files.additionalImages);
                    } catch (additionalImagesError) {
                        console.error('Error handling additional images:', additionalImagesError);
                        throw new Error('Failed to process additional images');
                    }
                }
            } catch (fileProcessingError) {
                // Clean up any uploaded files before throwing error
                if (req.files.image) {
                    try {
                        await unlinkFile(req.files.image[0].path);
                    } catch (cleanupError) {
                        console.error('Error cleaning up temporary file:', cleanupError);
                    }
                }
                if (req.files.additionalImages) {
                    for (const file of req.files.additionalImages) {
                        try {
                            await unlinkFile(file.path);
                        } catch (cleanupError) {
                            console.error('Error cleaning up temporary file:', cleanupError);
                        }
                    }
                }
                throw fileProcessingError;
            }
        }

        // Update content fields
        const updateFields = {
            type, title, subtitle, description,
            imageUrl, additionalImages: additionalImageUrls,
            buttonText, buttonLink,
            backgroundColor, textColor,
            layout, customClass, status
        };

        try {
            Object.assign(content, updateFields);
            await content.save();
            res.json({ success: true, content });
        } catch (saveError) {
            console.error('Error saving content to database:', saveError);
            throw new Error('Failed to save content updates');
        }
    } catch (error) {
        console.error('Content update error:', error);
        const errorMessage = error.message || 'Error updating content';
        res.status(500).json({ 
            success: false, 
            error: errorMessage,
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

exports.deleteContent = async (req, res) => {
    try {
        const contentId = req.params.id;
        const content = await PageContent.findById(contentId);

        if (!content) {
            return res.status(404).json({ success: false, error: 'Content not found' });
        }

        // Delete images from Cloudinary
        if (content.imageUrl) {
            const publicId = content.imageUrl.split('/').pop().split('.')[0];
            await cloudinary.uploader.destroy(publicId);
        }

        for (const url of content.additionalImages) {
            const publicId = url.split('/').pop().split('.')[0];
            await cloudinary.uploader.destroy(publicId);
        }

        await content.deleteOne();
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: 'Error deleting content' });
    }
};

exports.reorderContent = async (req, res) => {
    try {
        const { items } = req.body;
        
        // Update each content's order
        for (let i = 0; i < items.length; i++) {
            await PageContent.findByIdAndUpdate(items[i].id, { order: i + 1 });
        }
        
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: 'Error reordering content' });
    }
};

// Get the homepage editor
exports.getHomepageEditor = async (req, res) => {
    try {
        // Get content for each section
        const [heroSection, featuredSection, promoSection, featuredProductsSection, communitySection] = await Promise.all([
            PageContent.findOne({ type: 'hero' }),
            PageContent.findOne({ type: 'featured' }),
            PageContent.findOne({ type: 'promotion' }),
            PageContent.findOne({ type: 'product-showcase' }),
            PageContent.findOne({ type: 'community' })
        ]);

        res.render('admin/edit-homepage', {
            title: 'Edit Homepage Content',
            heroSection,
            featuredSection,
            promoSection,
            featuredProductsSection,
            communitySection,
            csrfToken: req.csrfToken()
        });
    } catch (error) {
        console.error('Error loading homepage content:', error);
        req.flash('error', 'Failed to load homepage content');
        res.redirect('/admin/dashboard');
    }
};

// Update a section
exports.updateSection = async (req, res) => {
    try {
        const { type } = req.params;
        console.log(`Updating section: ${type}`, req.body);

        // Validate section type
        if (!['hero', 'featured', 'promotion', 'product-showcase', 'community'].includes(type)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid section type'
            });
        }

        let uploadedFiles = {};
        
        // Handle file uploads if present
        if (req.files && req.files.length > 0) {
            console.log('Processing uploaded files:', req.files.map(f => ({ fieldname: f.fieldname, filename: f.filename })));
            
            for (const file of req.files) {
                try {
                    // Upload to Cloudinary with retry logic
                    let retryCount = 0;
                    let result;
                    while (retryCount < 3) {
                        try {
                            result = await cloudinary.uploader.upload(file.path, {
                                folder: 'page-content',
                                resource_type: 'auto',
                                timeout: 60000 // 60 second timeout
                            });
                            break;
                        } catch (uploadError) {
                            retryCount++;
                            if (retryCount === 3) throw uploadError;
                            await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
                        }
                    }
                    
                    uploadedFiles[file.fieldname] = result.secure_url;
                    // Clean up the temporary file
                    await unlinkFile(file.path).catch(err => 
                        console.error('Error deleting temp file:', err)
                    );
                    console.log(`File uploaded successfully: ${file.fieldname} -> ${result.secure_url}`);
                    
                    // Set main image URL for backward compatibility
                    if (file.fieldname === 'image') {
                        imageUrl = result.secure_url;
                    }
                } catch (error) {
                    console.error(`Error uploading file ${file.fieldname}:`, error);
                    return res.status(500).json({
                        success: false,
                        error: `Failed to upload file: ${file.fieldname}`
                    });
                }
            }
        }
        
        console.log('Uploaded files mapping:', uploadedFiles);

        // Prepare update data based on section type
        let updateData = {
            type,
            isActive: true,
            updatedAt: new Date()
        };

        // Handle different section types
        switch (type) {
            case 'hero':
                const { title: heroTitle, subtitle: heroSubtitle, description: heroDescription } = req.body;
                updateData = {
                    ...updateData,
                    title: heroTitle,
                    subtitle: heroSubtitle,
                    description: heroDescription,
                    ...(imageUrl ? { image: imageUrl } : {})
                };
                break;

            case 'featured':
                const { title: featuredTitle, description: featuredDescription } = req.body;
                updateData = {
                    ...updateData,
                    title: featuredTitle,
                    description: featuredDescription,
                    ...(imageUrl ? { image: imageUrl } : {})
                };
                break;

            case 'promotion':
                const { 
                    description: promoDescription, 
                    promotionStartDate, 
                    promotionEndDate, 
                    promotionType, 
                    showCountdown, 
                    isUrgent 
                } = req.body;
                
                console.log('Promotion data received:', {
                    promotionStartDate,
                    promotionEndDate,
                    promotionType,
                    showCountdown,
                    isUrgent,
                    description: promoDescription
                });
                
                // Ensure we have valid dates
                const startDate = promotionStartDate ? new Date(promotionStartDate) : new Date();
                const endDate = promotionEndDate ? new Date(promotionEndDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
                
                console.log('Processed dates:', { startDate, endDate });
                
                updateData = {
                    ...updateData,
                    title: 'Promotional Banner',
                    description: promoDescription, // This should contain the JSON string of messages
                    promotionStartDate: startDate,
                    promotionEndDate: endDate,
                    promotionType: promotionType || 'default',
                    showCountdown: showCountdown === 'on' || showCountdown === true,
                    isUrgent: isUrgent === 'on' || isUrgent === true
                };
                
                console.log('Final promotion updateData:', updateData);
                break;

            case 'product-showcase':
                const { title: showcaseTitle, description: showcaseDescription, products } = req.body;
                
                console.log('Product showcase data received:', {
                    title: showcaseTitle,
                    description: showcaseDescription,
                    products: products,
                    productsType: typeof products
                });
                
                // Ensure products is a valid JSON string and update with uploaded images
                let productsData = [];
                if (typeof products === 'string') {
                    try {
                        productsData = JSON.parse(products);
                    } catch (e) {
                        console.error('Invalid JSON in products field:', e);
                        productsData = [];
                    }
                } else if (Array.isArray(products)) {
                    productsData = products;
                } else {
                    console.error('Products field is not string or array:', products);
                    productsData = [];
                }
                
                // Update product images with uploaded files
                productsData.forEach((product, index) => {
                    const imageFieldName = `productImage_${index}`;
                    if (uploadedFiles[imageFieldName]) {
                        product.img = uploadedFiles[imageFieldName];
                        console.log(`Updated product ${index} image:`, uploadedFiles[imageFieldName]);
                    }
                });
                
                const productsString = JSON.stringify(productsData);
                console.log('Final products string:', productsString);
                
                updateData = {
                    ...updateData,
                    title: showcaseTitle || 'Featured Products',
                    description: showcaseDescription || '',
                    products: productsString
                };
                break;

            case 'community':
                const { title: communityTitle, subtitle: communitySubtitle, instagram, posts } = req.body;
                
                console.log('Community data received:', {
                    title: communityTitle,
                    subtitle: communitySubtitle,
                    instagram: instagram,
                    posts: posts,
                    postsType: typeof posts,
                    allBodyKeys: Object.keys(req.body),
                    uploadedFilesKeys: Object.keys(uploadedFiles)
                });
                
                // Ensure posts is a valid JSON string and update with uploaded images
                let postsData = [];
                if (typeof posts === 'string') {
                    try {
                        postsData = JSON.parse(posts);
                    } catch (e) {
                        console.error('Invalid JSON in posts field:', e);
                        postsData = [];
                    }
                } else if (Array.isArray(posts)) {
                    postsData = posts;
                } else {
                    console.error('Posts field is not string or array:', posts);
                    postsData = [];
                }
                
                // Update post images with uploaded files
                postsData.forEach((post, index) => {
                    const imageFieldName = `postImage_${index}`;
                    if (uploadedFiles[imageFieldName]) {
                        postsData[index] = uploadedFiles[imageFieldName];
                        console.log(`Updated post ${index} image:`, uploadedFiles[imageFieldName]);
                    }
                });
                
                const postsString = JSON.stringify(postsData);
                console.log('Final posts string:', postsString);
                
                updateData = {
                    ...updateData,
                    title: communityTitle || 'JOIN THE COMMUNITY',
                    subtitle: communitySubtitle || 'Tag us @SABILS',
                    instagram: instagram || '@SABILS',
                    posts: postsString
                };
                break;

            default:
                // Fallback for other types
                const { title: defaultTitle, subtitle: defaultSubtitle, description: defaultDescription, instagram: defaultInstagram } = req.body;
                updateData = {
                    ...updateData,
                    title: defaultTitle,
                    subtitle: defaultSubtitle,
                    description: defaultDescription,
                    ...(imageUrl ? { image: imageUrl } : {}),
                    ...(defaultInstagram ? { instagram: defaultInstagram } : {})
                };
        }

        console.log('Update data prepared:', updateData);

        // Find existing section or create new one
        let section = await PageContent.findOne({ type });
        
        if (section) {
            // Update existing section
            Object.assign(section, updateData);
            await section.save();
            console.log('Section updated:', section);
        } else {
            // Create new section
            section = await PageContent.create(updateData);
            console.log('New section created:', section);
        }

        res.json({
            success: true,
            message: 'Section updated successfully',
            data: section
        });

    } catch (error) {
        console.error('Error updating section:', error);
        
        // Send a properly formatted error response
        res.status(500).json({
            success: false,
            message: 'Error updating section',
            error: process.env.NODE_ENV === 'production' 
                ? 'An error occurred while saving changes' 
                : error.message
        });
    }
};