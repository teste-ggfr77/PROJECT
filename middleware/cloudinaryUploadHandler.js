const cloudinary = require('../config/cloudinary.config');
const { promisify } = require('util');
const fs = require('fs');
const unlinkAsync = promisify(fs.unlink);

// Maximum retry attempts for uploads
const MAX_RETRIES = 3;
// Base delay for exponential backoff (in ms)
const BASE_DELAY = 1000;

class CloudinaryUploadError extends Error {
    constructor(message, code, retryable = true) {
        super(message);
        this.name = 'CloudinaryUploadError';
        this.code = code;
        this.retryable = retryable;
    }
}

async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function uploadToCloudinary(file, options = {}, attemptNumber = 1) {
    try {
        const result = await cloudinary.uploader.upload(file.path, options);
        // Clean up the temporary file after successful upload
        await unlinkAsync(file.path);
        return result;
    } catch (error) {
        // Clean up the temporary file in case of error
        try {
            await unlinkAsync(file.path);
        } catch (unlinkError) {
            console.error('Failed to clean up temporary file:', unlinkError);
        }

        const isRetryableError = error.message?.includes('cdg1::');
        if (isRetryableError && attemptNumber < MAX_RETRIES) {
            // Calculate delay with exponential backoff
            const retryDelay = BASE_DELAY * Math.pow(2, attemptNumber - 1);
            await delay(retryDelay);
            
            // Retry the upload
            return uploadToCloudinary(file, options, attemptNumber + 1);
        }

        throw new CloudinaryUploadError(
            'Failed to upload file to Cloudinary',
            error.message?.match?.(/cdg1::\S+/)?.[0] || 'UPLOAD_FAILED',
            isRetryableError
        );
    }
}

async function uploadMultiple(files, options = {}) {
    const results = [];
    const errors = [];

    await Promise.all(files.map(async (file) => {
        try {
            const result = await uploadToCloudinary(file, options);
            results.push(result);
        } catch (error) {
            errors.push({ file: file.originalname, error });
        }
    }));

    if (errors.length > 0) {
        const error = new CloudinaryUploadError(
            'Some files failed to upload',
            'PARTIAL_UPLOAD_FAILURE'
        );
        error.errors = errors;
        error.successfulUploads = results;
        throw error;
    }

    return results;
}

module.exports = {
    upload: uploadToCloudinary,
    uploadMultiple,
    CloudinaryUploadError
};
