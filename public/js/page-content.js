// Page Content JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // Initialize animations
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
    };

    const animationObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animated');
                observer.unobserve(entry.target); // Only animate once
            }
        });
    }, observerOptions);

    // Observe all animated elements
    document.querySelectorAll('[class*="fade-in"], [class*="slide-"], [class*="zoom"]').forEach(element => {
        animationObserver.observe(element);
    });

    // Handle responsive visibility
    function handleResponsiveVisibility() {
        const width = window.innerWidth;
        document.querySelectorAll('[data-hide-on-mobile], [data-hide-on-tablet], [data-hide-on-desktop]').forEach(element => {
            if (width < 768 && element.hasAttribute('data-hide-on-mobile')) {
                element.style.display = 'none';
            } else if (width >= 768 && width < 1024 && element.hasAttribute('data-hide-on-tablet')) {
                element.style.display = 'none';
            } else if (width >= 1024 && element.hasAttribute('data-hide-on-desktop')) {
                element.style.display = 'none';
            } else {
                element.style.display = '';
            }
        });
    }

    // Initial check and listen for window resize
    handleResponsiveVisibility();
    window.addEventListener('resize', handleResponsiveVisibility);
});
