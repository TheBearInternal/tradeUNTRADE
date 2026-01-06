-- Congressional Trading Tracker Database Schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Politicians Table
CREATE TABLE politicians (
    id SERIAL PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100) NOT NULL,
    office VARCHAR(20) NOT NULL CHECK (office IN ('house', 'senate', 'executive')),
    party VARCHAR(50),
    state VARCHAR(2),
    district VARCHAR(10),
    chamber VARCHAR(20),
    profile_image_url TEXT,
    bio TEXT,
    twitter_handle VARCHAR(100),
    website_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true
);

-- Create indexes for politicians
CREATE INDEX idx_politicians_office ON politicians(office);
CREATE INDEX idx_politicians_party ON politicians(party);
CREATE INDEX idx_politicians_state ON politicians(state);
CREATE INDEX idx_politicians_is_active ON politicians(is_active);
CREATE INDEX idx_politicians_last_name ON politicians(last_name);

-- Assets Table
CREATE TABLE assets (
    id SERIAL PRIMARY KEY,
    ticker VARCHAR(10) UNIQUE,
    asset_name VARCHAR(255),
    asset_type VARCHAR(50),
    company_name VARCHAR(255),
    sector VARCHAR(100),
    industry VARCHAR(100),
    exchange VARCHAR(50),
    current_price DECIMAL(12, 2),
    market_cap BIGINT,
    last_price_update TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for assets
CREATE INDEX idx_assets_ticker ON assets(ticker);
CREATE INDEX idx_assets_asset_type ON assets(asset_type);
CREATE INDEX idx_assets_sector ON assets(sector);

-- Transactions Table
CREATE TABLE transactions (
    id SERIAL PRIMARY KEY,
    politician_id INTEGER NOT NULL REFERENCES politicians(id) ON DELETE CASCADE,
    asset_id INTEGER REFERENCES assets(id) ON DELETE SET NULL,
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('purchase', 'sale', 'exchange')),
    transaction_date DATE NOT NULL,
    filing_date DATE,
    amount_min INTEGER,
    amount_max INTEGER,
    amount_range_code VARCHAR(10),
    asset_description TEXT,
    comment TEXT,
    source VARCHAR(50) NOT NULL CHECK (source IN ('house_ptr', 'senate_ptr', 'oge_278')),
    filing_id VARCHAR(255),
    filing_url TEXT,
    confidence_score DECIMAL(3, 2) DEFAULT 0.00,
    manual_review_needed BOOLEAN DEFAULT false,
    verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for transactions
CREATE INDEX idx_transactions_politician_id ON transactions(politician_id);
CREATE INDEX idx_transactions_asset_id ON transactions(asset_id);
CREATE INDEX idx_transactions_transaction_date_desc ON transactions(transaction_date DESC);
CREATE INDEX idx_transactions_filing_date_desc ON transactions(filing_date DESC);
CREATE INDEX idx_transactions_transaction_type ON transactions(transaction_type);
CREATE INDEX idx_transactions_source ON transactions(source);
CREATE INDEX idx_transactions_created_at_desc ON transactions(created_at DESC);

-- Composite indexes for common queries
CREATE INDEX idx_transactions_politician_date ON transactions(politician_id, transaction_date DESC);
CREATE INDEX idx_transactions_asset_date ON transactions(asset_id, transaction_date DESC);
CREATE INDEX idx_transactions_type_date ON transactions(transaction_type, transaction_date DESC);

-- Unique constraint to prevent duplicate transactions
CREATE UNIQUE INDEX idx_transactions_unique ON transactions(
    politician_id,
    COALESCE(asset_id, 0),
    transaction_date,
    transaction_type,
    COALESCE(filing_id, '')
);

-- Users Table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    avatar_url TEXT,
    subscription_tier VARCHAR(20) DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro', 'premium')),
    subscription_expires_at TIMESTAMP,
    email_verified BOOLEAN DEFAULT false,
    two_factor_enabled BOOLEAN DEFAULT false,
    two_factor_secret VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP,
    is_active BOOLEAN DEFAULT true
);

-- Create indexes for users
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_subscription_tier ON users(subscription_tier);

-- Alerts Table
CREATE TABLE alerts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    alert_type VARCHAR(20) NOT NULL CHECK (alert_type IN ('politician', 'ticker', 'sector')),
    politician_id INTEGER REFERENCES politicians(id) ON DELETE CASCADE,
    asset_id INTEGER REFERENCES assets(id) ON DELETE CASCADE,
    sector VARCHAR(100),
    notify_email BOOLEAN DEFAULT true,
    notify_push BOOLEAN DEFAULT false,
    notify_sms BOOLEAN DEFAULT false,
    min_transaction_amount INTEGER,
    transaction_types TEXT[], -- Array of transaction types
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true
);

