const express = require('express')
var app = express.Router();
var db = require('../../../databases/database.ts');

// Account token
app.get('/api/autocheckin/test', (req, res) => {
    res.json({ success: true, msg: "CheckOut instance reachable and authenticated" });
});

app.get('/api/autocheckin/users', (req, res) => {
    db.query('SELECT email, checkintoken, checkinReport, checkinReportTime FROM users WHERE checkinstate = 1', (err, result) => {
        if (err) throw err;
        res.json({ success: true, autoCheckinUsers: result });
    });
});

app.get('*', function (req, res) {
    res.status(404);
    res.json({ 'success': false, msg: 'Not a valid endpoint. (autocheckin-api)' });
})

module.exports = app;

