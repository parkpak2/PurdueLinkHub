/**
 * Academic Deadlines System
 * Manages and displays important academic dates and deadlines
 */

// ==========================================
// State
// ==========================================
const deadlinesState = {
    allDeadlines: [],
    upcomingDeadlines: [],
    currentDeadline: null
};

// ==========================================
// Configuration
// ==========================================
const DEADLINES_CONFIG = {
    upcomingDaysThreshold: 14, // Show deadlines within next 14 days
    maxUpcomingDisplay: 5
};

// ==========================================
// Initialization
// ==========================================
async function initDeadlines() {
    try {
        await loadDeadlines();
        updateUpcomingDeadlines();
        displayDeadlinesCard();
        updateContextualBanner();

        console.log('Deadlines system initialized');
    } catch (error) {
        console.error('Error initializing deadlines:', error);
    }
}

// ==========================================
// Data Loading
// ==========================================
async function loadDeadlines() {
    try {
        const response = await fetch('data/deadlines.json');
        if (!response.ok) throw new Error('Failed to load deadlines');

        deadlinesState.allDeadlines = await response.json();
    } catch (error) {
        console.error('Error loading deadlines:', error);
        deadlinesState.allDeadlines = [];
    }
}

// ==========================================
// Deadline Processing
// ==========================================
function updateUpcomingDeadlines() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const upcoming = deadlinesState.allDeadlines.filter(deadline => {
        const deadlineDate = new Date(deadline.date);
        deadlineDate.setHours(0, 0, 0, 0);

        const daysUntil = Math.ceil((deadlineDate - today) / (1000 * 60 * 60 * 24));

        // Include if within threshold and not past
        return daysUntil >= 0 && daysUntil <= DEADLINES_CONFIG.upcomingDaysThreshold;
    });

    // Sort by date (closest first)
    upcoming.sort((a, b) => new Date(a.date) - new Date(b.date));

    deadlinesState.upcomingDeadlines = upcoming.slice(0, DEADLINES_CONFIG.maxUpcomingDisplay);

    // Set current deadline (most urgent)
    if (deadlinesState.upcomingDeadlines.length > 0) {
        deadlinesState.currentDeadline = deadlinesState.upcomingDeadlines[0];
    }
}

function isInRegistrationPeriod() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if today is within any registration period
    const registrationDeadlines = deadlinesState.allDeadlines.filter(d => d.type === 'Registration');

    for (const deadline of registrationDeadlines) {
        const startDate = new Date(deadline.date);
        startDate.setHours(0, 0, 0, 0);

        const endDate = deadline.endDate ? new Date(deadline.endDate) : startDate;
        endDate.setHours(23, 59, 59, 999);

        if (today >= startDate && today <= endDate) {
            return { isRegistration: true, deadline };
        }
    }

    return { isRegistration: false, deadline: null };
}

// ==========================================
// Display Functions
// ==========================================
function displayDeadlinesCard() {
    // Check if deadlines card container exists
    let deadlinesCard = document.getElementById('deadlinesCard');

    if (!deadlinesCard) {
        // Create deadlines card and insert before course planner
        deadlinesCard = document.createElement('section');
        deadlinesCard.id = 'deadlinesCard';
        deadlinesCard.className = 'deadlines-card';

        const coursePlanner = document.getElementById('coursePlanner');
        if (coursePlanner) {
            coursePlanner.parentNode.insertBefore(deadlinesCard, coursePlanner);
        }
    }

    if (deadlinesState.upcomingDeadlines.length === 0) {
        deadlinesCard.style.display = 'none';
        return;
    }

    deadlinesCard.style.display = 'block';

    const deadlinesHTML = `
        <div class="deadlines-header">
            <h2 class="deadlines-title">📅 Upcoming Deadlines</h2>
        </div>
        <div class="deadlines-list">
            ${deadlinesState.upcomingDeadlines.map(deadline => createDeadlineCard(deadline)).join('')}
        </div>
    `;

    deadlinesCard.innerHTML = deadlinesHTML;

    // Add click handlers for deadline links
    deadlinesCard.querySelectorAll('.deadline-item').forEach((item, index) => {
        const deadline = deadlinesState.upcomingDeadlines[index];
        if (deadline.url) {
            item.style.cursor = 'pointer';
            item.addEventListener('click', () => {
                window.open(deadline.url, '_blank', 'noopener,noreferrer');
            });
        }
    });
}

