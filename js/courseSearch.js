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
    subjects: new Map(), // Cache subjects by ID
    courses: [], // Cache all courses
    classes: [], // Cache all classes (loaded on demand)
    sections: [], // Cache all sections (loaded on demand)
    classesLoaded: false,
    sectionsLoaded: false,
    isLoading: false,
    // Pagination
    currentPage: 1,
    itemsPerPage: 10,
    // Section pagination (per course)
    sectionPages: {}, // courseId -> currentPage
    sectionsPerPage: 5
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
// Use backend proxy to avoid CORS issues
// Backend will forward requests to https://api.purdue.io/odata
const API_BASE = 'http://localhost:3000/api/purdue';

// ==========================================
// Initialization
// ==========================================
async function initCourseSearch() {
    // Get DOM elements
    courseElements.searchInput = document.getElementById('courseSearchInput');
    courseElements.searchButton = document.getElementById('courseSearchButton');
    courseElements.termSelect = document.getElementById('termSelect');
    courseElements.resultsContainer = document.getElementById('courseResults');
    courseElements.scheduleContainer = document.getElementById('scheduleGrid');
    courseElements.loadingIndicator = document.getElementById('searchLoading');

    // Load saved schedule from localStorage
    loadSavedSchedule();

    // Load data in parallel
    console.log('Loading subjects and terms...');
    await Promise.all([
        loadSubjects(),
        loadTerms()
    ]);

    console.log(`Loaded ${courseState.subjects.size} subjects`);

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
// Subject Management
// ==========================================
async function loadSubjects() {
    try {
        const response = await fetch(`${API_BASE}/Subjects`);
        if (!response.ok) throw new Error('Failed to load subjects');

        const data = await response.json();

        // Store subjects in a Map by ID for quick lookup
        courseState.subjects.clear();
        data.value.forEach(subject => {
            courseState.subjects.set(subject.Id, subject);
        });

        console.log(`Loaded ${courseState.subjects.size} subjects`);
    } catch (error) {
        console.error('Error loading subjects:', error);
    }
}

// ==========================================
// Term Management
// ==========================================
async function loadTerms() {
    try {
        // Fetch all terms (OData query params disabled by Purdue.io API)
        const response = await fetch(`${API_BASE}/Terms`);
        if (!response.ok) throw new Error('Failed to load terms');

        const data = await response.json();

        // Filter out terms without dates and sort by StartDate descending
        let terms = data.value.filter(term => term.StartDate);
        terms.sort((a, b) => new Date(b.StartDate) - new Date(a.StartDate));

        // Take top 5 most recent terms
        courseState.availableTerms = terms.slice(0, 5);

        // Set current term to the most recent
        if (courseState.availableTerms.length > 0) {
            courseState.currentTerm = courseState.availableTerms[0];
            populateTermSelect();
        }
    } catch (error) {
        console.error('Error loading terms:', error);
        showCourseError('Unable to load term data. Make sure the backend server is running.');
    }
}

function populateTermSelect() {
    if (!courseElements.termSelect) return;

    courseElements.termSelect.innerHTML = '';

    courseState.availableTerms.forEach(term => {
        const option = document.createElement('option');
        option.value = term.Id;
        option.textContent = term.Name;
        courseElements.termSelect.appendChild(option);
    });
}

function handleTermChange(e) {
    const selectedTermId = e.target.value;
    courseState.currentTerm = courseState.availableTerms.find(t => t.Id === selectedTermId);

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
    // Parse query - support formats like "CS 18000", etc.
    const parsed = parseSearchQuery(query);

    // Lazy load courses only once
    if (courseState.courses.length === 0) {
        console.log('⏳ Loading courses (first time only, ~5 seconds)...');
        const url = `${API_BASE}/Courses`;
        const response = await fetch(url);
        if (!response.ok) throw new Error('API request failed');

        const data = await response.json();

        // Attach subjects immediately during load
        data.value.forEach(course => {
            if (course.SubjectId) {
                course.Subject = courseState.subjects.get(course.SubjectId);
            }
        });

        courseState.courses = data.value;
        console.log(`✅ Cached ${courseState.courses.length} courses`);
    }

    // Fast filtering on cached data
    let filteredCourses = courseState.courses.filter(course => {
        if (!course.Subject) return false;

        if (parsed.subject && parsed.number) {
            return course.Subject.Abbreviation === parsed.subject &&
                   course.Number === parsed.number;
        } else if (parsed.subject) {
            return course.Subject.Abbreviation === parsed.subject;
        } else if (parsed.number) {
            return course.Number === parsed.number;
        } else {
            return course.Title &&
                   course.Title.toLowerCase().includes(query.toLowerCase());
        }
    });

    // Limit results to 50 for better performance
    if (filteredCourses.length > 50) {
        console.log(`⚠️ Found ${filteredCourses.length} courses, showing first 50`);
        filteredCourses = filteredCourses.slice(0, 50);
    }

    // Sort by subject abbreviation first, then course number
    filteredCourses.sort((a, b) => {
        const subjA = a.Subject?.Abbreviation || '';
        const subjB = b.Subject?.Abbreviation || '';

        if (subjA !== subjB) {
            return subjA.localeCompare(subjB);
        }

        const numA = parseInt(a.Number) || 0;
        const numB = parseInt(b.Number) || 0;
        return numA - numB;
    });

    courseState.searchResults = filteredCourses;
    return filteredCourses;
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
                <p>Try a different search term like "TECH 12000" or "CNIT"</p>
            </div>
        `;
        return;
    }

    // Reset to page 1 on new search
    courseState.currentPage = 1;

    renderPaginatedResults(courses);
}

function renderPaginatedResults(courses) {
    if (!courseElements.resultsContainer) return;

    const totalPages = Math.ceil(courses.length / courseState.itemsPerPage);
    const startIdx = (courseState.currentPage - 1) * courseState.itemsPerPage;
    const endIdx = startIdx + courseState.itemsPerPage;
    const pageItems = courses.slice(startIdx, endIdx);

    courseElements.resultsContainer.innerHTML = '';

    // Show result count
    const resultInfo = document.createElement('div');
    resultInfo.className = 'result-info';
    resultInfo.innerHTML = `
        <p>Showing ${startIdx + 1}-${Math.min(endIdx, courses.length)} of ${courses.length} courses</p>
    `;
    courseElements.resultsContainer.appendChild(resultInfo);

    // Display courses for current page
    pageItems.forEach(course => {
        const card = createCourseCard(course);
        courseElements.resultsContainer.appendChild(card);
    });

    // Add pagination controls if needed
    if (totalPages > 1) {
        const pagination = createPaginationControls(totalPages, courses);
        courseElements.resultsContainer.appendChild(pagination);
    }
}

function createPaginationControls(totalPages, courses) {
    const container = document.createElement('div');
    container.className = 'pagination-controls';

    // Previous button
    const prevBtn = document.createElement('button');
    prevBtn.textContent = '← Previous';
    prevBtn.className = 'pagination-btn';
    prevBtn.disabled = courseState.currentPage === 1;
    prevBtn.onclick = () => {
        if (courseState.currentPage > 1) {
            courseState.currentPage--;
            renderPaginatedResults(courses);
            courseElements.resultsContainer.scrollIntoView({ behavior: 'smooth' });
        }
    };

    // Page info
    const pageInfo = document.createElement('span');
    pageInfo.className = 'page-info';
    pageInfo.textContent = `Page ${courseState.currentPage} of ${totalPages}`;

    // Next button
    const nextBtn = document.createElement('button');
    nextBtn.textContent = 'Next →';
    nextBtn.className = 'pagination-btn';
    nextBtn.disabled = courseState.currentPage === totalPages;
    nextBtn.onclick = () => {
        if (courseState.currentPage < totalPages) {
            courseState.currentPage++;
            renderPaginatedResults(courses);
            courseElements.resultsContainer.scrollIntoView({ behavior: 'smooth' });
        }
    };

    container.appendChild(prevBtn);
    container.appendChild(pageInfo);
    container.appendChild(nextBtn);

    return container;
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
        <button class="view-sections-btn" data-course-id="${course.Id}">
            View Sections
        </button>
        <div class="course-sections" id="sections-${course.Id}" style="display: none;">
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
    const sectionsContainer = card.querySelector(`#sections-${course.Id}`);
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
            console.log('==========================================');
            console.log('👉 View Sections clicked for course:', course);
            console.log('Course ID:', course.Id);
            console.log('Course Title:', course.Title);
            console.log('==========================================');

            // Update loading message
            sectionsContainer.innerHTML = `
                <div class="loading-sections">
                    <div style="text-align: center; padding: 20px;">
                        <div style="font-size: 24px; margin-bottom: 10px;">⏳</div>
                        <div><strong>Loading sections from server...</strong></div>
                        <div style="font-size: 12px; color: #666; margin-top: 10px;">
                            <strong>First time:</strong> 10-20 seconds (loading 516K classes + 665K sections)<br>
                            <strong>After that:</strong> Instant (server cached)
                        </div>
                        <div style="font-size: 11px; color: #999; margin-top: 10px; font-style: italic;">
                            Server is filtering data on backend for better performance
                        </div>
                    </div>
                </div>
            `;

            const sections = await loadCourseSections(course.Id);
            console.log('✅ Received sections:', sections.length);
            displaySections(sectionsContainer, sections, course);
        } catch (error) {
            console.error('❌ Error loading sections:', error);
            console.error('Error stack:', error.stack);
            sectionsContainer.innerHTML = `
                <p class="error-message">
                    ⚠️ Failed to load sections. Please try again.
                    <br><small>${error.message}</small>
                </p>
            `;
        }
    }
}

