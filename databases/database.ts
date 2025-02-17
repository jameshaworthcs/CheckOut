var mysql = require('mysql2');

// Create a connection pool instead of a single connection
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  charset: 'utf8mb4',
  connectionLimit: 10,
  waitForConnections: true,
  queueLimit: 0,
});

// Handle pool errors
pool.on('error', function (err) {
  console.error('Database pool error:', err);
  if (err.code === 'PROTOCOL_CONNECTION_LOST') {
    console.log('Lost connection to database. Pool will automatically handle reconnection.');
  } else {
    console.error('Unexpected pool error:', err);
  }
});

// Create a connection-like object that uses the pool internally
const connection = {
  query: function (...args) {
    return pool.query(...args);
  },
  escape: function (...args) {
    return pool.escape(...args);
  },
  escapeId: function (...args) {
    return mysql.escapeId(...args);
  },
  format: function (...args) {
    return mysql.format(...args);
  },
  end: function (callback) {
    return pool.end(callback);
  },
};

// For backwards compatibility
module.exports = connection;
