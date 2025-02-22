const crypto = require('crypto');
const util = require('util');
var db = require('../../../databases/database.ts');
const { sendEmail } = require('../../email.ts');
const express = require('express');
const moment = require('moment-timezone');
const ejs = require('ejs');
const jwt = require('jsonwebtoken');
var app = express.Router();

db.query = util.promisify(db.query); // Promisify db.query for async/await

const allowedDomains = ['.ac.uk', 'j-h.ai', 'realjamesh.co.uk', 'jemedia.xyz', 'jameshaworth.dev'];

// Function to validate email domain
function validateEmailDomain(email) {
  for (let domain of allowedDomains) {
    if (email.endsWith(domain)) {
      return { success: true };
    }
  }
  return { success: false, msg: 'Invalid email domain. Try again with your .ac.uk email.' };
}

// Function to validate verified email
function validateVerifiedEmail(email_verified) {
  if (email_verified == true) {
    return { success: true };
  }
  return {
    success: false,
    msg: 'Email not verified with OAuth provider. Contact support for advice!',
  };
}

// Send a welcome email to new users
function welcomeEmail(email, username, rootDomain) {
  const data = {
    username,
    rootDomain,
  };
  // Render the template file
  ejs.renderFile('/var/www/checkout/views/account/welcome-email.ejs', data, (err, html) => {
    if (err) {
      console.error('Error rendering EJS template:', err);
      return;
    }

    const emailTitle = `Welcome to CheckOut, ${username}`;
    sendEmail(email, emailTitle, html);
  });
}

// Login
async function login(req, email, email_verified, name, shortname, avatarURI) {
  try {
    // Sneaky email re-write
    if (email === 'jamhaw8@gmail.com') {
      email = 'checkout@jemedia.xyz';
    }

    // Validate email domain
    const emailValidation = validateEmailDomain(email);
    if (!emailValidation.success) {
      return emailValidation;
    }

    // Validate email verification
    const emailVerification = validateVerifiedEmail(email_verified);
    if (!emailVerification.success) {
      return emailVerification;
    }

    // Check if the user already exists
    let results = await db.query('SELECT id FROM users WHERE email = ?', [email]);

    let userId;
    let newUser = false;
    if (results.length > 0) {
      // User exists
      userId = results[0].id;
    } else {
      // User does not exist, create a new user
      const apiToken = crypto.randomBytes(64).toString('hex');
      const userState = 'normal';
      var mysqlTimestamp = moment().tz('UTC').format('YYYY-MM-DD HH:mm:ss');

      const newUserData = {
        email,
        code: null,
        api_token: apiToken,
        userstate: userState,
        checkintoken: null,
        checkinstate: 0,
        fullName: name,
        username: shortname,
        note: '',
        checkinReport: 'Disabled',
        checkinReportTime: mysqlTimestamp,
        accountCreationTime: mysqlTimestamp,
      };

      results = await db.query('INSERT INTO users SET ?', newUserData);
      userId = results.insertId;
      newUser = true;
      welcomeEmail(email, shortname, req.rootDomain);
    }

    // Set user information in the session
    req.session.user = { id: userId };

    return { success: true, msg: 'User authenticated', newUser };
  } catch (error) {
    console.error(error);
    return { success: false, msg: 'User authentication failed', error: error.message };
  }
}

// Authenticate on every request
async function authenticateUser(req) {
  try {
    let userQuery = `SELECT checkinState, checkinReport, sync, api_token, id, email, username, userstate FROM users WHERE id = ? OR api_token = ?`;
    let userId = req.session.user ? req.session.user.id : null;
    let apiKey = req.headers['x-checkout-key'] || '';

    let results = await db.query(userQuery, [userId, apiKey]);

    if (results.length == 0) {
      req.loggedIn = false;
      req.useremail = 'anon@checkout.ac.uk';
      req.userState = 'anon';
      req.username = 'Anon';
      req.userID = 0;
      req.sync = {};
    } else {
      req.loggedIn = true;
      req.useremail = results[0]['email'];
      req.userState = results[0]['userstate'];
      req.userID = results[0]['id'];
      req.apitoken = results[0]['api_token'];
      req.username = results[0]['username'];
      try {
        req.sync = results[0]['sync'] || {};
      } catch {
        req.sync = {};
      }
      req.checkinReport = results[0]['checkinReport'];
      req.checkinState = results[0]['checkinState'];
    }
  } catch (err) {
    console.error('Auth error', err);
    req.loggedIn = false;
    req.useremail = 'anon@checkout.ac.uk';
    req.userState = 'anon';
    req.username = 'Anon';
    req.userID = 0;
    req.sync = {};
  }
}

