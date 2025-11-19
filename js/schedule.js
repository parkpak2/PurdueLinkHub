/**
 * Weekly Schedule Grid Component
 * Displays selected course sections in a visual weekly calendar
 */

// ==========================================
// Configuration
// ==========================================
const SCHEDULE_CONFIG = {
    startHour: 7,
    endHour: 22,
    daysOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    dayAbbreviations: {
        'Monday': 'M',
        'Tuesday': 'T',
        'Wednesday': 'W',
        'Thursday': 'R',
        'Friday': 'F',
        'Saturday': 'S',
        'Sunday': 'U'
    },
    colors: [
        '#CFB991', // Purdue Gold
        '#6B9BD1', // Blue
        '#81C784', // Green
        '#FFB74D', // Orange
        '#BA68C8', // Purple
        '#F06292', // Pink
        '#4DB6AC', // Teal
        '#FF8A65', // Coral
        '#9575CD', // Deep Purple
        '#FFD54F'  // Yellow
    ]
};

// ==========================================
// State
// ==========================================
const scheduleState = {
    renderedSections: [],
    colorMap: new Map(), // courseId -> color
    conflicts: []
};

// ==========================================
// Schedule Grid Rendering
// ==========================================
function renderScheduleGrid(sections) {
    const scheduleContainer = document.getElementById('scheduleGrid');
    const scheduleSection = document.getElementById('scheduleSection');

    if (!scheduleContainer) return;

    // Show/hide schedule section
    if (sections.length === 0) {
        scheduleSection.style.display = 'none';
        return;
    }

    scheduleSection.style.display = 'block';
    scheduleState.renderedSections = sections;

    // Clear previous grid
    scheduleContainer.innerHTML = '';
    scheduleContainer.className = 'schedule-grid active';

    // Create grid structure
    const grid = createGridStructure();
    scheduleContainer.appendChild(grid);

    // Assign colors to courses
    assignCourseColors(sections);

    // Detect conflicts
    scheduleState.conflicts = detectAllConflicts(sections);

    // Render each section
    sections.forEach(section => {
        renderSection(section, grid);
    });

    // Setup clear schedule button
    setupClearScheduleButton();
}

function createGridStructure() {
    const grid = document.createElement('div');
    grid.className = 'weekly-grid';

    // Calculate grid dimensions
    const numHours = SCHEDULE_CONFIG.endHour - SCHEDULE_CONFIG.startHour;
    const numSlots = numHours * 2; // 30-minute slots

    // Set CSS grid template
    grid.style.gridTemplateColumns = '60px repeat(5, 1fr)';
    grid.style.gridTemplateRows = `40px repeat(${numSlots}, 20px)`;

    // Create header row
    createHeaderRow(grid);

    // Create time labels and grid cells
    createTimeLabelsAndCells(grid, numSlots);

    return grid;
}

function createHeaderRow(grid) {
    // Empty corner cell
    const corner = document.createElement('div');
    corner.className = 'grid-corner';
    grid.appendChild(corner);

    // Day headers
    SCHEDULE_CONFIG.daysOfWeek.forEach(day => {
        const header = document.createElement('div');
        header.className = 'day-header';
        header.textContent = day;
        grid.appendChild(header);
    });
}

function createTimeLabelsAndCells(grid, numSlots) {
    for (let i = 0; i < numSlots; i++) {
        const hour = SCHEDULE_CONFIG.startHour + Math.floor(i / 2);
        const minutes = (i % 2) * 30;

        // Time label (only on the hour)
        if (minutes === 0) {
            const timeLabel = document.createElement('div');
            timeLabel.className = 'time-label';
            timeLabel.textContent = formatHour(hour);
            timeLabel.style.gridRow = `${i + 2} / span 2`;
            grid.appendChild(timeLabel);
        } else {
            const emptyLabel = document.createElement('div');
            emptyLabel.className = 'time-label empty';
            grid.appendChild(emptyLabel);
        }

        // Day cells
        SCHEDULE_CONFIG.daysOfWeek.forEach((day, dayIndex) => {
            const cell = document.createElement('div');
            cell.className = 'schedule-cell';
            cell.dataset.day = dayIndex;
            cell.dataset.slot = i;
            grid.appendChild(cell);
        });
    }
}

function formatHour(hour) {
    if (hour === 0) return '12 AM';
    if (hour < 12) return `${hour} AM`;
    if (hour === 12) return '12 PM';
    return `${hour - 12} PM`;
}

// ==========================================
// Section Rendering
// ==========================================
function renderSection(section, grid) {
    if (!section.Meetings || section.Meetings.length === 0) return;

    const courseId = section._course?.CourseId;
    const color = scheduleState.colorMap.get(courseId) || '#999';

    section.Meetings.forEach(meeting => {
        renderMeeting(meeting, section, color, grid);
    });
}

