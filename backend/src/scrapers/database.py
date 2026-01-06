"""
Database utilities for Python scrapers
Provides connection and query functions with parameterized queries (SQL injection prevention)
"""

import psycopg2
from psycopg2 import pool, sql
import os
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

# Database configuration from environment
DB_CONFIG = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'port': int(os.getenv('DB_PORT', 5432)),
    'database': os.getenv('DB_NAME', 'congressional_trading'),
    'user': os.getenv('DB_USER', 'postgres'),
    'password': os.getenv('DB_PASSWORD', ''),
}

# Connection pool
connection_pool = None

def init_pool(minconn=1, maxconn=5):
    """Initialize database connection pool"""
    global connection_pool
    try:
        connection_pool = psycopg2.pool.SimpleConnectionPool(
            minconn,
            maxconn,
            **DB_CONFIG
        )
        logger.info("Database connection pool initialized")
    except Exception as e:
        logger.error(f"Failed to initialize connection pool: {e}")
        raise

def get_connection():
    """Get connection from pool"""
    if connection_pool is None:
        init_pool()
    return connection_pool.getconn()

def return_connection(conn):
    """Return connection to pool"""
    if connection_pool:
        connection_pool.putconn(conn)

def close_pool():
    """Close all connections in pool"""
    if connection_pool:
        connection_pool.closeall()
        logger.info("Database connection pool closed")

def execute_query(query, params=None, fetch=False):
    """
    Execute parameterized query (SQL injection safe)

    Args:
        query: SQL query with %s placeholders
        params: Tuple of parameters
        fetch: Whether to fetch results

    Returns:
        Query results if fetch=True, else None
    """
    conn = None
    cursor = None
    try:
        conn = get_connection()
        cursor = conn.cursor()

        # Execute with parameters (prevents SQL injection)
        cursor.execute(query, params or ())

        if fetch:
            result = cursor.fetchall()
            return result
        else:
            conn.commit()
            return cursor.rowcount

    except Exception as e:
        if conn:
            conn.rollback()
        logger.error(f"Database query error: {e}")
        logger.error(f"Query: {query}")
        logger.error(f"Params: {params}")
        raise
    finally:
        if cursor:
            cursor.close()
        if conn:
            return_connection(conn)

def find_or_create_politician(full_name, office, party=None, state=None):
    """
    Find existing politician or create new one

    Args:
        full_name: Full name of politician
        office: house/senate/executive
        party: Political party (optional)
        state: State code (optional)

    Returns:
        politician_id
    """
    # Try to find existing
    query = "SELECT id FROM politicians WHERE full_name = %s AND office = %s LIMIT 1"
    result = execute_query(query, (full_name, office), fetch=True)

    if result:
        return result[0][0]

    # Create new politician
    # Split name into first and last
    name_parts = full_name.strip().split()
    first_name = name_parts[0] if name_parts else ''
    last_name = name_parts[-1] if len(name_parts) > 1 else name_parts[0]

    insert_query = """
        INSERT INTO politicians (full_name, first_name, last_name, office, party, state, is_active)
        VALUES (%s, %s, %s, %s, %s, %s, TRUE)
        RETURNING id
    """

    conn = None
    cursor = None
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(insert_query, (full_name, first_name, last_name, office, party, state))
        politician_id = cursor.fetchone()[0]
        conn.commit()
        logger.info(f"Created new politician: {full_name} (ID: {politician_id})")
        return politician_id
    except Exception as e:
        if conn:
            conn.rollback()
        logger.error(f"Error creating politician: {e}")
        raise
    finally:
        if cursor:
            cursor.close()
        if conn:
            return_connection(conn)

