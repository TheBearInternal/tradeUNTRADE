# Congressional Trading Tracker API Documentation

## Base URL
```
http://localhost:3000/api/v1
```

## Authentication

Most endpoints support optional authentication. Protected endpoints require a JWT Bearer token.

### Register
```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "username": "johndoe",
  "password": "SecurePass123",
  "full_name": "John Doe"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "email": "user@example.com",
      "username": "johndoe",
      "subscription_tier": "free"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### Login
```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123"
}
```

### Refresh Token
```http
POST /api/v1/auth/refresh-token
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Get Current User
```http
GET /api/v1/auth/me
Authorization: Bearer {accessToken}
```

## Politicians

### List Politicians
```http
GET /api/v1/politicians?office=house&party=Republican&state=CA&page=1&limit=50
```

**Query Parameters:**
- `office` (optional): `house`, `senate`, or `executive`
- `party` (optional): Political party
- `state` (optional): Two-letter state code (e.g., `CA`, `NY`)
- `page` (optional): Page number (default: 1)
- `limit` (optional): Results per page (default: 50, max: 100)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "full_name": "Nancy Pelosi",
      "office": "house",
      "party": "Democrat",
      "state": "CA",
      "district": "12",
      "profile_image_url": "https://...",
      "created_at": "2024-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 535,
    "totalPages": 11
  }
}
```

### Get Politician Details
```http
GET /api/v1/politicians/:id
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "full_name": "Nancy Pelosi",
    "office": "house",
    "party": "Democrat",
    "state": "CA",
    "stats": {
      "total_transactions": 142,
      "total_purchases": 89,
      "total_sales": 53,
      "total_amount_min": 5000000,
      "total_amount_max": 15000000,
      "first_transaction": "2020-01-15",
      "latest_transaction": "2024-11-20"
    }
  }
}
```

### Get Politician Transactions
```http
GET /api/v1/politicians/:id/transactions?transaction_type=purchase&limit=50
```

### Search Politicians
```http
GET /api/v1/politicians/search?q=pelosi&limit=20
```

## Transactions

### List Transactions
```http
GET /api/v1/transactions?politician_id=1&ticker=AAPL&transaction_type=purchase&start_date=2024-01-01&end_date=2024-12-31&party=Democrat&min_amount=50000&page=1&limit=50&sort_by=transaction_date&sort_order=DESC
```

**Query Parameters:**
- `politician_id` (optional): Filter by politician ID
- `ticker` (optional): Filter by stock ticker
- `transaction_type` (optional): `purchase`, `sale`, or `exchange`
- `start_date` (optional): Start date (ISO 8601 format)
- `end_date` (optional): End date (ISO 8601 format)
- `min_amount` (optional): Minimum transaction amount
- `party` (optional): Political party
- `sector` (optional): Stock sector
- `source` (optional): `house_ptr`, `senate_ptr`, or `oge_278`
- `page` (optional): Page number
- `limit` (optional): Results per page (max: 100)
- `sort_by` (optional): `transaction_date`, `filing_date`, `created_at`, `amount_min`
- `sort_order` (optional): `ASC` or `DESC`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1234,
      "politician_id": 1,
      "politician_name": "Nancy Pelosi",
      "party": "Democrat",
      "state": "CA",
      "office": "house",
      "asset_id": 567,
      "ticker": "AAPL",
      "asset_name": "Apple Inc.",
      "company_name": "Apple Inc.",
      "sector": "Technology",
      "transaction_type": "purchase",
      "transaction_date": "2024-11-15",
      "filing_date": "2024-11-20",
      "amount_min": 50001,
      "amount_max": 100000,
      "amount_range_code": "D",
      "source": "house_ptr",
      "filing_url": "https://...",
      "created_at": "2024-11-21T10:30:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 1523,
    "totalPages": 31
  }
}
```

### Get Transaction Feed
Real-time feed of recent transactions
```http
GET /api/v1/transactions/feed?limit=100
```

### Get Transaction Details
```http
GET /api/v1/transactions/:id
```

### Search Transactions
```http
GET /api/v1/transactions/search?q=tesla&limit=50
```

## Assets

### List Assets
```http
GET /api/v1/assets?sector=Technology&page=1&limit=100
```