function renderMeeting(meeting, section, color, grid) {
    if (!meeting.DaysOfWeek || !meeting.StartTime) return;

    // Parse days
    const days = parseDaysOfWeek(meeting.DaysOfWeek);

    days.forEach(dayIndex => {
        const block = createMeetingBlock(meeting, section, color, dayIndex);
        if (block) {
            grid.appendChild(block);
        }
    });
}

function createMeetingBlock(meeting, section, color, dayIndex) {
    const timeInfo = parseTimeInfo(meeting.StartTime, meeting.Duration);
    if (!timeInfo) return null;

    const { startSlot, numSlots } = timeInfo;

    // Check if out of bounds
    if (startSlot < 0 || startSlot >= (SCHEDULE_CONFIG.endHour - SCHEDULE_CONFIG.startHour) * 2) {
        return null;
    }

    const block = document.createElement('div');
    block.className = 'meeting-block';

    // Check if this section has conflicts
    const hasConflict = scheduleState.conflicts.some(conflict =>
        conflict.sections.includes(section.SectionId)
    );

    if (hasConflict) {
        block.classList.add('conflict');
    }

    // Position in grid
    block.style.gridColumn = dayIndex + 2; // +2 for time label column and 1-indexing
    block.style.gridRow = `${startSlot + 2} / span ${numSlots}`;
    block.style.backgroundColor = color;
    block.style.borderLeft = `4px solid ${adjustBrightness(color, -20)}`;

    // Content
    const subject = section._course?.Subject?.Abbreviation || '';
    const number = section._course?.Number?.replace(/^0+/, '') || '';
    const courseCode = `${subject} ${number}`;
    const type = section.Type || 'Lecture';
    const location = formatLocation(meeting.Room);
    const time = formatTime(meeting.StartTime, meeting.Duration);

    block.innerHTML = `
        <div class="meeting-block-content">
            <div class="meeting-course">${courseCode}</div>
            <div class="meeting-type">${type}</div>
            <div class="meeting-location">${location}</div>
            <div class="meeting-time">${time}</div>
        </div>
    `;

    // Tooltip
    block.title = `${section._course?.Title}\n${type}\n${time}\n${location}`;

    return block;
}

function parseTimeInfo(startTime, duration) {
    const start = new Date(startTime);
    const startHour = start.getUTCHours();
    const startMin = start.getUTCMinutes();

    // Calculate slot index (0-based, 30-minute slots)
    const startSlot = (startHour - SCHEDULE_CONFIG.startHour) * 2 + (startMin >= 30 ? 1 : 0);

    // Parse duration
    let durationMinutes = 50; // Default
    if (duration) {
        const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
        if (match) {
            const hours = parseInt(match[1] || 0);
            const minutes = parseInt(match[2] || 0);
            durationMinutes = hours * 60 + minutes;
        }
    }

    const numSlots = Math.ceil(durationMinutes / 30);

    return { startSlot, numSlots };
}

function parseDaysOfWeek(daysString) {
    const dayIndices = [];
    const dayMap = {
        'Monday': 0,
        'Tuesday': 1,
        'Wednesday': 2,
        'Thursday': 3,
        'Friday': 4,
        'Saturday': 5,
        'Sunday': 6
    };

    // Handle comma-separated format: "Monday, Wednesday, Friday"
    if (daysString.includes(',')) {
        const days = daysString.split(',').map(d => d.trim());
        days.forEach(day => {
            if (dayMap.hasOwnProperty(day)) {
                dayIndices.push(dayMap[day]);
            }
        });
    } else {
        // Handle abbreviated format: "MWF"
        for (const [fullDay, abbr] of Object.entries(SCHEDULE_CONFIG.dayAbbreviations)) {
            if (daysString.includes(abbr)) {
                const index = dayMap[fullDay];
                if (index !== undefined && !dayIndices.includes(index)) {
                    dayIndices.push(index);
                }
            }
        }
    }

    return dayIndices.filter(i => i < 5); // Only M-F
}

// ==========================================
// Color Assignment
// ==========================================
function assignCourseColors(sections) {
    const uniqueCourses = new Set();

    sections.forEach(section => {
        const courseId = section._course?.CourseId;
        if (courseId) {
            uniqueCourses.add(courseId);
        }
    });

    let colorIndex = 0;
    uniqueCourses.forEach(courseId => {
        if (!scheduleState.colorMap.has(courseId)) {
            scheduleState.colorMap.set(courseId, SCHEDULE_CONFIG.colors[colorIndex % SCHEDULE_CONFIG.colors.length]);
            colorIndex++;
        }
    });
}

function adjustBrightness(color, amount) {
    const num = parseInt(color.replace('#', ''), 16);
    const r = Math.max(0, Math.min(255, (num >> 16) + amount));
    const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + amount));
    const b = Math.max(0, Math.min(255, (num & 0x0000FF) + amount));
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