// Logout endpoint
app.post('/api/auth/logout', (req, res) => {
  if (req.session.user) {
    delete req.session.user.id; // Remove the user ID from the session
  }
  res.redirect('/success/logout'); // Redirect to the logout success page
});

// API Key Login
app.post('/api/auth/apikey/login', async (req, res) => {
  try {
    const apiKey = req.body.apiKey;

    if (!apiKey) {
      return res.status(400).json({
        success: false,
        msg: 'API key is required',
      });
    }

    // Check if the API key exists and get the user
    const results = await db.query('SELECT id, api_token FROM users WHERE api_token = ?', [apiKey]);

    if (results.length === 0) {
      return res.status(401).json({
        success: false,
        msg: 'Invalid API key',
      });
    }

    // Perform timing-safe comparison of API keys
    const storedApiKey = results[0].api_token;
    const isValidKey = crypto.timingSafeEqual(
      Buffer.from(apiKey),
      Buffer.from(storedApiKey)
    );

    if (!isValidKey) {
      return res.status(401).json({
        success: false,
        msg: 'Invalid API key',
      });
    }

    // Set up the session
    const userId = results[0].id;
    req.session.user = { id: userId };

    return res.status(200).json({
      success: true,
      msg: 'Successfully authenticated with API key',
    });
  } catch (error) {
    console.error('API key login error:', error);
    return res.status(500).json({
      success: false,
      msg: 'Internal server error during authentication',
    });
  }
});

// Modify the JWT signing to use a dedicated secret
const JWT_SECRET = process.env.JWT_SECRET; // This should be set to a high-entropy value
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable must be set');
}

// Update the app token endpoint
app.get('/api/auth/apptoken', async (req, res) => {
  try {
    if (!req.loggedIn || !req.userID) {
      return res.status(401).json({
        success: false,
        msg: 'User not authenticated'
      });
    }

    const payload = {
      userID: req.userID,
      iat: Math.floor(Date.now() / 1000)
    };

    const options = {
      expiresIn: '1m',
      algorithm: 'HS256' // Explicitly specify the algorithm
    };

    jwt.sign(payload, JWT_SECRET, options, (err, token) => {
      if (err) {
        console.error('Error generating JWT:', err);
        return res.status(500).json({
          success: false,
          msg: 'Failed to generate token'
        });
      }
      
      res.json({
        success: true,
        apptoken: token
      });
    });
  } catch (error) {
    console.error('App login error:', error);
    res.status(500).json({
      success: false,
      msg: 'Internal server error'
    });
  }
});

// Verify App Token
app.post('/api/auth/verifyapptoken', async (req, res) => {
  try {
    const { apptoken } = req.body;
    
    if (!apptoken) {
      return res.status(400).json({
        success: false,
        msg: 'App token is required'
      });
    }

    try {
      // Verify the JWT with explicit algorithm
      const decoded = await jwt.verify(apptoken, JWT_SECRET, {
        algorithms: ['HS256'],
        maxAge: '1m' // Explicit max age check
      });

      // Check token age
      const now = Math.floor(Date.now() / 1000);
      if (decoded.iat > now) {
        return res.status(401).json({
          success: false,
          msg: 'Token issued in the future - possible replay attack'
        });
      }

      // Get user data from database using parameterized query
      const results = await db.query(
        'SELECT username, api_token FROM users WHERE id = ? AND userstate != ?',
        [decoded.userID, 'disabled']
      );

      if (results.length === 0) {
        return res.status(401).json({
          success: false,
          msg: 'User not found or account disabled'
        });
      }

      // Return success with user data
      res.json({
        success: true,
        username: results[0].username,
        api_token: results[0].api_token
      });
    } catch (jwtError) {
      // Specific error handling for different JWT errors
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          msg: 'Token has expired'
        });
      } else if (jwtError.name === 'JsonWebTokenError') {
        return res.status(401).json({
          success: false,
          msg: 'Invalid token'
        });
      }
      throw jwtError; // Re-throw unexpected errors
    }
  } catch (error) {
    console.error('Verify app token error:', error);
    res.status(500).json({
      success: false,
      msg: 'Internal server error'
    });
  }
});

module.exports = { login, authenticateUser, app };
