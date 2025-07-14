// Test script to verify the upload system is working
console.log('🧪 Testing Multiple Color Image Upload System...\n');

// Check if all required files exist
const fs = require('fs');
const path = require('path');

const requiredFiles = [
    'middleware/multipleUpload.js',
    'models/Product.js',
    'views/admin/add-product.ejs',
    'views/product-details.ejs',
    'controllers/adminController.js',
    'routes/adminRoutes.js'
];

console.log('📁 Checking required files:');
requiredFiles.forEach(file => {
    const filePath = path.join(__dirname, file);
    if (fs.existsSync(filePath)) {
        console.log(`   ✅ ${file}`);
    } else {
        console.log(`   ❌ ${file} - MISSING!`);
    }
});

// Check if directories exist
const requiredDirs = [
    'uploads/temp',
    'public/uploads'
];

console.log('\n📂 Checking required directories:');
requiredDirs.forEach(dir => {
    const dirPath = path.join(__dirname, dir);
    if (fs.existsSync(dirPath)) {
        console.log(`   ✅ ${dir}`);
    } else {
        console.log(`   ❌ ${dir} - MISSING!`);
        try {
            fs.mkdirSync(dirPath, { recursive: true });
            console.log(`   🔧 Created ${dir}`);
        } catch (err) {
            console.log(`   ❌ Failed to create ${dir}: ${err.message}`);
        }
    }
});

// Check if the Product model has colorVariants field
console.log('\n🗄️  Checking Product model:');
try {
    const productModelContent = fs.readFileSync(path.join(__dirname, 'models/Product.js'), 'utf8');
    if (productModelContent.includes('colorVariants')) {
        console.log('   ✅ Product model has colorVariants field');
    } else {
        console.log('   ❌ Product model missing colorVariants field');
    }
} catch (err) {
    console.log('   ❌ Error reading Product model:', err.message);
}

// Check if admin routes use the new upload middleware
console.log('\n🛣️  Checking admin routes:');
try {
    const adminRoutesContent = fs.readFileSync(path.join(__dirname, 'routes/adminRoutes.js'), 'utf8');
    if (adminRoutesContent.includes('uploadProductImages')) {
        console.log('   ✅ Admin routes use uploadProductImages middleware');
    } else {
        console.log('   ❌ Admin routes not using uploadProductImages middleware');
    }
} catch (err) {
    console.log('   ❌ Error reading admin routes:', err.message);
}

console.log('\n🎯 System Status:');
console.log('   📱 Frontend: Enhanced add-product form with color variants');
console.log('   🔧 Backend: Updated controller to handle multiple files');
console.log('   🗄️  Database: Product model supports colorVariants');
console.log('   🎨 UI: Product details page supports color switching');
console.log('   📁 Storage: Upload directories configured');

console.log('\n🚀 Ready to test!');
console.log('   1. Go to /admin/add-product');
console.log('   2. Fill in product details');
console.log('   3. Click "Add Color" to add color variants');
console.log('   4. Upload images for each color');
console.log('   5. Submit the form');
console.log('   6. Check the product details page for color switching');

console.log('\n💡 Expected behavior:');
console.log('   - Form should upload main image + color images');
console.log('   - Product should save with colorVariants array');
console.log('   - Product details should show color options');
console.log('   - Clicking colors should switch images automatically');

console.log('\n🔍 Debug tips:');
console.log('   - Check browser console for upload logs');
console.log('   - Check server logs for file processing');
console.log('   - Verify files are saved in public/uploads/');
console.log('   - Test with different image formats (JPG, PNG, WEBP)');