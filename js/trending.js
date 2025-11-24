/**
 * Trending Links System
 * Displays most popular links based on usage data
 */

// ==========================================
// Configuration
// ==========================================
const TRENDING_CONFIG = {
    apiUrl: '/api/popular',
    refreshInterval: 60000, // 1 minute
    displayCount: 5,
    defaultRange: '7d'
};

// ==========================================
// State
// ==========================================
const trendingState = {
    trendingLinks: [],
    isLoading: false,
    lastUpdate: null
};

// ==========================================
// Initialization
// ==========================================
async function initTrending() {
    try {
        await loadTrendingLinks();
        displayTrendingCard();

        // Auto-refresh every minute
        setInterval(async () => {
            await loadTrendingLinks();
            displayTrendingCard();
        }, TRENDING_CONFIG.refreshInterval);

        console.log('Trending system initialized');
    } catch (error) {
        console.error('Error initializing trending:', error);
    }
}

// ==========================================
// Data Loading
// ==========================================
async function loadTrendingLinks() {
    try {
        trendingState.isLoading = true;

        const url = `${TRENDING_CONFIG.apiUrl}?range=${TRENDING_CONFIG.defaultRange}&limit=${TRENDING_CONFIG.displayCount}`;
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error('Failed to fetch trending links');
        }

        const data = await response.json();
        trendingState.trendingLinks = data.data || [];
        trendingState.lastUpdate = new Date();

        console.log('Trending links loaded:', trendingState.trendingLinks.length);
    } catch (error) {
        console.error('Error loading trending links:', error);
        trendingState.trendingLinks = [];
    } finally {
        trendingState.isLoading = false;
    }
}

// ==========================================
// Display Functions
// ==========================================
function displayTrendingCard() {
    // Check if trending card container exists
    let trendingCard = document.getElementById('trendingCard');

    if (!trendingCard) {
        // Create trending card and insert before deadlines card or course planner
        trendingCard = document.createElement('section');
        trendingCard.id = 'trendingCard';
        trendingCard.className = 'trending-card';

        const deadlinesCard = document.getElementById('deadlinesCard');
        const coursePlanner = document.getElementById('coursePlanner');
        const insertBefore = deadlinesCard || coursePlanner;

        if (insertBefore) {
            insertBefore.parentNode.insertBefore(trendingCard, insertBefore);
        }
    }

    // Don't show if no data or server is offline
    if (trendingState.trendingLinks.length === 0) {
        trendingCard.style.display = 'none';
        return;
    }

    trendingCard.style.display = 'block';

    const trendingHTML = `
        <div class="trending-header">
            <h2 class="trending-title">🔥 Trending Now at Purdue</h2>
            <span class="trending-subtitle">Most clicked links (Last 7 days)</span>
        </div>
        <div class="trending-list">
            ${trendingState.trendingLinks.map((link, index) => createTrendingItem(link, index + 1)).join('')}
        </div>
        ${trendingState.lastUpdate ? `
            <div class="trending-footer">
                Last updated: ${formatLastUpdate(trendingState.lastUpdate)}
            </div>
        ` : ''}
    `;

    trendingCard.innerHTML = trendingHTML;

    // Add click handlers for trending items
    trendingCard.querySelectorAll('.trending-item').forEach((item, index) => {
        const link = trendingState.trendingLinks[index];
        if (link) {
            item.style.cursor = 'pointer';
            item.addEventListener('click', () => {
                handleTrendingClick(link);
            });
        }
    });
}

function createTrendingItem(link, rank) {
    // Get rank emoji
    let rankDisplay = `${rank}`;
    if (rank === 1) rankDisplay = '🥇';
    else if (rank === 2) rankDisplay = '🥈';
    else if (rank === 3) rankDisplay = '🥉';

    // Format count
    const countDisplay = link.count === 1 ? '1 click' : `${link.count} clicks`;

    return `
        <div class="trending-item" data-link-id="${link.linkId}">
            <div class="trending-rank">${rankDisplay}</div>
            <div class="trending-content">
                <div class="trending-name">${link.name}</div>
                <div class="trending-count">${countDisplay}</div>
            </div>
            <div class="trending-icon">→</div>
        </div>
    `;
}

function formatLastUpdate(date) {
    const now = new Date();
    const diff = Math.floor((now - date) / 1000); // seconds

    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
    return date.toLocaleTimeString();
}

// ==========================================
// Click Handlers
// ==========================================
function handleTrendingClick(link) {
    // Find the actual link data from state.allLinks
    if (window.state && window.state.allLinks) {
        const actualLink = window.state.allLinks.find(l => l.id === link.linkId);
        if (actualLink) {
            // Log usage
            if (typeof logLinkUsage === 'function') {
                logLinkUsage(actualLink);
            }

            // Open link
            window.open(actualLink.url, '_blank', 'noopener,noreferrer');
        } else {
            console.warn('Link not found in link database:', link.linkId);
        }
    }
}

// ==========================================
// Export
// ==========================================
if (typeof window !== 'undefined') {
    window.Trending = {
        init: initTrending,
        state: trendingState,
        refresh: loadTrendingLinks
    };
}
