const bannedAgents = ['python-reeeeeeequests'];
const subdomainRedirects = ['about', 'www'];
const requestTimestamps = {}; // Stores timestamps of requests for rate limiting
var db = require('../databases/database.ts');
const NodeCache = require('node-cache');

// Global toggle for rate limiting
const RATE_LIMIT_ENABLED = true; //= process.env.RATE_LIMIT_ENABLED !== 'false';

// Initialize caches
const bannedIPCache = new NodeCache({ stdTTL: 10 }); // Cache for 10 seconds
const permissionsCache = new NodeCache({ stdTTL: 10 }); // Cache for 10 seconds
const ratelimitCache = new NodeCache({ stdTTL: 120 }); // Cache for 120 seconds to handle sliding windows

// Helper function to get rate limit from permissions
const getRateLimit = (permissionResults) => {
  if (!Array.isArray(permissionResults) || permissionResults.length === 0) return 1000; // Default rate limit
  const limits = permissionResults.map((p) => p.ratelimit);
  const unlimitedExists = limits.some((limit) => limit === 0);
  if (unlimitedExists) return 0;
  return Math.max(...limits);
};

// Helper function to check and update rate limit using sliding window
const checkRateLimit = (ip, limit) => {
  // Skip rate limiting if disabled
  if (!RATE_LIMIT_ENABLED) return { limited: false, count: 0 };

  // Skip if no limit
  if (limit === 0) return { limited: false };

  const now = Date.now();
  const windowMs = 60000; // 1 minute in milliseconds
  const cacheKey = `ratelimit:${ip}`;

  // Get or initialize window data
  let data = ratelimitCache.get(cacheKey) || { count: 0, totalCount: 0, timestamp: now };

  // Calculate sliding window
  const elapsedMs = now - data.timestamp;
  if (elapsedMs >= windowMs) {
    // Window has completely passed, reset counter
    data = { count: 1, totalCount: 1, timestamp: now };
  } else {
    // For rapid requests, increment total count but keep the timestamp
    if (elapsedMs < 1000) {
      // If requests are within 1 second
      data = {
        count: data.count + 1,
        totalCount: data.totalCount + 1,
        timestamp: data.timestamp, // Keep the original timestamp
      };
    } else {
      // Normal sliding window for requests more than 1 second apart
      const weight = (windowMs - elapsedMs) / windowMs;
      const oldCount = Math.floor(data.count * weight);
      data = {
        count: oldCount + 1,
        totalCount: data.totalCount + 1,
        timestamp: now,
      };
    }
  }

  // Store updated data
  ratelimitCache.set(cacheKey, data);

  return {
    limited: data.count > limit,
    count: data.count,
    total: data.totalCount,
  };
};

