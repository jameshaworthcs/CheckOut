const express = require('express');
var db = require('../../../databases/database.ts');
var app = express.Router();
var secureRoute = require('../../secure.ts');

// Code Log API router
var codeLogAPIRouter = require('./code-log-api.ts');

// Request Log API router
var requestLogAPIRouter = require('./request-log-api.ts');

// Users API router
var userAPIRouter = require('./users-api.ts');

// AutoCheckin API router
var autocheckinAPIRouter = require('./autocheckin-api.ts');

var globalAppAPIRouter = require('./globalapp-api.ts');

// Permissions API router
var permissionsAPIRouter = require('./permissions-api.ts');

// Support API router
var supportAPIRouter = require('./support-api.ts');

// Handle code log API
app.use((req, res, next) => {
  if (req.url.startsWith('/manage/api/code-log/')) {
    return codeLogAPIRouter(req, res, next);
  } else {
    next();
  }
});

// SYSOP AUTH CHECK
// Prevent standard moderators from accessing all management apis
app.use((req, res, next) => {
  secureRoute.auth('sysop', req, res, () => {
    next();
  });
});

// Handle request log API
app.use((req, res, next) => {
  if (req.url.startsWith('/manage/api/request-log/')) {
    return requestLogAPIRouter(req, res, next);
  } else {
    next();
  }
});

// Handle users API
app.use((req, res, next) => {
  if (req.url.startsWith('/manage/api/users/')) {
    return userAPIRouter(req, res, next);
  } else {
    next();
  }
});

// Handle autocheckin API
app.use((req, res, next) => {
  if (req.url.startsWith('/manage/api/autocheckin/')) {
    return autocheckinAPIRouter(req, res, next);
  } else {
    next();
  }
});

// Handle globalapp API
app.use((req, res, next) => {
  if (req.url.startsWith('/manage/api/globalapp/')) {
    return globalAppAPIRouter(req, res, next);
  } else {
    next();
  }
});

// Handle permissions API
app.use((req, res, next) => {
  if (req.url.startsWith('/manage/api/permissions/')) {
    return permissionsAPIRouter(req, res, next);
  } else {
    next();
  }
});

// Handle support API
app.use((req, res, next) => {
  if (req.url.startsWith('/manage/api/support/')) {
    return supportAPIRouter(req, res, next);
  } else {
    next();
  }
});

app.get('*', function (req, res) {
  res.status(404);
  res.json({ success: false, msg: 'Not a valid endpoint. (manage-api)' });
});

module.exports = app;
