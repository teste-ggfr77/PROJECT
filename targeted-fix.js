const fs = require('fs');
const path = require('path');

// Read the current product-details.ejs file
const filePath = path.join(__dirname, 'views', 'product-details.ejs');
let content = fs.readFileSync(filePath, 'utf8');

// Split content into lines for precise editing
let lines = content.split('\n');

// Find and fix specific problematic lines
for (let i = 0; i < lines.length; i++) {
    // Fix forEach syntax errors
    if (lines[i].includes('product.colorVariants.forEach((variant index)')) {
        lines[i] = lines[i].replace('(variant index)', '(variant, index)');
        console.log(`Fixed line ${i + 1}: forEach colorVariants`);
    }
    
    if (lines[i].includes('product.colors.forEach((color index)')) {
        lines[i] = lines[i].replace('(color index)', '(color, index)');
        console.log(`Fixed line ${i + 1}: forEach colors`);
    }
    
    // Fix replace function calls
    if (lines[i].includes('variantImagesJson.replace(/"/g \'&quot;\')')) {
        lines[i] = lines[i].replace('/"/g \'&quot;\'', '/"/g, \'&quot;\'');
        console.log(`Fixed line ${i + 1}: replace function`);
    }
    
    // Fix padStart calls
    if (lines[i].includes('.padStart(2 \'0\')')) {
        lines[i] = lines[i].replace('.padStart(2 \'0\')', '.padStart(2, \'0\')');
        console.log(`Fixed line ${i + 1}: padStart function`);
    }
}

// Join lines back together
content = lines.join('\n');

// Write the updated content back to the file
fs.writeFileSync(filePath, content, 'utf8');

console.log('✅ Applied targeted fixes to all syntax errors');
console.log('🔧 Fixed forEach function parameters');
console.log('🔧 Fixed replace function calls');
console.log('🔧 Fixed padStart function calls');