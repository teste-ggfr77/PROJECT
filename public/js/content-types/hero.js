// Hero Section Interactions
document.addEventListener('DOMContentLoaded', () => {
    // Initialize hero section elements
    const heroSections = document.querySelectorAll('.hero-section');
    
    heroSections.forEach(section => {
        const video = section.querySelector('video');
        const playPauseBtn = section.querySelector('.control-button');
        const dots = section.querySelectorAll('.progress-dot');
        let isPlaying = true;

        // Video play/pause toggling
        if (video && playPauseBtn) {
            playPauseBtn.addEventListener('click', () => {
                if (isPlaying) {
                    video.pause();
                    playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
                } else {
                    video.play();
                    playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
                }
                isPlaying = !isPlaying;
            });
        }

        // Initialize video (if present)
        if (video) {
            video.play().catch(() => {
                // Autoplay prevented by browser
                isPlaying = false;
                if (playPauseBtn) {
                    playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
                }
            });
        }

        // Handle progress dots for slideshows (if present)
        if (dots.length > 0) {
            let currentIndex = 0;
            const totalSlides = dots.length;

            // Auto-advance slides every 5 seconds
            const autoAdvance = setInterval(() => {
                updateSlide((currentIndex + 1) % totalSlides);
            }, 5000);

            // Update active dot and slide
            function updateSlide(newIndex) {
                dots[currentIndex].classList.remove('active');
                dots[newIndex].classList.remove('hover');
                dots[newIndex].classList.add('active');
                currentIndex = newIndex;

                // Here you can add slide transition logic if needed
                // For example, transitioning between multiple background images
            }

            // Add click handlers to dots
            dots.forEach((dot, index) => {
                dot.addEventListener('click', () => {
                    clearInterval(autoAdvance);
                    updateSlide(index);
                });

                // Add hover effect
                dot.addEventListener('mouseenter', () => {
                    if (index !== currentIndex) {
                        dot.classList.add('hover');
                    }
                });

                dot.addEventListener('mouseleave', () => {
                    dot.classList.remove('hover');
                });
            });
        }

        // Parallax effect for background images
        const heroImage = section.querySelector('.hero-bg img');
        if (heroImage) {
            window.addEventListener('scroll', () => {
                const scrolled = window.pageYOffset;
                const rate = scrolled * 0.5;
                heroImage.style.transform = `translate3d(0, ${rate}px, 0)`;
            });
        }
    });
});
