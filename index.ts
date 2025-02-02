// Core dependencies
const express = require("express");
const http = require('http');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const XXH = require('xxhashjs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

// Monitoring and metrics
const io = require('@pm2/io');
let totalRequests = 0;
let loggedInRequests = 0;
const loggedInPercentage = io.metric({
  name: 'Logged In Percentage',
  value: () => totalRequests === 0 ? 0 : (loggedInRequests / totalRequests) * 100,
});

// Database connections
const db = require('./databases/database');
const db2 = require('./databases/database-v2');
const { redisClient, redisStore, USE_MYSQL_SESSION_STORE, handleShutdown, getCache, setCache } = require('./databases/redis');

// Route handlers
const appRouter = require('./routes/app');
const accountRouter = require('./routes/account');
const autoRouter = require('./routes/autocheckin');
const manageRouter = require('./routes/manage/manage');
const secureRoute = require('./routes/secure');
const { authenticateUser } = require('./routes/api/auth/auth');
const outsource = require('./outsource/outsource');
const apiRouter = require('./routes/api/api');
const { auth } = require('./routes/secure');

// Initialize Express app
const app = express();
const port = process.env.NODE_PORT || 4000;
app.set('trust proxy', 1);
app.set('view cache', true);

// Session configuration
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);

const dbOptions = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
};

const mysqlStore = new MySQLStore(dbOptions);
const sessionStore = USE_MYSQL_SESSION_STORE ? mysqlStore : redisStore || mysqlStore;

// Session middleware - with path exclusion for static files
app.use((req, res, next) => {
  if (req.url.startsWith('/static')) {
    return next();
  }
  
  session({
    secret: process.env.SSECRET,
    resave: false,
    saveUninitialized: true,
    store: sessionStore,
    name: "checkout_secure",
    rolling: true,
    cookie: {
      maxAge: 365 * 24 * 60 * 60 * 1000,
      httpOnly: process.env.NODE_ENV !== "development",
      secure: process.env.NODE_ENV !== "development"
    },
  })(req, res, next);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await handleShutdown();
  process.exit(0);
});

// Development logging
if (process.env.CHK_SRV === "BETA" || true) {
  const loggerM = require('morgan');
  app.use(loggerM('dev'));
}

// View engine and middleware setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());

// Create HTTP server for WebSocket support
const server = http.createServer(app);

// Import and setup WebSocket handlers
const wsHandler = require('./routes/api/submit/ws');
wsHandler.setupWebSocket(server);

// Cache configuration
let appStatusCache = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 10000;

// Utility functions
async function appStatus(req) {
  const currentTime = Date.now();

  if (appStatusCache && (currentTime - cacheTimestamp) < CACHE_DURATION) {
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

      await db2.execute(sql, Object.values(logData));
    }
  } catch (error) {
    console.error('Error logging to database:', error);
  }
}

// HTML minification configuration
const { minify } = require('html-minifier');
const useMinification = process.env.NODE_ENV !== 'development';
const useMiniCache = process.env.NODE_ENV !== 'development';
const TTL = 365 * 24 * 60 * 60;

