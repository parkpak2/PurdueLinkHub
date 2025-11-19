/**
 * Purdue Course Search - Using Purdue.io API
 * Handles course search, section selection, and schedule management
 */

// ==========================================
// State Management
// ==========================================
const courseState = {
    searchResults: [],
    selectedSections: [],
    currentTerm: null,
    availableTerms: [],
    isLoading: false
};

// ==========================================
// DOM Elements
// ==========================================
const courseElements = {
    searchInput: null,
    searchButton: null,
    termSelect: null,
    resultsContainer: null,
    scheduleContainer: null,
    loadingIndicator: null
};

// ==========================================
// API Configuration
// ==========================================
const API_BASE = 'https://api.purdue.io/odata';

// ==========================================
// Initialization
// ==========================================
function initCourseSearch() {
    // Get DOM elements
    courseElements.searchInput = document.getElementById('courseSearchInput');
    courseElements.searchButton = document.getElementById('courseSearchButton');
    courseElements.termSelect = document.getElementById('termSelect');
    courseElements.resultsContainer = document.getElementById('courseResults');
    courseElements.scheduleContainer = document.getElementById('scheduleGrid');
    courseElements.loadingIndicator = document.getElementById('searchLoading');

    // Load saved schedule from localStorage
    loadSavedSchedule();

    // Load available terms
    loadTerms();

    // Setup event listeners
    setupCourseEventListeners();

    console.log('Course Search initialized');
}

function setupCourseEventListeners() {
    if (courseElements.searchButton) {
        courseElements.searchButton.addEventListener('click', handleCourseSearch);
    }

    if (courseElements.searchInput) {
        courseElements.searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                handleCourseSearch();
            }
        });
    }

    if (courseElements.termSelect) {
        courseElements.termSelect.addEventListener('change', handleTermChange);
    }
}

// ==========================================
// Term Management
// ==========================================
async function loadTerms() {
    try {
        const response = await fetch(`${API_BASE}/Terms?$orderby=StartDate desc&$top=5`);
        if (!response.ok) throw new Error('Failed to load terms');

        const data = await response.json();
        courseState.availableTerms = data.value;

        // Set current term to the most recent
        if (courseState.availableTerms.length > 0) {
            courseState.currentTerm = courseState.availableTerms[0];
            populateTermSelect();
        }
    } catch (error) {
        console.error('Error loading terms:', error);
        showCourseError('Unable to load term data. Using default term.');
    }
}

function populateTermSelect() {
    if (!courseElements.termSelect) return;

    courseElements.termSelect.innerHTML = '';

    courseState.availableTerms.forEach(term => {
        const option = document.createElement('option');
        option.value = term.TermId;
        option.textContent = term.Name;
        courseElements.termSelect.appendChild(option);
    });
}

function handleTermChange(e) {
    const selectedTermId = e.target.value;
    courseState.currentTerm = courseState.availableTerms.find(t => t.TermId === selectedTermId);

    // Clear current results when term changes
    if (courseElements.resultsContainer) {
        courseElements.resultsContainer.innerHTML = '';
    }
}

// ==========================================
// Course Search
// ==========================================
async function handleCourseSearch() {
    const query = courseElements.searchInput?.value?.trim();

    if (!query) {
        showCourseError('Please enter a course code or keyword');
        return;
    }

    setLoading(true);
    courseElements.resultsContainer.innerHTML = '';

    try {
        const courses = await searchCourses(query);
        displayCourseResults(courses);
    } catch (error) {
        console.error('Error searching courses:', error);
        showCourseError('Failed to search courses. Please try again.');
    } finally {
        setLoading(false);
    }
}

