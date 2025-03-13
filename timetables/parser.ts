const fs = require('fs');
const mysql = require('mysql2');
const readline = require('readline');

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

console.log('Starting TIBL CSV to DB parser');

// Prompt for connection URL
rl.question('Enter MySQL connection URL (format: mysql://user:password@host:port/database): ', (connectionUrl) => {
  // Prompt for CSV filename
  rl.question('Enter CSV filename: ', (csvFilePath) => {
    // Prompt for table name
    rl.question('Enter MySQL table name: ', (tableName) => {
      // Parse the connection URL
      try {
        // Extract connection details from URL
        const urlPattern = /^mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)$/;
        const match = connectionUrl.match(urlPattern);
        
        if (!match) {
          console.error('Invalid connection URL format. Expected: mysql://user:password@host:port/database');
          rl.close();
          return;
        }
        
        const [, user, password, host, port, database] = match;
        
        // MySQL connection configuration
        const connection = mysql.createConnection({
          host: host,
          port: parseInt(port, 10),
          user: user,
          password: password,
          database: database,
          // Add authentication options to handle newer MySQL authentication protocol
          authPlugins: {
            mysql_clear_password: () => () => Buffer.from(password + '\0')
          },
          // Use the newer authentication method
          insecureAuth: true,
          // Enable multi-statement queries if needed
          multipleStatements: true
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
          fs.readFile(csvFilePath, 'utf8', (err, data) => {
            if (err) {
              console.error('Error reading CSV file:', err);
              rl.close();
              return;
            }

            // Split CSV data by lines
            const rows = data.trim().split('\n');

            // Extract column names
            let descriptionCount = 0;
            const columns = rows
              .shift()
              .trim()
              .split(';')
              .map((col) => {
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

            // Filter out problematic column
            const filteredColumns = columns.filter(col => col !== 'Attendance is mandatory for this activity');
            
            // Prepare SQL INSERT query
            const insertQuery = `INSERT INTO ${tableName} (${filteredColumns.map((col) => `\`${col}\``).join(', ')}) VALUES ?`;

            // Parse data and insert into MySQL table
            const values = rows.map((row) => {
              const rowValues = row.trim().split(';');
              // Filter values to match filtered columns
              return filteredColumns.map((col, index) => {
                const colIndex = columns.indexOf(col);
                const val = rowValues[colIndex];
                // If the value is an empty string and the column expects an integer, replace it with null
                if (val === '' && col === 'Number of students') {
                  return null;
                }
                // Otherwise, return the value
                return val ? val.replace(/"/g, '') : '';
              });
            });
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
      } catch (error) {
        console.error('Error parsing connection URL:', error);
        rl.close();
      }
    });
  });
});
