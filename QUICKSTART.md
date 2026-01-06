# Quick Start Guide

## Prerequisites

- **Docker** and **Docker Compose** installed
- **OR** Node.js 18+, Python 3.11+, PostgreSQL 15+, Redis 7+

## Option 1: Run with Docker (Recommended)

This is the easiest way to get started:

```bash
# 1. Clone the repository (if not already done)
cd tradeUNTRADE

# 2. Start all services
./start.sh

# 3. Test the API
./test-api.sh
```

That's it! The backend is now running.

### What's Running?

- **API Server**: http://localhost:3000
- **WebSocket**: ws://localhost:3001
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379
- **Python Scrapers**: Running in background

### View Logs

```bash
# All services
docker-compose logs -f

# Just the API
docker-compose logs -f api

# Just the scrapers
docker-compose logs -f scraper
```

### Stop Services

```bash
docker-compose down
```

## Option 2: Run Manually (Development)

### 1. Install Dependencies

```bash
# Backend
cd backend
npm install

# Scrapers
cd src/scrapers
pip install -r requirements.txt
```

### 2. Set Up Database

```bash
# Create database
createdb congressional_trading

# Run schema
psql congressional_trading < ../../database/schema.sql
```

### 3. Configure Environment

```bash
# Copy and edit .env file
cp .env.example .env
# Edit .env with your database credentials
```

### 4. Start Services

```bash
# Terminal 1: Redis
redis-server

# Terminal 2: API Server
cd backend
npm run dev

# Terminal 3: Scrapers (optional)
cd backend/src/scrapers
python main.py --mode continuous --interval 30
```

## How to Use the API

### Using curl

```bash
# Health check
curl http://localhost:3000/health

# Register user
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "username": "johndoe",
    "password": "SecurePass123"
  }'

# Login
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123"
  }'

# Get transactions (replace TOKEN with your JWT)
curl http://localhost:3000/api/v1/transactions?limit=10 \
  -H "Authorization: Bearer TOKEN"
```

### Using Postman

1. Import the API endpoints from `docs/API_DOCUMENTATION.md`
2. Set base URL: `http://localhost:3000/api/v1`
3. For authenticated requests, add header: `Authorization: Bearer YOUR_TOKEN`

### Using JavaScript/Node

```javascript
const fetch = require('node-fetch');

// Register
const register = await fetch('http://localhost:3000/api/v1/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    username: 'johndoe',
    password: 'SecurePass123'
  })
});

const { data } = await register.json();
const token = data.accessToken;

// Get transactions
const transactions = await fetch('http://localhost:3000/api/v1/transactions?limit=10', {
  headers: { 'Authorization': `Bearer ${token}` }
});

const txnData = await transactions.json();
console.log(txnData);
```

### WebSocket Connection

```javascript
const io = require('socket.io-client');

const socket = io('http://localhost:3001', {
  auth: { token: 'YOUR_JWT_TOKEN' } // Optional
});

// Subscribe to all transactions
socket.emit('subscribe', 'all');

// Listen for new transactions
socket.on('new_transaction', (transaction) => {
  console.log('New trade:', transaction);
});
```

## What's Next?

### You currently have a working backend API. To use it, you can:

**Option A: Build a Frontend (Recommended)**
- React web app
- React Native mobile app
- Or any other frontend framework

**Option B: Use API Directly**
- Build integrations with other services
- Create Discord/Slack bots
- Data analysis with Python/R
- Mobile apps with native code

**Option C: Use API Testing Tools**
- Postman for testing
- curl for command-line access
- Insomnia for API development

## Sample Data

The application starts with an empty database. To populate it:

1. **Wait for scrapers to run** (they run every 30 minutes by default)
2. **OR manually trigger scrapers**:
   ```bash
   docker-compose exec scraper python main.py --mode once --days 30
   ```
3. **OR insert sample data** (create seed files in `database/seeds/`)

## Troubleshooting

### Port already in use

```bash
# Find process using port 3000
lsof -i :3000
# Kill it
kill -9 PID
```

### Database connection error

```bash
# Check PostgreSQL is running
docker-compose ps postgres
# View logs
docker-compose logs postgres
```

### Can't connect to API

```bash
# Check if API is running
docker-compose ps api
# View logs
docker-compose logs api
```

## API Documentation

Full API documentation: `docs/API_DOCUMENTATION.md`

## Need a Frontend?

The backend is fully functional, but there's no web or mobile UI yet.

**Would you like me to build:**
1. A React web frontend?
2. A React Native mobile app?
3. Both?

Just let me know and I can implement the frontend with:
- Modern UI (Tailwind CSS / Material-UI)
- Real-time updates
- Search and filtering
- Charts and analytics
- User authentication
- Responsive design
