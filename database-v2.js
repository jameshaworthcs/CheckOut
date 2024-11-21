const mysql = require('mysql2/promise');

// Create a connection pool
const pool = mysql.createPool({
  host     : process.env.DB_HOST,
  user     : process.env.DB_USER,
  password : process.env.DB_PASSWORD,
  database : process.env.DB_NAME,
  charset: 'utf8mb4',
  waitForConnections: true,
  connectionLimit: 100,
  queueLimit: 0
});

// Wrap the pool with error handling
const db = {
  async execute(...args) {
    try {
      const connection = await pool.getConnection();
      try {
        const result = await connection.execute(...args);
        return result;
      } finally {
        connection.release();
      }
    } catch (err) {
      console.error('Database operation failed:', err);
      throw new Error('Database operation failed');
    }
  },
  
  async query(...args) {
    try {
      const connection = await pool.getConnection();
      try {
        const result = await connection.query(...args);
        return result;
      } finally {
        connection.release();
      }
    } catch (err) {
      console.error('Database operation failed:', err);
      throw new Error('Database operation failed');
    }
  }
};

// Test the connection but don't fail if it doesn't work
pool.getConnection()
  .then(connection => {
    //console.log('CheckOut Database (V2) is connected successfully!');
    connection.release();
  })
  .catch(err => {
    console.error('MySQL error when connecting checkout to MySQL(2):', err);
  });

module.exports = db;
