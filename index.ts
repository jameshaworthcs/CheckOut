/// <reference types="node" />

// Import Node and NPM modules
import express from 'express';
import { Request, Response, NextFunction } from 'express';
import * as http from 'http';
import { json, urlencoded } from 'body-parser';
import cookieParser from 'cookie-parser';
import * as XXH from 'xxhashjs';
import * as path from 'path';
import compression from 'compression';
import helmet from 'helmet';
import * as dotenv from 'dotenv';
import morgan from 'morgan';
import session from 'express-session';
import mysqlSession from 'express-mysql-session';
import { minify } from 'html-minifier-terser';
import moment from 'moment';

declare const __dirname: string;
declare const process: any;

// Configure environment variables
dotenv.config({ path: '.env.local' });

// Type definitions and interfaces

// Extend Express's Request to include additional properties used in the app
interface AppRequest extends Request {
  useremail?: string | null;
  userState?: string;
  apitoken?: string;
  // sessionID is provided by Express
  userData?: {
    beta?: boolean;
    development?: boolean;
    username?: string;
    theme?: string;
    moderator?: boolean;
    sysop?: boolean;
    checkinReport?: any;
  };
  username?: string;
  sync?: {
    inst?: string;
    yr?: string;
    crs?: string;
    themeID?: string;
  };
  switchSWW?: boolean;
  bedtime?: boolean;
  dayStart?: string;
  dayEnd?: string;
  christmas?: string;
  authReq?: boolean;
  undoEnable?: boolean;
  boycottState?: boolean;
  boycottMsg?: string;
  boycottLink?: string;
  ipRateLimit?: number;
  rootDomain?: string;
  webStateMsg?: string;
  webStateLink?: string;
  inst?: string;
  yr?: string;
  crs?: string;
  initCourse?: boolean;
  usersIP?: string;
  SpoofedIP?: string;
  consented?: boolean;
  cookieWall?: string;
  qualifiedURL?: string;
  userID?: string | number;
  checkinReport?: any;
  session: any; // Express-session added property
  // Additional properties from Express.Request
  url: string;
  method: string;
  headers: { [key: string]: any };
  originalUrl: string;
  body: any;
  query: any;
  loggedIn?: boolean;
  sessionID: string;
}

// Interface representing a row from the globalapp table
interface GlobalAppRow {
  revID?: number;
  webState?: number;
  bedtimeState?: number;
  dayStart?: string;
  dayEnd?: string;
  authState?: number;
  undoState?: number;
  boycottState?: number;
  boycottMsg?: string;
  boycottLink?: string;
  rateLimit?: number;
  rootDomain?: string;
  webStateMsg?: string;
  webStateLink?: string;
  userInfo?: {
    email?: string | null;
    userstate?: string;
    apikey?: string;
    deviceID?: string;
  };
  [key: string]: any;
}

// Interface for log data structure
interface LogData {
  timestamp: string;
  ip: string;
  spoofed_ip: string | null;
  host: string;
  method: string;
  path: string;
  username: string | null;
  user_id: number | null;
  device_id: string;
  user_agent: string;
  referer: string;
  post_data: string | null;
}

// Monitoring and metrics setup
let totalRequests: number = 0;
let loggedInRequests: number = 0;

// Import database connections and redis functions
const db = require('./databases/database');
const db2 = require('./databases/database-v2');
const {
  redisClient,
  redisStore,
  USE_MYSQL_SESSION_STORE,
  handleShutdown,
  getCache,
  setCache,
} = require('./databases/redis');

// Import route handlers and related modules
const appRouter = require('./routes/app');
const accountRouter = require('./routes/account');
const autoRouter = require('./routes/autocheckin');
const manageRouter = require('./routes/manage/manage');
const secureRoute = require('./routes/secure');
const { getRealIp } = require('./routes/secure');
const { authenticateUser } = require('./routes/api/auth/auth');

const outsource = require('./outsource/outsource');
const apiRouter = require('./routes/api/api');
const { auth } = require('./routes/secure');

// Initialize Express app and configure settings
const app: express.Application = express();
const port: number = process.env.NODE_PORT ? parseInt(process.env.NODE_PORT, 10) : 4000;
app.set('trust proxy', 1);
app.set('view cache', true);

