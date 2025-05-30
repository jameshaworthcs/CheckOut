const express = require('express');
var db = require('../../../databases/database.ts');
var app = express.Router();
const bodyParser = require('body-parser');
const crypto = require('crypto');

app.use(bodyParser.json());

async function findUsers(conditions = {}) {
  return new Promise((resolve, reject) => {
    let query = 'SELECT * FROM users';
    const conditionKeys = Object.keys(conditions);
    if (conditionKeys.length) {
      const conditionStr = conditionKeys.map((key) => `${key} LIKE ?`).join(' AND ');
      const conditionValues = conditionKeys.map((key) => `%${conditions[key]}%`);
      query += ` WHERE ${conditionStr}`;
      db.query(query, conditionValues, (error, results) => {
        if (error) {
          return reject(error);
        }
        resolve(results);
      });
    } else {
      db.query(query, (error, results) => {
        if (error) {
          return reject(error);
        }
        resolve(results);
      });
    }
  });
}

app.get('/manage/api/users/find', async (req, res) => {
  const { id, email, username, fullName, userstate, checkinstate } = req.query;
  const conditions = {};
  if (id) conditions.id = id;
  if (email) conditions.email = email;
  if (username) conditions.username = username;
  if (fullName) conditions.fullName = fullName;
  if (userstate) conditions.userstate = userstate;
  if (checkinstate) conditions.checkinstate = checkinstate;

  try {
    const result = await findUsers(conditions);
    res.status(200).json(result);
  } catch (error) {
    console.error(error);
    res.status(401).json({ success: false, msg: error.message });
  }
});

app.post('/manage/api/users/update', (req, res) => {
  const { id, username, userstate, checkinstate, checkintoken, note, fullName } = req.body;
  const query =
    'UPDATE users SET username = ?, userstate = ?, checkinstate = ?, checkintoken = ?, note = ?, fullName = ? WHERE id = ?';
  db.query(query, [username, userstate, checkinstate, checkintoken, note, fullName, id], (error, results) => {
    if (error) {
      console.error(error);
      return res.status(500).json({ success: false, msg: error.message });
    }
    res.status(200).json({ success: true });
  });
});

app.delete('/manage/api/users/delete/:id', (req, res) => {
  const userId = req.params.id;
  const query = 'DELETE FROM users WHERE id = ?';
  db.query(query, [userId], (error, results) => {
    if (error) {
      console.error(error);
      return res.status(500).json({ success: false, msg: error.message });
    }
    res.status(200).json({ success: true });
  });
});

app.get('/manage/api/users/generate-onetime/:id', (req, res) => {
  const userId = req.params.id;
  const query = 'SELECT api_token FROM users WHERE id = ?';
  db.query(query, [userId], (error, results) => {
    if (error) {
      console.error(error);
      return res.status(500).json({ success: false, msg: error.message });
    }
    if (!results || results.length === 0) {
      return res.status(404).json({ success: false, msg: 'User not found' });
    }
    const apiToken = results[0].api_token;
    const domain = process.env.NODE_ENV === 'development' ? `http://${req.get('host')}` : req.rootDomain;
    const transferUrl = `${domain}/api/app/hashtransfer?apikey=${apiToken}`;
    res.status(200).json({ success: true, url: transferUrl });
  });
});

app.post('/manage/api/users/refresh-api-token/:id', (req, res) => {
  const userId = req.params.id;
  const newToken = crypto.randomBytes(64).toString('hex');
  const query = 'UPDATE users SET api_token = ? WHERE id = ?';
  db.query(query, [newToken, userId], (error, results) => {
    if (error) {
      console.error(error);
      return res.status(500).json({ success: false, msg: error.message });
    }
    res.status(200).json({ id: userId, api_token: newToken });
  });
});

app.get('/manage/api/users/session-refresh/:id', (req, res) => {
  const userId = req.params.id;

  // Get the current maximum user ID
  db.query('SELECT MAX(id) as maxId FROM users', async (error, results) => {
    if (error) {
      console.error(error);
      return res.status(500).json({ success: false, msg: 'Failed to refresh user sessions' });
    }

    const maxId = results[0].maxId;
    // Set the user's ID to maxId + 1000 to ensure no conflicts with new users
    const query = 'UPDATE users SET id = ? WHERE id = ?';
    db.query(query, [maxId + 1000, userId], (error, results) => {
      if (error) {
        console.error(error);
        return res.status(500).json({ success: false, msg: 'Failed to refresh user sessions' });
      }
      res
        .status(200)
        .json({
          success: true,
          msg: 'All sessions have been invalidated for this user',
          id: maxId + 1000,
        });
    });
  });
});

app.get('*', function (req, res) {
  res.status(404);
  res.json({ success: false, msg: 'Not a valid endpoint. (users-manage-api)' });
});

module.exports = app;
