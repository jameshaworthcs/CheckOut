const express = require('express');
const server = require('../../../index.ts');

var app = express.Router();

app.get('/api/submit/autosplash', function (req, res) {
  res.status(200).send('WebSocket endpoint');
});

var secureRoute = require('../../secure.ts');
const jwt = require('jsonwebtoken');
var autoApp = require('../../autocheckin.ts');
const checkedIn = autoApp.checkedIn;

// Generate the server secret using environment variables for JWT
const serverSecret = `${process.env.SSECRET}${process.env.DBPASS}`;

// Async function to verify the JWT
async function verifyJWT(token) {
  try {
    // Verify the token asynchronously
    const decoded = await new Promise((resolve, reject) => {
      jwt.verify(token, serverSecret, (err, decoded) => {
        if (err) {
          return reject(err);  // Token is invalid or expired
        }
        resolve(decoded);  // Token is valid
      });
    });

    // If token is valid, return decoded data and isValid = true
    return {
      jwtValidated: decoded,  // This will be the decoded payload object
      isValid: true
    };
  } catch (error) {
    // If any error occurs, it means the token is invalid
    console.error('Token verification error:', error);
    return {
      jwtValidated: null,
      isValid: false
    };
  }
}

function pollForCheckIn(email, chc, ws) {
  let attempts = 0;
  const maxAttempts = 40;
  const intervalTime = 200; // 200ms

  // Perform immediate check first
  checkedIn(email, chc, (err, result) => {
    if (err) {
      ws.send(btoa(JSON.stringify({ success: false, error: 'Database error' })));
      ws.close();
      return;
    }

    if (result.checkedIn) {
      // Match found immediately
      const checkedInResult = {
        success: true,
        checkedin: true,
        msg: result.message,
      };
      ws.send(btoa(JSON.stringify(checkedInResult)));
      ws.close();
      return;
    }

    // If no immediate match, start polling
    const interval = setInterval(() => {
      attempts++;

      checkedIn(email, chc, (err, result) => {
        if (err) {
          ws.send(btoa(JSON.stringify({ success: false, error: 'Database error' })));
          ws.close();
          clearInterval(interval);
          return;
        }

        if (result.checkedIn) {
          const checkedInResult = {
            success: true,
            checkedin: true,
            msg: result.message,
          };
          ws.send(btoa(JSON.stringify(checkedInResult)));
          ws.close();
          clearInterval(interval);
        } else if (attempts >= maxAttempts) {
          const timeoutResult = {
            success: true,
            checkedin: false,
            msg: `Submit your code here only. If you didn't also submit on checkin, please contact <a href="/support?pre=autocheckin&msg=My submission of code ${chc} was not found on checkin. Please help me!">support</a>.`,
          };
          ws.send(btoa(JSON.stringify(timeoutResult)));
          ws.close();
          clearInterval(interval);

        }
      });
    }, intervalTime);
  });
}


async function handleAutoSplashConnection(ws, request) {
  ws.on('message', async (message) => {
    try {
      const decodedMessage = message.toString();
      //console.log('[Connection] Received message:', decodedMessage);
      const jwtResult = await verifyJWT(decodedMessage);
      //console.log('[Connection] JWT verification result:', jwtResult);
      let finalResponse;

      if (jwtResult.isValid) {
        // JWT is valid, do AutoSplash
        const {
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
          ipRateLimit,
        } = jwtResult.jwtValidated;

        const userPermissions = await secureRoute.checkPermissions(userState);
        const allowedServices = userPermissions.flatMap((perms) =>
          perms.routes
        );
        // Validate chc to be a 6 digit integer
        const chcPattern = /^\d{6}$/;
        if (!chcPattern.test(chc)) {
          finalResponse = {
            success: false,
            checkedin: false,
            msg: 'Invalid code value. It must be a 6 digit integer.',
          };
          ws.send(btoa(JSON.stringify(finalResponse)));
          ws.close();
          return;
        } else if (allowedServices.some((route) => route === 'autocheckin')) {
          // Start polling for check-in match
          pollForCheckIn(useremail, chc, ws);
        } else {
          finalResponse = {
            success: false,
            checkedin: false,
            msg: 'You do not have permission to access AutoCheckin.',
          };
          ws.send(btoa(JSON.stringify(finalResponse)));
          ws.close();
        }
      } else {
        finalResponse = {
          success: false,
          checkedin: false,
          msg: 'Unable to validate user.',
        };
        ws.send(btoa(JSON.stringify(finalResponse)));
        ws.close();
      }
    } catch (error) {
      console.error('[Connection] Error processing message:', error);
      finalResponse = {
        success: false,
        checkedin: false,
        msg: "Internal error processing AutoCheckin request.",
      };
      ws.send(btoa(JSON.stringify(finalResponse)));
      ws.close(1002, 'Invalid message format or sequence');
    }
  });

  ws.on('close', (code, reason) => {
    // Connection closed
  });
}

app.get('*', (req, res) => {
  res.status(404).json({
    success: false,
    msg: 'Not a valid endpoint. (autosplash-ws-api)',
  });
});

module.exports = app;
module.exports.handleAutoSplashConnection = handleAutoSplashConnection;

app.get('*', function (req, res) {
  res.status(404);
  res.json({ 'success': false, msg: 'Not a valid endpoint. (autosplash-ws-api)' });
});

module.exports = app;
module.exports.handleAutoSplashConnection = handleAutoSplashConnection;

