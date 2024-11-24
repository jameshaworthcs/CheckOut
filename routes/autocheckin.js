const express = require('express')
var db=require('../database');
var app = express.Router();
const moment = require('moment-timezone');
const crypto = require('crypto');
const { sendVerificationEmail } = require('./email');
const {spawn} = require('child_process');
var tibl = require('./tibl');

function autoCheckin(email, session, codes) {
  console.log("AutoChecking ", email, codes);
  var output = ''; // Store the output from the Python script

  // Capture the start time
  const startTime = Date.now();

  const python = spawn('/usr/pyvenv/autoEnv/bin/python3.12', ['/var/www/checkout/autocheckin/event_checkin.py', email, session]);

  // Collect data from script
  python.stdout.on('data', function (data) {
    // Process the data received from Python
    const lines = data.toString().split('\n');
    lines.forEach(line => {
      if (line.trim()) {
        //console.log(`${email}: ${line}`);
      }
    });
    output += data.toString(); // Concatenate the data to form the complete output
  });

  // Handle errors
  python.on('error', function (err) {
    console.error('Error executing Python script:', err);
  });

  // On close event, process the complete output
  python.on('close', (code) => {
    // Capture the end time
    const endTime = Date.now();

    // Calculate the elapsed time in seconds
    const elapsedTime = (endTime - startTime) / 1000;
    //console.log(`Python script exited with code ${code}`);
    console.log(`AutoCheckin finished in ${elapsedTime} seconds for ${email}`);
    console.log('Complete output:', output);
  });
}


function fetchAutoCheckers(emails = [], codes = []) {
  // Add error handling and connection check
  if (!db.state === 'connected') {
    console.error('Database connection not available, retrying in 5 seconds...');
    setTimeout(() => fetchAutoCheckers(emails, codes), 5000);
    return;
  }

  db.query('SELECT * FROM users WHERE checkinstate = 1', (err, result) => {
    if (err) {
      console.error('Database query error:', err);
      return;
    }
    
    // Iterate over each row in the result
    result.forEach(user => {
      //console.log(user);
      if (emails.length > 0) {
        if (emails.includes(user.email)) {
          autoCheckin(user.email, user.checkintoken, codes)
        }
      } else {
      //console.log("AutoCheckin user", user)
        autoCheckin(user.email, user.checkintoken, codes)
      }
    });
  });
}

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

// Call fetchAutoCheckers() initially
//fetchAutoCheckers();

// Schedule fetchAutoCheckers() to run every x minutes
//               x
const interval = 60 * 60 * 1000; // Convert x minutes to milliseconds

if (process.env.CHK_AUTO == "TRUE") {
  setInterval(fetchAutoCheckers, interval);
  fetchAutoCheckers();
}

// Import session token
app.get('/auto/c/:cookie', function (req, res) {
  var cookie = req.params.cookie;
  if (cookie) {
    const userID = req.session.user.id;
    const apikey = req.apikey;
    db.query('UPDATE users SET checkintoken = ?, checkinstate = 1 WHERE id = ? OR api_token = ?', [cookie, userID, apikey], (err, result) => {
        if (err) throw err;
        log(req.useremail, `Enabled`, `Ported cookie with AutoCheckin extension`)
        //res.json({"email":req.useremail, "checkintoken":cookie, "result":result});
        res.redirect('/auto/welcome')
        fetchAutoCheckers(emails = [req.useremail])
    });
  }
});

app.post('/auto/update', function (req, res) {
  var cookie = req.body.cookie;
  var newcookie = req.body.newcookie;
  var email = req.body.email;
  if (cookie && newcookie && req.useremail == 'autocheckin@checkout.ac.uk') {
    db.query('UPDATE users SET checkintoken = ? WHERE checkintoken = ? OR email = ?', [newcookie, cookie, email], (err, result) => {
        if (err) throw err;
        res.json({"newcookie":newcookie, "oldcookie":cookie, "result":result});
    });
  }
});

app.get('/auto/u/:cookie/:newcookie/:email', function (req, res) {
  var cookie = req.params.cookie;
  var newcookie = req.params.newcookie;
  var email = req.params.email;
  if (cookie && newcookie && req.useremail == 'autocheckin@checkout.ac.uk') {
    db.query('UPDATE users SET checkintoken = ? WHERE checkintoken = ? OR email = ?', [newcookie, cookie, email], (err, result) => {
        if (err) throw err;
        res.json({"newcookie":newcookie, "oldcookie":cookie, "result":result});
    });
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
      log(req.useremail, `${state == 1 ? "Enabled" : "Disabled"}`, `${state == 1 ? "Activated" : "Disabled"} AutoCheckin`);
      res.json({
        'success': true,
        'msg': `AutoCheckin ${state == 1 ? "enabled" : "disabled"}.`
      });
    });
  } else {
    res.json({
      'success': false,
      'msg': 'AutoCheckin state not updated, something went wrong.'
    });
  }
});


