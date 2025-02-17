const express = require('express');
var app = express.Router();
var db = require('../../../databases/database.ts');
const { courseDetails } = require('../course/course-find.ts');

async function obscureEmail(email) {
  // Split the email into the local part (before @) and domain (after @)
  const [localPart, domain] = email.split('@');

  // If the local part is too short, return it as is (since it has only one character)
  if (localPart.length <= 2) {
    return email;
  }

  // Obscure the local part, keeping only the first and last character
  const obscuredLocal =
    localPart[0] + '*'.repeat(localPart.length - 2) + localPart[localPart.length - 1];

  // Return the obscured email
  return `${obscuredLocal}@${domain}`;
}

app.get('/api/settings/account', async function (req, res) {
  let sessionConsentTimestamp;

  if (req.session && req.session['consent'] && req.session['consent']['timestamp']) {
    sessionConsentTimestamp = req.session['consent']['timestamp'];
  } else {
    sessionConsentTimestamp = '2030-01-01 01:01:01';
  }

  // Get course details regardless of login state
  let courseInfo = { success: false };
  try {
    const inst = req.inst;
    const crs = req.crs;
    const yr = req.yr;

    courseInfo = await courseDetails(inst, crs, yr);
  } catch (error) {
    console.error('Error fetching course details:', error);
    courseInfo = { success: false, reason: 'Failed to fetch course details' };
  }

  if (req.userState != 'anon') {
    // Get user info including accountCreationTime
    db.query(
      'SELECT email, username, accountCreationTime FROM users WHERE id = ?',
      [req.userID],
      async (err, results) => {
        if (err) {
          console.error('Error fetching user data:', err);
          return res
            .status(500)
            .json({
              success: false,
              msg: 'Failed to fetch account data',
              courseDetails: courseInfo,
            });
        }

        if (results.length === 0) {
          return res
            .status(404)
            .json({ success: false, msg: 'User not found', courseDetails: courseInfo });
        }

        const user = results[0];
        const obscuredEmail = await obscureEmail(user.email);
        const accountInfo = {
          email: obscuredEmail,
          username: user.username,
          accountCreationTime: user.accountCreationTime,
        };
        res.json({
          success: true,
          account: true,
          sessionConsentTimestamp,
          accountInfo,
          courseDetails: courseInfo,
        });
      }
    );
  } else {
    res.json({ success: true, account: false, sessionConsentTimestamp, courseDetails: courseInfo });
  }
});

app.get('/api/settings/theme', async function (req, res) {
  try {
    if (req.session.theme) {
      if (req.session.theme.id) {
        res.json({ success: true, themeID: req.session.theme.id });
      } else {
        res.json({ success: false, msg: 'Failed to fetch. Theme not set. (settings-api)' });
      }
    } else {
      res.json({ success: false, msg: 'Failed to fetch. Theme not set. (settings-api)' });
    }
  } catch {
    res.json({ success: false, msg: 'Failed to set up. Theme not set. (settings-api)' });
  }
});

app.post('/api/settings/theme', async function (req, res) {
  try {
    if (req.body.themeID) {
      // Set theme in session
      req.session.theme = { id: req.body.themeID };
      // If signed in, update account themeID
      if (req.userState != 'anon') {
        const userId = req.userID;
        const themeID = req.body.themeID;
        const query = `UPDATE users 
SET sync = JSON_SET(COALESCE(sync, '{}'), '$.themeID', ?) 
WHERE id = ?`;
        db.query(query, [themeID, userId], (error, results) => {
          if (error) {
            console.error(error);
            return res.status(500).json({ success: false, msg: error.message });
          }
          res
            .status(200)
            .json({ success: true, accountSync: true, msg: 'Theme updated and saved to account.' });
        });
      } else {
        res.json({
          success: true,
          accountSync: false,
          msg: 'Theme updated. <a href="account">Sign in</a> to sync this accross all your devices!',
        });
      }
    } else {
      res.json({ success: false, msg: 'Failed to set up. Theme not set. (settings-api)' });
    }
  } catch {
    res.json({ success: false, msg: 'Failed to set up. Theme not set. (settings-api)' });
  }
});

app.get('*', function (req, res) {
  res.status(404);
  res.json({ success: false, msg: 'Not a valid endpoint. (settings-api)' });
});

module.exports = app;
