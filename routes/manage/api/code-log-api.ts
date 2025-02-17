const express = require('express');
var db = require('../../../databases/database.ts');
var app = express.Router();
var secureRoute = require('../../secure.ts');

// TK Data view
app.get('/manage/api/code-log/data', function (req, res) {
  var limit = parseInt(req.query.limit) || 0;
  // Query the database
  try {
    //if (req.query.password === passWord) {
    db.query(
      'SELECT * FROM codes ORDER BY timestamp DESC LIMIT ?;',
      [limit],
      function (err, result, fields) {
        if (err) throw err;

        // Modify IP addresses in the result
        // result.forEach(function (row) {
        //   // Check if the 'ip' field is present and has at least three characters
        //   if (row.ip && row.ip.length >= 3) {
        //     // Remove the last three characters and replace with '***'
        //     row.ip = row.ip.slice(0, -6) + '***.***';
        //   }
        // });
        // result.forEach(function (row) {
        //   if (row.useragent && row.useragent.length >= 3) {
        //     var toRemove = row.useragent.length - 10
        //     row.useragent = row.useragent.slice(0, -toRemove) + ' ** Admin access required for full log.';
        //   }
        // });

        var moment = require('moment'); // Import moment.js for timestamp
        result.forEach(function (row) {
          if (row.codeDay && row.codeDay.length >= 3) {
            const parsedDate = moment(row.codeDay, 'YYYY-MM-DD');
            // Check if the date is valid before attempting to format
            if (parsedDate.isValid()) {
              // Get the day of the week in string format (e.g., 'Tuesday')
              const dayOfWeek = parsedDate.format('ddd');
              row.codeDay = dayOfWeek;
            } else {
              console.error('Invalid date format');
            }
          }
        });

        // Send the modified data as a JSON object
        res.json(result);
      }
    );
  } catch (err) {
    res.status(500).json({ success: false, error: 'Database error.' });
  }
});

// New POST endpoint for sysHide
app.post('/manage/api/code-log/sysHide', function (req, res) {
  secureRoute.auth('mod', req, res, function () {
    const codeID = req.body.codeID;
    const tk = req.body.tk;
    const sqlsyshide =
      'UPDATE codes SET codeState = ?, codeDesc = ? WHERE codeID = ? AND tk = ? LIMIT 1';
    const descValue = `Mod-Rm-${req.userID}`;
    db.query(sqlsyshide, ['0', descValue, codeID, tk], function (err, result) {
      if (err) {
        console.log(err);
        res.status(500).json({ error: 'Database error.' });
      } else {
        //console.log("Disabled code", codeID, tk);
        res.json({ result: 'Disabled code', codeID: codeID });
      }
    });
  });
});

// New POST endpoint for sysShow
app.post('/manage/api/code-log/sysShow', function (req, res) {
  secureRoute.auth('mod', req, res, function () {
    const codeID = req.body.codeID;
    const tk = req.body.tk;
    const sqlsysshow =
      'UPDATE codes SET codeState = ?, codeDesc = ? WHERE codeID = ? AND tk = ? LIMIT 1';
    const descValue = `Mod-En-${req.userID}`;
    db.query(sqlsysshow, ['1', descValue, codeID, tk], function (err, result) {
      if (err) {
        console.log(err);
        res.status(500).json({ error: 'Database error.' });
      } else {
        //console.log("Enabled code", codeID, tk);
        res.json({ result: 'Enabled code', codeID: codeID });
      }
    });
  });
});

// New POST endpoint for remove
app.post('/manage/api/code-log/remove', function (req, res) {
  secureRoute.auth('mod', req, res, function () {
    const codeID = req.body.codeID;
    const tk = req.body.tk;
    const sqlremove = `DELETE FROM codes WHERE codeID = ? AND tk = ? LIMIT 1`;
    db.query(sqlremove, [codeID, tk], function (err, result) {
      if (err) {
        console.log(err);
        res.status(500).json({ error: 'Database error.' });
      } else {
        //console.log("Removed submission", codeID, tk);
        res.json({ result: 'Removed Submission', codeID: codeID });
      }
    });
  });
});

app.get('*', function (req, res) {
  res.status(404);
  res.json({ success: false, msg: 'Not a valid endpoint. (code-log-manage-api)' });
});

module.exports = app;