async function loadCourseSections(courseId) {
    if (!courseState.currentTerm) {
        throw new Error('No term selected');
    }

    console.log('🔍 Fetching sections from backend...');
    console.log('  CourseId:', courseId);
    console.log('  TermId:', courseState.currentTerm.Id);
    console.log('  Term Name:', courseState.currentTerm.Name);

    // Use backend endpoint to filter sections server-side
    const url = `http://localhost:3000/api/course-sections/${courseId}/${courseState.currentTerm.Id}`;

    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to load sections: ${response.status}`);
    }

    const result = await response.json();

    if (!result.success) {
        throw new Error(result.message || 'Failed to load sections');
    }

    const sections = result.data || [];

    console.log(`✅ Found ${sections.length} sections (${result.classCount} classes)`);

    if (sections.length > 0) {
        console.log('Sample section:', sections[0]);
    }

    return sections;
}

function displaySections(container, sections, course) {
    if (sections.length === 0) {
        const subjectAbbr = course.Subject?.Abbreviation || 'N/A';
        const courseNumber = course.Number?.replace(/^0+/, '') || 'N/A';
        const termName = courseState.currentTerm?.Name || 'selected term';

        container.innerHTML = `
            <div class="no-sections">
                <p><strong>No sections found for ${subjectAbbr} ${courseNumber} in ${termName}</strong></p>
                <p style="font-size: 14px; color: #666; margin-top: 10px;">
                    This course may not be offered this term. Try selecting a different term from the dropdown.
                </p>
            </div>
        `;
        return;
    }

    // Initialize section page for this course if not exists
    if (!courseState.sectionPages[course.Id]) {
        courseState.sectionPages[course.Id] = 1;
    }

    renderPaginatedSections(container, sections, course);
}

function renderPaginatedSections(container, sections, course) {
    const currentPage = courseState.sectionPages[course.Id] || 1;
    const totalPages = Math.ceil(sections.length / courseState.sectionsPerPage);
    const startIdx = (currentPage - 1) * courseState.sectionsPerPage;
    const endIdx = startIdx + courseState.sectionsPerPage;
    const pageItems = sections.slice(startIdx, endIdx);

    container.innerHTML = '<h4>Available Sections:</h4>';

    // Section count info
    const sectionInfo = document.createElement('div');
    sectionInfo.className = 'section-info-header';
    sectionInfo.innerHTML = `
        <p>Showing ${startIdx + 1}-${Math.min(endIdx, sections.length)} of ${sections.length} sections</p>
    `;
    container.appendChild(sectionInfo);

    // Sections list
    const sectionsList = document.createElement('div');
    sectionsList.className = 'sections-list';

    pageItems.forEach(section => {
        const sectionCard = createSectionCard(section, course);
        sectionsList.appendChild(sectionCard);
    });

    container.appendChild(sectionsList);

    // Pagination controls if needed
    if (totalPages > 1) {
        const pagination = createSectionPaginationControls(totalPages, sections, course, container);
        container.appendChild(pagination);
    }
}

function createSectionPaginationControls(totalPages, sections, course, container) {
    const currentPage = courseState.sectionPages[course.Id];
    const paginationDiv = document.createElement('div');
    paginationDiv.className = 'section-pagination-controls';

    // Previous button
    const prevBtn = document.createElement('button');
    prevBtn.textContent = '← Previous';
    prevBtn.className = 'section-pagination-btn';
    prevBtn.disabled = currentPage === 1;
    prevBtn.onclick = () => {
        if (currentPage > 1) {
            courseState.sectionPages[course.Id]--;
            renderPaginatedSections(container, sections, course);
        }
    };

    // Page info
    const pageInfo = document.createElement('span');
    pageInfo.className = 'section-page-info';
    pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;

    // Next button
    const nextBtn = document.createElement('button');
    nextBtn.textContent = 'Next →';
    nextBtn.className = 'section-pagination-btn';
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.onclick = () => {
        if (currentPage < totalPages) {
            courseState.sectionPages[course.Id]++;
            renderPaginatedSections(container, sections, course);
        }
    };

    paginationDiv.appendChild(prevBtn);
    paginationDiv.appendChild(pageInfo);
    paginationDiv.appendChild(nextBtn);

    return paginationDiv;
}

function createSectionCard(section, course) {
    const card = document.createElement('div');
    card.className = 'section-card';

    // Check if section is already selected
    const isSelected = courseState.selectedSections.some(s => s.Id === section.Id);
    if (isSelected) {
        card.classList.add('selected');
    }

    // Format meeting times
    const meetingTimes = formatMeetingTimes(section.Meetings);

    card.innerHTML = `
        <div class="section-header">
            <span class="section-crn">CRN: ${section.Crn || 'N/A'}</span>
            <span class="section-type">${section.Type || 'Lecture'}</span>
        </div>
        <div class="section-info">
            <div class="section-times">${meetingTimes}</div>
        </div>
        <button class="add-section-btn ${isSelected ? 'selected' : ''}"
                data-section-id="${section.Id}">
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

        return `<strong>${days}</strong>: ${time} @ ${location}`;
    }).join('<br>');
}