async function searchCourses(query) {
    // Parse query - support formats like "CS 180", "CS180", "18000", etc.
    const parsed = parseSearchQuery(query);

    let filter = '';

    if (parsed.subject && parsed.number) {
        // Search by subject + number (e.g., "CS 180")
        filter = `Subject/Abbreviation eq '${parsed.subject}' and Number eq '${parsed.number}'`;
    } else if (parsed.subject) {
        // Search by subject only (e.g., "CS")
        filter = `Subject/Abbreviation eq '${parsed.subject}'`;
    } else if (parsed.number) {
        // Search by number only (e.g., "18000")
        filter = `Number eq '${parsed.number}'`;
    } else {
        // Search by title keyword
        filter = `contains(Title, '${query}')`;
    }

    const url = `${API_BASE}/Courses?$filter=${encodeURIComponent(filter)}&$expand=Subject&$orderby=Number asc`;

    const response = await fetch(url);
    if (!response.ok) throw new Error('API request failed');

    const data = await response.json();
    courseState.searchResults = data.value;

    return data.value;
}

function parseSearchQuery(query) {
    const result = { subject: null, number: null };

    // Try to match patterns like "CS 180", "CS180", "MA 261"
    const subjectNumberMatch = query.match(/^([A-Z]+)\s*(\d+)$/i);
    if (subjectNumberMatch) {
        result.subject = subjectNumberMatch[1].toUpperCase();
        result.number = subjectNumberMatch[2].padStart(5, '0'); // Pad to 5 digits
        return result;
    }

    // Try subject only (e.g., "CS")
    const subjectMatch = query.match(/^[A-Z]+$/i);
    if (subjectMatch) {
        result.subject = query.toUpperCase();
        return result;
    }

    // Try number only (e.g., "18000")
    const numberMatch = query.match(/^\d+$/);
    if (numberMatch) {
        result.number = query.padStart(5, '0');
        return result;
    }

    return result;
}

// ==========================================
// Display Course Results
// ==========================================
function displayCourseResults(courses) {
    if (!courseElements.resultsContainer) return;

    if (courses.length === 0) {
        courseElements.resultsContainer.innerHTML = `
            <div class="no-results">
                <div class="empty-icon">🔍</div>
                <h3>No courses found</h3>
                <p>Try a different search term like "CS 180" or "Calculus"</p>
            </div>
        `;
        return;
    }

    courseElements.resultsContainer.innerHTML = '';

    courses.forEach(course => {
        const card = createCourseCard(course);
        courseElements.resultsContainer.appendChild(card);
    });
}

function createCourseCard(course) {
    const card = document.createElement('div');
    card.className = 'course-card';

    const subjectAbbr = course.Subject?.Abbreviation || 'N/A';
    const courseNumber = course.Number?.replace(/^0+/, '') || 'N/A'; // Remove leading zeros
    const courseCode = `${subjectAbbr} ${courseNumber}`;

    card.innerHTML = `
        <div class="course-card-header">
            <div class="course-code">${courseCode}</div>
            <div class="course-credits">${course.CreditHours || 0} credits</div>
        </div>
        <h3 class="course-title">${course.Title || 'Untitled Course'}</h3>
        <p class="course-description">${course.Description || 'No description available.'}</p>
        <button class="view-sections-btn" data-course-id="${course.CourseId}">
            View Sections
        </button>
        <div class="course-sections" id="sections-${course.CourseId}" style="display: none;">
            <div class="loading-sections">Loading sections...</div>
        </div>
    `;

    // Add click handler for "View Sections" button
    const viewSectionsBtn = card.querySelector('.view-sections-btn');
    viewSectionsBtn.addEventListener('click', () => toggleSections(course, card));

    return card;
}

// ==========================================
// Section Loading and Display
// ==========================================
async function toggleSections(course, card) {
    const sectionsContainer = card.querySelector(`#sections-${course.CourseId}`);
    const btn = card.querySelector('.view-sections-btn');

    // Toggle visibility
    if (sectionsContainer.style.display !== 'none') {
        sectionsContainer.style.display = 'none';
        btn.textContent = 'View Sections';
        return;
    }

    sectionsContainer.style.display = 'block';
    btn.textContent = 'Hide Sections';

    // Load sections if not already loaded
    if (sectionsContainer.querySelector('.loading-sections')) {
        try {
            const sections = await loadCourseSections(course.CourseId);
            displaySections(sectionsContainer, sections, course);
        } catch (error) {
            console.error('Error loading sections:', error);
            sectionsContainer.innerHTML = '<p class="error-message">Failed to load sections.</p>';
        }
    }
}

