# 🔗 Purdue Link Hub

A centralized, intelligent web platform for Purdue University students featuring course planning, real-time trending analytics, and one-click access to essential university resources.

![Purdue Colors](https://img.shields.io/badge/Purdue-Old%20Gold%20%26%20Black-CEB888?style=for-the-badge)
![Node.js](https://img.shields.io/badge/Node.js-Express-green?style=for-the-badge)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-yellow?style=for-the-badge)

## 🎯 Overview

Purdue Link Hub goes beyond simple bookmarks by providing intelligent features that Google can't replicate:
- **Smart Course Planning**: Search Purdue courses, build visual schedules, detect time conflicts
- **Trending Analytics**: See what links Purdue students are using right now
- **Academic Calendar**: Never miss registration, add/drop, or tuition deadlines
- **One-Click Access**: All essential Purdue resources organized and searchable

## ✨ Features

### 🔥 NEW: Advanced Features

#### 📚 Course Planner (Purdue.io Integration)
- **Real-time Course Search**: Search all Purdue courses using official Purdue.io API
- **Section Details**: View meeting times, locations, instructors, and seat availability
- **Visual Schedule Builder**: Drag-and-drop weekly calendar (Monday-Friday, 7 AM - 10 PM)
- **Conflict Detection**: Automatic detection and highlighting of time conflicts
- **Persistent Storage**: Your schedule saves automatically to localStorage

#### 🔥 Trending Now
- **Real-time Analytics**: See the top 5 most-clicked links at Purdue (last 7 days)
- **Community-Driven**: Data reflects what actual Purdue students are using
- **Live Updates**: Refreshes automatically every minute
- **Beautiful UI**: Medal rankings (🥇🥈🥉) for top links

#### 📅 Academic Deadlines
- **Smart Reminders**: Automatically shows upcoming deadlines within 14 days
- **Priority System**: Color-coded urgency (today, 3 days, 7 days, 14 days)
- **Registration Week Mode**: Course Planner gets highlighted during registration periods
- **Important Dates**: Add/Drop, Tuition, Withdrawal, Finals Week

### 🌟 Core Features
- **Categorized Resources**: Organized tabs for Academics, Career, Campus Life, and Utilities
- **Personalized Quick Access**: Pin your favorite links to "My Links" for instant access
- **Smart Search**: Filter resources by name, description, or category
- **Dark Mode**: Toggle between light and dark themes
- **Mobile-First Design**: Fully responsive interface optimized for all devices

### 🎨 Design
- **Purdue Branding**: Official Old Gold (#CFB991) and Black (#000000) color scheme
- **Modern UI**: Rounded cards, smooth animations, and intuitive navigation
- **Accessibility**: Keyboard navigation and screen reader support

## 🚀 Quick Start

### Prerequisites
- **Node.js** (v14+) - Only required for Trending feature
- **Modern Web Browser** - Chrome, Firefox, Safari, or Edge

### Option 1: Full Experience (With Backend)

```bash
# Clone the repository
git clone https://github.com/parkpak2/PurdueLinkHub.git
cd PurdueLinkHub

# Install and start backend server (for Trending feature)
cd server
npm install
npm start

# In a new terminal, start frontend
cd ..
python3 -m http.server 8000

# Visit http://localhost:8000
```

### Option 2: Frontend Only (Without Trending)

```bash
# Clone and open
git clone https://github.com/parkpak2/PurdueLinkHub.git
cd PurdueLinkHub

# Start local server
python3 -m http.server 8000

# Visit http://localhost:8000
```

**Note**: Course Planner and Deadlines work without the backend. Trending feature requires the Node.js server.

## 📁 Project Structure

```
PurdueLinkHub/
├── index.html                  # Main HTML structure
├── style/
│   ├── main.css               # Core styling
│   └── schedule.css           # Course, Deadlines, Trending styles
├── js/
│   ├── app.js                 # Main app + Usage logging
│   ├── courseSearch.js        # Purdue.io API integration
│   ├── schedule.js            # Weekly schedule grid
│   ├── deadlines.js           # Academic calendar system
│   └── trending.js            # Trending analytics
├── data/
│   ├── links.json             # Resource links database
│   └── deadlines.json         # Academic deadlines data
├── server/                     # Backend API (Node.js + Express)
│   ├── server.js              # Express server
│   ├── package.json           # Dependencies
│   ├── README.md              # API documentation
│   └── data/                  # Usage logs (auto-created)
└── README.md                  # This file
```

## 🎮 Usage Guide

### Course Planning
1. Navigate to the **Course Planner** section
2. Select a term (e.g., Spring 2025)
3. Search for courses (e.g., "CS 180", "Calculus")
4. Click "View Sections" to see available sections
5. Click "Add to Schedule" to build your schedule
6. Visual conflicts are highlighted in red automatically

### Trending Links
- Appears automatically at the top when data is available
- Shows top 5 most-clicked links in the last 7 days
- Click any trending item to open that resource
- Updates every 60 seconds

### Academic Deadlines
- Automatically displays deadlines within next 14 days
- Click any deadline to visit the official Purdue page
- Banner shows most urgent deadline at top
- During Registration Week, Course Planner is highlighted

### Pinning Favorites
1. Click the ⭐ icon on any resource card
2. Access pinned resources via the "My Links" tab
3. Preferences saved locally in your browser

## 🔧 API Documentation

### Backend Endpoints

The Node.js backend provides these REST API endpoints:

#### `POST /api/usage`
Log a link click event
```json
{
  "linkId": "brightspace",
  "name": "Brightspace",
  "category": "Academics"
}
```

#### `GET /api/popular?range=7d&limit=5`
Get trending links by time range
```json
{
  "success": true,
  "data": [
    {"linkId": "brightspace", "name": "Brightspace", "count": 45},
    {"linkId": "mypurdue", "name": "MyPurdue", "count": 32}
  ]
}
```

#### `GET /api/stats`
Get overall usage statistics

#### `DELETE /api/usage/clear`
Clear all usage data (testing only)

See `server/README.md` for complete API documentation.

## 🛠️ Customization

### Adding New Resources
Edit `data/links.json`:
```json
{
  "id": "unique-id",
  "name": "Resource Name",
  "url": "https://example.purdue.edu",
  "category": "Academics",
  "description": "Brief description",
  "icon": "📚"
}
```

### Adding Deadlines
Edit `data/deadlines.json`:
```json
{
  "id": "spring25_finals",
  "term": "Spring 2025",
  "type": "Finals",
  "title": "Finals Week",
  "date": "2025-04-28",
  "endDate": "2025-05-03",
  "description": "Final examinations week",
  "priority": "high",
  "icon": "📝",
  "url": "https://www.purdue.edu/registrar/calendars/"
}
```

### Styling Changes
Edit `style/main.css` or `style/schedule.css`. Brand colors:
```css
:root {
    --purdue-gold: #CFB991;
    --text-primary: #000000;
}
```

## 🧪 Testing

### Manual Testing Checklist
- [ ] All resource links open correctly
- [ ] Course search returns Purdue courses
- [ ] Schedule builder shows conflicts
- [ ] Trending card appears (with backend)
- [ ] Deadlines show within 14 days
- [ ] Pin/unpin saves to localStorage
- [ ] Responsive on mobile/tablet/desktop
- [ ] Dark mode works properly

### Browser Compatibility
Tested on:
- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## 🎯 Key Differentiators vs Google

| Feature | Google | Purdue Link Hub |
|---------|--------|-----------------|
| Course Search | ❌ Generic results | ✅ Real-time Purdue.io API |
| Visual Schedule | ❌ No | ✅ Conflict detection |
| Trending Data | ❌ No | ✅ Live student usage |
| Context Awareness | ❌ No | ✅ Registration Week mode |
| Deadline Tracking | ❌ Manual | ✅ Automated reminders |

## 🔮 Future Enhancements

- [ ] Export schedule to Google Calendar
- [ ] RateMyProfessor integration
- [ ] GPA calculator
- [ ] Push notifications for deadlines
- [ ] Progressive Web App (PWA)
- [ ] Multi-campus support

## 🤝 Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This is an unofficial student project and is not affiliated with Purdue University. All Purdue trademarks belong to Purdue University.

## 🙏 Acknowledgments

- **Purdue.io** - Course catalog API ([github.com/Purdue-io/PurdueApi](https://github.com/Purdue-io/PurdueApi))
- **Purdue University** - For inspiration and data
- **All Boilermakers** - Who shaped this project

## 📧 Contact

Questions or suggestions? Open an issue on GitHub.

---

**Boiler Up! 🚂**
