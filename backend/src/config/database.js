const { Pool } = require('pg');
const logger = require('../utils/logger');

// Database configuration with connection pooling
const poolConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'congressional_trading',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  min: parseInt(process.env.DB_POOL_MIN) || 2,
  max: parseInt(process.env.DB_POOL_MAX) || 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

// Create connection pool
const pool = new Pool(poolConfig);

// Handle pool errors
pool.on('error', (err, client) => {
  logger.error('Unexpected error on idle PostgreSQL client', { error: err.message, stack: err.stack });
});

// Test database connection
pool.on('connect', () => {
  logger.info('New database connection established');
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await pool.end();
  logger.info('Database pool has ended');
  process.exit(0);
});

/**
 * Execute a query with parameterized values (SQL injection prevention)
 * @param {string} text - SQL query with $1, $2, etc. placeholders
 * @param {Array} params - Array of parameters to bind
 * @returns {Promise<Object>} Query result
 */
const query = async (text, params) => {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    logger.debug('Executed query', { text, duration, rows: result.rowCount });
    return result;
  } catch (error) {
    logger.error('Database query error', {
      error: error.message,
      query: text,
      params,
      stack: error.stack
    });
    throw error;
  }
};

/**
 * Get a client from the pool for transaction management
 * @returns {Promise<Object>} Database client
 */
const getClient = async () => {
  const client = await pool.connect();
  const originalQuery = client.query.bind(client);
  const originalRelease = client.release.bind(client);

  // Timeout for transactions
  const timeout = setTimeout(() => {
    logger.error('Client checkout timeout - possible connection leak');
  }, 5000);

  // Override release to clear timeout
  client.release = () => {
    clearTimeout(timeout);
    client.query = originalQuery;
    client.release = originalRelease;
    return originalRelease();
  };

  return client;
};

/**
 * Execute a function within a database transaction
 * @param {Function} callback - Async function to execute within transaction
 * @returns {Promise<*>} Result from callback
 */
const transaction = async (callback) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Build WHERE clause from filters
 * @param {Object} filters - Key-value pairs for filtering
 * @param {number} startIndex - Starting index for parameters ($1, $2, etc.)
 * @returns {Object} { clause, values }
 */
const buildWhereClause = (filters, startIndex = 1) => {
  const conditions = [];
  const values = [];
  let paramIndex = startIndex;

  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null) {
      if (Array.isArray(value)) {
        // Handle IN clause
        conditions.push(`${key} = ANY($${paramIndex})`);
        values.push(value);
      } else {
        conditions.push(`${key} = $${paramIndex}`);
        values.push(value);
      }
      paramIndex++;
    }
  }

  const clause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
  return { clause, values };
};

module.exports = {
  pool,
  query,
  getClient,
  transaction,
  buildWhereClause
};
