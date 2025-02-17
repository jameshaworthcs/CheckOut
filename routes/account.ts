const express = require('express');
var app = express.Router();

async function obscureEmail(email) {
  // Split the email into the local part (before @) and domain (after @)
  const [localPart, domain] = email.split('@');

  // If the local part is too short, return it as is (since it has only one character)
  if (localPart.length <= 2) {
    return email;
  }

  // Calculate the number of stars to add (up to a maximum of 1)
  const obscuredStars = '*'.repeat(Math.min(localPart.length - 2, 1));

  // Obscure the local part, keeping only the first and last character
  const obscuredLocal = localPart[0] + obscuredStars + localPart[localPart.length - 1];

  // Return the obscured email
  return `${obscuredLocal}@${domain}`;
}

// Define valid redirect mappings
const PAGE_REDIRECTS = {
  index: '/',
  account: '/account',
  autocheckin: '/auto',
};

// Define valid login methods
const validMethods = ['google', 'email', 'apikey', 'selection'];

/**
 * Login redirect handler
 *
 * Usage:
 * 1. Direct URL redirect:
 *    /login?login_redirect=/some/path
 *    /login?login_redirect=/dashboard?tab=settings
 *
 * 2. Named page redirect (using PAGE_REDIRECTS mapping):
 *    /login?login_redirect=index    -> redirects to /
 *    /login?login_redirect=account  -> redirects to /account
 *
 * If no redirect is specified, defaults to /account.
 * Adds ?login_redirect=1 to final URL while preserving any existing query parameters.
 * Prevents redirect loops by checking for login_redirect=1 in incoming requests.
 */
app.get(['/login', '/login/:method'], function (req, res) {
  // Check for both login_redirect and intent parameters
  let intent = req.query.login_redirect || req.query.intent;

  // Redirect to index if intent starts with /login or %2Flogin
  if (intent && (intent.startsWith('/login') || intent.startsWith('%2Flogin'))) {
    intent = 'index';
  }

  // Get login method from URL path or query parameter
  let method = req.params.method;
  if (!validMethods.includes(method)) {
    method = validMethods.includes(req.query.method) ? req.query.method : undefined;
  }

  // Prevent redirect loops
  if (req.query.login_redirect === '1') {
    return res.render('notices/generic-msg.ejs', {
      msgTitle: 'Login loop prevented',
      msgBody:
        "Something went wrong while signing you in. Please visit the <a href='/'>homepage</a> and try again or <a href='/support'>contact support.</a>",
      username: req.username,
    });
  }

  // Default to account if no intent specified
  if (!intent) {
    // Preserve any existing query params except login_redirect
    const existingParams = new URLSearchParams(req.query);
    existingParams.delete('login_redirect');
    existingParams.append('login_redirect', '1');

    // Keep the method parameter if it exists
    if (method) {
      existingParams.set('method', method);
    }

    const queryString = existingParams.toString();
    return res.redirect(`/account${queryString ? '?' + queryString : ''}`);
  }

  // Helper function to add login_redirect param while preserving existing query params
  const addLoginParam = (url) => {
    const urlObj = new URL(url, `http://${req.get('host')}`);

    // First, copy all existing query params from the request
    const existingParams = new URLSearchParams(req.query);
    existingParams.delete('login_redirect'); // Remove if present to avoid duplication
    existingParams.delete('intent'); // Remove intent as it's no longer needed

    // Add all existing params to the new URL
    for (const [key, value] of existingParams.entries()) {
      urlObj.searchParams.set(key, value);
    }

    // Add login_redirect param
    urlObj.searchParams.set('login_redirect', '1');

    // Keep the method parameter if it exists
    if (method) {
      urlObj.searchParams.set('method', method);
    }

    return urlObj.pathname + urlObj.search;
  };

  // Handle direct URL paths starting with /
  if (intent.startsWith('/')) {
    return res.redirect(addLoginParam(intent));
  }

  // Handle named pages from mapping
  const redirectUrl = PAGE_REDIRECTS[intent];
  if (redirectUrl) {
    return res.redirect(addLoginParam(redirectUrl));
  }

  // If intent is invalid, default to account
  const existingParams = new URLSearchParams(req.query);
  existingParams.delete('login_redirect');
  existingParams.delete('intent');
  existingParams.set('login_redirect', '1');
  if (method) {
    existingParams.set('method', method);
  }
  return res.redirect(`/account?${existingParams.toString()}`);
});

// Account homepage
app.get('/account', async function (req, res) {
  const email = await obscureEmail(req.useremail);
  res.render('account/account.ejs', {
    apikey: req.apitoken,
    email,
    perms: req.userState,
    username: req.username,
    sessionID: req.sessionID,
  });
});

// Account welcome email
app.get('/account/welcome-email', (req, res) => {
  const username = req.username;
  res.render('account/welcome-email', { username, rootDomain: req.rootDomain });
});

// Account new user welcome
app.get('/account/welcome', (req, res) => {
  const username = req.username;
  res.render('account/welcome', { username, rootDomain: req.rootDomain });
});

// Change username
app.get('/account/change-username', function (req, res) {
  res.render('account/change-username.ejs', { username: req.username });
});

// Change email
app.get('/account/change-email', function (req, res) {
  res.status(200);
  res.render('notices/generic-msg.ejs', {
    msgTitle: 'Change email',
    msgBody:
      "To change the email on your account please <a href='/learn-faq'>contact an admin</a>. <a href='/account'>Return to account.</a>",
    username: req.username,
  });
});

// Permissions page
app.get('/account/permissions', function (req, res) {
  res.render('account/permissions.ejs', { username: req.username, userState: req.userState });
});

module.exports = app;
