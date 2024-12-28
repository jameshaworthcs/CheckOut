// if (process.env.CHK_SRV != "PROD") {
//   //require('newrelic');
// }
const express = require("express");
const http = require('http');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const winston = require('winston');
const XXH = require('xxhashjs');
const NodeCache = require('node-cache');
var loggerM = require('morgan');
require('dotenv').config({ path: '.env.local' });
const blockedUsernames = ['t______________'];
//var passWord = process.env.ADPASS;
const io = require('@pm2/io');
// Variables to track logged-in and total requests
let totalRequests = 0;
let loggedInRequests = 0;
// Define a custom metric to show the percentage of logged-in users
const loggedInPercentage = io.metric({
  name: 'Logged In Percentage',
  value: () => {
    if (totalRequests === 0) return 0; // Avoid division by zero
    return (loggedInRequests / totalRequests) * 100;
  },
});

/// Routers
var appRouter = require('./routes/app');
var accountRouter = require('./routes/account');
var autoRouter = require('./routes/autocheckin');
// API is defined lower for WS functionality
var manageRouter = require('./routes/manage/manage');

var secureRoute = require('./routes/secure');
const { authenticateUser } = require('./routes/api/auth/auth');
var outsource = require('./outsource/outsource'); // Sync with external checkin DB's

const app = express();
const port = process.env.NODE_PORT || 4000;
var path = require('path');
var db = require('./database');
const db2 = require('./database-v2');
app.set('trust proxy', 1)
app.set('view cache', true);

// Sessions
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);

// MySQL session store options
const dbOptions = {
  host: process.env.DB_HOST,
  //port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
};
// Create MySQL store instance
const mysqlStore = new MySQLStore(dbOptions);

// Variable to switch between Redis and MySQL store
let USE_MYSQL_SESSION_STORE = false; // Default to Redis store

// Redis-related code inside a try-catch to handle import and connection errors
let redisClient, RedisStore, redisStore;

try {
  RedisStore = require('connect-redis').default;
  const redis = require('redis');

  // Create Redis client with suppressed logs
  redisClient = redis.createClient({
    host: '127.0.0.1',
    port: 6379,
    // Optional Redis authentication
    // password: process.env.REDISPASS
  }).on('error', () => {}); // Suppress Redis errors

  // Handle Redis errors and fall back to MySQL store - only log once
  redisClient.once('error', (err) => {
    console.log("Redis installation not found, using SQL session store instead.");
    USE_MYSQL_SESSION_STORE = true; // Switch to MySQL store on Redis error
    redisClient.removeAllListeners(); // Remove all event listeners
    redisClient.quit(); // Close the Redis connection
  });

  // Wait for Redis to be ready or fail
  redisClient.connect()
    .then(() => {
      redisStore = new RedisStore({ client: redisClient });
    })
    .catch((err) => {
      console.log("Redis installation not found, using SQL session store instead.");
      USE_MYSQL_SESSION_STORE = true;
      redisClient.removeAllListeners(); // Remove all event listeners
      redisClient.quit(); // Close the Redis connection
    });

} catch (err) {
  console.log("Redis installation not found, using SQL session store instead.");
  USE_MYSQL_SESSION_STORE = true;
}

// Fallback session store based on the USE_MYSQL_SESSION_STORE flag
const sessionStore = USE_MYSQL_SESSION_STORE ? mysqlStore : redisStore || mysqlStore; // Use MySQL if Redis fails

// Session middleware
app.use(session({
  secret: process.env.SSECRET,
  resave: false,
  saveUninitialized: true,
  store: sessionStore, // Use the selected session store
  name: "checkout_secure",
  rolling: true,
  cookie: {
    maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year
    httpOnly: process.env.NODE_ENV !== "development", // Only true in non-development
    secure: process.env.NODE_ENV !== "development"    // Only true in non-development
  },
}));