async function loadCourseSections(courseId) {
    if (!courseState.currentTerm) {
        throw new Error('No term selected');
    }

    // Get Classes for this course in the current term
    const filter = `Course/CourseId eq ${courseId} and Term/TermId eq ${courseState.currentTerm.TermId}`;
    const url = `${API_BASE}/Classes?$filter=${encodeURIComponent(filter)}&$expand=Sections($expand=Meetings($expand=Room($expand=Building),Instructors))`;

    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to load sections');

    const data = await response.json();

    // Flatten sections from all classes
    const allSections = [];
    data.value.forEach(classEntity => {
        if (classEntity.Sections) {
            classEntity.Sections.forEach(section => {
                section._classEntity = classEntity; // Store reference to parent class
                allSections.push(section);
            });
        }
    });

    return allSections;
}

function displaySections(container, sections, course) {
    if (sections.length === 0) {
        container.innerHTML = '<p class="no-sections">No sections available for the selected term.</p>';
        return;
    }

    container.innerHTML = '<h4>Available Sections:</h4>';

    const sectionsList = document.createElement('div');
    sectionsList.className = 'sections-list';

    sections.forEach(section => {
        const sectionCard = createSectionCard(section, course);
        sectionsList.appendChild(sectionCard);
    });

    container.appendChild(sectionsList);
}

function createSectionCard(section, course) {
    const card = document.createElement('div');
    card.className = 'section-card';

    // Check if section is already selected
    const isSelected = courseState.selectedSections.some(s => s.SectionId === section.SectionId);
    if (isSelected) {
        card.classList.add('selected');
    }

    // Format meeting times
    const meetingTimes = formatMeetingTimes(section.Meetings);

    // Calculate availability
    const availability = `${section.Enrolled || 0}/${section.Capacity || 0} enrolled`;
    const isFull = (section.RemainingSpace || 0) <= 0;

    card.innerHTML = `
        <div class="section-header">
            <span class="section-crn">CRN: ${section.CRN}</span>
            <span class="section-type">${section.Type || 'Lecture'}</span>
        </div>
        <div class="section-info">
            <div class="section-times">${meetingTimes}</div>
            <div class="section-availability ${isFull ? 'full' : ''}">
                ${availability}
                ${isFull ? '(FULL)' : `(${section.RemainingSpace} seats left)`}
            </div>
        </div>
        <button class="add-section-btn ${isSelected ? 'selected' : ''}"
                data-section-id="${section.SectionId}"
                ${isFull ? 'disabled' : ''}>
            ${isSelected ? 'Remove from Schedule' : 'Add to Schedule'}
        </button>
    `;

    const addBtn = card.querySelector('.add-section-btn');
    addBtn.addEventListener('click', () => toggleSectionSelection(section, course, card));

    return card;
}

function formatMeetingTimes(meetings) {
    if (!meetings || meetings.length === 0) {
        return 'Times TBA';
    }

    return meetings.map(meeting => {
        const days = meeting.DaysOfWeek || 'TBA';
        const time = formatTime(meeting.StartTime, meeting.Duration);
        const location = formatLocation(meeting.Room);

        return `${days}: ${time} - ${location}`;
    }).join('<br>');
}

