const express = require('express')
var app = express.Router();

// API management router
var apiManageRouter = require('./api/api');

// Handle management API
app.use((req, res, next) => {
    if (req.url.startsWith("/manage/api/")) {
        return apiManageRouter(req, res, next);
    } else {
        next();
    }
});

// Management home
app.get('/manage', function (req, res) {
    res.render('manage/manage-home.ejs', { username: req.username, email: req.useremail })
})

// TK Log view
app.get('/manage/code-log', function (req, res) {
    res.render('manage/code-log.ejs', { username: req.username, email: req.useremail });
})

// Request Log view
app.get('/manage/request-log', function (req, res) {
    res.render('manage/request-log/request-log.ejs', { username: req.username, email: req.useremail });
})

// Manage users
app.get('/manage/users', function (req, res) {
    res.render('manage/users.ejs', { username: req.username, email: req.useremail });
})

app.get('*', function (req, res) {
    res.status(404);
    res.render('notices/generic-msg.ejs', { msgTitle: "404 Not found", msgBody: "Management page not found. Return to <a href='/manage'>management homepage</a>.", username: req.username })
})

module.exports = app;