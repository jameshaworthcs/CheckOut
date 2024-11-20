const express = require('express')
var db2 = require('../../../database-v2');
var app = express.Router();

app.get('/manage/api/request-log/logs', async (req, res) => {
    try {
        const { startTime, endTime, ip, method, username, path, device_id, limit = 100 } = req.query;

        let sql = 'SELECT * FROM request_log WHERE 1=1';  // Base query

        const params = [];
        if (startTime) {
            sql += ' AND timestamp >= ?';
            params.push(startTime);
        }
        if (endTime) {
            sql += ' AND timestamp <= ?';
            params.push(endTime);
        }
        if (ip) {
            sql += ' AND ip = ?';
            params.push(ip);
        }
        if (method) {
            sql += ' AND method = ?';
            params.push(method);
        }
        if (username) {
            sql += ' AND username = ?';
            params.push(username);
        }
        if (path) {
            sql += ' AND path = ?';
            params.push(path);
        }
        if (device_id) {
            sql += ' AND device_id = ?';
            params.push(device_id);
        }

        sql += ' ORDER BY timestamp DESC LIMIT ?';
        params.push(parseInt(limit, 10));

        const [rows] = await db2.query(sql, params);
        res.json(rows);
    } catch (error) {
        console.error('Error fetching logs:', error);
        res.status(500).json({ error: 'Failed to fetch logs' });
    }
});

app.get('*', function (req, res) {
    res.status(404);
    res.json({ 'success': false, msg: 'Not a valid endpoint. (request-log-manage-api)' });
  })
  
  module.exports = app;