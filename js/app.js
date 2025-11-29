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
    searchQuery: '',
    theme: 'light'  
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
    closeBanner: document.getElementById('closeBanner'),
    themeSwitch: document.getElementById('themeSwitch')
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

        // Loads light/dark theme
        loadTheme();

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

    // Change themes
    if (elements.themeSwitch) {
        elements.themeSwitch.addEventListener(
            'change',
            handleThemeToggle
        );
    }

    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboardShortcut);

    // Search help modal
    const searchHelpBtn = document.getElementById('searchHelpBtn');
    const searchTipsOverlay = document.getElementById('searchTipsOverlay');
    const closeTipsBtn = document.getElementById('closeTipsBtn');

    if (searchHelpBtn && searchTipsOverlay && closeTipsBtn) {
        searchHelpBtn.addEventListener('click', () => {
            searchTipsOverlay.style.display = 'flex';
        });

        closeTipsBtn.addEventListener('click', () => {
            searchTipsOverlay.style.display = 'none';
        });

        // Close modal when clicking outside
        searchTipsOverlay.addEventListener('click', (event) => {
            if (event.target === searchTipsOverlay) {
                searchTipsOverlay.style.display = 'none';
            }
        });

        // Close modal with ESC key
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && searchTipsOverlay.style.display === 'flex') {
                searchTipsOverlay.style.display = 'none';
            }
        });
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


function loadTheme() {
    const storedTheme = localStorage.getItem('theme');
    const theme = storedTheme === 'dark' ? 'dark' : 'light';
    state.theme = theme;

    if (theme === 'dark') {
        document.body.classList.add('dark-theme');
        if (elements.themeSwitch) elements.themeSwitch.checked = true;
    } else {
        document.body.classList.remove('dark-theme');
        if (elements.themeSwitch) elements.themeSwitch.checked = false;
    }
}

function saveTheme() {
    localStorage.setItem('theme', state.theme);
}

function handleThemeToggle(event) {
    state.theme = event.target.checked ? 'dark' : 'light';

    if (state.theme === 'dark') {
        document.body.classList.add('dark-theme');
    } else {
        document.body.classList.remove('dark-theme');
    }

    saveTheme();
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

    // Filter by search query with improved scoring
    if (state.searchQuery) {
        // Score and filter links
        const scoredLinks = links.map(link => ({
            link,
            score: calculateSearchScore(link, state.searchQuery)
        }))
        .filter(item => item.score > 0)
        .sort((a, b) => b.score - a.score);

        links = scoredLinks.map(item => item.link);
    }

    state.filteredLinks = links;
    displayLinks();
}

// ==========================================
// Advanced Search Functions
// ==========================================

/**
 * Calculate search score for a link (higher = better match)
 */
function calculateSearchScore(link, query) {
    const lowerQuery = query.toLowerCase();
    const lowerName = link.name.toLowerCase();
    const lowerDesc = link.description.toLowerCase();
    const lowerCategory = link.category.toLowerCase();
    const aliases = link.aliases || [];

    let score = 0;

    // Exact name match (highest priority)
    if (lowerName === lowerQuery) {
        score += 1000;
    }

    // Name starts with query
    if (lowerName.startsWith(lowerQuery)) {
        score += 500;
    }

    // Exact alias match
    for (const alias of aliases) {
        if (alias.toLowerCase() === lowerQuery) {
            score += 800;
            break;
        }
    }

    // Alias starts with query
    for (const alias of aliases) {
        if (alias.toLowerCase().startsWith(lowerQuery)) {
            score += 400;
            break;
        }
    }

    // Name contains query
    if (lowerName.includes(lowerQuery)) {
        score += 300;
    }

    // Alias contains query
    for (const alias of aliases) {
        if (alias.toLowerCase().includes(lowerQuery)) {
            score += 200;
            break;
        }
    }

    // Description contains query
    if (lowerDesc.includes(lowerQuery)) {
        score += 100;
    }

    // Category match
    if (lowerCategory.includes(lowerQuery)) {
        score += 50;
    }

    // Fuzzy matching (typo tolerance)
    if (score === 0) {
        const fuzzyScore = getFuzzyScore(lowerName, lowerQuery);
        if (fuzzyScore > 0.7) {
            score += Math.floor(fuzzyScore * 150);
        }

        // Check aliases with fuzzy matching
        for (const alias of aliases) {
            const aliasFuzzyScore = getFuzzyScore(alias.toLowerCase(), lowerQuery);
            if (aliasFuzzyScore > 0.7) {
                score += Math.floor(aliasFuzzyScore * 120);
                break;
            }
        }
    }

    return score;
}

