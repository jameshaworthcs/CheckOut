const express = require('express');
var app = express.Router();
var db = require('../../../databases/database.ts');
var db2 = require('../../../databases/database-v2.ts');
const { sendEmail } = require('../../email.ts');

// Session data
app.get('/api/data/session', async function (req, res) {
  var sessionData = req.session;
  sessionData['deviceID'] = req.sessionID;
  res.json(sessionData);
});

// Session delete
app.post('/api/data/session/delete', async function (req, res) {
  req.session.destroy();
  res.json({ success: true, msg: 'Session information deleted.' });
});

// Account data
app.get('/api/data/account', (req, res) => {
  const userID = req.session.user ? req.session.user.id : null;
  const apikey = req.apikey;
  db.query('SELECT * FROM users WHERE id = ? OR api_token = ?', [userID, apikey], (err, result) => {
    if (err) throw err;
    if (JSON.stringify(result) != '[]') {
      // Parse the sync column if it exists and is a string
      if (result[0].sync && typeof result[0].sync === 'string') {
        try {
          result[0].sync = JSON.parse(result[0].sync);
        } catch (e) {
          console.error('Error parsing sync JSON:', e);
        }
      }
      res.json(result[0]);
    } else {
      res.status(404);
      res.json({});
    }
  });
});

// Delete user account
app.delete('/api/data/account/delete', (req, res) => {
  const userID = req.session.user ? req.session.user.id : null;
  const apikey = req.apikey;
  db.query('DELETE FROM users WHERE id = ? OR api_token = ?', [userID, apikey], (err, result) => {
    if (err) throw err;
    res.json({ success: true, msg: 'Account deleted successfully' });
  });
});

// tk Log
app.get('/api/data/tk', (req, res) => {
  const userID = req.session.user ? req.session.user.id : null;
  const apikey = req.apikey;
  var query = `SELECT * FROM codes WHERE 
    (deviceID = ? OR 
    (username != 'anon@checkout.ac.uk' AND username != 'guest@checkout.ac.uk' AND username = ?)) ORDER BY timestamp DESC;`;
  db.query(query, [req.sessionID, req.useremail], (err, result) => {
    res.json(result);
  });
});

// tk Log delete
app.post('/api/data/tk/delete', function (req, res) {
  if (req.userState != 'anon') {
    sendEmail(
      req.useremail,
      'Data request made [Code logs]',
      'This is a notification to confirm that a request was made to delete the code logs on file for your CheckOut account. No further action is needed - you will receive an email once the deletion is complete. This can take up to 7 days.'
    );
  }
  const adminMessage = `${req.useremail} / ${req.sessionID} has made a request to delete code logs.`;
  sendEmail('james@jameshaworth.dev', 'Code log data request logged', adminMessage);
  res.json({
    success: true,
    msg: 'Request submitted. If you are signed in, please check your emails for a confirmation. It can take up to 7 days to process a deletion request.',
  });
});

// Request log
app.get('/api/data/requests', async (req, res) => {
  try {
    let sql = 'SELECT * FROM request_log WHERE device_id = ? OR user_id = ?';
    const params = [req.sessionID, req.userID];
    sql += ' ORDER BY timestamp DESC';

    const [rows] = await db2.query(sql, params);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching logs:', error);
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
});

// Requests Log delete
app.post('/api/data/requests/delete', function (req, res) {
  if (req.userState != 'anon') {
    sendEmail(
      req.useremail,
      'Data request made [Request logs]',
      'This is a notification to confirm that a request was made to delete the code logs on file for your CheckOut account. No further action is needed - you will receive an email once the deletion is complete. This can take up to 7 days.'
    );
  }
  const adminMessage = `${req.useremail} / ${req.sessionID} has made a request to delete request logs.`;
  sendEmail('james@jameshaworth.dev', 'Request log data request logged', adminMessage);
  res.json({
    success: true,
    msg: 'Request submitted. If you are signed in, please check your emails for a confirmation. It can take up to 7 days to process a deletion request.',
  });
});

// AutoCheckin Log
app.get('/api/data/auto', function (req, res) {
  let query = 'SELECT * FROM autoCheckinLog WHERE email = ? ORDER BY timestamp DESC';

  db.query(query, [req.useremail], (err, result) => {
    if (err) throw err;
    res.json(result);
  });
});

// AutoCheckin Log delete
app.post('/api/data/auto/delete', function (req, res) {
  if (req.userState != 'anon') {
    sendEmail(
      req.useremail,
      'Data request made [AutoCheckin logs]',
      'This is a notification to confirm that a request was made to delete the AutoCheckin logs on file for your CheckOut account. No further action is needed - you will receive an email once the deletion is complete. This can take up to 7 days.'
    );
    const adminMessage = `${req.useremail} has made a request to delete AutoCheckin logs.`;
    sendEmail('james@jameshaworth.dev', 'AutoCheckin data request logged', adminMessage);
    res.json({
      success: true,
      msg: 'Request submitted. Please check your emails for a confirmation. It can take up to 7 days to process a deletion request.',
    });
  } else {
    res.json({ success: false, msg: 'You need to be signed in to make this request.' });
  }
});

app.get('*', function (req, res) {
  res.status(404);
  res.json({ success: false, msg: 'Not a valid endpoint. (data-api)' });
});

module.exports = app;
