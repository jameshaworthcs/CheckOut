const express = require('express');
var db2 = require('../../../databases/database-v2.ts');
var app = express.Router();
const secureRoute = require('../../secure.ts');

// Get all users and their AutoCheckin info
app.get('/manage/api/autocheckin/autocheckers', async (req, res) => {
    try {

        let sql = `SELECT id, email, checkintoken, checkinstate, fullName, checkinReport, checkinReportTime, userstate 
        FROM users`;
        //WHERE checkinstate = 1 OR checkinReport = 'Waitlist' OR userstate LIKE '%autocheckin%'`;

        const [rows] = await db2.query(sql);
        console.log(secureRoute.checkPermissions('sysop'))
        
        // Add autoAccess flag based on permissions check
        const enrichedRows = rows.map(async row => {
            const permResults = await secureRoute.checkPermissions(row.userstate);
            const allowedServices = permResults.flatMap(result => result.routes);
            return {
                ...row,
                autoAccess: allowedServices.some(route => route === 'autocheckin')
            };
        });
        
        // Since map with async returns an array of promises, we need to wait for all of them
        const resolvedRows = await Promise.all(enrichedRows);
        
        res.json(resolvedRows);
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