### Get Most Traded Assets
```http
GET /api/v1/assets/most-traded?period=30d&limit=20
```

**Periods:** `7d`, `30d`, `90d`, `1y`, `all`

### Search Assets
```http
GET /api/v1/assets/search?q=apple&limit=20
```

### Get Asset Details
```http
GET /api/v1/assets/:ticker
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 567,
    "ticker": "AAPL",
    "asset_name": "Apple Inc.",
    "company_name": "Apple Inc.",
    "sector": "Technology",
    "industry": "Consumer Electronics",
    "exchange": "NASDAQ",
    "current_price": 178.50,
    "transaction_count": 234,
    "unique_traders": 45,
    "purchases": 156,
    "sales": 78,
    "latest_transaction": "2024-11-20"
  }
}
```

### Get Asset Transactions
```http
GET /api/v1/assets/:ticker/transactions?page=1&limit=50
```

## Alerts

**Authentication Required**

### List User Alerts
```http
GET /api/v1/alerts
Authorization: Bearer {accessToken}
```

### Create Alert
```http
POST /api/v1/alerts
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "alert_type": "politician",
  "politician_id": 1,
  "notify_email": true,
  "notify_push": false,
  "min_transaction_amount": 50000,
  "transaction_types": ["purchase", "sale"]
}
```

**Alert Types:**
- `politician`: Alert for specific politician's trades
- `ticker`: Alert for specific stock ticker
- `sector`: Alert for sector trades

### Update Alert
```http
PUT /api/v1/alerts/:id
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "notify_email": true,
  "min_transaction_amount": 100000,
  "is_active": true
}
```

### Delete Alert
```http
DELETE /api/v1/alerts/:id
Authorization: Bearer {accessToken}
```

## Analytics

### Get Trending Data
```http
GET /api/v1/analytics/trending?period=7d&limit=10
```

**Response:**
```json
{
  "success": true,
  "data": {
    "politicians": [
      {
        "id": 1,
        "full_name": "Nancy Pelosi",
        "party": "Democrat",
        "transaction_count": 15,
        "purchases": 10,
        "sales": 5,
        "total_min_amount": 500000
      }
    ],
    "tickers": [
      {
        "ticker": "AAPL",
        "asset_name": "Apple Inc.",
        "transaction_count": 45,
        "unique_traders": 12,
        "purchases": 30,
        "sales": 15
      }
    ]
  }
}
```

### Get Sector Breakdown
```http
GET /api/v1/analytics/sectors?period=30d
```

### Get Top Traders
```http
GET /api/v1/analytics/top-traders?period=90d&limit=20
```

### Get Party Comparison
```http
GET /api/v1/analytics/party-comparison?period=90d
```

### Get Timeline
```http
GET /api/v1/analytics/timeline?period=90d
```

## WebSocket

Connect to WebSocket for real-time updates:

```javascript
const socket = io('http://localhost:3001', {
  auth: {
    token: 'your-jwt-token' // Optional
  }
});

// Subscribe to channels
socket.emit('subscribe', 'all'); // All transactions
socket.emit('subscribe', 'politician:1'); // Specific politician
socket.emit('subscribe', 'ticker:AAPL'); // Specific ticker
socket.emit('subscribe', 'sector:Technology'); // Specific sector
socket.emit('subscribe', 'party:Democrat'); // Specific party

// Listen for new transactions
socket.on('new_transaction', (transaction) => {
  console.log('New transaction:', transaction);
});

// Unsubscribe
socket.emit('unsubscribe', 'all');
```

## Rate Limiting

Rate limits vary by subscription tier:

| Tier    | Requests per 15 minutes |
|---------|-------------------------|
| Free    | 100                     |
| Pro     | 500                     |
| Premium | 2000                    |

Authentication endpoints have stricter limits (5 requests per 15 minutes).

## Error Responses

All errors follow this format:

```json
{
  "success": false,
  "error": "Error message here",
  "details": [] // Optional validation details
}
```

**Common HTTP Status Codes:**
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized (missing or invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `409` - Conflict (duplicate resource)
- `429` - Too Many Requests (rate limit exceeded)
- `500` - Internal Server Error
