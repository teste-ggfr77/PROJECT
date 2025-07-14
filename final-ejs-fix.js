const fs = require('fs');
const path = require('path');

// Read the current product-details.ejs file
const filePath = path.join(__dirname, 'views', 'product-details.ejs');
let content = fs.readFileSync(filePath, 'utf8');

// Fix the forEach syntax errors that are still there
content = content.replace(
    /product\.colorVariants\.forEach\(\(variant index\) => \{/g,
    'product.colorVariants.forEach((variant, index) => {'
);

content = content.replace(
    /product\.colors\.forEach\(\(color index\) => \{/g,
    'product.colors.forEach((color, index) => {'
);

// Fix the replace function call that's still broken
content = content.replace(
    /variantImagesJson\.replace\(\/\"\/g '&quot;'\)/g,
    'variantImagesJson.replace(/"/g, \'&quot;\')'
);

// Write the updated content back to the file
fs.writeFileSync(filePath, content, 'utf8');

console.log('✅ Fixed final EJS syntax errors');
console.log('🔧 Fixed forEach function parameters');
console.log('🔧 Fixed replace function calls');