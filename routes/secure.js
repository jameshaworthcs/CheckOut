const bannedAgents = ['python-reeeeeeequests'];
const subdomainRedirects = ['about', 'www'];
const requestTimestamps = {}; // Stores timestamps of requests for rate limiting
var db = require('../database');
//const winston = require('winston');
const NodeCache = require('node-cache');
let logFilePath;
if (process.env.NODE_ENV === "development") {
  logFilePath = "dev.log";
} else {
  logFilePath = '/var/lib/checkout/checkout.log';
}
// const logger = winston.createLogger({
//   level: 'info',  // Log 'info' and more critical levels (error, warn)
//   format: winston.format.json(),
//   transports: [
//     new winston.transports.File({ filename: logFilePath })
//   ]
// });

// Initialize caches
const bannedIPCache = new NodeCache({ stdTTL: 10 }); // Cache for 10 seconds
const permissionsCache = new NodeCache({ stdTTL: 30 }); // Cache for 30 seconds

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
  const userStatesArray = userStates.split(',').map(state => state.trim());
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
    const ip = req.usersIP; // Assuming you get the user's IP from elsewhere
    const requestUrl = req.originalUrl;

    // Check 0.1: Banned user check
    if (req.userState === 'banned') {
      if (!requestUrl.startsWith("/api/app/")) {
        return res.render("banned.ejs", { reason: 'unknown', routes: 'all', expiry: 'none' });
      } else if (requestUrl.startsWith("/api/app/submit")) {
        return res.status(403).json({
          success: false,
          message: "You are banned from submitting codes. Visit /banview for more details."
        });
      } else {
        return res.status(403).json({
          success: false,
          banned: true,
          help: "Visit /banview in a browser to see more details.",
          msg: `Visit <a href="/banview">here</a> to view your ban.`
        });
      }
    }

    // Check 0.2: Banned IP
    const bannedIPResults = await checkBannedIP(ip);
    if (bannedIPResults.length > 0) {
      const bannedRoutes = JSON.parse(bannedIPResults[0].routes);
      const expiryDateTime = new Date(bannedIPResults[0].ban_expiry);
      const currentDateTime = new Date();

      if ((bannedRoutes.some(route => requestUrl.startsWith(route)) || requestUrl.startsWith("/banview")) && (currentDateTime < expiryDateTime)) {
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

        if (!requestUrl.startsWith("/api/app/")) {
          return res.render("banned.ejs", { reason: bannedIPResults[0].reason, routes: bannedRoutes, expiry: expiryDateTime });
        } else if (requestUrl.startsWith("/api/app/submit")) {
          return res.status(403).json({
            success: false,
            message: "You are banned from submitting codes. Visit /banview for more details."
          });
        } else {
          return res.status(403).json({
            banned: true,
            help: "Visit /banview in a browser to see more details.",
            msg: `Visit <a href="/banview">here</a> to view your ban.`
          });
        }
      }
    }

    // Check 2: Redirect for Subdomains
    if (req.headers.host !== req.rootDomain && subdomainRedirects.includes(req.headers.host.split('.')[0])) {
      return res.redirect(req.qualifiedURL + "" + req.url);
    }

    // Check 3: Banned User Agents
    if (req.headers['user-agent'] && bannedAgents.some(item => req.headers['user-agent'].includes(item))) {
      console.log("Prevented banned user agent.");
      return res.status(403).send('This sender cannot access this method. Please contact support!');
    }

    // Check 4: Rate Limiting (Specific IP) - Off
    if (ip === "999.999.999.999") {
      const currentTimestamp = Date.now();
      const pastRequests = requestTimestamps[ip] || [];
      const recentRequests = pastRequests.filter(timestamp => currentTimestamp - timestamp < 60000);

      if (recentRequests.length >= 1) {
        console.log("144.32.240.45 rate limited");
        return res.status(429).send('429 Too many requests');
      } else {
        console.log("144.32.240.45 allowed");
      }

      requestTimestamps[ip] = [...pastRequests, currentTimestamp];
      console.log(requestTimestamps);
    }

    // Used for following functions
    const excludedPaths = ["/api/auth", "/api/welcome/", "/api/course-select/", "/api/app/onboarding", "/api/app/find", "/terms-privacy", "/learn-faq", '/api/app/hash', '/static/', '/manage', '/robots.txt'];
    const adminPaths = ["/admin", "/tklog", "/analytics", "/manage"];

    // Check 5: Global Auth Requirement
    if (req.authReq && !excludedPaths.some(path => req.url.startsWith(path))) {
      const permsResults = await checkPermissions(req.userState);
      const service = 'account';

      if (permsResults.length > 0) {
        const allowedServices = JSON.parse(permsResults[0].routes);
        if (!allowedServices.some(route => service === route)) {
          let msg;

          if (req.userState !== 'anon') {
            msg = `Your account, <i>${req.useremail}</i>, does not have the required permissions (${service}). Login to a different account with the correct permissions below or view your <a href='/account'>account</a>`;
          } else if (req.url.startsWith("/auto")) {
            msg = 'Sign in with your .ac.uk email to use AutoCheckin.';
          } else if (adminPaths.some(path => req.url.startsWith(path))) {
            msg = 'Sign in to access admin features.';
          } else if (!req.authReq) {
            msg = 'Sign in with your .ac.uk email to save your history, personalize CheckOut, and use AutoCheckin.';
          } else {
            msg = 'An account is required to use Beta CheckOut';
          }

          return res.render("account/auth/login.ejs", { intent: req.originalUrl, guestState: false, msg, username: req.username });
        }
      }
    }

    // Check 5.1: Bedtime and Christmas blocks
    const currentTime = new Date();
    if ((req.bedtime === '1' && (currentTime < req.dayStart || currentTime > req.dayEnd)) || req.christmas === '1') {
      const allowedPaths = [...excludedPaths, '/auto', '/manage'];
      
      if (!allowedPaths.some(path => req.url.startsWith(path))) {
        const permsResults = await checkPermissions(req.userState);
        let msg = '';
        let features = [];

        // Build message based on permissions and login status
        if (req.loggedIn) {
          if (permsResults.length > 0) {
            const allowedServices = JSON.parse(permsResults[0].routes);
            if (allowedServices.includes('autocheckin')) features.push('<a href="/auto">AutoCheckin</a>');
            if (allowedServices.includes('mod')) features.push('<a href="/manage">admin services</a>');
            msg = features.length > 0 ? 
              `While CheckOut is closed, you still have access to: ${features.join(' and ')}` :
              'Your account does not have access to any special features during closing hours.';
          }
        } else {
          msg = 'Login to check if you have access to AutoCheckin or admin services during closing hours.';
        }

        return res.render("bedtime-christmas/bedtime.ejs", { 
          msg,
          username: req.username,
          loggedIn: req.loggedIn
        });
      }
    }

    // Check 6: Consent screen & course selection

    const excludedConsentPaths = ["/manifest.json", "/data", "/api/", "/terms", "/learn-faq", "/faq", '/static/', '/manage', '/robots.txt'];
    if (req.consented == false && 
      !excludedConsentPaths.some(path => req.url.startsWith(path)) && 
    req.userState != "sysop" && req.userState != "bot") {
      return res.render("consent-course/consent.ejs", { username: req.username });
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
  // if (process.env.CHK_SRV == "BETA") {
  //   console.time(`auth_${req.url}`);
  // }
  checkPermissions(req.userState).then(results => {
    if (results.length > 0) {
      const allowedServices = results.flatMap(result => JSON.parse(result.routes));
      
      if (!(allowedServices.some(route => service === route))) {
        let msg;
        if ((req.url.startsWith("/api/") || req.url.startsWith("/manage/api/")) && !req.url.startsWith("/api/docs")) {
          // if (process.env.CHK_SRV == "BETA") {
          //   console.timeEnd(`auth_${req.url}`);
          // }
          return res.status(403).json({success: false, auth_error: true, msg: `Account with permission '${service}' required for this action. Visit the FAQ for instructions on how to overcome this error.`});
        } else if (req.userState.includes('anon') || req.url.startsWith("/auto")) { // AutoCheckin waitlist
          if (req.url.startsWith("/f9h4e09eh")) {
            msg = 'Sign in with your .ac.uk email to use your account.';
          } else if (req.url.startsWith("/auto") && typeof req.query.login === 'undefined') {
            //msg = 'Sign in with your .ac.uk email to use AutoCheckin.';
            // AutoCheckin waitlist:
            return res.render("autocheckin/waitlist.ejs");
          } else if (req.url.startsWith("/auto")) {
            msg = 'Sign in to use AutoCheckin.';
          } else if (req.url.startsWith("/admin") || req.url.startsWith("/tklog") || req.url.startsWith("/analytics")) {
            msg = 'Sign in to access admin features.';
          } else {
            msg = 'Sign in with your .ac.uk email to save your history, personalize CheckOut and use AutoCheckin.';
          }
        } else {
          msg = `Your account, <i>${req.useremail}</i>, does not have the required permissions (${service}). Login to a different account with the correct permissions below or view your <a href='/account'>account</a>`;
        }
        // if (process.env.CHK_SRV == "BETA") {
        //   console.timeEnd(`auth_${req.url}`);
        // }
        return res.render("account/auth/login.ejs", { intent: req.originalUrl, guestState: false, msg, username: req.username });
      }
    } else {
      // if (process.env.CHK_SRV == "BETA") {
      //   console.timeEnd(`auth_${req.url}`);
      // }
      res.json({success: false, msg: "Auth error"})
    }
    // All checks passed
    // if (process.env.CHK_SRV == "BETA") {
    //   console.timeEnd(`auth_${req.url}`);
    // }
    next();
  }).catch(err => {
    console.log(err)
    // DONT DO THIS - next(err);
    // Do this lol:
    // if (process.env.CHK_SRV == "BETA") {
    //   console.timeEnd(`auth_${req.url}`);
    // }
    return res.render('notices/generic-msg.ejs', { msgTitle: "Error", msgBody: "CheckOut not available while a security issue is being worked on. Please contact an admin if this issue persists.", username: 'Error' })
  });
}

function getRealIp(xForwardedFor) {
  if (!xForwardedFor) {
    return null;
  }

  const ipChain = xForwardedFor.split(',').map(ip => ip.trim());

  // Determine if IPv4 or IPv6 based on the first IP in the chain
  const firstIp = ipChain[0];
  const isIPv6 = firstIp.includes(':');

  // Define prefixes for IPv4 and IPv6 proxies
  const ipv4ProxyPrefix = '34.';
  const ipv6ProxyPrefix = '2600:';

  // Find the index of the first proxy IP
  let firstProxyIndex = null;
  for (let i = 0; i < ipChain.length; i++) {
    if ((isIPv6 && ipChain[i].startsWith(ipv6ProxyPrefix)) || (!isIPv6 && ipChain[i].startsWith(ipv4ProxyPrefix))) {
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
  return true
}



module.exports = { getRealIp, securityCheck, logQ, auth, checkPermissions };