const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Cloudinary storage configuration
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: (req, file) => {
        // Determine folder based on the route or field name
        let folder = 'uploads';
        if (req.route && req.route.path.includes('product')) {
            folder = 'products';
        } else if (req.route && req.route.path.includes('section')) {
            folder = 'page-content';
        } else if (file.fieldname && file.fieldname.includes('product')) {
            folder = 'page-content/products';
        } else if (file.fieldname && file.fieldname.includes('post')) {
            folder = 'page-content/community';
        } else if (req.url && req.url.includes('admin')) {
            folder = 'page-content';
        }
        
        return {
            folder: folder,
            allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
            transformation: [
                { width: 1000, height: 1000, crop: 'limit', quality: 'auto' }
            ]
        };
    }
});

// File filter
const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WEBP images are allowed.'), false);
    }
};

const upload = multer({ 
    storage, 
    fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
        files: 50 // Maximum 50 files
    }
});

// Middleware for handling product uploads (main image + additional photos)
const uploadProductImages = (req, res, next) => {
    const uploadAny = upload.any();

    uploadAny(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                req.fileValidationError = 'File size too large. Maximum size is 5MB.';
            } else if (err.code === 'LIMIT_FILE_COUNT') {
                req.fileValidationError = 'Too many files. Maximum is 50 files.';
            } else {
                req.fileValidationError = 'File upload error: ' + err.message;
            }
        } else if (err) {
            req.fileValidationError = err.message;
        }
        
        console.log('Cloudinary upload middleware - received files:', req.files ? req.files.length : 0);
        
        // Process uploaded files
        if (req.files && req.files.length > 0) {
            let mainImageFile = null;
            const additionalPhotoFiles = [];
            
            // Separate main image and additional photos
            req.files.forEach(file => {
                if (file.fieldname === 'image') {
                    mainImageFile = file;
                } else if (file.fieldname.startsWith('additionalPhotos_')) {
                    additionalPhotoFiles.push(file);
                }
            });
            
            // Set up req.file for main image (for backward compatibility)
            if (mainImageFile) {
                req.file = mainImageFile;
                console.log('Main image uploaded to Cloudinary:', mainImageFile.path);
            }
            
            console.log('Files processed:', {
                mainImage: mainImageFile ? 1 : 0,
                additionalPhotos: additionalPhotoFiles.length,
                total: req.files.length
            });
        } else {
            console.log('No files received in upload middleware');
        }
        
        next();
    });
};

module.exports = {
    upload,
    uploadProductImages,
    cloudinary
};