app.post('/auto/log', function (req, res) {
  // Define the values for the log entry
  if (req.useremail == 'autocheckin@checkout.ac.uk') {
    const email = req.body.email;
    const state = req.body.state;
    if (state == "Normal") {
      var mysqlTimestamp = moment().tz('UTC').format('YYYY-MM-DD HH:mm:ss');
      const query = `UPDATE users SET checkinReport = ?, checkinReportTime = ? WHERE email = ?`;
      // Execute the query
      db.query(query, [state, mysqlTimestamp, email], (err, result) => {
        if (err) {
          console.error('Error inserting log entry:', err);
          res.json({'logsuccess': false, 'err': err})
        } else {
          res.json({'logsuccess': true})
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
          res.json({'logsuccess': false, 'err': err})
        } else {
          res.json({'logsuccess': true})
        }
      });
    }
  } else {
    res.json({'logsuccess': false, 'auth': 'invalid'})
  }
});

app.get('/auto/log', function (req, res) {
  res.render('account/autocheckin/log.ejs')
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
    const match = result.find(log => log.message.includes(chc.toString()));

    if (match) {
      // If a match is found, return an object with the checkedIn status and the message
      callback(null, {
        checkedIn: true,
        message: match.message
      });
    } else {
      // If no match is found, return checkedIn: false and a not found message
      callback(null, {
        checkedIn: false,
        message: 'No matching check-in found yet'
      });
    }
  });
}


app.get('/auto/state', function (req, res) {
  const userID = req.session.user.id;
  const apikey = req.apikey;
  db.query('SELECT checkinReport, checkinReportTime, checkinstate, username FROM users WHERE id = ? OR api_token = ?', [userID, apikey], (err, result) => {
      if (err) throw err;
      res.json(result);
  });
});

app.get('/auto', function (req, res) {
  const userID = req.session.user.id;
  const apikey = req.apikey;
  db.query('SELECT * FROM users WHERE id = ? OR api_token = ?', [userID, apikey], (err, result) => {
    if (err) throw err;
    if (result[0].checkinReport === "Disabled" || result[0].checkinReport === "Waitlist" || result[0].checkinstate == 0) {
      // New or returning user needs to port cookie
      if (req.headers.host == 'checkout.ac') {
        res.render('autocheckin/setup');
      } else {
        res.render('autocheckin/domain');
      }
    } else {
      // User has setup AutoCheckin
      db.query('SELECT * FROM autoCheckinLog WHERE email = ? ORDER BY timestamp DESC LIMIT 1', [result[0].email], (err, logResult) => {
        if (err) throw err;
        const enabled = result[0].checkinReport === 'Fail' ? `<span class="red-text">in error state</span>` :
        result[0].checkinReport === 'Disabled' ? `<span class="red-text">disabled</span>` :
          result[0].checkinReport === 'Enabled' ? `<span class="yellow-text">pending</span> (this can take up to an hour to change)` :
              `<span class="green-text">active</span>`;
        const timestamp = new Date(result[0].checkinReportTime).toLocaleString('en-GB', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          timeZone: 'Europe/London'
        });
        var enabledMsg = `CheckOut's AutoCheckin service reports your session ${enabled} as of ${timestamp}.<br>View logs for your account below.`
        
        const checkinState = result[0].checkinstate === 1 ? "enabled" : "disabled";
        const msg = `Signed in as ${result[0].username} (${result[0].email}) and AutoCheckin is <b>${checkinState}</b>.`;
        res.render('account/autocheckin/auto', { msg, email: result[0].email, enabledMsg, showLog: true, checkinState, username: result[0].username })
      });
    }
  });
});

app.get('/auto/faq', function(req,res) {
  res.render('account/autocheckin/auto-faq')
})

app.get('/auto/emailwelcome', function(req,res) {
  res.render('autocheckin/welcome-email')
})

app.get('/auto/welcome', function(req,res) {
  const userID = req.session.user.id;
  const apikey = req.apikey;
  db.query('SELECT * FROM users WHERE id = ? OR api_token = ?', [userID, apikey], (err, result) => {
    if (err) throw err;
    if (result[0].checkinReport === "Disabled" || result[0].checkinReport === "Waitlist" || result[0].checkinstate == 0) {
      // New or returning user needs to port cookie
      res.render('autocheckin/setup');
    } else {
      // Welcome user after porting cookie
      res.render('autocheckin/welcome');
    }
  });
})

app.get('*', function(req,res) {
  res.status(404);
  res.send("Not a valid endpoint");
})

module.exports = app;
module.exports.fetchAutoCheckers = fetchAutoCheckers;
module.exports.checkedIn = checkedIn;