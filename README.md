# Congressional Trading Tracker

A full-stack application that monitors and displays stock trades made by U.S. politicians, scraping public financial disclosure data and presenting it through a clean API with real-time updates.

## Features

- **Automated Scraping**: House, Senate, and OGE financial disclosure filings
- **Real-time Updates**: WebSocket support for live transaction feeds
- **RESTful API**: Comprehensive API with filtering, pagination, and search
- **User Alerts**: Customizable notifications for politician/ticker/sector trades
- **Analytics Dashboard**: Trending trades, sector analysis, performance metrics
- **Security-First**: JWT authentication, rate limiting, parameterized queries
- **Production-Ready**: Docker support, caching, logging, error handling

## Tech Stack

**Backend:**
- Node.js with Express
- PostgreSQL (primary database)
- Redis (caching & rate limiting)
- Socket.io (WebSocket real-time updates)
- Python (web scraping with BeautifulSoup, Scrapy, pdfplumber)

**Security:**
- JWT authentication with refresh tokens
- bcrypt password hashing (12 rounds)
- Helmet.js security headers
- CORS with whitelist
- Express rate limiting (tiered by subscription)
- Parameterized SQL queries (injection prevention)
- Input validation with express-validator

## Project Structure

```
tradeUNTRADE/
├── backend/
│   ├── src/
│   │   ├── config/          # Database & Redis configuration
│   │   ├── middleware/      # Auth, rate limiting, caching, validation
│   │   ├── models/          # Database models
│   │   ├── routes/          # API endpoints
│   │   ├── services/        # WebSocket & business logic
│   │   ├── scrapers/        # Python scrapers
│   │   │   ├── database.py
│   │   │   ├── pdf_parser.py
│   │   │   ├── house_scraper.py
│   │   │   ├── senate_scraper.py
│   │   │   └── main.py
│   │   ├── utils/           # Logger, helpers
│   │   └── server.js        # Express app entry point
│   ├── package.json
│   └── Dockerfile
├── database/
│   ├── schema.sql           # PostgreSQL schema
│   ├── migrations/
│   └── seeds/
├── docs/
│   └── API_DOCUMENTATION.md
├── .env.example
├── docker-compose.yml
└── README.md
```

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.11+
- PostgreSQL 15+
- Redis 7+
- Docker & Docker Compose (optional)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd tradeUNTRADE
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Install backend dependencies**
   ```bash
   cd backend
   npm install
   ```

4. **Install Python dependencies**
   ```bash
   cd backend/src/scrapers
   pip install -r requirements.txt
   ```

5. **Set up database**
   ```bash
   # Create PostgreSQL database
   createdb congressional_trading

   # Run schema
   psql congressional_trading < database/schema.sql
   ```

6. **Start services**

   **Option A: Docker (Recommended)**
   ```bash
   docker-compose up -d
   ```

   **Option B: Manual**
   ```bash
   # Terminal 1: Start PostgreSQL & Redis
   # (Use your local installations)

   # Terminal 2: Start API server
   cd backend
   npm run dev

   # Terminal 3: Start scrapers
   cd backend/src/scrapers
   python main.py --mode continuous --interval 30
   ```

### Environment Variables

Key environment variables (see `.env.example` for full list):

```env
# Server
NODE_ENV=development
PORT=3000

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=congressional_trading
DB_USER=postgres
DB_PASSWORD=your_password

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=your_secret_key
JWT_REFRESH_SECRET=your_refresh_secret

# Scraper
SCRAPER_DELAY_MS=2000
SCRAPER_SCHEDULE_CRON=*/30 * * * *
```

## API Usage

### Authentication

Register a new user:
```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "username": "johndoe",
    "password": "SecurePass123"
  }'
```

Login:
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123"
  }'
```

### Query Transactions

Get recent transactions:
```bash
curl http://localhost:3000/api/v1/transactions?limit=10
```

Filter by politician:
```bash
curl http://localhost:3000/api/v1/transactions?politician_id=1&limit=50
```

Filter by ticker and date range:
```bash
curl http://localhost:3000/api/v1/transactions?ticker=AAPL&start_date=2024-01-01&end_date=2024-12-31
```

### WebSocket Real-time Updates

```javascript
const io = require('socket.io-client');
const socket = io('http://localhost:3001');

// Subscribe to all transactions
socket.emit('subscribe', 'all');

// Listen for new transactions
socket.on('new_transaction', (transaction) => {
  console.log('New trade:', transaction);
});

