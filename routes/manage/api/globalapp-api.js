const express = require('express')
var db = require('../../../database');
var app = express.Router();

app.get('/manage/api/globalapp/data', function (req, res) {
    db.query('SELECT * FROM globalapp ORDER BY revID DESC LIMIT 10;', function (err, result) {
        if (err) throw err;
        // Send the data as a JSON object
        res.json(result);
    });
});

app.post('/manage/api/globalapp/update', (req, res) => {
    const { data } = req.body;

    db.query('INSERT INTO globalapp SET ?', [data], (err, result) => {
        if (err) {
            console.error(err);
            res.status(500).json({ success: false });
        } else {
            res.json({ success: true });
        }
    });
});

app.get('*', function (req, res) {
    res.status(404);
    res.json({ 'success': false, msg: 'Not a valid endpoint. (globalapp-manage-api)' });
})

module.exports = app;