const mysql = require('mysql2/promise');

// Create a connection to the database using mysql2 with promise support
const db = mysql.createPool({
  host     : process.env.DB_HOST,
  user     : process.env.DB_USER,
  password : process.env.DB_PASSWORD,
  database : process.env.DB_NAME,
  charset: 'utf8mb4',
  waitForConnections: true,
  connectionLimit: 100,   // Adjust based on your needs
  queueLimit: 0          // No limit on queued requests
});

// Test the connection
db.getConnection()
  .then(connection => {
    //console.log('CheckOut Database (V2) is connected successfully!');
    connection.release();  // Release the connection back to the pool
  })
  .catch(err => {
    console.error('MySQL error when connecting checkout to MySQL(2):', err);
  });

module.exports = db;