-- Create indexes for alerts
CREATE INDEX idx_alerts_user_id ON alerts(user_id);
CREATE INDEX idx_alerts_alert_type ON alerts(alert_type);
CREATE INDEX idx_alerts_politician_id ON alerts(politician_id);
CREATE INDEX idx_alerts_asset_id ON alerts(asset_id);
CREATE INDEX idx_alerts_is_active ON alerts(is_active);

-- Unique constraint for alerts
CREATE UNIQUE INDEX idx_alerts_unique ON alerts(
    user_id,
    alert_type,
    COALESCE(politician_id, 0),
    COALESCE(asset_id, 0)
) WHERE is_active = true;

-- Notifications Table
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    transaction_id INTEGER REFERENCES transactions(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    notification_type VARCHAR(50),
    sent_email BOOLEAN DEFAULT false,
    sent_push BOOLEAN DEFAULT false,
    sent_sms BOOLEAN DEFAULT false,
    read_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for notifications
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_transaction_id ON notifications(transaction_id);
CREATE INDEX idx_notifications_created_at_desc ON notifications(created_at DESC);
CREATE INDEX idx_notifications_read_at ON notifications(read_at);

-- Politician Performance Table
CREATE TABLE politician_performance (
    id SERIAL PRIMARY KEY,
    politician_id INTEGER NOT NULL REFERENCES politicians(id) ON DELETE CASCADE,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    total_transactions INTEGER DEFAULT 0,
    total_purchases INTEGER DEFAULT 0,
    total_sales INTEGER DEFAULT 0,
    estimated_volume_min BIGINT DEFAULT 0,
    estimated_volume_max BIGINT DEFAULT 0,
    estimated_return_pct DECIMAL(5, 2),
    win_rate DECIMAL(5, 2),
    top_sectors JSONB,
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(politician_id, period_start, period_end)
);

-- Create indexes for politician_performance
CREATE INDEX idx_performance_politician_id ON politician_performance(politician_id);
CREATE INDEX idx_performance_period ON politician_performance(period_start, period_end);

-- Scraper Runs Table
CREATE TABLE scraper_runs (
    id SERIAL PRIMARY KEY,
    source VARCHAR(20) NOT NULL CHECK (source IN ('house', 'senate', 'oge')),
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    status VARCHAR(20) DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed', 'partial')),
    filings_found INTEGER DEFAULT 0,
    filings_processed INTEGER DEFAULT 0,
    transactions_extracted INTEGER DEFAULT 0,
    transactions_saved INTEGER DEFAULT 0,
    errors_count INTEGER DEFAULT 0,
    error_message TEXT,
    error_stack TEXT
);

-- Create indexes for scraper_runs
CREATE INDEX idx_scraper_runs_source ON scraper_runs(source);
CREATE INDEX idx_scraper_runs_started_at_desc ON scraper_runs(started_at DESC);
CREATE INDEX idx_scraper_runs_status ON scraper_runs(status);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_politicians_updated_at BEFORE UPDATE ON politicians
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_assets_updated_at BEFORE UPDATE ON assets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create view for recent transactions with politician and asset details
CREATE OR REPLACE VIEW recent_transactions_view AS
SELECT
    t.id,
    t.transaction_type,
    t.transaction_date,
    t.filing_date,
    t.amount_min,
    t.amount_max,
    t.amount_range_code,
    t.asset_description,
    t.source,
    t.filing_url,
    t.created_at,
    p.id as politician_id,
    p.full_name as politician_name,
    p.party,
    p.state,
    p.office,
    a.id as asset_id,
    a.ticker,
    a.asset_name,
    a.company_name,
    a.sector,
    a.industry
FROM transactions t
INNER JOIN politicians p ON t.politician_id = p.id
LEFT JOIN assets a ON t.asset_id = a.id
ORDER BY t.transaction_date DESC, t.created_at DESC;

-- Create materialized view for analytics (refresh periodically)
CREATE MATERIALIZED VIEW transaction_analytics AS
SELECT
    DATE_TRUNC('day', transaction_date) as trade_date,
    COUNT(*) as total_transactions,
    COUNT(CASE WHEN transaction_type = 'purchase' THEN 1 END) as purchases,
    COUNT(CASE WHEN transaction_type = 'sale' THEN 1 END) as sales,
    COUNT(DISTINCT politician_id) as unique_politicians,
    COUNT(DISTINCT asset_id) as unique_assets,
    SUM(amount_min) as total_min_amount,
    SUM(amount_max) as total_max_amount
FROM transactions
GROUP BY DATE_TRUNC('day', transaction_date);

CREATE INDEX idx_transaction_analytics_date ON transaction_analytics(trade_date DESC);

-- Grant permissions (adjust as needed for your environment)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO your_app_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO your_app_user;
