document.addEventListener('DOMContentLoaded', function() {
    // Handle countdown timers
    const countdownTimers = document.querySelectorAll('.countdown-timer');
    
    countdownTimers.forEach(timer => {
        const endDate = new Date(timer.dataset.endDate).getTime();
        const now = new Date().getTime();
        
        // Don't start the timer if the promotion hasn't started yet
        if (now < new Date(timer.closest('.promotion-section').dataset.startDate).getTime()) {
            timer.innerHTML = '<div class="promotion-coming-soon">Coming Soon</div>';
            return;
        }
        
        const updateTimer = () => {
            const now = new Date().getTime();
            const distance = endDate - now;
            
            if (distance < 0) {
                timer.innerHTML = '<div class="promotion-expired">Offer Expired</div>';
                return;
            }
            
            // Time calculations
            const days = Math.floor(distance / (1000 * 60 * 60 * 24));
            const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((distance % (1000 * 60)) / 1000);
              // Update the countdown values
            timer.querySelector('.countdown-number[data-days]').textContent = String(days).padStart(2, '0');
            timer.querySelector('.countdown-number[data-hours]').textContent = String(hours).padStart(2, '0');
            timer.querySelector('.countdown-number[data-minutes]').textContent = String(minutes).padStart(2, '0');
            timer.querySelector('.countdown-number[data-seconds]').textContent = String(seconds).padStart(2, '0');
        };
        
        // Update immediately and then every second
        updateTimer();
        setInterval(updateTimer, 1000);
    });

    // Handle urgent promotions animation
    const urgentBadges = document.querySelectorAll('.urgent-badge');
    urgentBadges.forEach(badge => {
        badge.style.animation = 'pulse 2s infinite';
    });

    // Handle promotion visibility based on dates
    const promotionSections = document.querySelectorAll('.promotion-section');
    promotionSections.forEach(section => {
        const startDate = new Date(section.dataset.startDate).getTime();
        const endDate = new Date(section.dataset.endDate).getTime();
        const now = new Date().getTime();

        if (now < startDate) {
            section.style.display = 'none';
        } else if (now > endDate) {
            section.querySelector('.promotion-content').innerHTML = '<div class="promotion-expired">This promotion has ended</div>';
        }
    });

    // Add hover effects for CTA buttons
    const promotionCTAs = document.querySelectorAll('.promotion-cta');
    promotionCTAs.forEach(cta => {
        cta.addEventListener('mouseenter', () => {
            cta.style.transform = 'scale(1.05)';
            cta.style.transition = 'transform 0.3s ease';
        });
        
        cta.addEventListener('mouseleave', () => {
            cta.style.transform = 'scale(1)';
        });
    });
});