// Subscribe to specific politician
socket.emit('subscribe', 'politician:1');

// Subscribe to specific ticker
socket.emit('subscribe', 'ticker:AAPL');
```

## Database Schema

### Key Tables

**politicians**
- Stores congressional members and their details
- Indexed on: office, party, state, is_active

**transactions**
- Stores individual stock trades
- Indexed on: politician_id, asset_id, transaction_date, filing_date
- Unique constraint prevents duplicates

**assets**
- Stores stock tickers and company information
- Indexed on: ticker, sector, asset_type

**users**
- User accounts with authentication
- bcrypt password hashing

**alerts**
- User notification preferences
- Supports politician, ticker, and sector alerts

**scraper_runs**
- Tracks scraper execution and statistics

See `database/schema.sql` for complete schema.

## Scraping Details

### House PTR Scraper
- Source: https://disclosures-clerk.house.gov/PublicDisclosure/FinancialDisclosure
- Parses Periodic Transaction Reports (PTRs) from PDF files
- Extracts: politician name, ticker, transaction type, date, amount range
- Respectful delays: 2 seconds between requests

### Senate Scraper
- Source: https://efdsearch.senate.gov/search/
- Parses HTML disclosure tables (more structured than House)
- Higher confidence scores due to structured data
- Respectful delays: 2 seconds between requests

### PDF Parsing
- Uses pdfplumber for table extraction
- Regex patterns for ticker symbols: `\(([A-Z]{1,5})\)`
- Amount range mapping (A-K codes to dollar ranges)
- Confidence scoring based on data completeness
- Flags low-confidence transactions for manual review

## Security Best Practices

- **SQL Injection Prevention**: All queries use parameterized statements (`$1`, `$2`, etc.)
- **Authentication**: JWT with 15-minute expiry, refresh tokens for 7 days
- **Password Security**: bcrypt with 12+ salt rounds
- **Rate Limiting**: Tiered limits (100/500/2000 requests per 15 min)
- **Input Validation**: express-validator on all endpoints
- **CORS**: Whitelist of allowed origins
- **Headers**: Helmet.js security headers
- **Logging**: Comprehensive error and access logging

## Performance Optimization

- **Connection Pooling**: PostgreSQL pool (2-10 connections)
- **Redis Caching**:
  - Politicians: 1 hour TTL
  - Transactions: 5 minutes TTL
  - Analytics: 10 minutes TTL
- **Database Indexes**: Optimized for common query patterns
- **Pagination**: All list endpoints (max 100 per page)
- **Query Optimization**: Composite indexes for multi-field queries

## Testing

Run tests:
```bash
cd backend
npm test
```

Run with coverage:
```bash
npm test -- --coverage
```

## Deployment

### Docker Deployment

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Production Checklist

- [ ] Set strong JWT secrets
- [ ] Configure production database credentials
- [ ] Set up SSL/TLS certificates
- [ ] Configure firewall rules
- [ ] Set up monitoring (e.g., PM2, New Relic)
- [ ] Configure log rotation
- [ ] Set up automated backups
- [ ] Review and adjust rate limits
- [ ] Configure CORS for production domains
- [ ] Set up CDN for static assets
- [ ] Enable database query logging
- [ ] Set up error alerting (e.g., Sentry)

## API Documentation

Full API documentation available at: `docs/API_DOCUMENTATION.md`

## Data Sources

This application scrapes public financial disclosure data from:

1. **House Financial Disclosures**: https://disclosures-clerk.house.gov/PublicDisclosure/FinancialDisclosure
2. **Senate Financial Disclosures**: https://efdsearch.senate.gov/search/
3. **Office of Government Ethics**: https://extapps2.oge.gov/201/Presiden.nsf

**Important Notes:**
- All data is publicly available
- Politicians have up to 45 days to file trades (data is inherently delayed)
- Amount ranges are approximate, not exact values
- Scraping is done respectfully with delays between requests

## Legal & Ethical Considerations

- This application only accesses **publicly available** information
- Scraping is performed **respectfully** with delays between requests
- The STOCK Act (2012) requires politicians to disclose trades
- This data is meant for public transparency and accountability
- Users should verify important information from official sources

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Write tests for new functionality
4. Follow existing code style
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues, questions, or feature requests, please open an issue on GitHub.

## Acknowledgments

- Built with security and transparency in mind
- Inspired by the need for public accountability
- Thanks to the open-source community

---

**Disclaimer**: This application provides information for educational and transparency purposes. Always verify important information from official sources. Past trading activity does not guarantee future performance.
