const express = require('express');
var db = require('../databases/database.ts');
var app = express.Router();
const moment = require('moment-timezone');
const crypto = require('crypto');
const { sendVerificationEmail } = require('./email.ts');
const { spawn } = require('child_process');
var tibl = require('./tibl.ts');

function log(email, state, message) {
  var mysqlTimestamp = moment().tz('UTC').format('YYYY-MM-DD HH:mm:ss');
  const query = `INSERT INTO autoCheckinLog (email, state, message, timestamp) VALUES (?, ?, ?, ?)`;
  // execute log query
  db.query(query, [email, state, message, mysqlTimestamp], (err, result) => {
    if (err) {
      console.error('Error inserting log entry:', err);
    }
  });
  const reportQuery = `UPDATE users SET checkinReport = ?, checkinReportTime = ? WHERE email = ?`;
  db.query(reportQuery, [state, mysqlTimestamp, email], (err, result) => {});
}

// Import session token
app.get('/auto/c/:cookie', async function (req, res) {
  var cookie = req.params.cookie;
  if (cookie) {
    const userID = req.session.user ? req.session.user.id : null;
    const apikey = req.apitoken;
    db.query(
      'UPDATE users SET checkintoken = ?, checkinstate = 1 WHERE id = ? OR api_token = ?',
      [cookie, userID, apikey],
      async (err, result) => {
        if (err) throw err;
        log(req.useremail, `Enabled`, `Ported cookie with AutoCheckin extension`);

        // Ping AutoCheckin server to update users and refresh session
        const { makeAutoCheckinRequest } = require('../routes/api/autocheckin/autocheckin-link');

        // First request to fetch users
        const fetchUsersResponse = await makeAutoCheckinRequest.get('fetch-users');
        if (fetchUsersResponse.success) {
          // If fetch users successful, make the refresh session request
          const refreshSessionResponse = await makeAutoCheckinRequest.get(
            `refresh-session/${req.useremail}`
          );
          console.log(
            `[AUTO] Session refresh for ${req.useremail}: ${refreshSessionResponse.success ? 'Success' : 'Failed'}`
          );
        }

        res.redirect('/auto/welcome');
      }
    );
  }
});

app.post('/auto/st', function (req, res) {
  var state = req.body.state;
  if (typeof state !== 'undefined' && (state == 1 || state == 0)) {
    let query = 'UPDATE users SET checkinstate = ?';
    let queryParams = [state];

    // If state is 0, also set checkintoken to null
    if (state == 0) {
      query += ', checkintoken = NULL';
    }

    query += ' WHERE email = ?';
    queryParams.push(req.useremail);

    db.query(query, queryParams, (err, result) => {
      if (err) throw err;
      log(
        req.useremail,
        `${state == 1 ? 'Enabled' : 'Disabled'}`,
        `${state == 1 ? 'Activated' : 'Disabled'} AutoCheckin`
      );

      // Ping AutoCheckin server to update users list (don't wait for response)
      const { makeAutoCheckinRequest } = require('../routes/api/autocheckin/autocheckin-link');
      makeAutoCheckinRequest.get('fetch-users').catch((err) => {
        console.log('[AUTO] Failed to notify AutoCheckin server of user state change:', err);
      });

      res.json({
        success: true,
        msg: `AutoCheckin ${state == 1 ? 'enabled' : 'disabled'}.`,
      });
    });
  } else {
    res.json({
      success: false,
      msg: 'AutoCheckin state not updated, something went wrong.',
    });
  }
});

app.post('/auto/log', function (req, res) {
  // Define the values for the log entry
  if (req.useremail == 'autocheckin@checkout.ac.uk') {
    const email = req.body.email;
    const state = req.body.state;
    if (state == 'Normal') {
      var mysqlTimestamp = moment().tz('UTC').format('YYYY-MM-DD HH:mm:ss');
      const query = `UPDATE users SET checkinReport = ?, checkinReportTime = ? WHERE email = ?`;
      // Execute the query
      db.query(query, [state, mysqlTimestamp, email], (err, result) => {
        if (err) {
          console.error('Error inserting log entry:', err);
          res.json({ logsuccess: false, err: err });
        } else {
          res.json({ logsuccess: true });
        }
      });
    } else {
      const message = req.body.message;
      var mysqlTimestamp = moment().tz('UTC').format('YYYY-MM-DD HH:mm:ss');
      const query = `INSERT INTO autoCheckinLog (email, state, message, timestamp) VALUES (?, ?, ?, ?)`;
      // Execute the query
      const reportQuery = `UPDATE users SET checkinReport = ?, checkinReportTime = ? WHERE email = ?`;
      db.query(reportQuery, [state, mysqlTimestamp, email], (err, result) => {});
      db.query(query, [email, state, message, mysqlTimestamp], (err, result) => {
        if (err) {
          console.error('Error inserting log entry:', err);
          res.json({ logsuccess: false, err: err });
        } else {
          res.json({ logsuccess: true });
        }
      });
    }
  } else {
    res.json({ logsuccess: false, auth: 'invalid' });
  }
});