/**
 * Calculate fuzzy matching score (Levenshtein distance based)
 * Returns a score between 0 and 1 (1 = perfect match)
 */
function getFuzzyScore(str1, str2) {
    const maxLength = Math.max(str1.length, str2.length);
    if (maxLength === 0) return 1.0;

    const distance = getLevenshteinDistance(str1, str2);
    return 1.0 - (distance / maxLength);
}

/**
 * Calculate Levenshtein distance (edit distance) between two strings
 */
function getLevenshteinDistance(str1, str2) {
    const matrix = [];

    for (let i = 0; i <= str2.length; i++) {
        matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
        matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
        for (let j = 1; j <= str1.length; j++) {
            if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1, // substitution
                    matrix[i][j - 1] + 1,     // insertion
                    matrix[i - 1][j] + 1      // deletion
                );
            }
        }
    }

    return matrix[str2.length][str1.length];
}

function displayLinks() {
    // Clear grid
    elements.linksGrid.innerHTML = '';

    // Show empty state if no links
    if (state.filteredLinks.length === 0) {
        showEmptyState();
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

function showEmptyState() {
    elements.linksGrid.style.display = 'none';
    elements.emptyState.style.display = 'block';

    // Customize message based on context
    const emptyIcon = elements.emptyState.querySelector('.empty-icon');
    const emptyTitle = elements.emptyState.querySelector('h2');
    const emptyText = elements.emptyState.querySelector('p');

    if (state.currentCategory === 'My Links' && state.pinnedLinks.size === 0) {
        emptyIcon.textContent = '⭐';
        emptyTitle.textContent = 'No pinned links yet';
        emptyText.textContent = 'Click the star icon on any resource card to add it to My Links for quick access';
    } else if (state.searchQuery) {
        emptyIcon.textContent = '🔍';
        emptyTitle.textContent = 'No resources found';
        emptyText.textContent = `No results for "${state.searchQuery}". Try a different search term or category`;
    } else {
        emptyIcon.textContent = '🔍';
        emptyTitle.textContent = 'No resources found';
        emptyText.textContent = 'Try adjusting your search or category filter';
    }
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
        // If clicking the pin button, do nothing
        if (event.target.classList.contains('pin-button')) return;

        // Feature cards 
        if (link.id === 'feature-guide') {  
            openUserGuide();
            return;
        }

        // Npen To-Do Modal
        if (link.id === 'todo-list') {
            openTodoModal(); 
            return;
        }

        if (link.id === 'purdue-search') {
        // This function lives in search.js now!
        if (typeof openPurdueSearch === 'function') {
            openPurdueSearch();
        } else {
            console.error('search.js not loaded');
        }
        return;
        }

        // Normal resource card → open link + track usage
        logLinkUsage(link);
        window.open(link.url, '_blank', 'noopener,noreferrer');
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
// Keyboard Shortcuts
// ==========================================
function handleKeyboardShortcut(event) {
    // Don't trigger shortcuts when typing in input fields (except for search input with specific keys)
    const isInputField = event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA';

    // "/" key - Focus search bar
    if (event.key === '/' && !isInputField) {
        event.preventDefault();
        elements.searchInput.focus();
        elements.searchInput.select();
        return;
    }

    // ESC key - Clear search
    if (event.key === 'Escape' && event.target === elements.searchInput) {
        event.preventDefault();
        elements.searchInput.value = '';
        state.searchQuery = '';
        filterAndDisplayLinks();
        elements.searchInput.blur();
        return;
    }

    // Enter key - Open first result
    if (event.key === 'Enter' && event.target === elements.searchInput) {
        event.preventDefault();
        if (state.filteredLinks.length > 0) {
            const firstLink = state.filteredLinks[0];
            logLinkUsage(firstLink);
            window.open(firstLink.url, '_blank', 'noopener,noreferrer');
        }
        return;
    }

    // Number keys 1-9 - Open nth result
    if (!isInputField && event.key >= '1' && event.key <= '9') {
        const index = parseInt(event.key) - 1;
        if (index < state.filteredLinks.length) {
            event.preventDefault();
            const link = state.filteredLinks[index];
            logLinkUsage(link);
            window.open(link.url, '_blank', 'noopener,noreferrer');
        }
        return;
    }
}

// ==========================================
// Usage Tracking
// ==========================================
async function logLinkUsage(link) {
    try {
        // Don't block the UI - fire and forget
        const response = await fetch('/api/usage', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                linkId: link.id,
                name: link.name,
                category: link.category
            })
        });

        if (response.ok) {
            console.log('Usage logged:', link.name);
        }
    } catch (error) {
        // Silently fail - don't disrupt user experience
        console.log('Usage logging unavailable (server might be offline)');
    }
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
