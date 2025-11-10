/**
 * Purdue Link Hub - Main Application
 * Manages link display, filtering, search, and personalization
 */

// ==========================================
// State Management
// ==========================================
const state = {
    allLinks: [],
    filteredLinks: [],
    pinnedLinks: new Set(),
    currentCategory: 'all',
    searchQuery: ''
};

// ==========================================
// DOM Elements
// ==========================================
const elements = {
    linksGrid: document.getElementById('linksGrid'),
    searchInput: document.getElementById('searchInput'),
    emptyState: document.getElementById('emptyState'),
    tabButtons: document.querySelectorAll('.tab-button'),
    contextBanner: document.getElementById('contextBanner'),
    bannerMessage: document.getElementById('bannerMessage'),
    closeBanner: document.getElementById('closeBanner')
};

// ==========================================
// Initialization
// ==========================================
async function init() {
    try {
        // Load links from JSON
        await loadLinks();

        // Load pinned links from localStorage
        loadPinnedLinks();

        // Display all links initially
        displayLinks();

        // Setup event listeners
        setupEventListeners();

        // Show contextual banner if applicable
        showContextualBanner();

        console.log('Purdue Link Hub initialized successfully');
    } catch (error) {
        console.error('Error initializing app:', error);
        showError('Failed to load resources. Please refresh the page.');
    }
}

// ==========================================
// Data Loading
// ==========================================
async function loadLinks() {
    try {
        const response = await fetch('data/links.json');
        if (!response.ok) {
            throw new Error('Failed to fetch links');
        }
        state.allLinks = await response.json();
        state.filteredLinks = [...state.allLinks];
    } catch (error) {
        console.error('Error loading links:', error);
        throw error;
    }
}

function loadPinnedLinks() {
    const stored = localStorage.getItem('pinnedLinks');
    if (stored) {
        try {
            const pinnedArray = JSON.parse(stored);
            state.pinnedLinks = new Set(pinnedArray);
        } catch (error) {
            console.error('Error loading pinned links:', error);
            state.pinnedLinks = new Set();
        }
    }
}

function savePinnedLinks() {
    const pinnedArray = Array.from(state.pinnedLinks);
    localStorage.setItem('pinnedLinks', JSON.stringify(pinnedArray));
}

// ==========================================
// Event Listeners
// ==========================================
function setupEventListeners() {
    // Search input
    elements.searchInput.addEventListener('input', handleSearch);

    // Category tabs
    elements.tabButtons.forEach(button => {
        button.addEventListener('click', handleCategoryChange);
    });

    // Banner close button
    if (elements.closeBanner) {
        elements.closeBanner.addEventListener('click', hideBanner);
    }
}

function handleSearch(event) {
    state.searchQuery = event.target.value.toLowerCase().trim();
    filterAndDisplayLinks();
}

function handleCategoryChange(event) {
    const category = event.target.dataset.category;
    state.currentCategory = category;

    // Update active tab
    elements.tabButtons.forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');

    filterAndDisplayLinks();
}

function handlePinToggle(linkId, button) {
    if (state.pinnedLinks.has(linkId)) {
        state.pinnedLinks.delete(linkId);
        button.classList.remove('pinned');
        button.textContent = '⭐';
    } else {
        state.pinnedLinks.add(linkId);
        button.classList.add('pinned');
        button.textContent = '⭐';
    }

    savePinnedLinks();

    // Refresh display if on "My Links" tab
    if (state.currentCategory === 'My Links') {
        filterAndDisplayLinks();
    }
}

// ==========================================
// Filtering and Display
// ==========================================
function filterAndDisplayLinks() {
    let links = [...state.allLinks];

    // Filter by category
    if (state.currentCategory === 'My Links') {
        links = links.filter(link => state.pinnedLinks.has(link.id));
    } else if (state.currentCategory !== 'all') {
        links = links.filter(link => link.category === state.currentCategory);
    }

    // Filter by search query
    if (state.searchQuery) {
        links = links.filter(link =>
            link.name.toLowerCase().includes(state.searchQuery) ||
            link.description.toLowerCase().includes(state.searchQuery) ||
            link.category.toLowerCase().includes(state.searchQuery)
        );
    }

    state.filteredLinks = links;
    displayLinks();
}

function displayLinks() {
    // Clear grid
    elements.linksGrid.innerHTML = '';

    // Show empty state if no links
    if (state.filteredLinks.length === 0) {
        elements.emptyState.style.display = 'block';
        elements.linksGrid.style.display = 'none';
        return;
    }

    elements.emptyState.style.display = 'none';
    elements.linksGrid.style.display = 'grid';

    // Create and append link cards
    state.filteredLinks.forEach(link => {
        const card = createLinkCard(link);
        elements.linksGrid.appendChild(card);
    });
}