function createDeadlineCard(deadline) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const deadlineDate = new Date(deadline.date);
    deadlineDate.setHours(0, 0, 0, 0);

    const daysUntil = Math.ceil((deadlineDate - today) / (1000 * 60 * 60 * 24));

    let urgencyClass = '';
    let urgencyText = '';

    if (daysUntil === 0) {
        urgencyClass = 'urgent';
        urgencyText = 'Today';
    } else if (daysUntil === 1) {
        urgencyClass = 'urgent';
        urgencyText = 'Tomorrow';
    } else if (daysUntil <= 3) {
        urgencyClass = 'high-priority';
        urgencyText = `In ${daysUntil} days`;
    } else if (daysUntil <= 7) {
        urgencyClass = 'medium-priority';
        urgencyText = `In ${daysUntil} days`;
    } else {
        urgencyClass = 'low-priority';
        urgencyText = `In ${daysUntil} days`;
    }

    const formattedDate = formatDate(deadlineDate);

    return `
        <div class="deadline-item ${urgencyClass}">
            <div class="deadline-icon">${deadline.icon || '📌'}</div>
            <div class="deadline-content">
                <div class="deadline-title">${deadline.title}</div>
                <div class="deadline-description">${deadline.description}</div>
                <div class="deadline-meta">
                    <span class="deadline-date">${formattedDate}</span>
                    <span class="deadline-countdown ${urgencyClass}">${urgencyText}</span>
                </div>
            </div>
        </div>
    `;
}

function formatDate(date) {
    const options = { month: 'short', day: 'numeric', year: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

// ==========================================
// Contextual Banner Integration
// ==========================================
function updateContextualBanner() {
    const registrationStatus = isInRegistrationPeriod();

    if (registrationStatus.isRegistration) {
        // Highlight course planner during registration
        const coursePlanner = document.getElementById('coursePlanner');
        const badge = document.getElementById('coursePlannerBadge');

        if (coursePlanner) {
            coursePlanner.classList.add('highlighted');
        }

        if (badge) {
            badge.style.display = 'inline-block';
            badge.textContent = 'REGISTRATION WEEK';
        }

        // Update banner message
        updateBannerWithDeadline(registrationStatus.deadline);
    } else if (deadlinesState.currentDeadline) {
        // Show most urgent upcoming deadline
        const daysUntil = getDaysUntil(deadlinesState.currentDeadline.date);

        if (daysUntil <= 7) {
            updateBannerWithDeadline(deadlinesState.currentDeadline);
        }
    }
}

function updateBannerWithDeadline(deadline) {
    // This integrates with the existing banner system in app.js
    const banner = document.getElementById('contextBanner');
    const bannerMessage = document.getElementById('bannerMessage');

    if (!banner || !bannerMessage) return;

    // Check if banner was dismissed
    const dismissedBanners = JSON.parse(localStorage.getItem('dismissedBanners') || '[]');
    if (dismissedBanners.includes(deadline.id)) return;

    const daysUntil = getDaysUntil(deadline.date);
    let message = '';

    if (daysUntil === 0) {
        message = `${deadline.icon} ${deadline.title} is TODAY! ${deadline.description}`;
    } else if (daysUntil === 1) {
        message = `${deadline.icon} ${deadline.title} is TOMORROW! ${deadline.description}`;
    } else {
        message = `${deadline.icon} ${deadline.title} in ${daysUntil} days - ${deadline.description}`;
    }

    bannerMessage.textContent = message;
    banner.dataset.bannerId = deadline.id;
    banner.style.display = 'block';
}

function getDaysUntil(dateString) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const targetDate = new Date(dateString);
    targetDate.setHours(0, 0, 0, 0);

    return Math.ceil((targetDate - today) / (1000 * 60 * 60 * 24));
}

// ==========================================
// Export
// ==========================================
if (typeof window !== 'undefined') {
    window.Deadlines = {
        init: initDeadlines,
        state: deadlinesState,
        isRegistrationPeriod: isInRegistrationPeriod
    };
}
