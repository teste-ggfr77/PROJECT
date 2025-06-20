// Nobull-inspired interactions
document.addEventListener('DOMContentLoaded', () => {
    // Fade in elements on scroll
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
    };

    const fadeInObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('nobull-fade-in');
                fadeInObserver.unobserve(entry.target);
            }
        });
    }, observerOptions);

    // Observe all content sections
    document.querySelectorAll('.nobull-content').forEach(section => {
        section.classList.remove('nobull-fade-in');
        fadeInObserver.observe(section);
    });

    // Parallax effect for background images
    const parallaxSections = document.querySelectorAll('.nobull-bg-image');
    window.addEventListener('scroll', () => {
        parallaxSections.forEach(section => {
            const scrolled = window.pageYOffset;
            const rate = scrolled * 0.3;
            section.style.transform = `translate3d(0, ${rate}px, 0)`;
        });
    });

    // Smooth video playback
    const videos = document.querySelectorAll('.nobull-video');
    videos.forEach(video => {
        video.play().catch(() => {
            // Autoplay blocked - show play button or handle gracefully
            console.log('Video autoplay blocked');
        });
    });

    // Dynamic header behavior
    let lastScroll = 0;
    const header = document.querySelector('.header');
    if (header) {
        window.addEventListener('scroll', () => {
            const currentScroll = window.pageYOffset;
            if (currentScroll > lastScroll && currentScroll > 100) {
                header.classList.add('hidden');
            } else {
                header.classList.remove('hidden');
            }
            lastScroll = currentScroll;
        });
    }
});
