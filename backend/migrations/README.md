# Database Migrations

## User Preferences Migration

To add user preferences support, run the following SQL migration:

```bash
psql -U postgres -d congressional_trading -f add_user_preferences.sql
```

Or if using a different database user/name:

```bash
psql -U <username> -d <database_name> -f add_user_preferences.sql
```

This migration adds:
- `email_notifications` column (BOOLEAN, default: true)
- `default_view` column (VARCHAR(50), default: 'recent_transactions')

These columns support the User Profile/Settings page feature.
