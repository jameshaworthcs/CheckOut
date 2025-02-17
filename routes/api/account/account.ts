const express = require('express');
var app = express.Router();
var db = require('../../../databases/database.ts');
const crypto = require('crypto');
//var db2 = require('../../../databases/database-v2');
//const { sendEmail } = require('../../email');

// Account token
app.get('/api/account/token', (req, res) => {
  const userID = req.session.user.id;
  const apikey = req.apikey;
  db.query(
    'SELECT api_token FROM users WHERE id = ? OR api_token = ?',
    [userID, apikey],
    (err, result) => {
      if (err) throw err;
      res.json({ success: true, apiKey: result[0]['api_token'] });
    }
  );
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
    res.status(200).json({ success: true, msg: 'API token refreshed.' });
  });
});

// Change username
app.post('/api/account/username', (req, res) => {
  const userId = req.userID;
  const newUsername = req.body.username;
  const USERNAME_MAX_LENGTH = 50; // adjust this to match your column length

  // Check for HTML tags in username
  if (newUsername.includes('<') || newUsername.includes('>')) {
    return res.status(400).json({
      success: false,
      msg: 'Username cannot contain HTML tags',
    });
  }

  // Check username length before database query
  if (newUsername.length > USERNAME_MAX_LENGTH) {
    return res.status(400).json({
      success: false,
      msg: `Username is too long. Please remove ${newUsername.length - USERNAME_MAX_LENGTH} characters`,
    });
  }

  const timestamp = new Date().toISOString();
  const noteAddition = `Username changed (${timestamp}): ${newUsername}`;

  const query = `
        UPDATE users 
        SET username = ?,
            note = CONCAT(IFNULL(note, ''), '\n', ?)
        WHERE id = ?`;

  db.query(query, [newUsername, noteAddition, userId], (error, results) => {
    if (error) {
      console.error(error);
      // Check for specific MySQL error codes
      if (error.code === 'ER_DATA_TOO_LONG') {
        if (error.sqlMessage.includes('note')) {
          return res.status(400).json({
            success: false,
            msg: 'You have changed your username too many times. Please contact support via the FAQ for assistance.',
          });
        }
        // Fallback for username column (though we should catch this earlier)
        return res.status(400).json({
          success: false,
          msg: `Username exceeds maximum length by ${newUsername.length - USERNAME_MAX_LENGTH} characters`,
        });
      }
      return res.status(500).json({
        success: false,
        msg: 'Failed to update username. Please try again.',
      });
    }

    if (results.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        msg: 'User not found',
      });
    }

    res.status(200).json({
      success: true,
      msg: 'Username updated successfully',
    });
  });
});

// Join AutoCheckin Waitlist
app.post('/api/account/waitlist', (req, res) => {
  const userId = req.userID;
  const leaveOrJoin = req.body.action || 'join';
  let query;
  let message;
  if (leaveOrJoin === 'leave') {
    query = 'UPDATE users SET checkinReport = "Disabled" WHERE id = ?';
    message = 'Waitlist left';
  } else {
    query = 'UPDATE users SET checkinReport = "Waitlist" WHERE id = ?';
    message = 'Waitlist joined';
  }
  db.query(query, [userId], (error, results) => {
    if (error) {
      console.error(error);
      return res.status(500).json({ success: false, msg: error.message });
    }
    res.status(200).json({ success: true, msg: message });
  });
});

// Get permissions data
app.get('/api/account/permissions', async (req, res) => {
  try {
    // Get all permissions first
    const [result] = await Promise.all([
      new Promise((resolve, reject) => {
        db.query('SELECT userstate, routes, permid, ratelimit FROM perms', (err, result) => {
          if (err) reject(err);
          resolve(result);
        });
      }),
    ]);

    // Calculate inherited routes for the current user
    const userStates = req.userState.split(',').map((state) => state.trim());
    const userPerms = result.filter((perm) => userStates.includes(perm.userstate));
    const inheritedRoutes = userPerms.flatMap((perm) =>
      Array.isArray(perm.routes) ? perm.routes : []
    );
    const uniqueInheritedRoutes = [...new Set(inheritedRoutes)];

    // Calculate highest rate limit from user's permission levels
    const highestRateLimit = Math.max(...userPerms.map((perm) => perm.ratelimit));

    res.json({
      success: true,
      permissions: result,
      userStates,
      inheritedRoutes: uniqueInheritedRoutes,
      highestRateLimit,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, msg: 'Failed to fetch permissions data' });
  }
});

// Logout all sessions endpoint
app.post('/api/account/logout-all', async (req, res) => {
  const userId = req.userID;

  try {
    // First get the current maximum user ID
    db.query('SELECT MAX(id) as maxId FROM users', async (error, results) => {
      if (error) {
        console.error(error);
        return res.status(500).json({ success: false, msg: 'Failed to logout all sessions' });
      }

      const maxId = results[0].maxId;
      // Set the user's ID to maxId + 1000 to ensure no conflicts with new users
      const query = 'UPDATE users SET id = ? WHERE id = ?';
      db.query(query, [maxId + 1000, userId], (error, results) => {
        if (error) {
          console.error(error);
          return res.status(500).json({ success: false, msg: 'Failed to logout all sessions' });
        }
        res.status(200).json({ success: true, msg: 'All sessions have been logged out' });
      });
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, msg: 'Failed to logout all sessions' });
  }
});

app.get('*', function (req, res) {
  res.status(404);
  res.json({ success: false, msg: 'Not a valid endpoint. (account-api)' });
});

module.exports = app;
