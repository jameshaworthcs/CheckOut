const express = require('express');
var db = require('../../../databases/database.ts');
var app = express.Router();

// TK Data view
app.get('/manage/api/code-log/data', function (req, res) {
  var limit = parseInt(req.query.limit) || 0;
  // Query the database
  try {
    //if (req.query.password === passWord) {
    db.query('SELECT * FROM codes ORDER BY timestamp DESC LIMIT ?;', [limit], function (err, result, fields) {
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
    });
  } catch (err) {
    res.render('deny.ejs');
    console.log("Unauthorized user tried to access logdata, was rejected");
  }
});

app.get('*', function (req, res) {
  res.status(404);
  res.json({ 'success': false, msg: 'Not a valid endpoint. (code-log-manage-api)' });
})

module.exports = app;

