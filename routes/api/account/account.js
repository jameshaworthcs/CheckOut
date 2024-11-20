const express = require('express')
var app = express.Router();
var db = require('../../../database');
const crypto = require('crypto');
//var db2 = require('../../../database-v2');
//const { sendEmail } = require('../../email');

// Account token
app.get('/api/account/token', (req, res) => {
    const userID = req.session.user.id;
    const apikey = req.apikey;
    db.query('SELECT api_token FROM users WHERE id = ? OR api_token = ?', [userID, apikey], (err, result) => {
        if (err) throw err;
        res.json({ success: true, "apiKey": result[0]['api_token'] });
    });
});

// Refresh account token
app.post('/api/account/token/refresh', (req, res) => {
    const userId = req.userID;
    const newToken = crypto.randomBytes(64).toString('hex');
    const query = 'UPDATE users SET api_token = ? WHERE id = ?';
    db.query(query, [newToken, userId], (error, results) => {
        if (error) {
            console.error(error);
            return res.status(500).json({ success: false, msg: error.message });
        }
        res.status(200).json({ success: true, msg: "API token refreshed." });
    });
});


// Join AutoCheckin Waitlist
app.post('/api/account/waitlist', (req, res) => {
    const userId = req.userID;
    const leaveOrJoin = req.body.action || "join";
    let query;
    let message;
    if (leaveOrJoin === "leave") {
        query = 'UPDATE users SET checkinReport = "Disabled" WHERE id = ?';
        message = "Waitlist left";
    } else {
        query = 'UPDATE users SET checkinReport = "Waitlist" WHERE id = ?';
        message = "Waitlist joined";
    }
    db.query(query, [userId], (error, results) => {
        if (error) {
            console.error(error);
            return res.status(500).json({ success: false, msg: error.message });
        }
        res.status(200).json({ success: true, msg: message });
    });
});

app.get('*', function (req, res) {
    res.status(404);
    res.json({ 'success': false, msg: 'Not a valid endpoint. (account-api)' });
})

module.exports = app;