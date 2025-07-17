const cloudinary = require('../config/cloudinary.config');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { promisify } = require('util');
const unlinkAsync = promisify(fs.unlink);

// Configure multer for temporary file storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const tempDir = path.join(process.cwd(), 'tmp');
        // Ensure temp directory exists
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }
        cb(null, tempDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

// File filter function
const fileFilter = (req, file, cb) => {
    // Accept images only
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
        return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
};

// Create multer upload instance
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
        files: 10 // Maximum 10 files
    }
});

// Helper function to upload file to Cloudinary with retries
async function uploadToCloudinary(file, options = {}) {
    const maxRetries = 3;
    let attempt = 0;
    
    while (attempt < maxRetries) {
        try {
            console.log(`Attempting to upload file ${file.filename} (attempt ${attempt + 1})`);
            
            const result = await cloudinary.uploader.upload(file.path, {
                folder: 'page-content',
                resource_type: 'auto',
                timeout: 60000,
                ...options
            });
            
            console.log(`Successfully uploaded file ${file.filename} to Cloudinary`);
            
            // Clean up the temporary file
            try {
                await unlinkAsync(file.path);
                console.log(`Cleaned up temporary file ${file.path}`);
            } catch (unlinkError) {
                console.error('Error deleting temporary file:', unlinkError);
                // Don't throw here, as the upload was successful
            }
            
            return result;
        } catch (error) {
            attempt++;
            console.error(`Upload attempt ${attempt} failed for ${file.filename}:`, error);
            
            if (attempt === maxRetries) {
                throw new Error(`Failed to upload file after ${maxRetries} attempts: ${error.message}`);
            }
            
            // Wait before retrying (exponential backoff)
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
    }
}

// Middleware to handle file uploads
const handleFileUploads = async (req, res, next) => {
    try {
        if (!req.files || req.files.length === 0) {
            console.log('No files to process');
            return next();
        }

        console.log(`Processing ${req.files.length} files`);
        const uploadedFiles = {};

        for (const file of req.files) {
            try {
                console.log(`Starting upload process for ${file.fieldname}`);
                const result = await uploadToCloudinary(file);
                uploadedFiles[file.fieldname] = result.secure_url;
                console.log(`Successfully processed ${file.fieldname}: ${result.secure_url}`);
            } catch (error) {
                console.error(`Error processing file ${file.fieldname}:`, error);
                // Clean up any uploaded files
                for (const uploadedFile of req.files) {
                    try {
                        await unlinkAsync(uploadedFile.path).catch(() => {});
                    } catch (cleanupError) {
                        console.error('Error during cleanup:', cleanupError);
                    }
                }
                return res.status(400).json({
                    success: false,
                    message: 'File upload failed',
                    error: `Failed to upload file: ${file.fieldname}`
                });
            }
        }

        // Attach the uploaded files to the request object
        req.uploadedFiles = uploadedFiles;
        next();
    } catch (error) {
        console.error('Unexpected error in handleFileUploads:', error);
        next(error);
    }
};

module.exports = {
    upload,
    handleFileUploads
};
