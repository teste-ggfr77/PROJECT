const fs = require('fs');
const path = require('path');

// Read the current product-details.ejs file
const filePath = path.join(__dirname, 'views', 'product-details.ejs');
let content = fs.readFileSync(filePath, 'utf8');

// Fix the missing %> after the first JavaScript block
content = content.replace(
    /console\.log\('Total product images:', productImages\.length\);\s*<img/,
    "console.log('Total product images:', productImages.length);\n        %>\n        <img"
);

// Fix the padStart function call that's still broken
content = content.replace(
    /productImages\.length\.toString\(\)\.padStart\(2 '0'\)/g,
    "productImages.length.toString().padStart(2, '0')"
);

// Fix any remaining console.log issues
content = content.replace(
    /console\.log\('Total product images:' productImages\.length\)/g,
    "console.log('Total product images:', productImages.length)"
);

// Write the updated content back to the file
fs.writeFileSync(filePath, content, 'utf8');

console.log('✅ Fixed all remaining EJS syntax errors');
console.log('🔧 Added missing %> closing tag');
console.log('🔧 Fixed padStart function calls');
console.log('🔧 Fixed console.log statements');