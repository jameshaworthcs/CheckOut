const express = require('express');
var app = express.Router();
var db = require('../../../databases/database.ts');

// Get all permissions
app.get('/manage/api/permissions/list', (req, res) => {
  db.query('SELECT * FROM perms ORDER BY permid ASC', (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ success: false, msg: 'Failed to fetch permissions' });
    }
    res.json(result);
  });
});

// Update permission
app.post('/manage/api/permissions/update', (req, res) => {
  const { permid, userstate, routes, ratelimit } = req.body;

  // Validate routes is an array
  if (!Array.isArray(routes)) {
    return res.status(400).json({ success: false, msg: 'Routes must be an array' });
  }

  const query = 'UPDATE perms SET userstate = ?, routes = ?, ratelimit = ? WHERE permid = ?';
  db.query(query, [userstate, JSON.stringify(routes), ratelimit, permid], (error, results) => {
    if (error) {
      console.error(error);
      return res.status(500).json({ success: false, msg: error.message });
    }
    res.status(200).json({ success: true });
  });
});

// Add new permission
app.post('/manage/api/permissions/add', (req, res) => {
  const { userstate, routes, ratelimit } = req.body;

  // Validate routes is an array
  if (!Array.isArray(routes)) {
    return res.status(400).json({ success: false, msg: 'Routes must be an array' });
  }

  const query = 'INSERT INTO perms (userstate, routes, ratelimit) VALUES (?, ?, ?)';
  db.query(query, [userstate, JSON.stringify(routes), ratelimit], (error, results) => {
    if (error) {
      console.error(error);
      return res.status(500).json({ success: false, msg: error.message });
    }
    res.status(200).json({ success: true, permid: results.insertId });
  });
});

// Delete permission
app.delete('/manage/api/permissions/delete/:permid', (req, res) => {
  const permid = req.params.permid;
  const query = 'DELETE FROM perms WHERE permid = ?';
  db.query(query, [permid], (error, results) => {
    if (error) {
      console.error(error);
      return res.status(500).json({ success: false, msg: error.message });
    }
    res.status(200).json({ success: true });
  });
});

app.get('*', function (req, res) {
  res.status(404);
  res.json({ success: false, msg: 'Not a valid endpoint. (permissions-manage-api)' });
});

module.exports = app;
