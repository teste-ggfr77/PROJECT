// Gender switcher functionality
document.addEventListener('DOMContentLoaded', function() {
    // Get stored gender preference or default to 'all'
    const currentGender = localStorage.getItem('preferredGender') || 'all';
    
    // Find all gender-specific elements
    const genderSwitcher = document.createElement('div');
    genderSwitcher.className = 'gender-switcher';
    genderSwitcher.innerHTML = `
        <select id="gender-select" class="gender-select">
            <option value="all">All Products</option>
            <option value="women">Women's</option>
            <option value="men">Men's</option>
        </select>
    `;

    // Insert the switcher into the page
    document.querySelector('.hero-section')?.insertBefore(genderSwitcher, document.querySelector('.hero-content'));

    // Style the switcher
    const style = document.createElement('style');
    style.textContent = `
        .gender-switcher {
            position: absolute;
            top: 20px;
            right: 20px;
            z-index: 10;
        }
        .gender-select {
            padding: 8px 16px;
            border-radius: 25px;
            border: 2px solid rgba(255, 255, 255, 0.2);
            background: rgba(0, 0, 0, 0.5);
            color: white;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            backdrop-filter: blur(10px);
        }
        .gender-select:hover {
            background: rgba(0, 0, 0, 0.7);
            border-color: rgba(255, 255, 255, 0.4);
        }
        .gender-select option {
            background: #000;
            color: white;
        }
    `;
    document.head.appendChild(style);

    // Set initial value
    const select = document.getElementById('gender-select');
    if (select) {
        select.value = currentGender;
        
        // Handle gender selection
        select.addEventListener('change', function(e) {
            const selectedGender = e.target.value;
            localStorage.setItem('preferredGender', selectedGender);
            
            // Redirect to appropriate page
            if (selectedGender === 'all') {
                window.location.href = '/';
            } else {
                const currentPath = window.location.pathname;
                const newPath = currentPath.replace(/^\/(men|women|all)/, `/${selectedGender}`);
                window.location.href = newPath;
            }
        });
    }
});
