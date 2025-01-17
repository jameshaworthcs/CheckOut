const express = require('express')
var db = require('../../database');
var secureRoute = require('../secure');
var app = express.Router();

// Google Auth Router
var googleAuthRouter = require('./auth/google');

// Generic Auth Router
const { login, authenticateUser, app: authRouter } = require('./auth/auth');

// Submission Router
var submitRouter = require('./submit/submit');

// Welcome Router
var welcomeRouter = require('./welcome/welcome');

// Course selection Router
var courseSelectRouter = require('./course-select/course-select');

// Course Router
var courseRouter = require('./course/course');

// Settings Router
var settingsRouter = require('./settings/settings');

// Data Router
var dataRouter = require('./data-control/data');

// Account Router
var accountRouter = require('./account/account');

// History Router
var historyRouter = require('./history/history');

// Handle Google Authentications (/auth/google)
app.use((req, res, next) => {
    if (req.url.startsWith("/api/auth/google/")) {
        return googleAuthRouter(req, res, next);
    } else {
        next();
    }
});

// Handle generic auth functions
app.use((req, res, next) => {
    if (req.url.startsWith("/api/auth/")) {
        return authRouter(req, res, next);
    } else {
        next();
    }
});

// Handle submissions
app.use((req, res, next) => {
    if (req.url.startsWith("/api/submit/")) {
        return submitRouter(req, res, next);
    } else {
        next();
    }
});

// Handle welcome
app.use((req, res, next) => {
    if (req.url.startsWith("/api/welcome/")) {
        return welcomeRouter(req, res, next);
    } else {
        next();
    }
});

// Handle course selections
app.use((req, res, next) => {
    if (req.url.startsWith("/api/course-select/")) {
        return courseSelectRouter(req, res, next);
    } else {
        next();
    }
});

// Handle course requests
app.use((req, res, next) => {
    if (req.url.startsWith("/api/course/")) {
        return courseRouter(req, res, next);
    } else {
        next();
    }
});

// Handle settings configuration
app.use((req, res, next) => {
    if (req.url.startsWith("/api/settings/")) {
        return settingsRouter(req, res, next);
    } else {
        next();
    }
});

// Handle history requests
app.use((req, res, next) => {
    if (req.url.startsWith("/api/history/")) {
        return historyRouter(req, res, next);
    } else {
        next();
    }
});

// Handle data control
app.use((req, res, next) => {
    if (req.url.startsWith("/api/data/")) {
        return dataRouter(req, res, next);
    } else {
        next();
    }
});

// Handle account
app.use((req, res, next) => {
    if (req.url.startsWith("/api/account/")) {
        secureRoute.auth("account", req, res, () => {
            return accountRouter(req, res, next);
          });
    } else {
        next();
    }
});

app.get('*', function (req, res) {
    res.status(404);
    res.json({ 'success': false, msg: 'Not a valid endpoint. (top-level-api)' });
})

module.exports = app;