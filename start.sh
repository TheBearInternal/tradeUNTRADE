#!/bin/bash

echo "🚀 Starting Congressional Trading Tracker Backend"
echo "=================================================="

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file from .env.example..."
    cp .env.example .env

    # Generate random secrets
    JWT_SECRET=$(openssl rand -hex 32)
    JWT_REFRESH_SECRET=$(openssl rand -hex 32)
    DB_PASSWORD=$(openssl rand -hex 16)

    # Update .env with generated secrets
    sed -i.bak "s/your_super_secret_jwt_key_change_this_in_production/$JWT_SECRET/" .env
    sed -i.bak "s/your_super_secret_refresh_key_change_this_in_production/$JWT_REFRESH_SECRET/" .env
    sed -i.bak "s/your_secure_password/$DB_PASSWORD/" .env
    rm .env.bak

    echo "✅ Generated secure random secrets in .env"
fi

# Start services
echo ""
echo "🐳 Starting Docker containers..."
docker-compose up -d

# Wait for services to be ready
echo ""
echo "⏳ Waiting for services to start..."
sleep 10

# Check if PostgreSQL is ready
echo "🔍 Checking PostgreSQL..."
docker-compose exec -T postgres pg_isready -U postgres || echo "⚠️  PostgreSQL not ready yet"

# Check if Redis is ready
echo "🔍 Checking Redis..."
docker-compose exec -T redis redis-cli ping || echo "⚠️  Redis not ready yet"

# Check API health
echo "🔍 Checking API health..."
sleep 5
curl -s http://localhost:3000/health | grep -q "healthy" && echo "✅ API is healthy" || echo "⚠️  API not ready yet"

echo ""
echo "=================================================="
echo "✅ Backend services are starting!"
echo ""
echo "📡 API Server: http://localhost:3000"
echo "🔌 WebSocket: ws://localhost:3001"
echo "💾 PostgreSQL: localhost:5432"
echo "📦 Redis: localhost:6379"
echo ""
echo "📊 View logs:"
echo "  docker-compose logs -f api"
echo "  docker-compose logs -f scraper"
echo ""
echo "🛑 Stop services:"
echo "  docker-compose down"
echo ""
echo "📖 Test the API (see examples below):"
echo "=================================================="