// Shutdown handling: Closing the Redis client on exit (only if Redis was used)
process.on('SIGINT', () => {
  if (redisClient && redisClient.quit) {
    redisClient.quit(() => {
      console.log('Redis client closed.');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
});




// Development helpers
if (process.env.CHK_SRV == "BETA") {
  // Log requests and time taken
  app.use(loggerM('dev'));
  // Middleware to track start time
  //app.use((req, res, next) => {
    // Start high-resolution timer
    //req.startTime = process.hrtime();

    // Define a method to calculate the time passed in milliseconds
    //req.timePassed = () => {
    //  const diff = process.hrtime(req.startTime);
    //  const timePassedMs = diff[0] * 1000 + diff[1] / 1e6; // Convert seconds and nanoseconds to milliseconds
    //  return timePassedMs.toFixed(2); // Return time in milliseconds as a string
    //};

    // At any point do console.log(`Elapsed_${req.url}: ${req.timePassed()} ms`);

    //next();
  //});
}

// View engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Middleware to parse URL-encoded form data
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser()); // for cookies

// Server for WS connections
const server = http.createServer(app);

// Export the server to be used in ws.js (from api/submit)
module.exports = server;

// // General logger
// const logger = winston.createLogger({
//   level: 'info',  // Log 'info' and more critical levels (error, warn)
//   format: winston.format.json(),
//   transports: [
//     new winston.transports.File({ filename: '/var/lib/checkout/checkout.log' })
//   ]
// });

let appStatusCache = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 10000; // 10 seconds

async function appStatus(req) {
  const currentTime = Date.now();

  if (appStatusCache && (currentTime - cacheTimestamp) < CACHE_DURATION) {
    // Use cached result if it's within the cache duration
    return appStatusCache.map(row => ({
      ...row,
      userInfo: {
        email: req.useremail,
        userstate: req.userState,
        apikey: req.apitoken,
        deviceID: req.sessionID
      }
    }));
  }

  return new Promise((resolve, reject) => {
    const sqlQuery = 'SELECT * FROM globalapp ORDER BY revID DESC LIMIT 1;';
    db.query(sqlQuery, (err, result) => {
      if (err) return reject(err);

      result.forEach(row => {
        row.userInfo = {
          email: req.useremail,
          userstate: req.userState,
          apikey: req.apitoken,
          deviceID: req.sessionID
        };
      });

      // Update cache
      appStatusCache = result;
      cacheTimestamp = currentTime;

      resolve(result);
    });
  });
}

async function log(req) {
  try {
    const moment = require('moment');
    const ip = req.usersIP;

    if (secureRoute.logQ(req)) {
      const logData = {
        timestamp: moment().format('YYYY-MM-DD HH:mm:ss'),
        ip: ip || "null",
        spoofed_ip: req.SpoofedIP || null,
        host: req.headers['host'] || "null",
        method: req.method || "null",
        path: req.originalUrl || "null",
        username: req.useremail || "null",
        user_id: req.userID || null,
        device_id: req.sessionID || "null",
        user_agent: req.headers['user-agent'] || "null",
        referer: req.headers['referer'] || "null",
        post_data: req.body ? JSON.stringify(req.body) : null
      };

      const sql = `
        INSERT INTO request_log (timestamp, ip, spoofed_ip, host, method, path, username, user_id, device_id, user_agent, referer, post_data)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      // Using db.execute with mysql2 to execute the query
      await db2.execute(sql, Object.values(logData));
    }
  } catch (error) {
    console.error('Error logging to database:', error);
  }
}

// Middleware to fetch app status and perform actions
app.use(async (req, res, next) => {
  try {
    req.userData = {};
    if (process.env.CHK_SRV == "BETA") {
      req.userData.beta = true;
    }

    if (process.env.NODE_ENV == "development" && process.env.LOCAL_WARNING !== "0") {
      req.userData.development = true;
    }

    // For local development use local admin user
    // Safe to do as userID 1 is anon in production
    if (process.env.NODE_ENV==="development") {
      req.session.user = { id: 1 };
    }

    // Fetch app status and set variables related to application state
    const fetchAppStatus = async () => {
      try {
        let result = await appStatus(req);

        req.switchSWW = result[0]['webState'] === 1 ? false : true; // inverse logic for SWW switch
        req.bedtime = result[0]['bedtimeState'] === 1 ? true : false;
        req.dayStart = result[0]['dayStart'];
        req.dayEnd = result[0]['dayEnd'];
        req.christmas = '0';
        req.authReq = result[0]['authState'] === 1 ? true : false;
        req.undoEnable = result[0]['undoState'] === 1 ? true : false;
        req.boycottState = result[0]['boycottState'] === 1 ? true : false;
        req.boycottMsg = result[0]['boycottMsg'];
        req.boycottLink = result[0]['boycottLink'];
        req.ipRateLimit = result[0]['rateLimit'];
        req.rootDomain = result[0]['rootDomain'];
        req.webStateMsg = result[0]['webStateMsg'];
        req.webStateLink = result[0]['webStateLink'];
        req.qualifiedURL = 'https://' + req.rootDomain;
      } catch (error) {
        console.error("Database error in fetchAppStatus:", error);
        throw new Error("Unable to fetch application status");
      }
    };

    // Set course-related variables
    const setCourseData = async () => {
      if (req.session.course) {
        var { inst = "null", yr = "null", crs = "null" } = req.session.course;
      } else {
        var { inst = "null", yr = "null", crs = "null" } = "null";
      }

      req.inst = inst;
      req.yr = yr;
      req.crs = crs;
      req.initCourse = [inst, yr, crs].every(value => value !== "null");

      if ('inst' in req.sync && 'crs' in req.sync && 'yr' in req.sync) {
        req.inst = req.sync.inst;
        req.yr = req.sync.yr;
        req.crs = req.sync.crs;
        req.initCourse = [req.inst, req.yr, req.crs].every(value => value !== "null");
      }
    };

    // Set theme-related variables
    const setThemeData = async () => {
      // Default theme ID (Modern)
      let theme = '2';

      // Check if session theme exists and has an id
      if (req.session?.theme?.id) {
        theme = req.session.theme.id;
      }

      // Check if themeID exists in sync object and update session theme
      if ('themeID' in req.sync) {
        theme = req.sync.themeID;
        req.session.theme = { id: theme }; // Sync session with account
      }

      // Overwrite theme with query parameter if it exists
      if (req.query?.theme) {
        theme = req.query.theme;
      }

      req.userData.username = req.username;
      req.userData.theme = theme;
    };

    // Extract and set user IP-related data
    const setIPData = async () => {
      // Helper function to extract the first IP from x-forwarded-for or fallback to a default IP
      const extractFirstIP = (header) => (header ? header.split(',')[0] : '1.1.1.1');

      // Get user IP from headers or secure route
      req.usersIP = req.headers['X-Shield-Client-IP'] || secureRoute.getRealIp(req.headers['x-forwarded-for']) || extractFirstIP(req.headers['x-forwarded-for']);

      // Set Spoofed IP, ensuring it's only set if different from usersIP
      req.SpoofedIP = req.usersIP === extractFirstIP(req.headers['x-forwarded-for']) ? '' : extractFirstIP(req.headers['x-forwarded-for']);
    };

    // Set consent and cookieWall variables
    const setConsentAndCookies = async () => {
      if (req.session.consent) {
        req.consented = req.session.consented;
      } else {
        req.consented = false;
      }

      req.cookieWall = 'depracated'; // req.cookies['cookieWall'] || "0";
    };

    // Authenticate user and set user-related data
    const authenticateAndSetUserData = async () => {
      // Log user in and refresh tokens
      await authenticateUser(req);

      // This function sets the following:
      // req.loggedIn, req.useremail, req.userState, req.username, req.userID, req.sync, (req.checkinReport)
      if (typeof req.checkinReport !== 'undefined') {
        req.userData.checkinReport = req.checkinReport;
      }
      if (req.userState === "sysop") {
        req.userData.sysop = true;
      }
      // For moderator link in navbar dropdown
      if (req.userState && (req.userState.includes("sysop") || req.userState.includes("moderator"))) {
        req.userData.moderator = true;
      }
    };

    // Set API key
    req.apikey = req.headers['x-checkout-key'] || "";

    // Run the app status and user authentication in sequence
    await fetchAppStatus();
    await authenticateAndSetUserData();

    // Run course, theme, IP, and consent/cookie setup in parallel
    await Promise.all([
      setCourseData(),
      setThemeData(),
      setIPData(),
      setConsentAndCookies(),
    ]);

    // Log all requests in request_log
    log(req);

    // Conditional PROD environment check
    if (process.env.CHK_SRV == "PROD") {
      res.setHeader('X-CheckOut-Backend', process.env.CHK_PROD_ID);
      
      // Increment total requests count
      totalRequests++;

      // Check if user is logged in and increment logged-in requests count
      if (req.loggedIn) {
        loggedInRequests++;
      }
    }
    next();
  } catch (err) {
    console.error("Error in global app status:", err);
    return res.render('notices/generic-msg.ejs', {
      msgTitle: "System Error",
      msgBody: "We're experiencing technical difficulties. Please try again later or <a href='mailto:checkout@jemedia.xyz'>contact support</a>.",
      username: 'Error'
    });
  }
});

// Allow appeals, even for banned users
app.post('/api/app/block/appeal', async (req, res) => {
  const ip = req.usersIP; // Extract the requester's IP address
  const reason = req.body.reason;
  try {
    db.query(
      'INSERT INTO appeals (ip, appeal_text, status) VALUES (?, ?, ?)',
      [ip, reason, "not reviewed"]
    );
    res.status(201).json({success: true, msg: 'Appeal created. Please do not submit multiple appeals. An update will be posted here if the ban is not removed upon appeal review.'});
  } catch (error) {
    console.log(error)
    res.status(500).json({success: false, msg: 'Error creating appeal'}); // Replace with better error handling 
  }
});

// Set minification options
const { minify } = require('html-minifier');
const useMinification = process.env.NODE_ENV === 'development' ? false : true;
const useMiniCache = process.env.NODE_ENV === 'development' ? false : true;

let redisClientCache = null;

// Try to initialize Redis and handle any errors during import or connection
try {
  const RedisCache = require("ioredis");
  redisClientCache = new RedisCache(); // Connect to Redis
  //console.log("Connected to Redis successfully");
  
  // Optional: Add Redis connection error handling
  redisClientCache.on("error", (err) => {
    //console.log("Redis connection error:", err);
    redisClientCache = null; // Set redisClientCache to null if connection fails
  });

} catch (error) {
  //console.log("Failed to initialize Redis:", error);
  console.log("Redis installation not found, caching disabled.")
  redisClientCache = null; // Set redisClientCache to null if Redis can't be imported or initialized
}

const TTL = 365 * 24 * 60 * 60; // 1 year in seconds

// Middleware to handle render functionality
app.use((req, res, next) => {
  // Store the original render function
  const originalRender = res.render;

  // Override res.render globally
  res.render = function(view, options = {}, callback) {
    //console.log(req.userData);
    options.userData = req.userData || {};

    // If minification is not enabled, use simple render with userData
    if (!useMinification) {
      return originalRender.call(this, view, options, callback);
    }

    // Minification logic
    originalRender.call(this, view, options, async (err, html) => {
      if (err) {
        if (callback) return callback(err);
        next(err);
      }

      const hash = `${XXH.h32(0xABCD).update(html).digest().toString(16)}_${req.userID}`;

      // Proceed without caching if Redis is unavailable
      if (!redisClientCache) {
        console.warn("Redis is unavailable, proceeding without caching.");
        // Minify the HTML and send it without caching
        const minifiedHtml = minify(html, {
          collapseWhitespace: true,
          removeComments: true,
          removeRedundantAttributes: true,
          removeScriptTypeAttributes: true,
          removeStyleLinkTypeAttributes: true,
          minifyCSS: true,
          minifyJS: true,
        });

        const finalHtml = `<!-- Made with ❤️ by the CheckOut team. © 2024. #${hash} -->\n\n${minifiedHtml}`;
        return this.send(finalHtml); // Send minified HTML without caching
      }

      try {
        // Check if the minified version is already in Redis cache
        const cachedMinifiedHtml = await redisClientCache.get(hash);

        if (cachedMinifiedHtml && useMiniCache) {
          // If found in Redis cache, send the cached minified HTML
          this.send(cachedMinifiedHtml);
        } else {
          // If not found, minify the HTML
          const minifiedHtml = minify(html, {
            collapseWhitespace: true,
            removeComments: true,
            removeRedundantAttributes: true,
            removeScriptTypeAttributes: true,
            removeStyleLinkTypeAttributes: true,
            minifyCSS: true,
            minifyJS: true,
          });

          // Add the copyright comment before the minified HTML
          const finalHtml = `<!-- Made with ❤️ by the CheckOut team. © 2024. #${hash} -->\n\n${minifiedHtml}`;

          // Store the minified HTML in Redis with a TTL
          await redisClientCache.set(hash, finalHtml, 'EX', TTL);

          // Send the minified HTML as the response
          this.send(finalHtml);
        }
      } catch (redisErr) {
        console.error("Redis operation error:", redisErr);
        // If Redis operation fails, send the minified HTML without caching
        const minifiedHtml = minify(html, {
          collapseWhitespace: true,
          removeComments: true,
          removeRedundantAttributes: true,
          removeScriptTypeAttributes: true,
          removeStyleLinkTypeAttributes: true,
          minifyCSS: true,
          minifyJS: true,
        });

        const finalHtml = `<!-- Made with ❤️ by the CheckOut team. © 2024. #${hash} -->\n\n${minifiedHtml}`;
        this.send(finalHtml);
      }
    });
  };

  next();
});