app.get('/auto/log', function (req, res) {
  res.render('account/autocheckin/log.ejs');
});

app.get('/auto/logdata', function (req, res) {
  const includeNormal = req.query.full === 'true';
  let query = 'SELECT * FROM autoCheckinLog WHERE email = ?';

  if (!includeNormal) {
    query += ' AND state != "Normal"';
  }

  query += ' ORDER BY timestamp DESC';

  db.query(query, [req.useremail], (err, result) => {
    if (err) throw err;
    res.json(result);
  });
});

// Used by AutoSplash to check if a user is checked in after submitting a code
function checkedIn(email, chc, callback) {
  // Query the most recent 10 log entries with state 'Checkin'
  const query = `
    SELECT * FROM autoCheckinLog 
    WHERE email = ? AND state = 'Checkin' 
    ORDER BY timestamp DESC 
    LIMIT 10
  `;

  // Execute the query
  db.query(query, [email], (err, result) => {
    if (err) return callback(err, null);

    // Look for a matching message that contains the 'chc' value
    const match = result.find((log) => log.message.includes(chc.toString()));

    if (match) {
      // If a match is found, return an object with the checkedIn status and the message
      callback(null, {
        checkedIn: true,
        message: match.message,
      });
    } else {
      // If no match is found, return checkedIn: false and a not found message
      callback(null, {
        checkedIn: false,
        message: 'No matching check-in found yet',
      });
    }
  });
}

app.get('/auto/state', function (req, res) {
  const userID = req.session.user ? req.session.user.id : null;
  const apikey = req.apitoken;
  db.query(
    'SELECT checkinReport, checkinReportTime, checkinstate, username FROM users WHERE id = ? OR api_token = ?',
    [userID, apikey],
    (err, result) => {
      if (err) throw err;
      res.json(result);
    }
  );
});

app.get('/auto', function (req, res) {
  const userID = req.session.user ? req.session.user.id : null;
  const apikey = req.apitoken;
  db.query('SELECT * FROM users WHERE id = ? OR api_token = ?', [userID, apikey], (err, result) => {
    if (err) throw err;
    if (
      result[0].checkinReport === 'Disabled' ||
      result[0].checkinReport === 'Waitlist' ||
      result[0].checkinstate == 0
    ) {
      // New or returning user needs to port cookie
      if (req.headers.host == req.rootDomain) {
        res.render('autocheckin/setup');
      } else {
        res.render('autocheckin/domain');
      }
    } else {
      // User has setup AutoCheckin
      res.render('autocheckin/dashboard/dashboard');
    }
  });
});

app.get('/auto/faq', function (req, res) {
  res.render('account/autocheckin/auto-faq');
});

app.get('/auto/emailwelcome', function (req, res) {
  res.render('autocheckin/welcome-email');
});

app.get('/auto/welcome', function (req, res) {
  const userID = req.session.user ? req.session.user.id : null;
  const apikey = req.apitoken;
  db.query('SELECT * FROM users WHERE id = ? OR api_token = ?', [userID, apikey], (err, result) => {
    if (err) throw err;
    if (
      result[0].checkinReport === 'Disabled' ||
      result[0].checkinReport === 'Waitlist' ||
      result[0].checkinstate == 0
    ) {
      // New or returning user needs to port cookie
      res.render('autocheckin/setup');
    } else {
      // Welcome user after porting cookie
      res.render('autocheckin/welcome');
    }
  });
});

app.get('*', function (req, res) {
  res.status(404);
  res.send('Not a valid endpoint');
});

module.exports = app;
module.exports.checkedIn = checkedIn;

// Old AutoCheckin code prior to seperate AutoCheckin server

// // Generate random interval between 1 and 5 hours (in milliseconds)
// function getRandomInterval() {
//   const minHours = 1;
//   const maxHours = 5;
//   return Math.floor(Math.random() * (maxHours - minHours + 1) + minHours) * 60 * 60 * 1000;
// }

// // Only run on AutoCheckin instances
// if (process.env.CHK_AUTO == "TRUE") {
//   // Initial run with 5 second delay
//   setTimeout(() => {
//     //console.log('[AUTO] Running initial AutoCheckin after 5 second startup delay');
//     fetchAutoCheckers();
//   }, 5000);

//   // Schedule recurring runs
//   let intervalId;
//   const scheduleNext = () => {
//     const newInterval = getRandomInterval();
//     console.log(`[AUTO] Next AutoCheckin scheduled in ${newInterval/1000/60/60} hours`);
//     intervalId = setTimeout(() => {
//       fetchAutoCheckers();
//       scheduleNext(); // Schedule the next run after completion
//     }, newInterval);
//   };

