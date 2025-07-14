const fs = require('fs');
const path = require('path');

// Read the current product-details.ejs file
const filePath = path.join(__dirname, 'views', 'product-details.ejs');
let content = fs.readFileSync(filePath, 'utf8');

// Fix all the syntax errors
content = content.replace(/console\.log\('Product has colorVariants:' product\.colorVariants\.length\);/g, 
    "console.log('Product has colorVariants:', product.colorVariants.length);");

content = content.replace(/console\.log\('Processing variant:' variant\.name 'with' variant\.images \? variant\.images\.length : 0 'images'\);/g, 
    "console.log('Processing variant:', variant.name, 'with', variant.images ? variant.images.length : 0, 'images');");

content = content.replace(/console\.log\('Using fallback color system for' product\.colors\.length 'colors'\);/g, 
    "console.log('Using fallback color system for', product.colors.length, 'colors');");

content = content.replace(/console\.log\('Total product images:' productImages\.length\);/g, 
    "console.log('Total product images:', productImages.length);");

// Fix forEach syntax errors
content = content.replace(/product\.colorVariants\.forEach\(\(variant index\) => \{/g, 
    "product.colorVariants.forEach((variant, index) => {");

content = content.replace(/product\.colors\.forEach\(\(color index\) => \{/g, 
    "product.colors.forEach((color, index) => {");

// Fix missing commas in replace function
content = content.replace(/variantImagesJson\.replace\(\/\"\/g '&quot;'\)/g, 
    'variantImagesJson.replace(/"/g, \'&quot;\')');

// Fix padStart function calls
content = content.replace(/productImages\.length\.toString\(\)\.padStart\(2 '0'\)/g, 
    "productImages.length.toString().padStart(2, '0')");

// Write the updated content back to the file
fs.writeFileSync(filePath, content, 'utf8');

console.log('✅ Fixed all EJS syntax errors in product-details.ejs');
console.log('🔧 Fixed console.log statements with proper commas and quotes');
console.log('🔧 Fixed forEach function parameters');
console.log('🔧 Fixed replace function calls');
console.log('🔧 Fixed padStart function calls');