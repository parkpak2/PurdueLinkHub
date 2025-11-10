# 🔗 Purdue Link Hub

A centralized, mobile-responsive web platform designed for Purdue University students to access key university resources from one convenient hub.

![Purdue Colors](https://img.shields.io/badge/Purdue-Old%20Gold%20%26%20Black-CEB888?style=for-the-badge)

## 🎯 Overview

Purdue Link Hub provides a streamlined, visually appealing interface for accessing essential Purdue University resources including:
- **Academics**: Brightspace, MyPurdue, Course Catalog, Libraries
- **Career**: Handshake, Center for Career Opportunities
- **Campus Life**: BoilerConnect, Housing, Dining, Recreation
- **Utilities**: Email, Parking, Campus Map, Financial Services

## ✨ Features

### 🌟 Core Features
- **Categorized Resources**: Organized tabs for Academics, Career, Campus Life, and Utilities
- **Personalized Quick Access**: Pin your favorite links to "My Links" for instant access
- **Smart Search**: Filter resources by name, description, or category
- **Contextual Banners**: Timely reminders for registration, career fairs, and important dates
- **Mobile-First Design**: Fully responsive interface optimized for all devices

### 🎨 Design
- **Purdue Branding**: Official Old Gold (#CEB888) and Black (#000000) color scheme
- **Modern UI**: Rounded cards, smooth animations, and intuitive navigation
- **Accessibility**: WCAG compliant with keyboard navigation and screen reader support

## 🚀 Quick Start

### Option 1: GitHub Pages (Recommended)
1. Fork this repository
2. Go to Settings → Pages
3. Set source to "main" branch
4. Visit `https://[your-username].github.io/PurdueLinkHub`

### Option 2: Local Development
```bash
# Clone the repository
git clone https://github.com/[username]/PurdueLinkHub.git

# Navigate to directory
cd PurdueLinkHub

# Open with a local server (Python example)
python -m http.server 8000

# Visit http://localhost:8000 in your browser
```

### Option 3: Direct File Access
Simply open `index.html` in your web browser. Note: Some browsers may restrict fetching local JSON files; use a local server for best results.

## 📁 Project Structure

```
PurdueLinkHub/
├── index.html              # Main HTML structure
├── style/
│   └── main.css           # Purdue-branded styling
├── js/
│   └── app.js             # Application logic
├── data/
│   └── links.json         # Resource links database
├── assets/
│   ├── icons/             # Icon resources
│   └── logos/             # Purdue branding assets
└── README.md              # Project documentation
```

## 🎮 Usage

### Navigating Resources
- **All Tab**: View all available resources
- **Category Tabs**: Filter by Academics, Career, Campus Life, or Utilities
- **Search Bar**: Type to filter resources by name or description

### Pinning Favorites
1. Click the ⭐ icon on any resource card
2. Access pinned resources via the "My Links" tab
3. Your preferences are saved locally in your browser

### Contextual Banners
The app displays timely reminders based on the academic calendar:
- Registration periods
- Career fair seasons
- Important deadlines

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

### Modifying Categories
Update category buttons in `index.html` and corresponding filter logic in `js/app.js`.

### Styling Changes
Edit `style/main.css`. Purdue brand colors are defined in CSS variables:
```css
:root {
    --purdue-gold: #CEB888;
    --purdue-old-gold: #B1810B;
    --purdue-black: #000000;
}
```

## 🧪 Testing

### Manual Testing Checklist
- [ ] All resource links open correctly
- [ ] Search filters work as expected
- [ ] Category tabs filter appropriately
- [ ] Pin/unpin functionality saves to localStorage
- [ ] Responsive design works on mobile, tablet, and desktop
- [ ] Banner dismissal persists across sessions

### Browser Compatibility
Tested on:
- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## 🔮 Future Enhancements

- [ ] Purdue SSO integration
- [ ] Event calendar API integration
- [ ] Push notifications for important dates
- [ ] Dark mode support
- [ ] Progressive Web App (PWA) functionality
- [ ] Analytics dashboard
- [ ] Multi-language support

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This is an unofficial student project and is not affiliated with Purdue University. All Purdue trademarks and branding belong to Purdue University.

## 🙏 Acknowledgments

- Purdue University for inspiration
- All Boilermakers who helped shape this project
- Icons from Unicode Emoji

## 📧 Contact

For questions or suggestions, please open an issue on GitHub.

---

**Boiler Up! 🚂**