def find_or_create_asset(ticker, asset_name=None, company_name=None, sector=None):
    """
    Find existing asset or create new one

    Args:
        ticker: Stock ticker symbol
        asset_name: Asset name (optional)
        company_name: Company name (optional)
        sector: Sector (optional)

    Returns:
        asset_id or None if ticker is invalid
    """
    if not ticker:
        return None

    ticker = ticker.upper().strip()

    # Try to find existing
    query = "SELECT id FROM assets WHERE ticker = %s LIMIT 1"
    result = execute_query(query, (ticker,), fetch=True)

    if result:
        return result[0][0]

    # Create new asset
    insert_query = """
        INSERT INTO assets (ticker, asset_name, company_name, sector, asset_type)
        VALUES (%s, %s, %s, %s, 'stock')
        ON CONFLICT (ticker) DO UPDATE SET
            asset_name = EXCLUDED.asset_name,
            company_name = EXCLUDED.company_name,
            sector = EXCLUDED.sector,
            updated_at = CURRENT_TIMESTAMP
        RETURNING id
    """

    conn = None
    cursor = None
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(insert_query, (ticker, asset_name, company_name, sector))
        asset_id = cursor.fetchone()[0]
        conn.commit()
        logger.debug(f"Created/updated asset: {ticker} (ID: {asset_id})")
        return asset_id
    except Exception as e:
        if conn:
            conn.rollback()
        logger.error(f"Error creating asset {ticker}: {e}")
        return None
    finally:
        if cursor:
            cursor.close()
        if conn:
            return_connection(conn)

def insert_transaction(transaction_data):
    """
    Insert transaction into database (with duplicate prevention)

    Args:
        transaction_data: Dictionary with transaction fields

    Returns:
        transaction_id or None if duplicate
    """
    query = """
        INSERT INTO transactions (
            politician_id, asset_id, transaction_type, transaction_date,
            filing_date, amount_min, amount_max, amount_range_code,
            asset_description, comment, source, filing_id, filing_url,
            confidence_score, manual_review_needed
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT DO NOTHING
        RETURNING id
    """

    params = (
        transaction_data.get('politician_id'),
        transaction_data.get('asset_id'),
        transaction_data.get('transaction_type'),
        transaction_data.get('transaction_date'),
        transaction_data.get('filing_date'),
        transaction_data.get('amount_min'),
        transaction_data.get('amount_max'),
        transaction_data.get('amount_range_code'),
        transaction_data.get('asset_description'),
        transaction_data.get('comment'),
        transaction_data.get('source'),
        transaction_data.get('filing_id'),
        transaction_data.get('filing_url'),
        transaction_data.get('confidence_score', 0.5),
        transaction_data.get('manual_review_needed', False)
    )

    conn = None
    cursor = None
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(query, params)
        result = cursor.fetchone()
        conn.commit()

        if result:
            logger.debug(f"Inserted transaction ID: {result[0]}")
            return result[0]
        else:
            logger.debug("Duplicate transaction skipped")
            return None

    except Exception as e:
        if conn:
            conn.rollback()
        logger.error(f"Error inserting transaction: {e}")
        logger.error(f"Data: {transaction_data}")
        raise
    finally:
        if cursor:
            cursor.close()
        if conn:
            return_connection(conn)

def create_scraper_run(source):
    """
    Create new scraper run record

    Args:
        source: house/senate/oge

    Returns:
        run_id
    """
    query = """
        INSERT INTO scraper_runs (source, status, started_at)
        VALUES (%s, 'running', CURRENT_TIMESTAMP)
        RETURNING id
    """

    conn = None
    cursor = None
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(query, (source,))
        run_id = cursor.fetchone()[0]
        conn.commit()
        logger.info(f"Created scraper run ID: {run_id} for source: {source}")
        return run_id
    except Exception as e:
        if conn:
            conn.rollback()
        logger.error(f"Error creating scraper run: {e}")
        raise
    finally:
        if cursor:
            cursor.close()
        if conn:
            return_connection(conn)

def update_scraper_run(run_id, status, stats=None, error=None):
    """
    Update scraper run with results

    Args:
        run_id: Scraper run ID
        status: completed/failed/partial
        stats: Dictionary with statistics
        error: Error message if failed
    """
    query = """
        UPDATE scraper_runs
        SET status = %s,
            completed_at = CURRENT_TIMESTAMP,
            filings_found = %s,
            filings_processed = %s,
            transactions_extracted = %s,
            transactions_saved = %s,
            errors_count = %s,
            error_message = %s
        WHERE id = %s
    """

    stats = stats or {}
    params = (
        status,
        stats.get('filings_found', 0),
        stats.get('filings_processed', 0),
        stats.get('transactions_extracted', 0),
        stats.get('transactions_saved', 0),
        stats.get('errors_count', 0),
        error,
        run_id
    )

    execute_query(query, params)
    logger.info(f"Updated scraper run ID: {run_id} with status: {status}")

# Initialize pool on module import
try:
    init_pool()
except Exception as e:
    logger.error(f"Failed to initialize database pool: {e}")
