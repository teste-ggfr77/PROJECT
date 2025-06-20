document.addEventListener('DOMContentLoaded', function() {
    const contentTypeSelect = document.getElementById('type');
    const featuredOptions = document.getElementById('featuredOptions');

    function toggleContentOptions() {
        const selectedType = contentTypeSelect.value;
        
        // Hide all content type specific options first
        document.querySelectorAll('.content-type-options').forEach(el => {
            el.style.display = 'none';
        });

        // Show options based on selected content type
        if (selectedType === 'featured') {
            featuredOptions.style.display = 'block';
        }
    }

    contentTypeSelect.addEventListener('change', toggleContentOptions);
    toggleContentOptions(); // Run once on page load
});