// Global authentication and bedtime test
function isCKAuthenticated(req, res, next) {
  next();
  // const moment = require('moment');
  // var currentTime = moment();
  // var midnight = moment().startOf('day').add(24, 'hours');
  // var startTime = moment(req.dayStart, 'HH:mm');
  // var endTime = moment(req.dayEnd, 'HH:mm');
  // if (currentTime.isBefore(startTime) && req.bedtime === true) {
  //   // Current time is before the start time
  //   var startMsg = `today at ${startTime.format('hh:mm a')}`;
  //   console.log("Out-of-hours request.")
  //   res.render('out-of-hours.ejs', { startMsg, currentTime })
  //   // Your code here if the condition is met
  // } else if (currentTime.isAfter(endTime) && currentTime.isBefore(midnight) && req.bedtime === true) {
  //   // Current time is after the end time but before midnight
  //   var startMsg = `tomorrow at ${startTime.format('hh:mm a')}`;
  //   console.log("Out-of-hours request.")
  //   res.render('out-of-hours.ejs', { startMsg, currentTime })
  //   // Your code here if the condition is met
  //   // } else if (req.authReq === true) {
  //   //   var BlockedTrue = false;
  //   //   try {
  //   //     if (req.session.user.username != undefined) {
  //   //       if (blockedUsernames.includes(req.session.user.username.toString())) {
  //   //         console.log("Blocked user attempt:", req.session.user.username)
  //   //         console.log(req.session.user.global_name)
  //   //         res.render('blocked-user.ejs', {username: req.session.user.username, DSname: req.session.user.global_name})
  //   //         var BlockedTrue = true;
  //   //       } else {
  //   //         console.log("Auth success user:", req.session.user.username)
  //   //         return next();
  //   //       }
  //   //     }
  //   //     //return next();
  //   //     if (BlockedTrue === false) {
  //   //       console.log("Auth fail ID 1")
  //   //       res.render('newauth.ejs') // Redirect to the login page if not authenticated
  //   //     }
  //   //   } catch (err) {
  //   //     //return next();
  //   //     console.log("Auth fail ID 2", err)
  //   //     res.render('newauth.ejs')
  //   //   }
  //   // } 
  // } else {
  //   return next();
  // }
}

