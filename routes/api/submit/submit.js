const express = require('express')
var app = express.Router();
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const serverSecret = `${process.env.SSECRET}${process.env.DBPASS}`;

// Submission Websocket Router
var wsRouter = require('./ws');

// Handle websocket submissions
app.use((req, res, next) => {
    if (req.url.startsWith("/api/submit/ws")) {
        return wsRouter(req, res, next);
    } else {
        next();
    }
});

// Async function to generate the JWT
async function generateJWT(values) {
    // Destructure the array to get the required values
    const [
      chc, token_pre_ws, useremail, userState, username, userID, inst, crs, yr, ip, deviceID, useragent, source, ipRateLimit
    ] = values;
  
    // Construct the payload
    const payload = {
      chc,
      token_pre_ws,
      useremail,
      userState,
      username,
      userID,
      inst,
      crs,
      yr,
      ip,
      deviceID,
      useragent,
      source,
      ipRateLimit
    };
  
    // Define options for the JWT, including expiration of 30 seconds
    const options = {
      expiresIn: '30s'  // Token will expire in 30 seconds
    };
  
    // Return a promise that resolves the signed JWT
    try {
      const token = await new Promise((resolve, reject) => {
        jwt.sign(payload, serverSecret, options, (err, token) => {
          if (err) {
            return reject(err);
          }
          resolve(token);
        });
      });
      return token;
    } catch (error) {
      console.error('Error generating JWT:', error);
      throw error;
    }
  }

async function hashRequestBody(req) {
    return new Promise((resolve, reject) => {
        try {
            // Stringify the req.body
            const requestBodyString = JSON.stringify(req.body);

            // Create a SHA-256 hash
            const hash = crypto.createHash('sha256');

            // Update the hash with the request body string
            hash.update(requestBodyString);

            // Finalize the hash and get the output in hexadecimal format
            const hashedOutput = hash.digest('hex');

            // Resolve the Promise with the hashed output
            resolve(hashedOutput);
        } catch (error) {
            // Reject the Promise in case of an error
            reject(error);
        }
    });
}

async function hash_pre_token(token_pre_ws, sessionID) {
    return new Promise((resolve, reject) => {
        try {

            // Create a SHA-256 hash
            const hash = crypto.createHash('sha256');

            const token_pre_ws_salted = `lol${token_pre_ws}lol${sessionID}foo`

            // Update the hash with the request body string
            hash.update(token_pre_ws_salted);

            // Finalize the hash and get the output in hexadecimal format
            const hashedOutput = hash.digest('hex');

            // Resolve the Promise with the hashed output
            resolve(hashedOutput);
        } catch (error) {
            // Reject the Promise in case of an error
            reject(error);
        }
    });
}

app.post('/api/submit/options', async function (req, res) {
    try {
        const token_pre_ws = await hashRequestBody(req);
        req.session.ws6 = await hash_pre_token(token_pre_ws, req.sessionID);
        const wsURL = `wss://${req.headers.host}/api/submit/ws`;
        const chc = req.body.chc || 0;
        let checkinState = 0;

        // Correct check for undefined
        //console.log(req.checkinState);
        if (typeof req.checkinState !== 'undefined') {
            checkinState = req.checkinState;
        }

        // Generate JWT
        const values = [
            chc, token_pre_ws, req.useremail, req.userState, req.username, req.userID, req.inst, req.crs, req.yr, req.usersIP, req.sessionID, req.headers['user-agent'], 'Web/App', req.ipRateLimit
        ];

        const token = await generateJWT(values);
        res.json({ 'success': true, ws: wsURL, ws1: token_pre_ws, jt: token, autoSplash: checkinState });
    } catch (error) {
        res.status(500).send({ success: false, error: 'Failed to submit' });
    }
});

app.get('*', function (req, res) {
    res.status(404);
    res.json({ 'success': false, msg: 'Not a valid endpoint. (submit-api)' });
})

module.exports = app;