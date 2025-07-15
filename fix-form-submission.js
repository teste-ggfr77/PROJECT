// Script to fix the form submission in add-product.ejs
const fs = require('fs');
const path = require('path');

const addProductPath = path.join(__dirname, 'views', 'admin', 'add-product.ejs');
let content = fs.readFileSync(addProductPath, 'utf8');

// Find and replace the form submission section
const formSubmissionStart = content.indexOf('// Form submission');
const formSubmissionEnd = content.indexOf('});', formSubmissionStart) + 3;

if (formSubmissionStart !== -1 && formSubmissionEnd !== -1) {
    const beforeSubmission = content.substring(0, formSubmissionStart);
    const afterSubmission = content.substring(formSubmissionEnd);
    
    const newFormSubmission = `// Form submission
document.getElementById('productForm').addEventListener('submit', function(e) {
    e.preventDefault(); // Always prevent default to handle files properly
    
    const fileInput = document.getElementById('image');
    
    // Validate main image
    if (fileInput.files.length === 0) {
        alert('Please select a main product image');
        return;
    }
    
    console.log('Submitting form with color variants:', colorVariants.length);
    
    // Create FormData to handle file uploads
    const formData = new FormData();
    
    // Add all form fields manually
    formData.append('name', document.getElementById('name').value);
    formData.append('description', document.getElementById('description').value);
    formData.append('price', document.getElementById('price').value);
    formData.append('quantity', document.getElementById('quantity').value);
    formData.append('sizes', document.getElementById('sizes').value);
    formData.append('category', document.getElementById('category').value);
    formData.append('colorsData', document.getElementById('colorsData').value);
    
    // Add CSRF token
    const csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute('content');
    formData.append('_csrf', csrfToken);
    
    // Add main image
    if (fileInput.files[0]) {
        formData.append('image', fileInput.files[0]);
        console.log('Added main image:', fileInput.files[0].name);
    }
    
    // Add color variant images to FormData
    let totalColorImages = 0;
    colorVariants.forEach((variant, variantIndex) => {
        variant.images.forEach((image, imageIndex) => {
            if (image.file) {
                const fieldName = \`colorImages_\${variant.name}_\${imageIndex}\`;
                formData.append(fieldName, image.file);
                console.log(\`Added color image: \${fieldName} - \${image.file.name}\`);
                totalColorImages++;
            }
        });
    });
    
    console.log(\`Total color images being uploaded: \${totalColorImages}\`);
    
    // Show loading state
    const submitBtn = this.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Uploading...';
    submitBtn.disabled = true;
    
    // Submit with fetch
    fetch('/admin/add-product', {
        method: 'POST',
        body: formData
    })
    .then(response => {
        console.log('Upload response status:', response.status);
        if (response.ok) {
            window.location.href = '/admin/dashboard';
        } else {
            return response.text().then(text => {
                console.error('Upload error response:', text);
                throw new Error(\`Upload failed: \${response.status}\`);
            });
        }
    })
    .catch(error => {
        console.error('Upload error:', error);
        alert('Error uploading product: ' + error.message);
        
        // Restore button state
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    });
});`;
    
    const newContent = beforeSubmission + newFormSubmission + afterSubmission;
    fs.writeFileSync(addProductPath, newContent);
    console.log('✅ Fixed form submission in add-product.ejs');
} else {
    console.log('❌ Could not find form submission section');
}

console.log('🔧 Form submission fix applied!');
console.log('📝 Changes made:');
console.log('   - Always prevent default form submission');
console.log('   - Manually build FormData with all fields');
console.log('   - Properly append color images with correct field names');
console.log('   - Add loading state during upload');
console.log('   - Better error handling and logging');