// Global middleware
app.use(async (req, res, next) => {
  try {
    req.userData = {};
    req.userData.beta = process.env.CHK_SRV === "BETA";
    req.userData.development = process.env.NODE_ENV === "development" && process.env.LOCAL_WARNING !== "0";

    // For static files, set minimal required properties and skip heavy processing
    if (req.url.startsWith('/static')) {
      req.userState = 'anon';
      req.useremail = null;
      req.apitoken = null;
      req.loggedIn = false;
      return next();
    }

    await fetchAppStatus(req);
    await authenticateAndSetUserData(req);
    await Promise.all([
      setCourseData(req),
      setThemeData(req),
      setIPData(req),
      setConsentAndCookies(req)
    ]);

    log(req);

    if (process.env.CHK_SRV === "PROD") {
      try {
        res.setHeader('X-CheckOut-Backend', process.env.CHK_PROD_ID || 'undefined');
      } catch (err) {}
      
      totalRequests++;
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

// Render middleware
app.use((req, res, next) => {
  const originalRender = res.render;

  /** @type {function(string, {userData?: any, [key: string]: any}, function): void} */
  res.render = function(view, options = {}, callback) {
    // Create a new options object that includes userData
    const renderOptions = {
      ...options,
      userData: {
        ...req.userData,
        username: req.username,
        theme: req.userData?.theme || '2',
        beta: req.userData?.beta || false,
        development: req.userData?.development || false,
        moderator: req.userData?.moderator || false,
        sysop: req.userData?.sysop || false
      }
    };

    if (!useMinification) {
      return originalRender.call(this, view, renderOptions, callback);
    }

    originalRender.call(this, view, renderOptions, async (err, html) => {
      if (err) {
        return callback ? callback(err) : next(err);
      }

      const hash = `${XXH.h32(0xABCD).update(html).digest().toString(16)}_${req.userID}`;

      if (!redisClient) {
        const minifiedHtml = minify(html, {
          collapseWhitespace: true,
          removeComments: true,
          removeRedundantAttributes: true,
          removeScriptTypeAttributes: true,
          removeStyleLinkTypeAttributes: true,
          minifyCSS: true,
          minifyJS: true,
        });

        return this.send(`<!-- Made with ❤️ by the CheckOut team. © 2025. #${hash} -->\n\n${minifiedHtml}`);
      }

      try {
        const cachedMinifiedHtml = await getCache(hash);

        if (cachedMinifiedHtml && useMiniCache) {
          this.send(cachedMinifiedHtml);
        } else {
          const minifiedHtml = minify(html, {
            collapseWhitespace: true,
            removeComments: true,
            removeRedundantAttributes: true,
            removeScriptTypeAttributes: true,
            removeStyleLinkTypeAttributes: true,
            minifyCSS: true,
            minifyJS: true,
          });

          const finalHtml = `<!-- Made with ❤️ by the CheckOut team. © 2025. #${hash} -->\n\n${minifiedHtml}`;
          await setCache(hash, finalHtml, TTL);
          this.send(finalHtml);
        }
      } catch (redisErr) {
        console.error("Redis operation error:", redisErr);
        const minifiedHtml = minify(html, {
          collapseWhitespace: true,
          removeComments: true,
          removeRedundantAttributes: true,
          removeScriptTypeAttributes: true,
          removeStyleLinkTypeAttributes: true,
          minifyCSS: true,
          minifyJS: true,
        });

        this.send(`<!-- Made with ❤️ by the CheckOut team. © 2025. #${hash} -->\n\n${minifiedHtml}`);
      }
    });
  };

  next();
});

// Caching headers
app.use((req, res, next) => {
  if (req.url.startsWith('/static')) {
    res.setHeader('Cache-Control', 'public, max-age=31536000, s-maxage=31536000, only-if-cached, max-stale=86400, stale-while-revalidate=0, stale-if-error=86400, immutable');
  } else {
    res.setHeader('Cache-Control', 'private, no-cache, no-store, max-age=0, s-maxage=0, max-stale=0, stale-while-revalidate=0, stale-if-error=0, must-revalidate, proxy-revalidate');
  }
  next();
});

// Routes
app.post('/api/app/block/appeal', async (req, res) => {
  const ip = req.usersIP;
  const reason = req.body.reason;
  try {
    await db.query(
      'INSERT INTO appeals (ip, appeal_text, status) VALUES (?, ?, ?)',
      [ip, reason, "not reviewed"]
    );
    res.status(201).json({
      success: true,
      msg: 'Appeal created. Please do not submit multiple appeals. An update will be posted here if the ban is not removed upon appeal review.'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({success: false, msg: 'Error creating appeal'});
  }
});

// API routes
app.get('/api/app/state', async (req, res) => {
  const result = await appStatus(req);
  res.json(result);
});

app.use(secureRoute.securityCheck);
app.use(express.static('public', {
  extensions: ['html', 'htm'],
  dotfiles: 'allow',
}));

// Route handlers
app.use((req, res, next) => {
    if (req.url.startsWith('/api/app')) {
        return appRouter(req, res, next);
    }
    
    if (req.url.startsWith('/api')) {
        return apiRouter(req, res, next);
    }
    
    if (req.url.startsWith('/login')) {
        return auth('account', req, res, () => {
            accountRouter(req, res, next);
        });
    }
    
    if (req.url.startsWith('/manage')) {
        return auth('mod', req, res, () => {
            manageRouter(req, res, next);
        });
    }
    
    if (req.url.startsWith('/account')) {
        return auth('account', req, res, () => {
            accountRouter(req, res, next);
        });
    }
    
    if (req.url.startsWith('/auto')) {
        return auth('autocheckin', req, res, () => {
            autoRouter(req, res, next);
        });
    }
    
    next();
});

// Static routes
app.get('/support', (req, res) => res.redirect('mailto:checkout@jemedia.xyz'));
app.get('/faq', (req, res) => res.redirect('/learn-faq'));
app.get('/terms', (req, res) => res.redirect('/terms-privacy'));

app.get('/learn-faq', (req, res) => {
  res.render('learn-faq/learn-faq.ejs', {
    authReq: req.authReq,
    ipRateLimit: req.ipRateLimit,
    username: req.username
  });
});

app.get('/terms-privacy', (req, res) => {
  res.render('terms.ejs', { username: req.username });
});

app.get('/settings', (req, res) => {
  res.render('settings/settings.ejs', { username: req.username });
});

app.get('/data', (req, res) => {
  res.render('data-control/data.ejs', { username: req.username });
});

app.get('/api/docs', (req, res) => {
  res.render('api.ejs');
});

app.get('/success/logout', (req, res) => {
  res.status(200).render('notices/generic-msg.ejs', {
    msgTitle: "Logged out",
    msgBody: "Successfully logged out. <a href='/'>Homepage</a>",
    username: 'Goodbye'
  });
});

app.get('/history', (req, res) => {
  res.render('history/history.ejs', { username: req.username });
});

app.get('/', (req, res) => appRouter(req, res));

// 404 handler
app.get('*', (req, res) => {
  res.status(404).render('notices/generic-msg.ejs', {
    msgTitle: "404 Page Not Found",
    msgBody: "Chances are the <b>link is correct</b>, we just haven't built the page yet. <a href='/'>Homepage</a>",
    username: req.username
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('notices/generic-msg.ejs', {
    msgTitle: "Error with CheckOut",
    msgBody: err.stack.replace(/\n/g, '<br>'),
    username: "Error"
  });
});

// Start server
server.listen(port, () => {
  const env = process.env.CHK_SRV;
  if (env === "PROD") {
    console.log(`Production CheckOut ${env}:${port} Backend-${process.env.CHK_PROD_ID} initialized!`);
  } else if (env === "AUTO") {
    console.log(`Production AutoCheckin ${env} running on port ${port}`);
  } else {
    console.log(`CheckOut development ${env} running on localhost:${port}`);
  }
});

// Utility functions
async function fetchAppStatus(req) {
  try {
    let result = await appStatus(req);

    req.switchSWW = result[0]['webState'] === 1 ? false : true;
    req.bedtime = result[0]['bedtimeState'] === 1;
    req.dayStart = result[0]['dayStart'];
    req.dayEnd = result[0]['dayEnd'];
    req.christmas = '0';
    req.authReq = result[0]['authState'] === 1;
    req.undoEnable = result[0]['undoState'] === 1;
    req.boycottState = result[0]['boycottState'] === 1;
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
}

async function setCourseData(req) {
  if (req.session.course) {
    var { inst = "null", yr = "null", crs = "null" } = req.session.course;
  } else {
    inst = "null";
    yr = "null";
    crs = "null";
  }

  req.inst = inst;
  req.yr = yr;
  req.crs = crs;
  req.initCourse = [inst, yr, crs].every(value => value !== "null");

  if (req.sync && 'inst' in req.sync && 'crs' in req.sync && 'yr' in req.sync) {
    req.inst = req.sync.inst;
    req.yr = req.sync.yr;
    req.crs = req.sync.crs;
    req.initCourse = [req.inst, req.yr, req.crs].every(value => value !== "null");
  }
}

async function setThemeData(req) {
  let theme = '2';

  if (req.session?.theme?.id) {
    theme = req.session.theme.id;
  }

  if (req.sync && 'themeID' in req.sync) {
    theme = req.sync.themeID;
    req.session.theme = { id: theme };
  }

  if (req.query?.theme) {
    theme = req.query.theme;
  }

  req.userData.username = req.username;
  req.userData.theme = theme;
}

async function setIPData(req) {
  const extractFirstIP = (header) => (header ? header.split(',')[0] : '1.1.1.1');
  req.usersIP = req.headers['X-Shield-Client-IP'] || secureRoute.getRealIp(req.headers['x-forwarded-for']) || extractFirstIP(req.headers['x-forwarded-for']);
  req.SpoofedIP = req.usersIP === extractFirstIP(req.headers['x-forwarded-for']) ? '' : extractFirstIP(req.headers['x-forwarded-for']);
}

async function setConsentAndCookies(req) {
  if (req.session.consent) {
    req.consented = req.session.consented;
  } else {
    req.consented = false;
  }
  req.cookieWall = 'deprecated';
}

async function authenticateAndSetUserData(req) {
  await authenticateUser(req);

  if (typeof req.checkinReport !== 'undefined') {
    req.userData.checkinReport = req.checkinReport;
  }
  if (req.userState === "sysop") {
    req.userData.sysop = true;
  }
  if (req.userState && (req.userState.includes("sysop") || req.userState.includes("moderator"))) {
    req.userData.moderator = true;
  }
}

// Mod routes
app.get('/sysHide', (req, res) => {
  secureRoute.auth("mod", req, res, () => {
    const codeID = req.query.codeID;
    const tk = req.query.tk;
    const sqlsysundo = `UPDATE codes SET codeState = "0", codeDesc = "Mod-Rm-${req.userID}" WHERE codeID = ? AND tk = ? LIMIT 1`;
    db.query(sqlsysundo, [codeID, tk], (err, resultsysundo) => {
      if (err) {
        console.log(err);
        res.render("error.ejs");
      } else {
        console.log("Removed submission.", codeID, tk);
        res.json({ "result": "Disabled code", "codeID": codeID });
      }
    });
  });
});

app.get('/sysShow', (req, res) => {
  secureRoute.auth("mod", req, res, () => {
    const codeID = req.query.codeID;
    const tk = req.query.tk;
    const sqlsysundo = `UPDATE codes SET codeState = "1", codeDesc = "Mod-En-${req.userID}" WHERE codeID = ? AND tk = ? LIMIT 1`;
    db.query(sqlsysundo, [codeID, tk], (err, resultsysundo) => {
      if (err) {
        console.log(err);
        res.render("error.ejs");
      } else {
        console.log(req.userID, "enabled code", codeID, tk);
        res.json({ "result": "Enabled code", "codeID": codeID });
      }
    });
  });
});

app.get('/remove', (req, res) => {
  secureRoute.auth("mod", req, res, () => {
    const codeID = req.query.codeID;
    const tk = req.query.tk;
    const sqlremove = `DELETE FROM codes WHERE codeID = ? AND tk = ? LIMIT 1`;
    db.query(sqlremove, [codeID, tk], (err, resultremove) => {
      if (err) {
        console.log(err);
        res.render("error.ejs");
      } else {
        console.log(req.userID, "disabled code", codeID, tk);
        res.json({ "result": "Removed Submission", "codeID": codeID });
      }
    });
  });
});

