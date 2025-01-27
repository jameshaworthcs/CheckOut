const express = require('express')
var app = express.Router();
const { login } = require('./auth');

const { OAuth2Client } = require('google-auth-library');

const CLIENT_ID = '573147530533-998o78a3tvhoo9ijemmghr9l6c154kks.apps.googleusercontent.com';
const client = new OAuth2Client(CLIENT_ID);

app.post('/api/auth/google/verify', async (req, res) => {
    const { token } = req.body;
    try {
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: CLIENT_ID
        });
        const payload = ticket.getPayload();
        //console.log(payload)
        const email = payload['email'];
        const name = payload['name'];
        const shortname = payload['given_name'];
        const avatarURI = payload['picture'] || '';
        const email_verified = payload['email_verified'];

        // Use the login function from auth.js
        const result = await login(req, email, email_verified, name, shortname, avatarURI);

        if (result.success) {
            res.status(200).json(result);
        } else {
            console.log(result)
            res.status(401).json(result);
        }
    } catch (error) {
        console.error(error);
        res.status(401).json({ success: false, msg: error.message });
    }
});

app.get('*', function (req, res) {
    res.status(404);
    res.json({ 'success': false, msg: 'Not a valid endpoint. (google-auth-api)' });
})

module.exports = app;

