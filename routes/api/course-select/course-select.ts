const express = require('express');
var app = express.Router();
var db = require('../../../databases/database.ts');

app.post('/api/course-select/save', async function (req, res) {
  // Save course values to session
  req.session.course = { inst: req.body.inst, yr: req.body.yr, crs: req.body.crs };

  // If user is logged in, save course values to the database
  if (req.loggedIn) {
    const userId = req.userID;
    const { inst, crs, yr } = req.body;
    const query = `UPDATE users 
                       SET sync = JSON_SET(COALESCE(sync, '{}'), '$.inst', ?, '$.crs', ?, '$.yr', ?)
                       WHERE id = ?`;

    try {
      // Use async/await to wait for the DB query to complete
      await new Promise((resolve, reject) => {
        db.query(query, [inst, crs, yr, userId], (error, results) => {
          if (error) {
            return reject(error);
          }
          resolve(results);
        });
      });

      res.json({
        success: true,
        deviceID: req.sessionID,
        msg: 'Saved course information to account and session. (course-select-api)',
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, msg: 'Error saving course information.' });
    }
  } else {
    // If not logged in, just save to the session
    res.json({
      success: true,
      deviceID: req.sessionID,
      msg: 'Saved course information to session. (course-select-api)',
    });
  }
});

app.get('*', function (req, res) {
  res.status(404);
  res.json({ success: false, msg: 'Not a valid endpoint. (course-select-api)' });
});

module.exports = app;
