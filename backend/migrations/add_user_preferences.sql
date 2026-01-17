-- Add user preferences columns to users table
-- Run this migration to support user preferences feature

ALTER TABLE users
ADD COLUMN IF NOT EXISTS email_notifications BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS default_view VARCHAR(50) DEFAULT 'recent_transactions';

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_users_preferences ON users(email_notifications, default_view);

-- Add comment for documentation
COMMENT ON COLUMN users.email_notifications IS 'User preference for receiving email notifications';
COMMENT ON COLUMN users.default_view IS 'User preferred default view: recent_transactions, top_traders, or most_traded_stocks';