function formatTime(startTime, duration) {
    if (!startTime) return 'TBA';

    const start = new Date(startTime);
    const startHour = start.getUTCHours();
    const startMin = start.getUTCMinutes();

    const startFormatted = formatTimeString(startHour, startMin);

    if (duration) {
        // Parse duration (format: "PT50M" or "PT1H30M")
        const durationMatch = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
        if (durationMatch) {
            const hours = parseInt(durationMatch[1] || 0);
            const minutes = parseInt(durationMatch[2] || 0);

            const endMin = startMin + minutes;
            const endHour = startHour + hours + Math.floor(endMin / 60);
            const endMinFinal = endMin % 60;

            const endFormatted = formatTimeString(endHour, endMinFinal);
            return `${startFormatted} - ${endFormatted}`;
        }
    }

    return startFormatted;
}

function formatTimeString(hour, minute) {
    const period = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    const minStr = minute.toString().padStart(2, '0');
    return `${hour12}:${minStr} ${period}`;
}

function formatLocation(room) {
    if (!room) return 'Location TBA';

    const building = room.Building?.ShortCode || 'TBA';
    const roomNum = room.Number || '';

    return `${building} ${roomNum}`;
}

// ==========================================
// Section Selection and Schedule Management
// ==========================================
function toggleSectionSelection(section, course, card) {
    const existingIndex = courseState.selectedSections.findIndex(s => s.SectionId === section.SectionId);

    if (existingIndex >= 0) {
        // Remove section
        courseState.selectedSections.splice(existingIndex, 1);
        card.classList.remove('selected');

        const btn = card.querySelector('.add-section-btn');
        btn.textContent = 'Add to Schedule';
        btn.classList.remove('selected');
    } else {
        // Add section with course info
        const sectionWithCourse = {
            ...section,
            _course: course
        };
        courseState.selectedSections.push(sectionWithCourse);
        card.classList.add('selected');

        const btn = card.querySelector('.add-section-btn');
        btn.textContent = 'Remove from Schedule';
        btn.classList.add('selected');
    }

    // Save to localStorage
    saveSchedule();

    // Update schedule display
    updateScheduleDisplay();
}

function saveSchedule() {
    // Save minimal data to localStorage
    const scheduleData = {
        sections: courseState.selectedSections.map(s => ({
            SectionId: s.SectionId,
            CRN: s.CRN,
            Type: s.Type,
            Meetings: s.Meetings,
            _course: {
                CourseId: s._course.CourseId,
                Number: s._course.Number,
                Title: s._course.Title,
                Subject: s._course.Subject
            }
        })),
        termId: courseState.currentTerm?.TermId
    };

    localStorage.setItem('purdueSchedule', JSON.stringify(scheduleData));
}

function loadSavedSchedule() {
    try {
        const saved = localStorage.getItem('purdueSchedule');
        if (saved) {
            const data = JSON.parse(saved);
            courseState.selectedSections = data.sections || [];

            // Update display if schedule container exists
            updateScheduleDisplay();
        }
    } catch (error) {
        console.error('Error loading saved schedule:', error);
    }
}

function updateScheduleDisplay() {
    if (!courseElements.scheduleContainer) return;

    // Call schedule grid renderer
    if (window.ScheduleGrid) {
        window.ScheduleGrid.render(courseState.selectedSections);
    }
}

// ==========================================
// Utility Functions
// ==========================================
function setLoading(isLoading) {
    courseState.isLoading = isLoading;

    if (courseElements.loadingIndicator) {
        courseElements.loadingIndicator.style.display = isLoading ? 'block' : 'none';
    }

    if (courseElements.searchButton) {
        courseElements.searchButton.disabled = isLoading;
        courseElements.searchButton.textContent = isLoading ? 'Searching...' : 'Search';
    }
}

function showCourseError(message) {
    if (courseElements.resultsContainer) {
        courseElements.resultsContainer.innerHTML = `
            <div class="error-message">
                <span>⚠️</span>
                <p>${message}</p>
            </div>
        `;
    }
}

// ==========================================
// Export for use in main app
// ==========================================
if (typeof window !== 'undefined') {
    window.CourseSearch = {
        init: initCourseSearch,
        state: courseState
    };
}
