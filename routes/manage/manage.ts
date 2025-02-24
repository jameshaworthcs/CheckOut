const express = require('express');
var app = express.Router();
var secureRoute = require('../secure.ts');

// API management router
var apiManageRouter = require('./api/api.ts');

// Handle management API
app.use((req, res, next) => {
  if (req.url.startsWith('/manage/api/')) {
    return apiManageRouter(req, res, next);
  } else {
    next();
  }
});

// Management home
app.get('/manage', function (req, res) {
  let limitationNotice = false;
  if (req.userState.includes('moderator')) {
    limitationNotice = true;
  }
  res.render('manage/manage-home.ejs', {
    username: req.username,
    email: req.useremail,
    limitationNotice,
  });
});

// TK Log view
app.get('/manage/code-log', function (req, res) {
  res.render('manage/code-log/code-log.ejs', { username: req.username, email: req.useremail });
});

// SYSOP AUTH CHECK
// Prevent standard moderators from accessing all management features
app.use((req, res, next) => {
  secureRoute.auth('sysop', req, res, () => {
    next();
  });
});

// Request Log view
app.get('/manage/request-log', function (req, res) {
  res.render('manage/request-log/request-log.ejs', {
    username: req.username,
    email: req.useremail,
  });
});

// Manage users
app.get('/manage/users', function (req, res) {
  res.render('manage/users/users.ejs', { username: req.username, email: req.useremail });
});

// Manage autocheckin
app.get('/manage/autocheckin', function (req, res) {
  res.render('manage/autocheckin/autocheckin.ejs', {
    username: req.username,
    email: req.useremail,
  });
});

// Manage autocheckin logs
app.get('/manage/autocheckin/logs', function (req, res) {
  res.render('manage/autocheckin/autocheckin-logs.ejs', {
    username: req.username,
    email: req.useremail,
  });
});

// Manage autocheckin dashboard
app.get('/manage/autocheckin/dashboard', function (req, res) {
  res.render('autocheckin/dashboard/dashboard.ejs', {
    email: req.query.email,
  });
});

// Manage globalapp
app.get('/manage/globalapp', function (req, res) {
  res.render('manage/globalapp/globalapp.ejs', { username: req.username, email: req.useremail });
});

// Manage permissions
app.get('/manage/permissions', function (req, res) {
  res.render('manage/permissions/permissions.ejs', {
    username: req.username,
    email: req.useremail,
  });
});

// Manage support requests
app.get('/manage/support', function (req, res) {
  res.render('manage/support/support.ejs', { username: req.username, email: req.useremail });
});

// Return request headers
app.get('/manage/headers', function (req, res) {
  res.json({
    headers: req.headers,
  });
});

// Catch-all 404 route
app.get('*', function (req, res) {
  res.status(404);
  res.render('notices/generic-msg.ejs', {
    msgTitle: '404 Not found',
    msgBody: "Management page not found. Return to <a href='/manage'>management homepage</a>.",
    username: req.username,
  });
});

module.exports = app;
