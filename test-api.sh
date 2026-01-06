#!/bin/bash

echo "🧪 Testing Congressional Trading Tracker API"
echo "=============================================="

API_URL="http://localhost:3000/api/v1"

# Test health endpoint
echo ""
echo "1️⃣  Testing health endpoint..."
curl -s $API_URL/../health | jq '.'

# Register a test user
echo ""
echo "2️⃣  Registering test user..."
REGISTER_RESPONSE=$(curl -s -X POST "$API_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "username": "testuser",
    "password": "TestPass123",
    "full_name": "Test User"
  }')

echo "$REGISTER_RESPONSE" | jq '.'

# Extract access token
ACCESS_TOKEN=$(echo "$REGISTER_RESPONSE" | jq -r '.data.accessToken')

if [ "$ACCESS_TOKEN" != "null" ] && [ -n "$ACCESS_TOKEN" ]; then
    echo "✅ User registered successfully!"

    # Test authenticated endpoint
    echo ""
    echo "3️⃣  Testing authenticated endpoint (get current user)..."
    curl -s "$API_URL/auth/me" \
      -H "Authorization: Bearer $ACCESS_TOKEN" | jq '.'
else
    echo "⚠️  Registration failed or user already exists. Trying login..."

    # Try to login
    echo ""
    echo "3️⃣  Logging in..."
    LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
      -H "Content-Type: application/json" \
      -d '{
        "email": "test@example.com",
        "password": "TestPass123"
      }')

    echo "$LOGIN_RESPONSE" | jq '.'
    ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.accessToken')
fi

# Test public endpoints
echo ""
echo "4️⃣  Testing politicians endpoint..."
curl -s "$API_URL/politicians?limit=5" | jq '.data[:2]'

echo ""
echo "5️⃣  Testing transactions feed..."
curl -s "$API_URL/transactions/feed?limit=5" | jq '.data[:2]'

echo ""
echo "6️⃣  Testing analytics - trending..."
curl -s "$API_URL/analytics/trending?period=7d&limit=5" | jq '.data.politicians[:2]'

echo ""
echo "=============================================="
echo "✅ API Testing Complete!"
echo ""
echo "💡 You can now use these endpoints from:"
echo "   - Postman"
echo "   - curl commands"
echo "   - Your frontend application"
echo ""
echo "📖 Full API documentation: docs/API_DOCUMENTATION.md"
echo "=============================================="