// Security check
app.use(secureRoute.securityCheck);

// Allow API docs & assets after security check
// (/static/ is excluded from auth requirements)
app.use(express.static('public', {
  extensions: ['html', 'htm'],
  dotfiles: 'allow',
}));

// (kind of) Always allow access to app state
app.get('/api/app/state', async function (req, res) {
  let result = await appStatus(req);
  res.json(result);
});

// webstate and boycott Global switch
app.use((req, res, next) => {
  if (req.switchSWW == true) {
    var errorCodeSWW = 200
    res.status(errorCodeSWW)
    res.render('error-sww.ejs', { errorCodeSWW, msg: req.webStateMsg, link: req.webStateLink })
  } else if (req.boycottState == true) {
    res.render('boycott.ejs', { boycottMsg: req.boycottMsg, boycottLink: req.boycottLink })
  } else {
    next();
  }
});

app.get('/sysHide', isCKAuthenticated, function (req, res) { // Mod-Block Submission
  secureRoute.auth("mod", req, res, () => {
    var codeID = req.query.codeID;
    var tk = req.query.tk;
    var sqlsysundo = `UPDATE codes SET codeState = "0", codeDesc = "Mod-Rm-` + req.userID + `" WHERE codeID = ? AND tk = ? LIMIT 1`;
    db.query(sqlsysundo, [codeID, tk], function (err, resultsysundo) {
      if (err) {
        console.log(err);
        res.render("error.ejs");
      } else {
        console.log("Removed submission.", codeID, tk);
        res.json({ "result": "Disabled code", "codeID": codeID })
      }
    })
  });
});