function createLinkCard(link) {
    const card = document.createElement('div');
    card.className = 'link-card';
    if (state.pinnedLinks.has(link.id)) {
        card.classList.add('pinned');
    }

    const isPinned = state.pinnedLinks.has(link.id);

    card.innerHTML = `
        <div class="link-header">
            <div class="link-title-section">
                <span class="link-icon">${link.icon}</span>
                <h3 class="link-name">${link.name}</h3>
                <p class="link-description">${link.description}</p>
            </div>
            <button
                class="pin-button ${isPinned ? 'pinned' : ''}"
                data-link-id="${link.id}"
                aria-label="${isPinned ? 'Unpin' : 'Pin'} ${link.name}"
                title="${isPinned ? 'Unpin from My Links' : 'Pin to My Links'}"
            >
                ⭐
            </button>
        </div>
        <span class="link-category">${link.category}</span>
    `;

    // Add click handler for the card (open link)
    card.addEventListener('click', (event) => {
        // Don't open link if clicking the pin button
        if (!event.target.classList.contains('pin-button')) {
            window.open(link.url, '_blank', 'noopener,noreferrer');
        }
    });

    // Add click handler for pin button
    const pinButton = card.querySelector('.pin-button');
    pinButton.addEventListener('click', (event) => {
        event.stopPropagation();
        handlePinToggle(link.id, pinButton);
        card.classList.toggle('pinned');
    });

    return card;
}

// ==========================================
// Contextual Banners
// ==========================================
function showContextualBanner() {
    const banner = getContextualBanner();

    if (banner && !isBannerDismissed(banner.id)) {
        elements.bannerMessage.textContent = banner.message;
        elements.contextBanner.dataset.bannerId = banner.id;
        elements.contextBanner.style.display = 'block';
    }
}

function getContextualBanner() {
    const now = new Date();
    const month = now.getMonth(); // 0-11
    const day = now.getDate();

    // Registration periods (example - adjust dates as needed)
    // November 1-15: Spring registration
    if (month === 10 && day >= 1 && day <= 15) {
        return {
            id: 'spring-registration',
            message: '📅 Spring Registration is open! Visit MyPurdue to register for classes.'
        };
    }

    // April 1-15: Fall registration
    if (month === 3 && day >= 1 && day <= 15) {
        return {
            id: 'fall-registration',
            message: '📅 Fall Registration is open! Visit MyPurdue to register for classes.'
        };
    }

    // September: Career fair season
    if (month === 8) {
        return {
            id: 'career-fair',
            message: '💼 Career Fair season! Check Handshake for upcoming events and opportunities.'
        };
    }

    // February: Career fair season
    if (month === 1) {
        return {
            id: 'career-fair-spring',
            message: '💼 Spring Career Fair season! Check Handshake for upcoming events.'
        };
    }

    return null;
}

function isBannerDismissed(bannerId) {
    const dismissed = localStorage.getItem('dismissedBanners');
    if (dismissed) {
        try {
            const dismissedArray = JSON.parse(dismissed);
            return dismissedArray.includes(bannerId);
        } catch (error) {
            return false;
        }
    }
    return false;
}

function hideBanner() {
    const bannerId = elements.contextBanner.dataset.bannerId;
    if (bannerId) {
        // Save dismissed banner to localStorage
        const dismissed = localStorage.getItem('dismissedBanners');
        let dismissedArray = [];

        if (dismissed) {
            try {
                dismissedArray = JSON.parse(dismissed);
            } catch (error) {
                dismissedArray = [];
            }
        }

        if (!dismissedArray.includes(bannerId)) {
            dismissedArray.push(bannerId);
            localStorage.setItem('dismissedBanners', JSON.stringify(dismissedArray));
        }
    }

    elements.contextBanner.style.display = 'none';
}

// ==========================================
// Error Handling
// ==========================================
function showError(message) {
    elements.linksGrid.innerHTML = `
        <div style="text-align: center; padding: 40px; color: #d32f2f;">
            <h2>⚠️ Error</h2>
            <p>${message}</p>
        </div>
    `;
}

// ==========================================
// Start Application
// ==========================================
document.addEventListener('DOMContentLoaded', init);

// Export for potential testing or module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        state,
        loadLinks,
        filterAndDisplayLinks,
        displayLinks
    };
}
