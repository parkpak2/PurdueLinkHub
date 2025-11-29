/**
 * Boiler Link Hub - Backend Server
 * Handles usage tracking and trending links analytics
 */

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// ==========================================
// Middleware
// ==========================================
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..')));

// Request logging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// ==========================================
// Data Storage Configuration
// ==========================================
const DATA_DIR = path.join(__dirname, 'data');
const USAGE_LOG_FILE = path.join(DATA_DIR, 'usage-log.json');
const STATS_FILE = path.join(DATA_DIR, 'stats.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initialize files if they don't exist
if (!fs.existsSync(USAGE_LOG_FILE)) {
    fs.writeFileSync(USAGE_LOG_FILE, JSON.stringify([], null, 2));
}

if (!fs.existsSync(STATS_FILE)) {
    fs.writeFileSync(STATS_FILE, JSON.stringify({}, null, 2));
}

// ==========================================
// Helper Functions
// ==========================================

/**
 * Read usage log from file
 */
function readUsageLog() {
    try {
        const data = fs.readFileSync(USAGE_LOG_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading usage log:', error);
        return [];
    }
}

/**
 * Write usage log to file
 */
function writeUsageLog(log) {
    try {
        fs.writeFileSync(USAGE_LOG_FILE, JSON.stringify(log, null, 2));
    } catch (error) {
        console.error('Error writing usage log:', error);
    }
}

/**
 * Read stats from file
 */
function readStats() {
    try {
        const data = fs.readFileSync(STATS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading stats:', error);
        return {};
    }
}

/**
 * Write stats to file
 */
function writeStats(stats) {
    try {
        fs.writeFileSync(STATS_FILE, JSON.stringify(stats, null, 2));
    } catch (error) {
        console.error('Error writing stats:', error);
    }
}

/**
 * Filter usage log by date range
 */
function filterByDateRange(log, days) {
    const now = new Date();
    const cutoffDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    return log.filter(entry => {
        const entryDate = new Date(entry.timestamp);
        return entryDate >= cutoffDate;
    });
}

/**
 * Aggregate usage counts by linkId
 */
function aggregateUsage(log) {
    const counts = {};

    log.forEach(entry => {
        if (!counts[entry.linkId]) {
            counts[entry.linkId] = {
                linkId: entry.linkId,
                name: entry.name || entry.linkId,
                count: 0
            };
        }
        counts[entry.linkId].count++;
    });

    return Object.values(counts);
}

// ==========================================
// Purdue.io API Proxy
// ==========================================

/**
 * GET /api/purdue/*
 * Proxy requests to Purdue.io API to avoid CORS issues
 */
app.get('/api/purdue/*', async (req, res) => {
    try {
        // Extract the path after /api/purdue/
        const purduePath = req.path.replace('/api/purdue/', '');

        // Reconstruct query string
        const queryString = Object.keys(req.query)
            .map(key => `${key}=${encodeURIComponent(req.query[key])}`)
            .join('&');

        const purdueUrl = `https://api.purdue.io/odata/${purduePath}${queryString ? '?' + queryString : ''}`;

        console.log('Proxying to Purdue.io:', purdueUrl);

        // Use dynamic import for node-fetch
        const fetch = (await import('node-fetch')).default;
        const response = await fetch(purdueUrl);

        if (!response.ok) {
            throw new Error(`Purdue.io API returned ${response.status}`);
        }

        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('Error proxying to Purdue.io:', error);
        res.status(500).json({
            error: 'Failed to fetch data from Purdue.io',
            message: error.message
        });
    }
});

// ==========================================
// On-Demand Data Loading (No upfront caching)
// ==========================================
// All data is fetched from Purdue.io API on-demand when needed

// ==========================================
// Course Sections Endpoint (Backend Filtering)
// ==========================================

/**
 * GET /api/course-sections/:courseId/:termId
 * Get sections for a specific course and term (on-demand from Purdue.io API)
 */
app.get('/api/course-sections/:courseId/:termId', async (req, res) => {
    try {
        const { courseId, termId } = req.params;
        console.log(`\n🔍 Fetching sections for course ${courseId} in term ${termId}`);

        const fetch = (await import('node-fetch')).default;
        const startTime = Date.now();

        // Step 1: Get classes for this course and term
        const classesUrl = `https://api.purdue.io/odata/Classes?$filter=CourseId eq ${courseId} and TermId eq ${termId}`;
        const classesResponse = await fetch(classesUrl);
        if (!classesResponse.ok) throw new Error('Failed to fetch classes');

        const classesData = await classesResponse.json();
        const matchingClasses = classesData.value;
        console.log(`   Found ${matchingClasses.length} classes`);

        if (matchingClasses.length === 0) {
            return res.json({ success: true, data: [] });
        }

        // Step 2: Get sections for these classes (in batches to avoid URL length limit)
        const classIds = matchingClasses.map(c => c.Id);
        const batchSize = 10; // Fetch 10 classes at a time to avoid URL length issues
        let allSections = [];

        for (let i = 0; i < classIds.length; i += batchSize) {
            const batch = classIds.slice(i, i + batchSize);
            const classIdFilter = batch.map(id => `ClassId eq ${id}`).join(' or ');
            const sectionsUrl = `https://api.purdue.io/odata/Sections?$filter=${classIdFilter}`;

            const sectionsResponse = await fetch(sectionsUrl);
            if (!sectionsResponse.ok) {
                console.error(`   ❌ Failed to fetch sections batch ${i / batchSize + 1}: ${sectionsResponse.status}`);
                throw new Error(`Failed to fetch sections: ${sectionsResponse.status}`);
            }

            const sectionsData = await sectionsResponse.json();
            allSections.push(...sectionsData.value);
        }

        console.log(`   Found ${allSections.length} sections`);

        if (allSections.length === 0) {
            return res.json({ success: true, data: [] });
        }

        // Step 3: Get meetings for these sections (in batches)
        const sectionIds = allSections.map(s => s.Id);
        let allMeetings = [];

        for (let i = 0; i < sectionIds.length; i += batchSize) {
            const batch = sectionIds.slice(i, i + batchSize);
            const sectionIdFilter = batch.map(id => `SectionId eq ${id}`).join(' or ');
            const meetingsUrl = `https://api.purdue.io/odata/Meetings?$filter=${sectionIdFilter}`;

            const meetingsResponse = await fetch(meetingsUrl);
            if (!meetingsResponse.ok) {
                console.error(`   ❌ Failed to fetch meetings batch ${i / batchSize + 1}: ${meetingsResponse.status}`);
                throw new Error(`Failed to fetch meetings: ${meetingsResponse.status}`);
            }

            const meetingsData = await meetingsResponse.json();
            allMeetings.push(...meetingsData.value);
        }

        console.log(`   Found ${allMeetings.length} meetings`);

        // Step 4: Get instructors, rooms, and buildings
        const instructorIds = [...new Set(allMeetings.map(m => m.InstructorId).filter(id => id))];
        const roomIds = [...new Set(allMeetings.map(m => m.RoomId).filter(id => id))];

        let instructors = [];
        let rooms = [];
        let buildings = [];

        // Fetch instructors and rooms in parallel
        if (instructorIds.length > 0 || roomIds.length > 0) {
            const promises = [];

            if (instructorIds.length > 0) {
                const instructorFilter = instructorIds.map(id => `Id eq ${id}`).join(' or ');
                const instructorsUrl = `https://api.purdue.io/odata/Instructors?$filter=${instructorFilter}`;
                promises.push(fetch(instructorsUrl).then(r => r.json()));
            } else {
                promises.push(Promise.resolve({ value: [] }));
            }

            if (roomIds.length > 0) {
                const roomFilter = roomIds.map(id => `Id eq ${id}`).join(' or ');
                const roomsUrl = `https://api.purdue.io/odata/Rooms?$filter=${roomFilter}`;
                promises.push(fetch(roomsUrl).then(r => r.json()));
            } else {
                promises.push(Promise.resolve({ value: [] }));
            }

            const [instructorsData, roomsData] = await Promise.all(promises);
            instructors = instructorsData.value;
            rooms = roomsData.value;

            // Get buildings for the rooms
            if (rooms.length > 0) {
                const buildingIds = [...new Set(rooms.map(r => r.BuildingId).filter(id => id))];
                if (buildingIds.length > 0) {
                    const buildingFilter = buildingIds.map(id => `Id eq ${id}`).join(' or ');
                    const buildingsUrl = `https://api.purdue.io/odata/Buildings?$filter=${buildingFilter}`;
                    const buildingsResponse = await fetch(buildingsUrl);
                    const buildingsData = await buildingsResponse.json();
                    buildings = buildingsData.value;
                }
            }
        }

        // Step 5: Enrich sections with meetings, instructors, and rooms
        const enrichedSections = allSections.map(section => {
            const sectionMeetings = allMeetings.filter(m => m.SectionId === section.Id);

            const enrichedMeetings = sectionMeetings.map(meeting => {
                let enriched = { ...meeting };

                // Attach instructor
                if (meeting.InstructorId) {
                    const instructor = instructors.find(i => i.Id === meeting.InstructorId);
                    if (instructor) {
                        enriched.Instructor = instructor;
                    }
                }

                // Attach room with building info
                if (meeting.RoomId) {
                    const room = rooms.find(r => r.Id === meeting.RoomId);
                    if (room) {
                        const building = buildings.find(b => b.Id === room.BuildingId);
                        enriched.Room = {
                            ...room,
                            Building: building
                        };
                    }
                }

                return enriched;
            });

            return {
                ...section,
                Meetings: enrichedMeetings
            };
        });

        const loadTime = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(`   ✅ Completed in ${loadTime}s\n`);

        res.json({
            success: true,
            data: enrichedSections,
            classCount: matchingClasses.length,
            sectionCount: enrichedSections.length,
            loadTime: loadTime
        });

    } catch (error) {
        console.error('❌ Error fetching course sections:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch course sections',
            message: error.message
        });
    }
});

// ==========================================
// API Routes
// ==========================================

/**
 * POST /api/usage
 * Log a link click event
 */
app.post('/api/usage', (req, res) => {
    try {
        const { linkId, name, category } = req.body;

        // Validation
        if (!linkId) {
            return res.status(400).json({ error: 'linkId is required' });
        }

        // Create usage entry
        const entry = {
            linkId,
            name: name || linkId,
            category: category || 'Unknown',
            timestamp: new Date().toISOString(),
            userAgent: req.headers['user-agent'] || 'Unknown'
        };

        // Read current log
        const log = readUsageLog();

        // Add new entry
        log.push(entry);

        // Write back to file
        writeUsageLog(log);

        // Update aggregated stats
        updateStats(entry);

        console.log(`Usage logged: ${linkId} (${name})`);

        res.status(201).json({
            success: true,
            message: 'Usage logged successfully',
            data: entry
        });
    } catch (error) {
        console.error('Error logging usage:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * GET /api/popular
 * Get most popular links by time range
 * Query params:
 *   - range: Time range in format like "7d", "30d", "all" (default: "7d")
 *   - limit: Maximum number of results (default: 10)
 */
app.get('/api/popular', (req, res) => {
    try {
        const range = req.query.range || '7d';
        const limit = parseInt(req.query.limit) || 10;

        // Read usage log
        let log = readUsageLog();

        // Filter by date range
        if (range !== 'all') {
            const days = parseInt(range.replace('d', ''));
            if (isNaN(days)) {
                return res.status(400).json({ error: 'Invalid range format. Use "7d", "30d", or "all"' });
            }
            log = filterByDateRange(log, days);
        }

        // Aggregate counts
        const aggregated = aggregateUsage(log);

        // Sort by count (descending)
        aggregated.sort((a, b) => b.count - a.count);

        // Limit results
        const topLinks = aggregated.slice(0, limit);

        res.json({
            success: true,
            range,
            total: log.length,
            results: topLinks.length,
            data: topLinks
        });
    } catch (error) {
        console.error('Error getting popular links:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * GET /api/stats
 * Get overall statistics
 */
app.get('/api/stats', (req, res) => {
    try {
        const stats = readStats();
        const log = readUsageLog();

        const response = {
            success: true,
            data: {
                totalClicks: log.length,
                uniqueLinks: Object.keys(stats).length,
                last24h: filterByDateRange(log, 1).length,
                last7d: filterByDateRange(log, 7).length,
                last30d: filterByDateRange(log, 30).length,
                topLinks: stats
            }
        };

        res.json(response);
    } catch (error) {
        console.error('Error getting stats:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * DELETE /api/usage/clear
 * Clear all usage data (for testing/reset)
 */
app.delete('/api/usage/clear', (req, res) => {
    try {
        writeUsageLog([]);
        writeStats({});

        console.log('Usage data cleared');

        res.json({
            success: true,
            message: 'All usage data cleared'
        });
    } catch (error) {
        console.error('Error clearing data:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * Update aggregated stats (for quick access)
 */
function updateStats(entry) {
    const stats = readStats();

    if (!stats[entry.linkId]) {
        stats[entry.linkId] = {
            linkId: entry.linkId,
            name: entry.name,
            category: entry.category,
            count: 0,
            firstSeen: entry.timestamp,
            lastSeen: entry.timestamp
        };
    }

    stats[entry.linkId].count++;
    stats[entry.linkId].lastSeen = entry.timestamp;

    writeStats(stats);
}

// ==========================================
// Health Check
// ==========================================
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// ==========================================
// Error Handling
// ==========================================
app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
});

app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// ==========================================
// Start Server
// ==========================================
app.listen(PORT, () => {
    console.log('===========================================');
    console.log('🚀 Boiler Link Hub Server');
    console.log('===========================================');
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`API Endpoints:`);
    console.log(`  POST   /api/usage       - Log link click`);
    console.log(`  GET    /api/popular     - Get trending links`);
    console.log(`  GET    /api/stats       - Get statistics`);
    console.log(`  DELETE s/api/usage/clear - Clear all data`);
    console.log(`  GET    /health          - Health check`);
    console.log('===========================================');
});