app.get('/sysShow', isCKAuthenticated, function (req, res) { // Mod-Show Submission
  secureRoute.auth("mod", req, res, () => {
    var codeID = req.query.codeID;
    var tk = req.query.tk;
    var sqlsysundo = `UPDATE codes SET codeState = "1", codeDesc = "Mod-En-` + req.userID + `" WHERE codeID = ? AND tk = ? LIMIT 1`;
    db.query(sqlsysundo, [codeID, tk], function (err, resultsysundo) {
      if (err) {
        console.log(err);
        res.render("error.ejs");
      } else {
        console.log(req.userID, "enabled code", codeID, tk);
        res.json({ "result": "Enabled code", "codeID": codeID })
      }
    })
  });
});

app.get('/remove', isCKAuthenticated, function (req, res) { // Remove submission
  secureRoute.auth("mod", req, res, () => {
    var codeID = req.query.codeID;
    var tk = req.query.tk;
    var sqlremove = `DELETE FROM codes WHERE codeID = ? AND tk = ? LIMIT 1`;
    db.query(sqlremove, [codeID, tk], function (err, resultremove) {
      if (err) {
        console.log(err);
        res.render("error.ejs");
      } else {
        console.log(req.userID, "disabled code", codeID, tk);
        res.json({ "result": "Removed Submission", "codeID": codeID })
      }
    })
  });
});

