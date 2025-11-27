// ==========================================
// User Guide Panel (open / close / drag / resize / dropdown)
// ==========================================

// DOM refs
const guideOverlay = document.getElementById('userGuideOverlay');
const guidePanel   = document.getElementById('userGuideCard');
const guideHeader  = document.getElementById('userGuideHeader');
const guideClose   = document.getElementById('closeUserGuide');
const guideResize  = document.getElementById('userGuideResize');

let isDragging = false;
let dragOffsetX = 0;
let dragOffsetY = 0;

let isResizing = false;
let startWidth = 0;
let startHeight = 0;
let startX = 0;
let startY = 0;
const BASE_WIDTH = 480; // matches your default CSS width

// Make openUserGuide global so app.js can call it when the "Guide" card is clicked
function openUserGuide() {
    const overlay = document.getElementById('userGuideOverlay');
    if (overlay) overlay.style.display = 'flex';
}

window.openUserGuide = openUserGuide;
window.closeUserGuide = closeUserGuide;

function closeUserGuide() {
    if (!guideOverlay) return;
    guideOverlay.style.display = 'none';
}

// Close via X button
if (guideClose) {
    guideClose.addEventListener('click', (e) => {
        e.stopPropagation();
        closeUserGuide();
    });
}

// Dragging (header)
if (guideHeader && guidePanel) {
    guideHeader.addEventListener('mousedown', (e) => {
        isDragging = true;
        const rect = guidePanel.getBoundingClientRect();
        dragOffsetX = e.clientX - rect.left;
        dragOffsetY = e.clientY - rect.top;
        e.preventDefault();
    });
}

// Resizing (bottom-right corner)
if (guideResize && guidePanel) {
    guideResize.addEventListener('mousedown', (e) => {
        isResizing = true;
        const rect = guidePanel.getBoundingClientRect();
        startWidth  = rect.width;
        startHeight = rect.height;
        startX = e.clientX;
        startY = e.clientY;
        e.preventDefault();
    });
}

// Mouse move = drag OR resize
document.addEventListener('mousemove', (e) => {
    if (!guidePanel) return;

    if (isDragging) {
        guidePanel.style.left = (e.clientX - dragOffsetX) + 'px';
        guidePanel.style.top  = (e.clientY - dragOffsetY) + 'px';
    } else if (isResizing) {
        const newWidth  = startWidth  + (e.clientX - startX);
        const newHeight = startHeight + (e.clientY - startY);

        guidePanel.style.width  = Math.max(260, newWidth) + 'px';
        guidePanel.style.height = Math.max(180, newHeight) + 'px';

        updateGuideTextScale();
    }
});

// Stop drag / resize
document.addEventListener('mouseup', () => {
    isDragging = false;
    isResizing = false;
});

// Scale the inner text slightly with width
function updateGuideTextScale() {
    if (!guidePanel) return;
    const currentWidth = guidePanel.getBoundingClientRect().width;
    let scale = currentWidth / BASE_WIDTH;      // >1 when wider, <1 when smaller

    // clamp so it doesn’t get silly
    scale = Math.max(0.9, Math.min(1.2, scale));

    // this is used in CSS: font-size: calc(0.95rem * var(--guide-text-scale, 1));
    guidePanel.style.setProperty('--guide-text-scale', scale.toString());
}

// ==========================================
// Dropdown sections inside guide
// ==========================================

function initGuideDropdowns() {
    const items = document.querySelectorAll('.guide-item');

    items.forEach((item) => {
        const toggleBtn = item.querySelector('.guide-toggle');
        const content   = item.querySelector('.guide-content');

        if (!toggleBtn || !content) return;

        // Start collapsed
        content.classList.remove('open');
        toggleBtn.classList.remove('open');

        toggleBtn.addEventListener('click', () => {
            const isOpen = content.classList.contains('open');

            if (isOpen) {
                content.classList.remove('open');
                toggleBtn.classList.remove('open');
            } else {
                content.classList.add('open');
                toggleBtn.classList.add('open');
            }
        });
    });
}

// Run dropdown init once DOM is ready (script is at bottom, but this is safe)
document.addEventListener('DOMContentLoaded', () => {
    initGuideDropdowns();
    updateGuideTextScale(); // set initial text scale
});
