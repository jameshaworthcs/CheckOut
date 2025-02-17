const express = require('express');
var app = express.Router();
var moment = require('moment');

app.post('/api/welcome/consent', function (req, res) {
  //if (req.headers.host == 'checkout.ac') {
  //    res.json({ 'success': false, msg: 'Main site unavailable whilst in development. Please use <a class="tosLink" href="https://beta.checkout.ac"><b>beta</b>.checkout.ac<br><br>' });
  if (req.body.deviceID == req.sessionID) {
    const timestamp = moment().format('YYYY-MM-DD HH:mm:ss');
    req.session.consent = { consented: true, timestamp };
    //console.log(req.body)
    if (req.body.themeID) {
      req.session.theme = { id: req.body.themeID };
      res.json({ success: true, msg: 'Set up complete. (course-select-api)' });
    } else {
      res.json({ success: false, msg: 'Failed to set up. Theme not set. (course-select-api)' });
    }
  } else {
    res
      .status(500)
      .json({
        success: false,
        msg: 'Failed to set up. Check cookies are being saved correctly. (course-select-api)',
      });
  }
});

app.get('*', function (req, res) {
  res.status(404);
  res.json({ success: false, msg: 'Not a valid endpoint. (welcome-api)' });
});

module.exports = app;
