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

        // Get the maximum order number
        const maxOrderContent = await PageContent.findOne().sort('-order');
        const order = maxOrderContent ? maxOrderContent.order + 1 : 1;

        let imageUrl = '';
        let additionalImageUrls = [];

        if (req.files) {
            if (req.files.image) {
                const result = await cloudinary.uploader.upload(req.files.image[0].path);
                imageUrl = result.secure_url;
                await unlinkFile(req.files.image[0].path);
            }

            if (req.files.additionalImages) {
                additionalImageUrls = await uploadMultipleImages(req.files.additionalImages);
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

        await content.save();
        res.json({ success: true, content });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: 'Error adding content' });
    }
};

exports.updateContent = async (req, res) => {
    try {
        const contentId = req.params.id;
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
            if (req.files.image) {
                if (content.imageUrl) {
                    const publicId = content.imageUrl.split('/').pop().split('.')[0];
                    await cloudinary.uploader.destroy(publicId);
                }
                const result = await cloudinary.uploader.upload(req.files.image[0].path);
                imageUrl = result.secure_url;
                await unlinkFile(req.files.image[0].path);
            }

            if (req.files.additionalImages) {
                // Delete existing additional images
                for (const url of content.additionalImages) {
                    const publicId = url.split('/').pop().split('.')[0];
                    await cloudinary.uploader.destroy(publicId);
                }
                additionalImageUrls = await uploadMultipleImages(req.files.additionalImages);
            }
        }

        content.type = type;
        content.title = title;
        content.subtitle = subtitle;
        content.description = description;
        content.imageUrl = imageUrl;
        content.additionalImages = additionalImageUrls;
        content.buttonText = buttonText;
        content.buttonLink = buttonLink;
        content.backgroundColor = backgroundColor;
        content.textColor = textColor;
        content.layout = layout;
        content.customClass = customClass;
        content.status = status;

        await content.save();
        res.json({ success: true, content });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: 'Error updating content' });
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
        const [heroSection, featuredSection, promoSection] = await Promise.all([
            PageContent.findOne({ type: 'hero' }),
            PageContent.findOne({ type: 'featured' }),
            PageContent.findOne({ type: 'promo' })
        ]);

        res.render('admin/edit-homepage', {
            title: 'Edit Homepage Content',
            heroSection,
            featuredSection,
            promoSection,
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
        console.log('Updating section:', type, 'with data:', req.body);
        
        let section = await PageContent.findOne({ type });
        
        // If section doesn't exist, create it
        if (!section) {
            section = new PageContent({ type });
        }

        // Update basic fields
        section.title = req.body.title || section.title;
        section.subtitle = req.body.subtitle || section.subtitle;
        section.description = req.body.description || section.description;

        // Handle image upload if present
        if (req.file) {
            // Delete old image if exists
            if (section.image) {
                try {
                    const publicId = section.image.split('/').pop().split('.')[0];
                    await cloudinary.uploader.destroy(publicId);
                } catch (err) {
                    console.log('Error deleting old image:', err);
                }
            }
            
            const result = await cloudinary.uploader.upload(req.file.path);
            section.image = result.secure_url;
            await unlinkFile(req.file.path);
        }

        // Handle section-specific fields
        switch (type) {
            case 'hero':
                if (req.body.videoUrl) {
                    section.videoUrl = req.body.videoUrl;
                }
                break;
            case 'promo':
            case 'promotion':
                // Store promotional messages in the description field as JSON
                if (req.body.messages) {
                    section.description = JSON.stringify(req.body.messages);
                }
                break;
        }

        await section.save();
        console.log('Section saved successfully:', section);

        req.flash('success', 'Section updated successfully');
        res.redirect('/admin/edit-homepage');
    } catch (error) {
        console.error('Error updating section:', error);
        req.flash('error', 'Failed to update section: ' + error.message);
        res.redirect('/admin/edit-homepage');
    }
};