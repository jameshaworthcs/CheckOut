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

/**
 * Validates if the email domain is allowed or matches a specific hash.
 * @param {string} email - The email address to validate.
 * @returns {{success: boolean, msg?: string}}
 */
function validateEmailDomain(email) {
  // Check if email hash matches the allowed hash
  const emailHash = crypto.createHash('sha512').update(email).digest('hex');
  if (emailHash === '1f164bacbe1e448098294be96f3fe5f478f4e932c4ef3cb2aae01af33fb4cc930c5b39fcb2a9a3092569ada595dfe34756fd99a2b2b8c81a837de665adc7369c') {
    return { success: true };
  }
  
  // Check against allowed domains
  for (let domain of allowedDomains) {
    if (email.endsWith(domain)) {
      return { success: true };
    }
  }
  return { success: false, msg: 'Invalid email domain. Try again with your .ac.uk email.' };
}

/**
 * Checks if the email address was marked as verified by the OAuth provider.
 * @param {boolean} email_verified - The verification status from the OAuth provider.
 * @returns {{success: boolean, msg?: string}}
 */
function validateVerifiedEmail(email_verified) {
  if (email_verified == true) {
    return { success: true };
  }
  return {
    success: false,
    msg: 'Email not verified with OAuth provider. Contact support for advice!',
  };
}

/**
 * Sends a welcome email to a new user.
 * @param {string} email - The recipient's email address.
 * @param {string} username - The recipient's username.
 * @param {string} rootDomain - The root domain of the application (for links).
 */
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

/**
 * Handles user login or registration based on OAuth details.
 * Validates email domain and verification status.
 * Creates a new user if one doesn't exist, otherwise logs in the existing user.
 * Sends a welcome email to new users.
 * Sets user ID in the session.
 * @param {object} req - The Express request object.
 * @param {string} email - User's email.
 * @param {boolean} email_verified - Whether the email is verified by OAuth.
 * @param {string} name - User's full name.
 * @param {string} shortname - User's preferred short name/username.
 * @param {string} avatarURI - URI for the user's avatar (not currently used in user creation).
 * @returns {Promise<{success: boolean, msg: string, newUser?: boolean, error?: string}>}
 */
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

/**
 * Middleware-like function to authenticate a user on each request.
 * Checks for a valid session ID or API key (in headers).
 * Populates `req` with user details (`loggedIn`, `useremail`, `userState`, `userID`, etc.)
 * or sets default anonymous user values if authentication fails.
 * @param {object} req - The Express request object.
 */
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

/**
 * POST /api/auth/logout
 * Logs the user out by removing their ID from the session.
 */
app.post('/api/auth/logout', (req, res) => {
  if (req.session.user) {
    delete req.session.user.id; // Remove the user ID from the session
  }
  res.redirect('/success/logout'); // Redirect to the logout success page
});

/**
 * POST /api/auth/apikey/login
 * Authenticates a user based on a provided API key.
 * Uses timing-safe comparison to prevent timing attacks.
 * Sets the user ID in the session upon successful authentication.
 */
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

// Use a dedicated, high-entropy secret for JWT signing
const JWT_SECRET = process.env.JWT_SECRET; // This should be set to a high-entropy value
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable must be set');
}

/**
 * GET /api/auth/apptoken
 * Generates a short-lived (1 minute) JWT (apptoken) for authenticated users.
 * Used for operations requiring a temporary, verified token.
 */
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

/**
 * POST /api/auth/verifyapptoken
 * Verifies a provided apptoken (JWT).
 * Checks signature, expiration (max 1 min), issue time, and algorithm.
 * Fetches user details if the token is valid and the user is active.
 * Returns user details upon successful verification.
 */
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

/**
 * GET /api/auth/service-token
 * Generates a short-lived (1 minute) JWT (servicetoken) for authenticated users.
 * Includes userID, username, and useremail in the payload.
 * Sets the token securely in an HttpOnly, Secure cookie.
 * Used for authenticating subsequent requests to secure app services.
 */
app.get('/api/auth/service-token', async (req, res) => {
  try {
    if (!req.loggedIn || !req.userID) {
      return res.status(401).json({
        success: false,
        msg: 'User not authenticated'
      });
    }

    const payload = {
      userID: req.userID,
      username: req.username,
      useremail: req.useremail,
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

      // set jwt securely in cookie for 1 minute
      res.cookie('servicetoken', token, { maxAge: 1 * 60 * 1000, secure: true, httpOnly: true });
      
      res.json({
        success: true
      });
    });
  } catch (error) {
    console.error('Service login error:', error);
    res.status(500).json({
      success: false,
      msg: 'Internal server error'
    });
  }
});

module.exports = { login, authenticateUser, app };