function formatTime(startTime, duration) {
    if (!startTime) return 'TBA';

    // Parse time string format "14:30:00.0000000"
    const timeMatch = startTime.match(/^(\d+):(\d+):(\d+)/);
    if (!timeMatch) return 'TBA';

    const startHour = parseInt(timeMatch[1]);
    const startMin = parseInt(timeMatch[2]);

    const startFormatted = formatTimeString(startHour, startMin);

    if (duration) {
        // Parse duration (format: "PT50M" or "PT1H30M")
        const durationMatch = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
        if (durationMatch) {
            const hours = parseInt(durationMatch[1] || 0);
            const minutes = parseInt(durationMatch[2] || 0);

            const totalEndMin = startMin + minutes;
            const endHour = startHour + hours + Math.floor(totalEndMin / 60);
            const endMinFinal = totalEndMin % 60;

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
    if (!room) return 'TBA';

    const building = room.Building?.ShortCode || '';
    const roomNum = room.Number || '';

    if (!building && !roomNum) return 'TBA';

    return `${building} ${roomNum}`.trim();
}

// ==========================================
// Section Selection and Schedule Management
// ==========================================
function toggleSectionSelection(section, course, card) {
    const existingIndex = courseState.selectedSections.findIndex(s => s.Id === section.Id);

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
            Id: s.Id,
            Crn: s.Crn,
            Type: s.Type,
            Meetings: s.Meetings,
            _course: {
                Id: s._course.Id,
                CourseId: s._course.Id,
                Number: s._course.Number,
                Title: s._course.Title,
                Subject: s._course.Subject,
                CreditHours: s._course.CreditHours || 0
            }
        })),
        termId: courseState.currentTerm?.Id
    };

    localStorage.setItem('purdueSchedule', JSON.stringify(scheduleData));
}

function loadSavedSchedule() {
    try {
        const saved = localStorage.getItem('purdueSchedule');
        if (saved) {
            const data = JSON.parse(saved);
            courseState.selectedSections = data.sections || [];

            console.log('✅ Loaded saved schedule:', courseState.selectedSections.length, 'sections');

            // Update display - might need to wait for DOM
            setTimeout(() => {
                updateScheduleDisplay();
            }, 100);
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
