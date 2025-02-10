const fs = require('fs');
const mysql = require('mysql');
const readline = require('readline');

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log("Starting TIBL CSV to DB parser");

// Prompt for password
rl.question('Enter MySQL password: ', (password) => {
  // MySQL connection configuration
  const connection = mysql.createConnection({
    host: '127.0.0.1',
    user: 'checkout',
    password: password,
    database: 'checkout'
  });

  // Establish MySQL connection
  connection.connect((err) => {
    if (err) {
      console.error('Error connecting to database:', err);
      rl.close();
      return;
    }
    console.log('Connected to MySQL database');

    // Read the CSV file
    const csvFilePath = 'sem2_tibl_yrk_cs_2.csv';

    fs.readFile(csvFilePath, 'utf8', (err, data) => {
      if (err) {
        console.error('Error reading CSV file:', err);
        return;
      }

      // Split CSV data by lines
      const rows = data.trim().split('\n');

      // Extract column names
      let descriptionCount = 0;
      const columns = rows.shift().trim().split(';').map(col => {
        col = col.replace(/"/g, '');
        if (col === 'Description') {
          descriptionCount++;
          if (descriptionCount === 2) {
            // Account for duplicate 'Description' header
            return 'Description2';
          }
        }
        return col;
      });


      // Prepare SQL INSERT query
      const tableName = 'tibl_yrk_cs_2';
      const insertQuery = `INSERT INTO ${tableName} (${columns.map(col => `\`${col}\``).join(', ')}) VALUES ?`;

      // Parse data and insert into MySQL table
      const values = rows.map(row => row.trim().split(';').map(val => {
        // If the value is an empty string and the column expects an integer, replace it with null
        if (val === '' && columns[rows.indexOf(row)] === 'Number of students') {
          return null;
        }
        // Otherwise, return the value
        return val.replace(/"/g, '');
      }));
      //console.log(values);

      connection.query(insertQuery, [values], (err, result) => {
        if (err) {
          console.error('Error inserting data into MySQL table:', err);
          rl.close();
          return;
        }
        console.log('Data inserted successfully');

        // Close both the connection and readline interface
        connection.end();
        rl.close();
      });
    });
  });
});

