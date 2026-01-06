# 🚀 Complete Running Guide - Congressional Trading Tracker

This guide will walk you through running the **complete** Congressional Trading Tracker application - backend API, web frontend, and mobile app.

## 📋 What You Need

### Required Software
- **Docker Desktop** (easiest) OR:
  - Node.js 18+
  - Python 3.11+
  - PostgreSQL 15+
  - Redis 7+
- **For Mobile**: Expo Go app on your phone OR Android Studio/Xcode

### Installation Links
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- [Node.js](https://nodejs.org/)
- [Python](https://www.python.org/downloads/)
- [Expo Go](https://expo.dev/client) (for testing mobile app)

---

## 🎯 Quick Start (Easiest - Using Docker)

This is the recommended way for beginners!

### Step 1: Start the Backend

```bash
cd tradeUNTRADE
./start.sh
```

**What this does:**
- Starts PostgreSQL database
- Starts Redis cache
- Starts the API server on http://localhost:3000
- Starts WebSocket server on ws://localhost:3000
- Starts Python scrapers in background

**Wait 30 seconds**, then check if it's running:
```bash
curl http://localhost:3000/health
```

You should see: `{"status":"healthy"...}`

### Step 2: Start the Web App

Open a **new terminal**:

```bash
cd tradeUNTRADE/web

# Install dependencies (first time only)
npm install

# Copy environment file
cp .env.example .env

# Start web app
npm run dev
```

**Open your browser**: http://localhost:3001

✅ You should see the Congressional Trading Tracker website!

### Step 3: Start the Mobile App (Optional)

Open **another new terminal**:

```bash
cd tradeUNTRADE/mobile

# Install dependencies (first time only)
npm install

# Start Expo
npm start
```

**On your phone:**
1. Install "Expo Go" from App Store/Play Store
2. Scan the QR code that appears in the terminal
3. The app will load on your phone!

**Note**: Change the API_BASE_URL in `mobile/src/services/api.js` to your computer's IP address (like `http://192.168.1.5:3000/api/v1`) for the mobile app to connect.

---

## 🔍 Testing It Out

### Test the Backend API

```bash
cd tradeUNTRADE
./test-api.sh
```

This will:
- Create a test user
- Make API calls
- Show you example responses

### Use the Web App

1. **Visit** http://localhost:3001
2. **Click "Sign Up"** to create an account
3. **Explore:**
   - Home page shows recent trades (will be empty at first)
   - Politicians page (coming soon - extend it yourself!)
   - Stocks page (coming soon)
   - Dark mode toggle in header

### Use Postman (For Developers)

1. Download [Postman](https://www.postman.com/downloads/)
2. Create a new request
3. Try this:

```
GET http://localhost:3000/api/v1/transactions/feed?limit=10
```

---

## 🛑 Stopping Everything

### Stop Backend (Docker)
```bash
cd tradeUNTRADE
docker-compose down
```

### Stop Web App
In the web app terminal, press `Ctrl+C`

### Stop Mobile App
In the mobile app terminal, press `Ctrl+C`

---

## 🔧 Manual Setup (Without Docker)

If you prefer not to use Docker:

### Step 1: Setup Database

```bash
# Start PostgreSQL (if not already running)
# On Mac: brew services start postgresql
# On Linux: sudo systemctl start postgresql

# Create database
createdb congressional_trading

# Run schema
cd tradeUNTRADE
psql congressional_trading < database/schema.sql
```

### Step 2: Setup Environment

```bash
cd tradeUNTRADE
cp .env.example .env

# Edit .env with your editor (nano, vim, or VS Code)
nano .env
```

**Important settings in .env:**
- `DB_PASSWORD=your_password`
- `JWT_SECRET=a_random_secret_key`
- `JWT_REFRESH_SECRET=another_random_secret`

### Step 3: Start Services Manually

**Terminal 1 - Redis:**
```bash
redis-server
```

**Terminal 2 - Backend API:**
```bash
cd tradeUNTRADE/backend
npm install
npm run dev
```

**Terminal 3 - Python Scrapers (Optional):**
```bash
cd tradeUNTRADE/backend/src/scrapers
pip install -r requirements.txt
python main.py --mode continuous
```

**Terminal 4 - Web App:**
```bash
cd tradeUNTRADE/web
npm install
npm run dev
```

---

## 📱 Mobile App Configuration

### For Real Device Testing

1. **Find your computer's IP address:**

   **Mac/Linux:**
   ```bash
   ifconfig | grep "inet "
   ```

   **Windows:**
   ```bash
   ipconfig
   ```

   Look for something like `192.168.1.5`

2. **Update mobile API config:**

   Edit `mobile/src/services/api.js`:
   ```javascript
   const API_BASE_URL = 'http://YOUR_IP_ADDRESS:3000/api/v1';
   // Example: 'http://192.168.1.5:3000/api/v1'
   ```

3. **Make sure your phone and computer are on the same WiFi network**

4. **Start the mobile app:**
   ```bash
   cd tradeUNTRADE/mobile
   npm start
   ```

5. **Scan QR code with Expo Go app**

---

## 🐛 Troubleshooting

### Backend Issues

**"Port 3000 already in use"**
```bash
# Find and kill the process
lsof -i :3000
kill -9 PID
```

**"Database connection failed"**
```bash
# Check if PostgreSQL is running
docker-compose ps postgres
# OR if manual: pg_isready
```

**"Redis connection failed"**
```bash
# Check if Redis is running
docker-compose ps redis
# OR if manual: redis-cli ping
```

### Web App Issues

**"Cannot connect to API"**
- Make sure backend is running on port 3000
- Check `.env` file in web directory
- Try: `curl http://localhost:3000/health`

**Blank page / No data**
- The database starts empty!
- Wait for scrapers to run (they run every 30 min)
- OR manually trigger: `docker-compose exec scraper python main.py --mode once`

### Mobile App Issues

**"Unable to connect to development server"**
- Make sure you're on the same WiFi network
- Update API_BASE_URL with your computer's IP
- Restart Expo: `r` in the terminal

**"Network request failed"**
- Check API_BASE_URL is correct
- Make sure backend is running
- Try accessing http://YOUR_IP:3000/health from your phone's browser

---

## 📊 Adding Sample Data

The database starts empty. To add sample data:

### Option 1: Wait for Scrapers
The Python scrapers run every 30 minutes and will populate data automatically.

### Option 2: Manual Trigger
```bash
# Trigger scrapers to run now
docker-compose exec scraper python main.py --mode once --days 30
```

### Option 3: Create Seed Data (Advanced)
Create SQL files in `database/seeds/` and run:
```bash
psql congressional_trading < database/seeds/sample_data.sql
```

---

## 🎨 Customizing the UI

### Web App
- **Colors**: Edit `web/tailwind.config.js`
- **Components**: Files in `web/src/components/`
- **Pages**: Files in `web/src/pages/`
- **Styles**: `web/src/index.css`

### Mobile App
- **Styles**: Inline styles in each component
- **Screens**: Files in `mobile/src/screens/`
- **Components**: Files in `mobile/src/components/`

---

## 📖 Understanding the Architecture

```
┌─────────────────┐
│   Web Browser   │  ← You see this (http://localhost:3001)
│   (React App)   │
└────────┬────────┘
         │ HTTP Requests
         ↓
┌─────────────────┐
│   Backend API   │  ← Node.js/Express (http://localhost:3000)
│  + WebSocket    │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ↓         ↓
┌─────────┐ ┌─────────┐
│  Postgr │ │  Redis  │
│  eSQL   │ │  Cache  │
└─────────┘ └─────────┘
    ↑
    │ Writes data
    │
┌─────────────────┐
│ Python Scrapers │  ← Fetch from House/Senate websites
└─────────────────┘
```

---

## 🚦 Next Steps

### For Beginners
1. ✅ Get backend running
2. ✅ Get web app running
3. ✅ Create a user account
4. ✅ Explore the interface
5. ⏳ Wait for scrapers to populate data (or trigger manually)

### For Developers
1. ✅ Review the codebase structure
2. 📝 Read `docs/API_DOCUMENTATION.md`
3. 🔧 Extend missing pages (Politicians, Assets, Analytics)
4. 🎨 Customize the UI/UX
5. 📱 Complete the mobile app features
6. 🚀 Deploy to production

---

## 🆘 Getting Help

### Check Logs

**Backend logs:**
```bash
docker-compose logs -f api
```

**Scraper logs:**
```bash
docker-compose logs -f scraper
```

**All logs:**
```bash
docker-compose logs -f
```

### Common Commands

**Restart everything:**
```bash
docker-compose restart
```

**Rebuild after code changes:**
```bash
docker-compose down
docker-compose up --build -d
```

**Clear all data and start fresh:**
```bash
docker-compose down -v
docker-compose up -d
```

---

## ✅ Success Checklist

- [ ] Backend API responds at http://localhost:3000/health
- [ ] Web app loads at http://localhost:3001
- [ ] Can create a user account
- [ ] Can see the home page
- [ ] Dark mode toggle works
- [ ] Mobile app loads (if testing)
- [ ] No errors in browser console (F12)
- [ ] No errors in terminal logs

---

## 🎯 What's Working vs. What's Missing

### ✅ Fully Implemented
- Backend REST API (all endpoints)
- Database schema
- WebSocket real-time updates
- Python scrapers (House & Senate)
- Authentication system
- Web app home page
- Web app login/register
- Web app layout & navigation
- Dark mode
- Mobile app basic structure

### ⚠️ Partially Implemented (Stubs/Placeholders)
- Web app - Politicians page
- Web app - Assets/Stocks page
- Web app - Analytics page
- Web app - Alerts page
- Mobile app - Most screens

### 💡 You Can Extend
- Complete the missing web pages
- Add charts to analytics
- Implement watchlists
- Add push notifications (mobile)
- Add more filters and search
- Improve UI/UX

---

## 🎉 You're Ready!

If you can see the web app loading and the backend responding, **you're successfully running the Congressional Trading Tracker!**

**Next:** Start exploring, create an account, and customize it to your needs.

**Need help?** Check the logs, review the API documentation, or examine the code in each directory.
