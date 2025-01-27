const express = require('express');
const server = require('../../../index'); // Updated to use .ts extension

var app = express.Router();

app.get('/api/submit/ws', function (req, res) {
    res.status(200).send('WebSocket endpoint');
});

const crypto = require('crypto');
const WebSocket = require('ws');
const jwt = require('jsonwebtoken');

// Submission Helper
var submissionHelper = require('./submission');
var { handleAutoSplashConnection } = require('./auto-splash');

// Generate the server secret using environment variables for JWT
const serverSecret = `${process.env.SSECRET}${process.env.DBPASS}`;

const wss = new WebSocket.Server({ noServer: true });

// Helper function to generate SHA-512 hash
function sha512Hash(data) {
    return crypto.createHash('sha512').update(data).digest('hex');
}

// Helper function to generate SHA-256 hash
function sha256Hash(data) {
    return crypto.createHash('sha256').update(data).digest('hex');
}

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

wss.on('connection', async function connection(ws, request) {
    // Initialize the client's session state and store it directly on the ws object
    ws.clientState = {
        step1_received: null,
        step1_response: null,
        step2_received: null,
        step2_response: null,
        step3_received: null,
        step3_response: null,
        step4_received: null,
        step4_response: null,
    };

    ws.on('message', async function incoming(message) {
        try {
            const decodedMessage = message.toString();
            //console.log(`[Connection] Received message:`, decodedMessage);

            // Access the client's state directly from the ws object
            const clientState = ws.clientState;

            // Step 1: Expecting a string, hash it with SHA-512
            if (!clientState.step1_received) {
                clientState.step1_received = decodedMessage;
                clientState.step1_response = sha512Hash(decodedMessage);
                ws.send(clientState.step1_response);
            }
            // Step 2: Expecting a base64 encoded string (form data), decode and hash with SHA-256
            else if (!clientState.step2_received) {
                const decoded = Buffer.from(decodedMessage, 'base64').toString('utf-8');
                // Form data
                clientState.step2_received = decoded;
                clientState.step2_response = sha256Hash(decoded);
                ws.send(clientState.step2_response);
            }
            // Step 3: Same as Step 2
            else if (!clientState.step3_received) {
                const decoded = Buffer.from(decodedMessage, 'base64').toString('utf-8');
                clientState.step3_received = decoded;
                clientState.step3_response = sha256Hash(decoded);
                ws.send(clientState.step3_response);
            }
            // Step 4: Same as Step 1, hash it with SHA-512
            else if (!clientState.step4_received) {
                clientState.step4_received = decodedMessage;
                const jwtResult = await verifyJWT(decodedMessage);
                let finalResponse;
                if (jwtResult.isValid) {
                    // JWT is valid, do submission
                    // Destructure jwtValidated and step2_received
                    const { token_pre_ws, useremail, userState, username, userID, inst, crs, yr, ip, deviceID, useragent, source, ipRateLimit } = jwtResult.jwtValidated;
                    const { chc, md, grp } = JSON.parse(clientState.step2_received);

                    // Build the submissionData object
                    const submissionData = {
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
                        chc,
                        md,
                        grp,
                        ipRateLimit
                    };
                    finalResponse = await submissionHelper.submitCode(submissionData);
                } else {
                    finalResponse = {"success": false, "submit": false, "msg": "Unable to validate submission."}
                }
                clientState.step4_response = finalResponse;
                ws.send(btoa(JSON.stringify(finalResponse)));

                // Optionally, close the connection after step 4
                ws.close(); // Close WS connection
            }
            else {
                // If we receive an unexpected message after completing all steps
                ws.close(1000, 'Unexpected message after completing all steps');
            }

            //console.log(`[Connection] Client state:`, clientState);
        } catch (error) {
            console.error(`[Connection] Error processing message:`, error);
            ws.close(1002, 'Invalid message format or sequence');
        }
    });

    ws.on('close', function close(code, reason) {
        //console.log(`[Connection] WebSocket connection closed. Code: ${code}, Reason: ${reason}`);
        // The clientState object is automatically discarded when the connection closes
    });
});

server.on('upgrade', function upgrade(request, socket, head) {
    const pathname = request.url;

    if (pathname === '/api/submit/ws') {
        wss.handleUpgrade(request, socket, head, function done(ws) {
            wss.emit('connection', ws, request);
        });
    } else if (pathname === '/api/submit/autosplash') {
        wss.handleUpgrade(request, socket, head, function done(ws) {
            handleAutoSplashConnection(ws, request);
        });
    } else {
        socket.destroy();
    }
});

app.get('*', function (req, res) {
    res.status(404);
    res.json({ 'success': false, msg: 'Not a valid endpoint. (submit-ws-api)' });
});

module.exports = app;

