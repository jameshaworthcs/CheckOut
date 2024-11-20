var mysql = require('mysql');

var connection = mysql.createConnection({
  host     : 'localhost',
  user     : 'checkout',
  password : process.env.DB_PASSWORD,
  database : 'checkout',
  charset  : 'utf8mb4'
});

connection.connect(function(err) {
    if (err) {
      console.log("MySQL error when connecting checkout to local sql");
      throw err;
    }
    //console.log('CheckOut Database is connected successfully!');
});

// // Override the query method to add logging
// const originalQuery = connection.query.bind(connection);

// connection.query = function(sql, values, callback) {
//     const startTime = Date.now();
//     if (typeof values === 'function') {
//         callback = values;
//         values = undefined;
//     }
//     const newCallback = function(err, results, fields) {
//         const endTime = Date.now();
//         const timeTaken = endTime - startTime;
//         console.log(`${timeTaken}ms Query: ${sql}`);
//         if (callback) {
//             callback(err, results, fields);
//         }
//     };
//     return originalQuery(sql, values, newCallback);
// };

module.exports = connection;