// ==========================================
// Conflict Detection
// ==========================================
function detectAllConflicts(sections) {
    const conflicts = [];

    for (let i = 0; i < sections.length; i++) {
        for (let j = i + 1; j < sections.length; j++) {
            if (sectionsConflict(sections[i], sections[j])) {
                conflicts.push({
                    sections: [sections[i].SectionId, sections[j].SectionId],
                    courses: [
                        `${sections[i]._course?.Subject?.Abbreviation} ${sections[i]._course?.Number}`,
                        `${sections[j]._course?.Subject?.Abbreviation} ${sections[j]._course?.Number}`
                    ]
                });
            }
        }
    }

    // Show conflict warning if any
    if (conflicts.length > 0) {
        showConflictWarning(conflicts);
    } else {
        hideConflictWarning();
    }

    return conflicts;
}

function sectionsConflict(section1, section2) {
    if (!section1.Meetings || !section2.Meetings) return false;

    for (const meeting1 of section1.Meetings) {
        for (const meeting2 of section2.Meetings) {
            if (meetingsOverlap(meeting1, meeting2)) {
                return true;
            }
        }
    }

    return false;
}

function meetingsOverlap(meeting1, meeting2) {
    // Check if days overlap
    const days1 = parseDaysOfWeek(meeting1.DaysOfWeek || '');
    const days2 = parseDaysOfWeek(meeting2.DaysOfWeek || '');

    const commonDays = days1.filter(day => days2.includes(day));
    if (commonDays.length === 0) return false;

    // Check if times overlap
    const time1 = parseTimeInfo(meeting1.StartTime, meeting1.Duration);
    const time2 = parseTimeInfo(meeting2.StartTime, meeting2.Duration);

    if (!time1 || !time2) return false;

    const end1 = time1.startSlot + time1.numSlots;
    const end2 = time2.startSlot + time2.numSlots;

    // Overlap if: start1 < end2 AND start2 < end1
    return time1.startSlot < end2 && time2.startSlot < end1;
}

function showConflictWarning(conflicts) {
    let warningDiv = document.getElementById('conflictWarning');

    if (!warningDiv) {
        warningDiv = document.createElement('div');
        warningDiv.id = 'conflictWarning';
        warningDiv.className = 'conflict-warning';

        const scheduleSection = document.getElementById('scheduleSection');
        scheduleSection.insertBefore(warningDiv, scheduleSection.firstChild);
    }

    const conflictList = conflicts.map(c =>
        `${c.courses[0]} and ${c.courses[1]}`
    ).join(', ');

    warningDiv.innerHTML = `
        <span class="conflict-icon">⚠️</span>
        <div>
            <strong>Schedule Conflict Detected!</strong>
            <p>The following courses have overlapping times: ${conflictList}</p>
        </div>
    `;
}

function hideConflictWarning() {
    const warningDiv = document.getElementById('conflictWarning');
    if (warningDiv) {
        warningDiv.remove();
    }
}

// ==========================================
// Utilities
// ==========================================
function formatLocation(room) {
    if (!room) return 'TBA';
    const building = room.Building?.ShortCode || 'TBA';
    const roomNum = room.Number || '';
    return `${building} ${roomNum}`;
}

function formatTime(startTime, duration) {
    if (!startTime) return 'TBA';

    const start = new Date(startTime);
    const startHour = start.getUTCHours();
    const startMin = start.getUTCMinutes();

    const startFormatted = formatTimeString(startHour, startMin);

    if (duration) {
        const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
        if (match) {
            const hours = parseInt(match[1] || 0);
            const minutes = parseInt(match[2] || 0);

            const endMin = startMin + minutes;
            const endHour = startHour + hours + Math.floor(endMin / 60);
            const endMinFinal = endMin % 60;

            const endFormatted = formatTimeString(endHour, endMinFinal);
            return `${startFormatted}-${endFormatted}`;
        }
    }

    return startFormatted;
}

function formatTimeString(hour, minute) {
    const period = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    const minStr = minute.toString().padStart(2, '0');
    return `${hour12}:${minStr}${period}`;
}

function setupClearScheduleButton() {
    const clearBtn = document.getElementById('clearScheduleBtn');
    if (clearBtn) {
        clearBtn.onclick = () => {
            if (confirm('Are you sure you want to clear your entire schedule?')) {
                clearSchedule();
            }
        };
    }
}

function clearSchedule() {
    // Clear state
    if (window.CourseSearch && window.CourseSearch.state) {
        window.CourseSearch.state.selectedSections = [];
    }

    // Clear localStorage
    localStorage.removeItem('purdueSchedule');

    // Re-render
    renderScheduleGrid([]);

    // Update any displayed sections
    document.querySelectorAll('.section-card.selected').forEach(card => {
        card.classList.remove('selected');
        const btn = card.querySelector('.add-section-btn');
        if (btn) {
            btn.textContent = 'Add to Schedule';
            btn.classList.remove('selected');
        }
    });

    alert('Schedule cleared successfully!');
}

// ==========================================
// Export
// ==========================================
if (typeof window !== 'undefined') {
    window.ScheduleGrid = {
        render: renderScheduleGrid,
        clear: clearSchedule,
        state: scheduleState
    };
}
