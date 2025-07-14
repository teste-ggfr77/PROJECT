// Script to update product-details.ejs to work with colorVariants
const fs = require('fs');
const path = require('path');

const productDetailsPath = path.join(__dirname, 'views', 'product-details.ejs');
let content = fs.readFileSync(productDetailsPath, 'utf8');

// Update the image array generation
const imageArrayStart = content.indexOf('const productImages = [];');
const imageArrayEnd = content.indexOf('});', imageArrayStart) + 3;

if (imageArrayStart !== -1 && imageArrayEnd !== -1) {
    const beforeImageArray = content.substring(0, imageArrayStart);
    const afterImageArray = content.substring(imageArrayEnd);
    
    const newImageArray = `const productImages = [];
        productImages.push(product.image);
        
        // Add color variant images if they exist
        if (product.colorVariants && product.colorVariants.length > 0) {
            product.colorVariants.forEach(variant => {
                if (variant.images && variant.images.length > 0) {
                    variant.images.forEach(image => {
                        productImages.push(image);
                    });
                } else {
                    // Fallback to main image if no variant images
                    productImages.push(product.image);
                }
            });
        } else {
            // Fallback: generate images based on color names
            product.colors.forEach(color => {
                productImages.push(\`/uploads/\${color.toLowerCase()}.jpg\`);
            });
        }`;
    
    content = beforeImageArray + newImageArray + afterImageArray;
}

// Update the variant images section
const variantImagesStart = content.indexOf('<div class="variant-images">');
const variantImagesEnd = content.indexOf('</div>', variantImagesStart) + 6;

if (variantImagesStart !== -1 && variantImagesEnd !== -1) {
    const beforeVariantImages = content.substring(0, variantImagesStart);
    const afterVariantImages = content.substring(variantImagesEnd);
    
    const newVariantImages = `<div class="variant-images">
                <% if (product.colorVariants && product.colorVariants.length > 0) { %>
                    <% product.colorVariants.forEach((variant, index) => { %>
                        <img src="<%= variant.images && variant.images.length > 0 ? variant.images[0] : product.image %>" 
                             alt="<%= variant.name %>" 
                             class="variant-image <%= index === 0 ? 'selected' : '' %>"
                             data-color="<%= variant.name %>"
                             data-images="<%= JSON.stringify(variant.images || [product.image]) %>">
                    <% }) %>
                <% } else { %>
                    <% product.colors.forEach((color, index) => { %>
                        <img src="/uploads/<%= color.toLowerCase() %>" 
                             alt="<%= color %>" 
                             class="variant-image <%= index === 0 ? 'selected' : '' %>"
                             data-color="<%= color %>">
                    <% }) %>
                <% } %>
            </div>`;
    
    content = beforeVariantImages + newVariantImages + afterVariantImages;
}

// Update the JavaScript section for color switching
const jsColorSwitchStart = content.indexOf('variantImages.forEach((img, index) => {');
const jsColorSwitchEnd = content.indexOf('});', jsColorSwitchStart) + 3;

if (jsColorSwitchStart !== -1 && jsColorSwitchEnd !== -1) {
    const beforeColorSwitch = content.substring(0, jsColorSwitchStart);
    const afterColorSwitch = content.substring(jsColorSwitchEnd);
    
    const newColorSwitch = `variantImages.forEach((img, index) => {
        img.addEventListener('click', function() {
            variantImages.forEach(image => image.classList.remove('selected'));
            this.classList.add('selected');
            
            const selectedColor = this.getAttribute('data-color');
            const colorImages = this.getAttribute('data-images');
            
            selectedColorInput.value = selectedColor;
            document.getElementById('selectedColorText').textContent = selectedColor;
            console.log('Color selected:', selectedColor);
            
            // Update main image to show the selected color
            if (colorImages) {
                try {
                    const images = JSON.parse(colorImages);
                    if (images && images.length > 0) {
                        mainImage.src = images[0];
                        // Update productImages array for navigation
                        productImages.length = 0;
                        productImages.push(product.image);
                        images.forEach(img => productImages.push(img));
                        currentImageIndex = 1; // Start with first color image
                        updateImage();
                    }
                } catch (e) {
                    console.error('Error parsing color images:', e);
                    currentImageIndex = index + 1;
                    updateImage();
                }
            } else {
                currentImageIndex = index + 1;
                updateImage();
            }
        });
    }`;
    
    content = beforeColorSwitch + newColorSwitch + afterColorSwitch;
}

fs.writeFileSync(productDetailsPath, content);
console.log('✅ Updated product-details.ejs to work with colorVariants');

console.log('🎨 Product Details fix applied!');
console.log('📝 Changes made:');
console.log('   - Support for colorVariants with multiple images per color');
console.log('   - Fallback to old color system if no colorVariants');
console.log('   - Proper image switching when colors are selected');
console.log('   - Enhanced color variant display');