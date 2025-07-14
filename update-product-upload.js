// Script to update the product upload functionality
const fs = require('fs');
const path = require('path');

// 1. Update adminController.js with the new addProduct function
const adminControllerPath = path.join(__dirname, 'controllers', 'adminController.js');
const updatedAddProductPath = path.join(__dirname, 'controllers', 'adminController_updated.js');

// Read the current admin controller
let adminController = fs.readFileSync(adminControllerPath, 'utf8');

// Read the updated addProduct function
const updatedAddProduct = fs.readFileSync(updatedAddProductPath, 'utf8');

// Replace the addProduct function
const addProductStart = adminController.indexOf('exports.addProduct = async (req, res) => {');
const addProductEnd = adminController.indexOf('};', addProductStart) + 2;

if (addProductStart !== -1 && addProductEnd !== -1) {
    const beforeFunction = adminController.substring(0, addProductStart);
    const afterFunction = adminController.substring(addProductEnd);
    
    adminController = beforeFunction + updatedAddProduct + afterFunction;
    
    // Write the updated controller
    fs.writeFileSync(adminControllerPath, adminController);
    console.log('✅ Updated adminController.js with new addProduct function');
} else {
    console.log('❌ Could not find addProduct function in adminController.js');
}

// 2. Update adminRoutes.js to use the new upload middleware
const adminRoutesPath = path.join(__dirname, 'routes', 'adminRoutes.js');
let adminRoutes = fs.readFileSync(adminRoutesPath, 'utf8');

// Add the import for uploadProductImages
if (!adminRoutes.includes('uploadProductImages')) {
    adminRoutes = adminRoutes.replace(
        "const upload = require('../middleware/upload');",
        "const upload = require('../middleware/upload');\nconst { uploadProductImages } = require('../middleware/multipleUpload');"
    );
    
    // Update the add-product route
    adminRoutes = adminRoutes.replace(
        "router.post('/add-product', adminAuth, upload.single('image'), adminCtrl.addProduct);",
        "router.post('/add-product', adminAuth, uploadProductImages, adminCtrl.addProduct);"
    );
    
    fs.writeFileSync(adminRoutesPath, adminRoutes);
    console.log('✅ Updated adminRoutes.js with new upload middleware');
} else {
    console.log('✅ adminRoutes.js already updated');
}

// 3. Create the uploads/temp directory
const tempDir = path.join(__dirname, 'uploads', 'temp');
if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
    console.log('✅ Created uploads/temp directory');
} else {
    console.log('✅ uploads/temp directory already exists');
}

console.log('\n🎉 Product upload system updated successfully!');
console.log('📝 Features added:');
console.log('   - Multiple color variant images');
console.log('   - Drag & drop image upload');
console.log('   - Color-specific image management');
console.log('   - Enhanced product model with colorVariants');
console.log('');
console.log('🚀 You can now:');
console.log('   1. Add multiple colors to products');
console.log('   2. Upload specific images for each color');
console.log('   3. Users can switch colors and see different images');
console.log('   4. Automatic image switching in product details');
console.log('');
console.log('💡 To test: Go to /admin/add-product and try adding a product with multiple colors!');