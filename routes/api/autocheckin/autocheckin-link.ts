const express = require('express')
const moment = require('moment-timezone')
var app = express.Router();
var db = require('../../../databases/database.ts');

interface LogRequest {
    email: string;
    state: 'Normal' | string;
    message?: string;
}

interface LogResponse {
    logsuccess: boolean;
    err?: any;
}

// Account token
app.get('/api/autocheckin/test', (req, res) => {
    res.json({ success: true, msg: "CheckOut instance reachable and authenticated" });
});

// Get all users that are autoCheckin enabled
app.get('/api/autocheckin/users', (req, res) => {
    db.query('SELECT email, checkintoken, checkinReport, checkinReportTime FROM users WHERE checkinstate = 1', (err, result) => {
        if (err) throw err;
        res.json({ success: true, autoCheckinUsers: result });
    });
});

// Log an event to the autoCheckinLog table and update the checkinReport field
app.post('/api/autocheckin/log', async function (req, res) {
    try {
        const { email, state, message } = req.body as LogRequest;

        if (!email || !state) {
            return res.status(400).json({
                success: false,
                err: 'Missing required fields: email and state'
            });
        }

        const mysqlTimestamp = moment().tz('UTC').format('YYYY-MM-DD HH:mm:ss');
        
        // Update checkin report for all cases
        await new Promise((resolve, reject) => {
            const reportQuery = `UPDATE users SET checkinReport = ?, checkinReportTime = ? WHERE email = ?`;
            db.query(reportQuery, [state, mysqlTimestamp, email], (err, result) => {
                if (err) reject(err);
                else resolve(result);
            });
        });

        // Only log to autoCheckinLog if state is not Normal
        if (state !== 'Normal' || true) {
            await new Promise((resolve, reject) => {
                const query = `INSERT INTO autoCheckinLog (email, state, message, timestamp) VALUES (?, ?, ?, ?)`;
                db.query(query, [email, state, message, mysqlTimestamp], (err, result) => {
                    if (err) reject(err);
                    else resolve(result);
                });
            });
        }

        res.json({ success: true, message: 'Log entry created successfully' });
    } catch (err) {
        console.error('Error in log endpoint:', err);
        res.status(500).json({
            success: false,
            err: err instanceof Error ? err.message : 'Unknown error occurred'
        });
    }
});

// Update the checkin token for a user
app.post('/api/autocheckin/update', function (req, res) {
    var oldtoken = req.body.oldtoken || 'donotuse';
    var newtoken = req.body.newtoken;
    var email = req.body.email;
    if (newtoken && oldtoken && email) {
      db.query('UPDATE users SET checkintoken = ? WHERE checkintoken = ? OR email = ?', [newtoken, oldtoken, email], (err, result) => {
          if (err) throw err;
          res.json({success: true, result});
      });
    } else {
        res.status(400).json({
            success: false,
            err: 'Missing required fields: newtoken'
        });
    }
  });

app.get('*', function (req, res) {
    res.status(404);
    res.json({ 'success': false, msg: 'Not a valid endpoint. (autocheckin-api)' });
})

module.exports = app;

