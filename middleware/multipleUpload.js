const multer = require('multer');
const path = require('path');

const fs = require('fs');

// Ensure upload directories exist
const ensureUploadDirs = () => {
    const dirs = ['uploads/temp', 'public/uploads'];
    dirs.forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
            console.log(`Created directory: ${dir}`);
        }
    });
};

// Initialize directories
ensureUploadDirs();

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Use public/uploads directly to avoid file moving issues
        cb(null, 'public/uploads');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, file.fieldname + '-' + uniqueSuffix + ext);
    }
});

const fileFilter = (req, file, cb) => {
    // Check file type
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

// Middleware for handling product uploads (main image + color images)
const uploadProductImages = (req, res, next) => {
    // Use upload.any() to catch all files with dynamic field names
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
        
        console.log('Upload middleware - received files:', req.files ? req.files.length : 0);
        console.log('Upload middleware - file details:', req.files ? req.files.map(f => ({
            fieldname: f.fieldname,
            filename: f.filename,
            originalname: f.originalname,
            size: f.size
        })) : 'none');
        
        // Process uploaded files
        if (req.files && req.files.length > 0) {
            let mainImageFile = null;
            const colorImageFiles = [];
            const additionalPhotoFiles = [];
            const allFiles = [...req.files]; // Keep original files array
            
            // Separate main image, color images, and additional photos
            req.files.forEach(file => {
                if (file.fieldname === 'image') {
                    mainImageFile = file;
                } else if (file.fieldname.startsWith('colorImages_')) {
                    colorImageFiles.push(file);
                } else if (file.fieldname.startsWith('additionalPhotos_')) {
                    additionalPhotoFiles.push(file);
                }
            });
            
            // Set up req.file for main image (for backward compatibility)
            if (mainImageFile) {
                req.file = mainImageFile;
                console.log('Main image found:', mainImageFile.filename);
            }
            
            // Keep all files in req.files for processing in controller
            req.files = allFiles;
            console.log('Files processed:', {
                mainImage: mainImageFile ? 1 : 0,
                colorImages: colorImageFiles.length,
                additionalPhotos: additionalPhotoFiles.length,
                total: allFiles.length
            });
        } else {
            console.log('No files received in upload middleware');
        }
        
        next();
    });
};

module.exports = {
    upload,
    uploadProductImages
};