//   // Start the scheduling cycle
//   scheduleNext();
// }

// function autoCheckin(email, session, codes) {
//   //console.log("AutoChecking ", email, codes);
//   var output = ''; // Store the output from the Python script

//   // Capture the start time
//   const startTime = Date.now();

//   const python = spawn('/usr/pyvenv/autoEnv/bin/python3.12', ['/var/www/checkout/autocheckin/event_checkin.py', email, session]);

//   // Collect data from script
//   python.stdout.on('data', function (data) {
//     // Process the data received from Python
//     const lines = data.toString().split('\n');
//     lines.forEach(line => {
//       if (line.trim()) {
//         //console.log(`${email}: ${line}`);
//       }
//     });
//     output += data.toString(); // Concatenate the data to form the complete output
//   });

//   // Handle errors
//   python.on('error', function (err) {
//     console.error('Error executing AutoCheckin script:', err);
//     log(email, "Fail", "Internal error with AutoCheckin - Contact support");
//   });

//   // On close event, process the complete output
//   python.on('close', (code) => {
//     // Capture the end time
//     const endTime = Date.now();

//     // Calculate the elapsed time in seconds
//     const elapsedTime = (endTime - startTime) / 1000;
//     //console.log(`Python script exited with code ${code}`);
//     console.log(`[AUTO] AutoCheckin finished in ${elapsedTime} seconds for ${email}`);
//     //console.log('Complete output:', output);
//   });
// }

// function fetchAutoCheckers(emails = [], codes = [], instant = false) {

//   //console.log("Running autocheckers", emails, codes, "Instant:", instant)
//   // Add error handling and connection check
//   db.query('SELECT 1', (err) => {
//     if (err) {
//       console.error('Database connection not available, retrying in 5 seconds...');
//       setTimeout(() => fetchAutoCheckers(emails, codes, instant), 5000);
//       return;
//     }

//     db.query('SELECT * FROM users WHERE checkinstate = 1', (err, result) => {
//       if (err) {
//         console.error('[AUTO] Database query error:', err);
//         return;
//       }

//       // Convert result to array and shuffle it
//       let users = [...result];
//       users.sort(() => Math.random() - 0.5);

//       users.forEach((user, index) => {
//         if (instant) {
//           // Instant processing without delays
//           if (emails.length > 0) {
//             if (emails.includes(user.email)) {
//               console.log(`[AUTO] Instantly processing ${user.email}`);
//               autoCheckin(user.email, user.checkintoken, codes);
//             }
//           } else {
//             console.log(`[AUTO] Instantly processing ${user.email}`);
//             autoCheckin(user.email, user.checkintoken, codes);
//           }
//         } else {
//           // Delayed processing with random intervals between 0-600000 milliseconds (0-10 minutes)
//           const randomDelay = Math.floor(Math.random() * 600000); // Random 0-600000 milliseconds
//           setTimeout(() => {
//             if (emails.length > 0) {
//               if (emails.includes(user.email)) {
//                 console.log(`[AUTO] Processing ${user.email} with ${index + 1}/${users.length} delay: ${randomDelay} ms`);
//                 autoCheckin(user.email, user.checkintoken, codes);
//               }
//             } else {
//               console.log(`[AUTO] Processing ${user.email} with ${index + 1}/${users.length} delay: ${randomDelay} ms`);
//               autoCheckin(user.email, user.checkintoken, codes);
//             }
//           }, randomDelay);
//         }
//       });
//     });
//   });
// }

// // Updated cookie endpoint
// app.post('/auto/update', function (req, res) {
//   var cookie = req.body.cookie;
//   var newcookie = req.body.newcookie;
//   var email = req.body.email;
//   if (cookie && newcookie && req.useremail == 'autocheckin@checkout.ac.uk') {
//     db.query('UPDATE users SET checkintoken = ? WHERE checkintoken = ? OR email = ?', [newcookie, cookie, email], (err, result) => {
//         if (err) throw err;
//         res.json({"newcookie":newcookie, "oldcookie":cookie, "result":result});
//     });
//   }
// });

// // Legacy update endpoint
// app.get('/auto/u/:cookie/:newcookie/:email', function (req, res) {
//   var cookie = req.params.cookie;
//   var newcookie = req.params.newcookie;
//   var email = req.params.email;
//   if (cookie && newcookie && req.useremail == 'autocheckin@checkout.ac.uk') {
//     db.query('UPDATE users SET checkintoken = ? WHERE checkintoken = ? OR email = ?', [newcookie, cookie, email], (err, result) => {
//         if (err) throw err;
//         res.json({"newcookie":newcookie, "oldcookie":cookie, "result":result});
//     });
//   }
// });