// Support redirect
app.get('/support', isCKAuthenticated, function (req, res) { // Redirect to FAQ
  res.redirect('mailto:checkout@jemedia.xyz');
});

// FAQ Redirect
app.get('/faq', isCKAuthenticated, function (req, res) { // Redirect to FAQ
  res.redirect('/learn-faq')
})

// FAQ View
app.get('/learn-faq', isCKAuthenticated, function (req, res) { // Frequently asked questions
  var authReq = req.authReq
  var ipRateLimit = req.ipRateLimit
  res.render('learn-faq/learn-faq.ejs', { authReq, ipRateLimit, username: req.username })
})

// TOS Redirect
app.get('/terms', isCKAuthenticated, function (req, res) { // Redirect to FAQ
  res.redirect('/terms-privacy')
})

// TOS View
app.get('/terms-privacy', isCKAuthenticated, function (req, res) { // Terms of service and disclaimer
  res.render('terms.ejs', { username: req.username })
})

// Settings View
app.get('/settings', isCKAuthenticated, function (req, res) { // Settings
  res.render('settings/settings.ejs', { username: req.username })
})

// Data control View
app.get('/data', isCKAuthenticated, function (req, res) { // Data
  res.render('data-control/data.ejs', { username: req.username })
})

// API explorer view
app.get('/api/docs', isCKAuthenticated, function (req, res) { // API explorer
  res.render('api.ejs')
})

