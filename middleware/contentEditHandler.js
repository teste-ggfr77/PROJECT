const multer = require('multer');
const cloudinary = require('../config/cloudinary.config');
const { promisify } = require('util');
const fs = require('fs');
const unlinkAsync = promisify(fs.unlink);

// Configure multer for memory storage
const storage = multer.diskStorage({
    destination: '/tmp',
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
        files: 10 // max 10 files at once
    }
});

const handleContentEdit = async (req, res, next) => {
    try {
        // Log request details
        console.log('Content Edit Request:', {
            method: req.method,
            path: req.path,
            body: req.body,
            files: req.files,
            headers: req.headers
        });

        // If there are files to upload
        if (req.files && req.files.length > 0) {
            const uploadPromises = req.files.map(async (file) => {
                try {
                    // Upload to Cloudinary with retry logic
                    let retryCount = 0;
                    let result;
                    
                    while (retryCount < 3) {
                        try {
                            result = await cloudinary.uploader.upload(file.path, {
                                folder: 'page-content',
                                resource_type: 'auto',
                                timeout: 60000
                            });
                            break;
                        } catch (uploadError) {
                            retryCount++;
                            console.error(`Upload attempt ${retryCount} failed:`, uploadError);
                            if (retryCount === 3) throw uploadError;
                            await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
                        }
                    }

                    // Clean up the temporary file
                    await unlinkAsync(file.path).catch(err => 
                        console.error('Error deleting temp file:', err)
                    );

                    return {
                        fieldname: file.fieldname,
                        url: result.secure_url
                    };
                } catch (error) {
                    console.error(`Error processing file ${file.fieldname}:`, error);
                    throw error;
                }
            });

            try {
                const uploadedFiles = await Promise.all(uploadPromises);
                req.uploadedFiles = uploadedFiles;
            } catch (error) {
                console.error('File upload error:', error);
                return res.status(500).json({
                    success: false,
                    message: 'Error uploading files',
                    error: process.env.NODE_ENV === 'production' 
                        ? 'File upload failed' 
                        : error.message
                });
            }
        }

        next();
    } catch (error) {
        console.error('Content edit handler error:', error);
        next(error);
    }
};

module.exports = {
    upload,
    handleContentEdit
};
