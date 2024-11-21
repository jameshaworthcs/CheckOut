var mysql = require('mysql');

// Flag to track database connection status
let isConnected = false;

const connection = mysql.createConnection({
  host     : process.env.DB_HOST,
  user     : process.env.DB_USER,
  password : process.env.DB_PASSWORD,
  database : process.env.DB_NAME,
  charset  : 'utf8mb4'
});

// Wrap query method to check connection status
const originalQuery = connection.query.bind(connection);
connection.query = function(...args) {
  if (!isConnected) {
    const callback = args[args.length - 1];
    if (typeof callback === 'function') {
      callback(new Error('Database connection is not available'));
    }
    return;
  }
  return originalQuery(...args);
};

connection.connect(function(err) {
  if (err) {
    console.error("MySQL error when connecting checkout to local sql:", err);
    isConnected = false;
    // Don't throw error, just log it
    return;
  }
  isConnected = true;
  //console.log('CheckOut Database is connected successfully!');
});

module.exports = connection;