// Logout success
app.get('/success/logout', isCKAuthenticated, function (req, res) {
  res.status(200);
  res.render('notices/generic-msg.ejs', { msgTitle: "Logged out", msgBody: "Successfully logged out. <a href='/'>Homepage</a>", username: 'Goodbye' })
});

// Handle API/Forms/Classes etc
app.use((req, res, next) => {
  if (req.url.startsWith("/api/app")) {
    isCKAuthenticated(req, res, () => {
      // If authenticated, then use codesRouter
      return appRouter(req, res, next);
    });
  } else {
    next();
  }
});

var apiRouter = require('./routes/api/api');

// Handle public API (including Auth and Submissions)
app.use((req, res, next) => {
  if (req.url.startsWith("/api/")) {
    isCKAuthenticated(req, res, () => {
      // If authenticated, then use apiRouter
      return apiRouter(req, res, next);
    });
  } else {
    next();
  }
});

// Handle login
app.use((req, res, next) => {
  if (req.url.startsWith("/login")) {
    // Requires moderator permissions
    secureRoute.auth("account", req, res, () => {
      return accountRouter(req, res, next);
    });
  } else {
    next();
  }
});

// Handle management
app.use((req, res, next) => {
  if (req.url.startsWith("/manage")) {
    // Requires moderator permissions
    secureRoute.auth("mod", req, res, () => {
      return manageRouter(req, res, next);
    });
  } else {
    next();
  }
});

// Account and AutoCheckin
app.use((req, res, next) => {
  //isCKAuthenticated(req, res, () => {
  if (req.url.startsWith("/account")) {
    secureRoute.auth("account", req, res, () => {
      // If authenticated, then do account info
      return accountRouter(req, res, next);
    });
  } else if (req.url.startsWith("/auto")) {
    secureRoute.auth("autocheckin", req, res, () => {
      // If authenticated, then do AutoCheckin handler
      return autoRouter(req, res, next);
    });
  } else {
    next();
  }
  //});
});

// Codes History webview
app.get('/history', isCKAuthenticated, function (req, res) {
  res.render('history/history.ejs', { username: req.username })
});

// Homepage (app.js)
app.get('/', isCKAuthenticated, function (req, res) {
  //console.log(`Elapsed_${req.url}: ${req.timePassed()} ms (Start of appRouter)`);
  return appRouter(req, res);
});

// 404
app.get('*', isCKAuthenticated, function (req, res) {
  res.status(404);
  res.render('notices/generic-msg.ejs', { msgTitle: "404", msgBody: "Chances are the <b>link is correct</b>, we just haven't built the page yet. <a href='/'>Homepage</a>", username: req.username })
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  const formattedStack = err.stack.replace(/\n/g, '<br>');
  res.status(500);
  res.render('notices/generic-msg.ejs', { msgTitle: "Error with CheckOut", msgBody: formattedStack, username: "Error" })
});

// // Start server (removed with ws addition)
// app.listen(port, () => {
//   console.log(`checkin listening on port ${port}!`);
// });

// Start server
server.listen(port, () => {
  if (process.env.CHK_SRV == "PROD") {
    console.log(`Production CheckOut ${process.env.CHK_SRV}:${port} Backend-${process.env.CHK_PROD_ID} initialized!`);
  } else if (process.env.CHK_SRV == "AUTO") {
    console.log(`Production AutoCheckin ${process.env.CHK_SRV} running on port ${port}`);
  } else {
    console.log(`CheckOut development ${process.env.CHK_SRV} running on localhost:${port}`);
  }
});

// Removed with WS addition
//module.exports = {app};
