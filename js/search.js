function openPurdueSearch() {
    const modal = document.getElementById('purdueSearchModal');
    const input = document.getElementById('purdueSearchInput');
    const searchBtn = document.getElementById('performPurdueSearchBtn');
    const closeBtn = document.getElementById('closePurdueSearchBtn');

    if (!modal || !input) {
        console.error("Purdue Search elements not found in DOM");
        return;
    }

    // 1. Show Modal
    modal.style.display = 'flex';
    input.value = ''; // Clear previous search
    input.focus();

    // 2. Define Search Action
    const executeSearch = () => {
        const query = input.value.trim();
        if (query) {
            // The official Purdue search URL structure
            const searchUrl = `https://www.purdue.edu/home/search/?q=${encodeURIComponent(query)}`;
            window.open(searchUrl, '_blank');
            modal.style.display = 'none';
        }
    };

    // 3. Setup Listeners (Using replaceWith to prevent duplicate listeners)
    // This creates a fresh clone of the button every time we open the modal,
    // ensuring we don't accidentally add 50 click listeners if the user opens/closes it 50 times.
    
    const newSearchBtn = searchBtn.cloneNode(true);
    searchBtn.parentNode.replaceChild(newSearchBtn, searchBtn);
    newSearchBtn.addEventListener('click', executeSearch);

    const newCloseBtn = closeBtn.cloneNode(true);
    closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);
    newCloseBtn.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    // 4. Enter Key Support
    input.onkeydown = (e) => {
        if (e.key === 'Enter') executeSearch();
    };

    // 5. Close on background click
    // We assign this to the specific modal instance
    modal.onclick = (e) => {
        if (e.target === modal) modal.style.display = 'none';
    };
}

// Make sure it's available globally so app.js can see it
window.openPurdueSearch = openPurdueSearch;