// Enable compression for all responses
app.use(compression({ level: 6 }));

// Environment and feature flag type definitions
const isProduction: boolean = process.env.NODE_ENV !== 'development';
const useMinification: boolean = isProduction;
const useMiniCache: boolean = isProduction;

// Security configuration with helmet, environment aware
// app.use(helmet({
//   contentSecurityPolicy: false,
//   crossOriginEmbedderPolicy: false,
//   crossOriginOpenerPolicy: false,
//   crossOriginResourcePolicy: false,
//   dnsPrefetchControl: false,
//   frameguard: false,
//   hidePoweredBy: true,
//   hsts: process.env.NODE_ENV !== "development" ? {
//     maxAge: 31536000,
//     includeSubDomains: true,
//     preload: true
//   } : false,
//   ieNoOpen: false,
//   noSniff: false,
//   permittedCrossDomainPolicies: false,
//   referrerPolicy: false,
//   xssFilter: true
// }));

// Session configuration using express-session and express-mysql-session
const MySQLStore = mysqlSession(session);
const dbOptions = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  clearExpired: true,
  checkExpirationInterval: 900000,
  expiration: 86400000,
  createDatabaseTable: true,
  schema: {
    tableName: 'sessions',
    columnNames: {
      session_id: 'session_id',
      expires: 'expires',
      data: 'data',
    },
  },
};

// Initialize session store based on availability
let sessionStore;
try {
  const mysqlStoreInstance = new MySQLStore(dbOptions);
  sessionStore = USE_MYSQL_SESSION_STORE ? mysqlStoreInstance : redisStore || mysqlStoreInstance;
  //console.log("Session store initialized:", sessionStore);
} catch (err) {
  console.error('Error initializing session store:', err);
  process.exit(1);
}

const sessionMiddleware = session({
  secret: process.env.SSECRET as string,
  resave: false,
  saveUninitialized: true,
  store: sessionStore,
  name: 'checkout_secure',
  rolling: true,
  proxy: true,
  cookie: {
    maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year
    httpOnly: process.env.NODE_ENV !== 'development',
    secure: process.env.NODE_ENV !== 'development',
  },
});

// Session middleware with path exclusion for static files
app.use((req: AppRequest, res: Response, next: NextFunction): void => {
  if (req.url.startsWith('/static')) {
    return next();
  }
  sessionMiddleware(req, res, next);
});

// Graceful shutdown on SIGINT signal
process.on('SIGINT', async () => {
  await handleShutdown();
  process.exit(0);
});

// Development logging using morgan if in BETA environment
if (process.env.CHK_SRV === 'BETA') {
  app.use(morgan('dev'));
}

// View engine and middleware setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(json());
app.use(urlencoded({ extended: false }));
app.use(cookieParser());

// Create HTTP server for WebSocket support
const server = http.createServer(app);

// Import and setup WebSocket handlers
const wsHandler = require('./routes/api/submit/ws');
wsHandler.setupWebSocket(server);

