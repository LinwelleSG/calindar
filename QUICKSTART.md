# 🚀 Quick Start Guide - Calindar PWA

## Installation Options

### Option 1: Simple Start (Windows)
1. Double-click `run.bat`
2. Wait for dependencies to install
3. Open http://127.0.0.1:5000 in your browser

### Option 2: Simple Start (Mac/Linux)
1. Make the script executable: `chmod +x run.sh`
2. Run: `./run.sh`
3. Open http://127.0.0.1:5000 in your browser

### Option 3: Manual Setup
```bash
# Install dependencies
pip install -r requirements.txt

# Start the application
python app.py
```

## First Time Setup

1. **Create Your First Calendar**
   - Click "Create New Calendar"
   - Enter a name (e.g., "Family Calendar")
   - Note the 8-character share code generated

2. **Add Your First Event**
   - Click "Add Event"
   - Fill in the details
   - Set a reminder if needed

3. **Share with Family**
   - Click "Share" button
   - Copy the share code
   - Send to family members
   - They click "Join with Share Code"

## Features Overview

### 📅 Calendar Management
- Create multiple calendars
- Unique share codes for each calendar
- Easy switching between calendars

### 👥 Family Sharing
- Share calendars instantly with 8-character codes
- Real-time synchronization across all devices
- No accounts needed - just share the code

### 📱 Mobile-Friendly
- Install as PWA on mobile devices
- Works offline after initial load
- Responsive design for all screen sizes

### 🔔 Smart Reminders
- Set reminders from 5 minutes to 1 day before events
- Multiple reminder options per event
- Visual notifications in the app

### ⚡ Real-Time Updates
- See changes instantly across all connected devices
- No manual refresh needed
- Live event updates using WebSockets

## Usage Tips

### Creating Events
- Use the calendar widget to select dates
- Set "All Day" for events without specific times
- Add descriptions for detailed information
- Configure reminders based on event importance

### Sharing Best Practices
- Create separate calendars for different purposes:
  - Family calendar for shared events
  - Work calendar for professional events
  - Personal calendar for individual tasks
- Share codes are permanent - save them for future reference
- Multiple people can use the same share code

### Mobile Usage
- Add to home screen for app-like experience
- Works great in landscape mode on tablets
- Tap and hold events for quick actions
- Pull down to refresh calendar view

## Troubleshooting

### Common Issues

**App won't start:**
- Make sure Python is installed
- Run `pip install -r requirements.txt`
- Check that port 5000 is available

**Can't see events:**
- Refresh the page
- Check if you're viewing the correct calendar
- Verify the share code is correct

**Real-time updates not working:**
- Ensure JavaScript is enabled
- Check your internet connection
- Try refreshing the page

**PWA install not showing:**
- Add icon files to `static/icons/` directory
- Use HTTPS in production
- Ensure manifest.json is accessible

## Customization

### Colors and Themes
Edit `static/css/style.css` to change:
- Primary color (default: #2196F3)
- Background colors
- Font styles
- Button appearances

### Adding Features
The app is built with modularity in mind:
- Add new API endpoints in `app/api/`
- Extend the database models in `app/models.py`
- Add new frontend features in `static/js/`

## Production Deployment

### Environment Variables
Create a `.env` file with:
```
SECRET_KEY=your-super-secret-production-key
DATABASE_URL=postgresql://user:pass@host:port/dbname
FLASK_ENV=production
```

### Database Setup
For production, use PostgreSQL:
```bash
pip install psycopg2-binary
export DATABASE_URL=postgresql://user:pass@host:port/dbname
```

### Web Server
Use Gunicorn for production:
```bash
pip install gunicorn
gunicorn --worker-class eventlet -w 1 app:app
```

## Support

### Need Help?
- Check the README.md for detailed documentation
- Review the code comments for technical details
- Create an issue on the project repository

### Contributing
- Fork the repository
- Create a feature branch
- Submit a pull request with your improvements

---

**Happy Calendar Sharing! 📅✨**