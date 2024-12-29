const express = require('express')
var db2 = require('../../../database-v2');
var app = express.Router();

app.get('/manage/api/autocheckin/autocheckers', async (req, res) => {
    try {

        let sql = `SELECT id, email, checkintoken, checkinstate, fullName, checkinReport, checkinReportTime 
        FROM users 
        WHERE checkinstate = 1 OR checkinReport = 'Waitlist' OR userstate LIKE '%autocheckin%'`;

        const [rows] = await db2.query(sql);
        res.json(rows);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

// Get AutoCheckin logs for query email
app.get('/manage/api/autocheckin/logs', async (req, res) => {
    const email = req.query.email;
    
    if (!email) {
        return res.status(400).json({ error: 'Email parameter is required' });
    }

    try {
        let sql = 'SELECT * FROM autoCheckinLog WHERE email = ? ORDER BY timestamp DESC';
        
        const [autoCheckinLogs] = await db2.query(sql, [email]);
        res.json(autoCheckinLogs);
    } catch (error) {
        console.error('Error fetching autocheckin logs:', error);
        res.status(500).json({ error: 'Failed to fetch autocheckin logs' });
    }
});

app.get('*', function (req, res) {
    res.status(404);
    res.json({ 'success': false, msg: 'Not a valid endpoint. (autocheckin-manage-api)' });
  })
  
  module.exports = app;