// Utility function to perform database queries
const queryDatabase = (query, params) => {
  return new Promise((resolve, reject) => {
    db.query(query, params, (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });
};

// Check if IP is banned
const checkBannedIP = async (ip) => {
  const cachedResult = bannedIPCache.get(ip);
  if (cachedResult) {
    return cachedResult;
  }
  const query = 'SELECT * FROM banned_ips WHERE ip = ?';
  const results = await queryDatabase(query, [ip]);
  bannedIPCache.set(ip, results);
  return results;
};

// Check permissions
const checkPermissions = async (userStates) => {
  const userStatesArray = userStates.split(',').map((state) => state.trim());
  const cacheKey = userStatesArray.sort().join(',');

  const cachedResult = permissionsCache.get(cacheKey);
  if (cachedResult) {
    return cachedResult;
  }

  const placeholders = userStatesArray.map(() => '?').join(',');
  const query = `SELECT * FROM perms WHERE userstate IN (${placeholders})`;

  const results = await queryDatabase(query, userStatesArray);
  permissionsCache.set(cacheKey, results);
  return results;
};

// Main security check middleware
const securityCheck = async (req, res, next) => {
  try {
    const ip = req.usersIP;
    const requestUrl = req.originalUrl;

    // For static files, use anon permissions but with fixed rate limit
    if (requestUrl.startsWith('/static')) {
      req.userState = 'anon';
      const rateLimitResult = checkRateLimit(ip, 1000); // Fixed rate limit for static files

      if (rateLimitResult.limited) {
        return res.status(429).json({
          success: false,
          ratelimit: true,
          msg: `Rate limit exceeded: ${rateLimitResult.count}/1000 requests in the last minute for static files.`,
          limit: 1000,
          current: rateLimitResult.count,
          total: rateLimitResult.total,
        });
      }
      return next();
    }

    // Fetch permissions once at the start
    const permissionResults = await checkPermissions(req.userState || 'anon');

    // Rate limiting check
    const rateLimit = getRateLimit(permissionResults);
    const rateLimitResult = checkRateLimit(ip, rateLimit);

    if (rateLimitResult.limited) {
      if (requestUrl.startsWith('/api') || requestUrl.startsWith('/manage/api')) {
        return res.status(429).json({
          success: false,
          ratelimit: true,
          msg: `Rate limit exceeded: ${rateLimitResult.count}/${rateLimit} requests in the last minute. Please wait or contact support if you need a higher limit.`,
          limit: rateLimit,
          current: rateLimitResult.count,
          total: rateLimitResult.total,
        });
      }
      return res.status(429).render('notices/generic-msg.ejs', {
        msgTitle: 'Rate Limit Exceeded',
        msgBody: `You have made ${rateLimitResult.count} requests in the last minute, exceeding your limit of ${rateLimit} requests per minute. Please try again later or contact support if you need a higher limit.`,
        username: req.username,
      });
    }

    const allowedServices = permissionResults.flatMap((result) =>
      Array.isArray(result.routes) ? result.routes : []
    );
    const isSysop = allowedServices.includes('sysop');

    // Check 0: Webstate and Boycott checks
    if (!isSysop) {
      if (req.switchSWW === true) {
        const errorCodeSWW = 200;
        return res.status(errorCodeSWW).render('notices/sww.ejs', {
          errorCodeSWW,
          msg: req.webStateMsg,
          link: req.webStateLink,
        });
      }

      if (req.boycottState === true) {
        return res.render('boycott.ejs', {
          boycottMsg: req.boycottMsg,
          boycottLink: req.boycottLink,
        });
      }
    }

    // Check 0.1: Banned user check
    if (req.userState === 'banned') {
      if (!requestUrl.startsWith('/api/app/')) {
        return res.render('banned.ejs', { reason: 'unknown', routes: 'all', expiry: 'none' });
      } else if (requestUrl.startsWith('/api/app/submit')) {
        return res.status(403).json({
          success: false,
          message: 'You are banned from submitting codes. Visit /banview for more details.',
        });
      } else {
        return res.status(403).json({
          success: false,
          banned: true,
          help: 'Visit /banview in a browser to see more details.',
          msg: `Visit <a href="/banview">here</a> to view your ban.`,
        });
      }
    }

    // Check 0.2: Banned IP
    const bannedIPResults = await checkBannedIP(ip);
    if (bannedIPResults.length > 0) {
      const bannedRoutes = JSON.parse(bannedIPResults[0].routes);
      const expiryDateTime = new Date(bannedIPResults[0].ban_expiry);
      const currentDateTime = new Date();

      if (
        (bannedRoutes.some((route) => requestUrl.startsWith(route)) ||
          requestUrl.startsWith('/banview')) &&
        currentDateTime < expiryDateTime
      ) {
        // logger.info('BAN-REQ', {
        //   timestamp: moment().format(),
        //   ip: ip,
        //   spoofedIP: req.SpoofedIP,
        //   path: req.originalUrl,
        //   username: req.useremail,
        //   userAgent: req.headers['user-agent'],
        //   postData: req.body,
        //   blockReason: bannedIPResults[0].reason,
        //   blockRoutes: bannedRoutes,
        //   blockExpiry: expiryDateTime
        // });

        if (!requestUrl.startsWith('/api')) {
          return res.render('banned.ejs', {
            reason: bannedIPResults[0].reason,
            routes: bannedRoutes,
            expiry: expiryDateTime,
          });
        } else if (requestUrl.startsWith('/api/app/options')) {
          return res.status(403).json({
            success: false,
            message: 'You are banned from submitting codes. Visit /banview for more details.',
          });
        } else {
          return res.status(403).json({
            success: false,
            banned: true,
            help: 'Visit /banview in a browser to see more details.',
            msg: `Visit <a href="/banview">here</a> to view your ban.`,
            message: 'Visit <a href="/banview">here</a> to view your ban.',
          });
        }
      }
    }

    // Check 2: Redirect for Subdomains
    if (
      req.headers.host !== req.rootDomain &&
      subdomainRedirects.includes(req.headers.host.split('.')[0])
    ) {
      return res.redirect(req.qualifiedURL + '' + req.url);
    }

    // Check 3: Banned User Agents
    if (
      req.headers['user-agent'] &&
      bannedAgents.some((item) => req.headers['user-agent'].includes(item))
    ) {
      console.log('Prevented banned user agent.');
      return res.status(403).send('This sender cannot access this method. Please contact support!');
    }

    // Check 4: Rate Limiting (Specific IP) - Off
    if (ip === '999.999.999.999') {
      const currentTimestamp = Date.now();
      const pastRequests = requestTimestamps[ip] || [];
      const recentRequests = pastRequests.filter(
        (timestamp) => currentTimestamp - timestamp < 60000
      );

      if (recentRequests.length >= 1) {
        console.log('144.32.240.45 rate limited');
        return res.status(429).send('429 Too many requests');
      } else {
        console.log('144.32.240.45 allowed');
      }

      requestTimestamps[ip] = [...pastRequests, currentTimestamp];
      console.log(requestTimestamps);
    }

    // Used for following functions
    const excludedPaths = [
      '/api/app/state',
      '/api/auth',
      '/login',
      '/api/welcome/',
      '/api/course-select/',
      '/api/app/onboarding',
      '/api/app/find',
      '/terms-privacy',
      '/learn-faq',
      '/api/app/hash',
      '/static/',
      '/manage',
      '/robots.txt',
      '/support',
      '/applogin'
    ];
    const adminPaths = ['/admin', '/tklog', '/analytics', '/manage'];

    // Check 5: Global Auth Requirement
    if (req.authReq && !excludedPaths.some((path) => req.url.startsWith(path))) {
      const service = 'account';

      if (permissionResults.length > 0) {
        if (!allowedServices.some((route) => service === route)) {
          let msg;

          if (req.userState !== 'anon') {
            msg = `Your account, <i>${req.useremail}</i>, does not have the required permissions (${service}). Login to a different account with the correct permissions below or view your <a href='/account'>account</a>`;
          } else if (req.url.startsWith('/auto')) {
            msg = 'Sign in with your .ac.uk email to use AutoCheckin.';
          } else if (adminPaths.some((path) => req.url.startsWith(path))) {
            msg = 'Sign in to access admin features.';
          } else if (!req.authReq) {
            msg =
              'Sign in with your .ac.uk email to save your history, personalize CheckOut, and use AutoCheckin.';
          } else {
            msg = 'An account is required to use Beta CheckOut';
          }

          return res.render('account/auth/login.ejs', {
            intent: req.originalUrl,
            guestState: false,
            msg,
            username: req.username,
            loginMethod: 'google', // Default to Google login
            googleClientId: process.env.GOOGLE_CLIENT
          });
        }
      }
    }

    // Check 6: Consent screen & course selection

    const excludedConsentPaths = [
      '/manifest.json',
      '/data',
      '/api/',
      '/terms',
      '/learn-faq',
      '/faq',
      '/static/',
      '/manage',
      '/robots.txt',
      '/applogin',
      '/login',
      '/sunset',
      '/' // All pages for sunset
    ];
    if (
      req.consented == false &&
      !excludedConsentPaths.some((path) => req.url.startsWith(path)) &&
      req.userState != 'sysop' &&
      req.userState != 'bot'
    ) {
      return res.render('consent-course/consent.ejs', { username: req.username });
    }

    // Check 7: Bedtime and Christmas blocks
    const currentTime = new Date();

    // Convert HH:MM strings to Date objects for today
    const [startHour, startMin] = req.dayStart.split(':').map(Number);
    const [endHour, endMin] = req.dayEnd.split(':').map(Number);

    const todayStart = new Date(currentTime);
    todayStart.setHours(startHour, startMin, 0);

    const todayEnd = new Date(currentTime);
    todayEnd.setHours(endHour, endMin, 0);

    if (
      ((req.bedtime === true && (currentTime < todayStart || currentTime > todayEnd)) ||
        req.christmas === '1') &&
      !isSysop
    ) {
      const allowedPaths = [
        ...excludedPaths,
        '/auto',
        '/manage',
        '/account',
        '/api',
        '/settings',
        '/data',
        '/applogin'
      ];

      if (!allowedPaths.some((path) => req.url.startsWith(path))) {
        const permsResults = await checkPermissions(req.userState);
        let msg = '';
        let features = [];

        // Build message based on permissions and login status
        if (req.loggedIn) {
          if (permsResults.length > 0) {
            //const allowedServices = permsResults.flatMap(result => JSON.parse(result.routes));
            if (allowedServices.includes('autocheckin'))
              features.push('<a href="/auto">AutoCheckin</a>');
            if (allowedServices.includes('mod'))
              features.push('<a href="/manage">admin services</a>');
            msg =
              features.length > 0
                ? `While CheckOut is asleep, you still have access to: ${features.join(' and ')}`
                : 'Your account does not have access to any special features while CheckOut is asleep.';
          }
        } else {
          msg =
            '<a href="/login?login_redirect=index&source=bedtime">Login</a> to check if you have access to AutoCheckin or admin services while CheckOut is asleep.';
        }

        return res.render('bedtime-christmas/bedtime.ejs', {
          msg,
          username: req.username,
          loggedIn: req.loggedIn,
          dayStart: req.dayStart,
        });
      }
    }

    // Temp emergency block

    // if (req.usersIP != 'example') {
    //   return res.render('notices/generic-msg.ejs', { msgTitle: "Error", msgBody: "CheckOut not available while a security issue is being worked on.", username: 'Error' })
    // }

    // All checks passed
    next();
  } catch (error) {
    next(error);
  }
};

function auth(service, req, res, next) {
  checkPermissions(req.userState)
    .then((results) => {
      if (results.length > 0) {
        // Combine routes from all permission results
        const allowedServices = results.flatMap((result) =>
          Array.isArray(result.routes) ? result.routes : []
        );

        if (!allowedServices.some((route) => service === route)) {
          let msg;
          if (
            (req.url.startsWith('/api/') || req.url.startsWith('/manage/api/')) &&
            !req.url.startsWith('/api/docs')
          ) {
            return res
              .status(403)
              .json({
                success: false,
                auth_error: true,
                msg: `Account with permission '${service}' required for this action. Visit the FAQ for instructions on how to overcome this error.`,
              });
          } else if (req.userState.includes('anon') || req.url.startsWith('/auto')) {
            if (req.url.startsWith('/f9h4e09eh')) {
              msg = 'Sign in with your .ac.uk email to use your account.';
            } else if (req.url.startsWith('/auto') && typeof req.query.login === 'undefined') {
              return res.render('autocheckin/waitlist.ejs');
            } else if (req.url.startsWith('/auto')) {
              msg = 'Sign in to use AutoCheckin.';
            } else if (req.url.startsWith('/manage')) {
              msg = 'Sign in to access admin features.';
            } else if (req.url.startsWith('/applogin')) {
              msg = 'Sign in to the mobile app.';
            } else if (req.url.startsWith('/secure/hostedapps/service-reauth')) {
              msg = 'Sign in to the data download service.';
            } else {
              msg =
                'Sign in with your .ac.uk email to save your history, personalise CheckOut and use AutoCheckin.';
            }
          } else if (
            req.userState.includes('moderator') &&
            service === 'sysop' &&
            req.url.startsWith('/manage')
          ) {
            // Handle management area moderator limitations
            msg = `Your moderator account (<i>${req.useremail}</i>) cannot access this area of the management tools. <a href='/manage'>Click here</a> to return to the management menu.`;
            res.status(403);
            return res.render('notices/generic-msg.ejs', {
              msgTitle: 'Access not allowed',
              msgBody: msg,
              username: req.username,
            });
          } else {
            msg = `Your account, <i>${req.useremail}</i>, does not have the required permissions (${service}). Login to a different account with the correct permissions below or view your <a href='/account'>account</a>`;
          }

          // Get login method from URL path or query parameter
          let loginMethod = 'google';
          const validMethods = ['google', 'email', 'apikey', 'selection'];

          // Check URL path first (e.g., /login/apikey)
          const urlParts = req.path.split('/');
          const methodFromPath = urlParts[urlParts.length - 1];
          if (validMethods.includes(methodFromPath)) {
            loginMethod = methodFromPath;
          } else {
            // Fall back to query parameter
            loginMethod = validMethods.includes(req.query.method) ? req.query.method : 'google';
          }

          return res.render('account/auth/login', {
            intent: req.originalUrl,
            guestState: false,
            msg,
            username: req.username,
            loginMethod,
            googleClientId: process.env.GOOGLE_CLIENT
          });
        }
      } else {
        res.json({ success: false, msg: 'Auth error' });
      }
      next();
    })
    .catch((err) => {
      console.log(err);
      return res.render('notices/generic-msg.ejs', {
        msgTitle: 'Error',
        msgBody:
          'CheckOut not available while a security issue is being worked on. Please contact an admin if this issue persists.',
        username: 'Error',
      });
    });
}

function getRealIp(xForwardedFor) {
  if (!xForwardedFor) {
    return null;
  }

  const ipChain = xForwardedFor.split(',').map((ip) => ip.trim());

  // Determine if IPv4 or IPv6 based on the first IP in the chain
  const firstIp = ipChain[0];
  const isIPv6 = firstIp.includes(':');

  // Define prefixes for IPv4 and IPv6 proxies
  const ipv4ProxyPrefix = '34.';
  const ipv6ProxyPrefix = '2600:';

  // Find the index of the first proxy IP
  let firstProxyIndex = null;
  for (let i = 0; i < ipChain.length; i++) {
    if (
      (isIPv6 && ipChain[i].startsWith(ipv6ProxyPrefix)) ||
      (!isIPv6 && ipChain[i].startsWith(ipv4ProxyPrefix))
    ) {
      firstProxyIndex = i;
      break;
    }
  }

  // Ensure a proxy IP was found and there's an IP before it
  if (firstProxyIndex !== null && firstProxyIndex > 0) {
    return ipChain[firstProxyIndex - 1];
  } else {
    // If no valid IP found, return null
    return null;
  }
}

function logQ(req) {
  // if (req.headers['user-agent'] != "Mozilla/5.0 (compatible; ProjectShield-UrlCheck; +http://g.co/projectshield)") {
  //   return true } else { return false }
  return true;
}

module.exports = { getRealIp, securityCheck, logQ, auth, checkPermissions };
