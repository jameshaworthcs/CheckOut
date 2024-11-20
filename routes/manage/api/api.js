const express = require('express')
var db = require('../../../database');
var app = express.Router();

// Code Log API router
var codeLogAPIRouter = require('./code-log-api');

// Request Log API router
var requestLogAPIRouter = require('./request-log-api');

// Users API router
var userAPIRouter = require('./users-api');

// Handle code log API
app.use((req, res, next) => {
    if (req.url.startsWith("/manage/api/code-log/")) {
        return codeLogAPIRouter(req, res, next);
    } else {
        next();
    }
});

// Handle request log API
app.use((req, res, next) => {
    if (req.url.startsWith("/manage/api/request-log/")) {
        return requestLogAPIRouter(req, res, next);
    } else {
        next();
    }
});

// Handle users API
app.use((req, res, next) => {
    if (req.url.startsWith("/manage/api/users/")) {
        return userAPIRouter(req, res, next);
    } else {
        next();
    }
});

app.get('*', function (req, res) {
    res.status(404);
    res.json({ 'success': false, msg: 'Not a valid endpoint. (manage-api)' });
})

module.exports = app;