// Cache configuration for app status
let appStatusCache: GlobalAppRow[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION: number = 10000;

// Utility function to fetch application status from the database with caching
async function appStatus(req: AppRequest): Promise<GlobalAppRow[]> {
  const currentTime: number = Date.now();
  if (appStatusCache && currentTime - cacheTimestamp < CACHE_DURATION) {
    return appStatusCache.map((row: GlobalAppRow) => ({
      ...row,
      userInfo: {
        email: req.useremail,
        userstate: req.userState,
        apikey: req.apitoken,
        deviceID: req.sessionID,
      },
    }));
  }
  return new Promise<GlobalAppRow[]>((resolve, reject) => {
    const sqlQuery: string = 'SELECT * FROM globalapp ORDER BY revID DESC LIMIT 1;';
    db.query(sqlQuery, (err: Error | null, result: GlobalAppRow[]) => {
      if (err) return reject(err);
      result.forEach((row: GlobalAppRow) => {
        row.userInfo = {
          email: req.useremail,
          userstate: req.userState,
          apikey: req.apitoken,
          deviceID: req.sessionID,
        };
      });
      appStatusCache = result;
      cacheTimestamp = currentTime;
      resolve(result);
    });
  });
}

// Function to log requests to the database
async function log(req: AppRequest): Promise<void> {
  try {
    const ip: string = req.usersIP || 'null';
    if (secureRoute.logQ(req)) {
      const logData: LogData = {
        timestamp: moment().format('YYYY-MM-DD HH:mm:ss'),
        ip: ip,
        spoofed_ip: req.SpoofedIP || null,
        host: req.headers['host'] || 'null',
        method: req.method || 'null',
        path: req.originalUrl || 'null',
        username: req.useremail || 'null',
        user_id: req.userID ? Number(req.userID) : null,
        device_id: req.sessionID || 'null',
        user_agent: req.headers['user-agent'] || 'null',
        referer: req.headers['referer'] || 'null',
        post_data: req.body ? JSON.stringify(req.body) : null,
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
const TTL: number = 365 * 24 * 60 * 60;

// Global middleware for additional request processing
app.use(async (req: AppRequest, res: Response, next: NextFunction): Promise<void> => {
  req.userData = {};
  req.userData.beta = process.env.CHK_SRV === 'BETA';
  req.userData.development =
    process.env.NODE_ENV === 'development' && process.env.LOCAL_WARNING !== '0';

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
    setConsentAndCookies(req),
  ]);

  log(req);

  if (process.env.CHK_SRV === 'PROD') {
    try {
      res.setHeader('X-CheckOut-Backend', process.env.CHK_PROD_ID || 'undefined');
    } catch (err) {}
    totalRequests++;
    if (req.loggedIn) {
      loggedInRequests++;
    }
  }
  next();
});

// Override res.render to include HTML minification if enabled
app.use((req: AppRequest, res: Response, next: NextFunction): void => {
  const originalRender = res.render;
  res.render = function (
    view: string,
    options: Record<string, any> = {},
    callback?: (err: Error, html?: string) => void
  ): Response {
    const renderOptions = {
      ...options,
      userData: {
        ...req.userData,
        username: req.username,
        email: req.useremail,
        theme: req.userData?.theme || '2',
        beta: req.userData?.beta || false,
        development: req.userData?.development || false,
        moderator: req.userData?.moderator || false,
        sysop: req.userData?.sysop || false,
      },
    };
    if (!useMinification) {
      return originalRender.call(this, view, renderOptions, callback);
    }
    originalRender.call(
      this,
      view,
      renderOptions,
      async (err: Error, html?: string): Promise<void> => {
        if (err) {
          return callback ? callback(err) : next(err);
        }
        if (!html) {
          return next(new Error('Empty HTML output'));
        }
        const hash: string = `${XXH.h32(0xabcd).update(html).digest().toString(16)}_${req.userID}`;
        if (!redisClient) {
          try {
            const minifiedHtml: string = await minify(html, {
              collapseWhitespace: true,
              removeComments: true,
              removeRedundantAttributes: true,
              removeScriptTypeAttributes: true,
              removeStyleLinkTypeAttributes: true,
              minifyCSS: true,
              minifyJS: true,
            });
            this.send(
              `<!-- Made with ❤️ by the CheckOut team. © 2025. #${hash} -->\n\n${minifiedHtml}`
            );
          } catch (minifyErr) {
            console.error('Minification error:', minifyErr);
            this.send(html); // Fallback to unminified HTML
          }
          return;
        }
        try {
          const cachedMinifiedHtml: string | null = await getCache(hash);
          if (cachedMinifiedHtml && useMiniCache) {
            this.send(cachedMinifiedHtml);
          } else {
            const minifiedHtml: string = await minify(html, {
              collapseWhitespace: true,
              removeComments: true,
              removeRedundantAttributes: true,
              removeScriptTypeAttributes: true,
              removeStyleLinkTypeAttributes: true,
              minifyCSS: true,
              minifyJS: true,
            });
            const finalHtml: string = `<!-- Made with ❤️ by the CheckOut team. © 2025. #${hash} -->\n\n${minifiedHtml}`;
            await setCache(hash, finalHtml, TTL);
            this.send(finalHtml);
          }
        } catch (redisErr) {
          console.error('Redis operation error:', redisErr);
          try {
            const minifiedHtml: string = await minify(html, {
              collapseWhitespace: true,
              removeComments: true,
              removeRedundantAttributes: true,
              removeScriptTypeAttributes: true,
              removeStyleLinkTypeAttributes: true,
              minifyCSS: true,
              minifyJS: true,
            });
            this.send(
              `<!-- Made with ❤️ by the CheckOut team. © 2025. #${hash} -->\n\n${minifiedHtml}`
            );
          } catch (minifyErr) {
            console.error('Minification error:', minifyErr);
            this.send(html); // Fallback to unminified HTML
          }
        }
      }
    );
    return res;
  };
  next();
});

// Caching headers middleware
app.use((req: Request, res: Response, next: NextFunction): void => {
  if (req.url.startsWith('/static')) {
    res.setHeader(
      'Cache-Control',
      'public, max-age=31536000, s-maxage=31536000, only-if-cached, max-stale=86400, stale-while-revalidate=0, stale-if-error=86400, immutable'
    );
  } else {
    res.setHeader(
      'Cache-Control',
      'private, no-cache, max-age=0, s-maxage=0, max-stale=0, stale-while-revalidate=0, stale-if-error=0, must-revalidate, proxy-revalidate'
    );
  }
  next();
});

// Routes setup
app.post('/api/app/block/appeal', async (req: AppRequest, res: Response): Promise<void> => {
  const ip: string = req.usersIP || 'null';
  const reason: any = req.body.reason;
  try {
    await db.query('INSERT INTO appeals (ip, appeal_text, status) VALUES (?, ?, ?)', [
      ip,
      reason,
      'not reviewed',
    ]);
    res.status(201).json({
      success: true,
      msg: 'Appeal created. Please do not submit multiple appeals. An update will be posted here if the ban is not removed upon appeal review.',
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, msg: 'Error creating appeal' });
  }
});

app.get('/api/app/state', async (req: AppRequest, res: Response): Promise<void> => {
  const result: GlobalAppRow[] = await appStatus(req);
  res.json(result);
});

app.use(secureRoute.securityCheck);
app.use(
  express.static('public', {
    extensions: ['html', 'htm'],
    dotfiles: 'allow',
  })
);

app.get('/api/docs', (req: Request, res: Response) => {
  res.render('api.ejs');
});

// Route handlers delegation based on URL
app.use((req: AppRequest, res: Response, next: NextFunction): void => {
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

// Static and informational routes
app.get('/support', (req: Request, res: Response) =>
  res.render('support.ejs', { username: (req as AppRequest).username })
);
app.get('/faq', (req: Request, res: Response) => res.redirect('/learn-faq'));
app.get('/terms', (req: Request, res: Response) => res.redirect('/terms-privacy'));

app.get('/learn-faq', (req: AppRequest, res: Response) => {
  res.render('learn-faq/learn-faq.ejs', {
    authReq: req.authReq,
    ipRateLimit: req.ipRateLimit,
    username: req.username,
  });
});

app.get('/terms-privacy', (req: AppRequest, res: Response) => {
  res.render('terms.ejs', { username: req.username });
});

app.get('/settings', (req: AppRequest, res: Response) => {
  res.render('settings/settings.ejs', { username: req.username });
});

app.get('/data', (req: AppRequest, res: Response) => {
  res.render('data-control/data.ejs', { username: req.username });
});

app.get('/applogin', (req: AppRequest, res: Response) => {
  secureRoute.auth('account', req, res, () => {
    res.render('account/auth/applogin.ejs', { username: req.username });
  });
});

app.get('/success/logout', (req: AppRequest, res: Response) => {
  res.status(200).render('notices/generic-msg.ejs', {
    msgTitle: 'Logged out',
    msgBody: "Successfully logged out. <a href='/'>Homepage</a>",
    username: 'Goodbye',
  });
});

app.get('/history', (req: AppRequest, res: Response) => {
  res.render('history/history.ejs', { username: req.username });
});

app.get('/', (req: AppRequest, res: Response) => appRouter(req, res));

// 404 handler
app.get('*', (req: AppRequest, res: Response) => {
  res.status(404).render('notices/generic-msg.ejs', {
    msgTitle: '404 Page Not Found',
    msgBody:
      "Chances are the <b>link is correct</b>, we just haven't built the page yet. <a href='/'>Homepage</a>",
    username: req.username,
  });
});

// Error handler middleware
app.use((err: Error, req: AppRequest, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).render('notices/generic-msg.ejs', {
    msgTitle: 'Error with CheckOut',
    msgBody:
      process.env.NODE_ENV === 'development'
        ? err.stack.replace(/\n/g, '<br>')
        : "An error occurred while processing your request. Please try again later or <a href='/support'>contact support</a>.",
    username: 'Error',
  });
});

// Start the HTTP server
server.listen(port, () => {
  const env = process.env.CHK_SRV;
  if (env === 'PROD') {
    console.log(
      `Production CheckOut ${env}:${port} Backend-${process.env.CHK_PROD_ID} initialized!`
    );
  } else if (env === 'AUTO') {
    console.log(`Production AutoCheckin ${env} running on port ${port}`);
  } else {
    console.log(`CheckOut development ${env} running on localhost:${port}`);
  }
});

// Additional utility functions

async function fetchAppStatus(req: AppRequest): Promise<void> {
  try {
    const result: GlobalAppRow[] = await appStatus(req);
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
    console.error('Database error in fetchAppStatus:', error);
    throw new Error('Unable to fetch application status');
  }
}

async function setCourseData(req: AppRequest): Promise<void> {
  let inst: string = 'null',
    yr: string = 'null',
    crs: string = 'null';
  if (req.session.course) {
    ({ inst = 'null', yr = 'null', crs = 'null' } = req.session.course);
  }
  req.inst = inst;
  req.yr = yr;
  req.crs = crs;
  req.initCourse = [inst, yr, crs].every((value) => value !== 'null');
  if (req.sync && 'inst' in req.sync && 'crs' in req.sync && 'yr' in req.sync) {
    req.inst = req.sync.inst;
    req.yr = req.sync.yr;
    req.crs = req.sync.crs;
    req.initCourse = [req.inst, req.yr, req.crs].every((value) => value !== 'null');
  }
}

async function setThemeData(req: AppRequest): Promise<void> {
  let theme: string = '2';
  if (req.session?.theme?.id) {
    theme = req.session.theme.id;
  }
  if (req.sync && 'themeID' in req.sync) {
    theme = req.sync.themeID as string;
    req.session.theme = { id: theme };
  }
  if (req.query?.theme) {
    theme = req.query.theme as string;
  }
  if (!req.userData) req.userData = {};
  req.userData.username = req.username;
  req.userData.theme = theme;
}

async function setIPData(req: AppRequest): Promise<void> {
  const extractFirstIP = (header: string | string[] | undefined): string => {
    if (!header) return '1.1.1.1';
    return Array.isArray(header) ? header[0] : header.split(',')[0];
  };
  const forwardedFor = req.headers['x-forwarded-for'];
  req.usersIP =
    (req.headers['cf-connecting-ip'] as string) ||
    getRealIp(forwardedFor as string) ||
    extractFirstIP(forwardedFor);
  req.SpoofedIP = req.usersIP === extractFirstIP(forwardedFor) ? '' : extractFirstIP(forwardedFor);
}

async function setConsentAndCookies(req: AppRequest): Promise<void> {
  if (req.session.consent) {
    req.consented = req.session.consented;
  } else {
    req.consented = false;
  }
  req.cookieWall = 'deprecated';
}

async function authenticateAndSetUserData(req: AppRequest): Promise<void> {
  await authenticateUser(req);
  if (typeof req.checkinReport !== 'undefined') {
    if (!req.userData) req.userData = {};
    req.userData.checkinReport = req.checkinReport;
  }
  if (req.userState === 'sysop') {
    if (!req.userData) req.userData = {};
    req.userData.sysop = true;
  }
  if (req.userState && (req.userState.includes('sysop') || req.userState.includes('moderator'))) {
    if (!req.userData) req.userData = {};
    req.userData.moderator = true;
  }
}
