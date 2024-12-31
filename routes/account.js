const express = require('express')
var db=require('../database');
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
  'index': '/',
  'account': '/account',
  'autocheckin': '/auto'
};

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
app.get('/login', function (req, res) {
  const intent = req.query.login_redirect;
  
  // Prevent redirect loops
  if (req.query.login_redirect === '1') {
    return res.render('notices/generic-msg.ejs', { 
      msgTitle: "Login loop prevented", 
      msgBody: "Something went wrong while signing you in. Please visit the <a href='/'>homepage</a> and try again or <a href='/support'>contact support.</a>", 
      username: req.username 
    });
  }

  // Default to account if no intent specified
  if (!intent) {
    // Preserve any existing query params except login_redirect
    const existingParams = new URLSearchParams(req.query);
    existingParams.delete('login_redirect');
    existingParams.append('login_redirect', '1');
    
    const queryString = existingParams.toString();
    return res.redirect(`/account${queryString ? '?' + queryString : ''}`);
  }

  // Helper function to add login_redirect param while preserving existing query params
  const addLoginParam = (url) => {
    const hasQuery = url.includes('?');
    return `${url}${hasQuery ? '&' : '?'}login_redirect=1`;
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
  return res.redirect('/account?login_redirect=1');
});

// Account homepage
app.get('/account', async function (req, res) {
  //const secretToken = req.logintoken;
  const email = await obscureEmail(req.useremail);
  res.render("account/account.ejs", { apikey: req.apitoken, email, perms: req.userState, username: req.username, sessionID: req.sessionID});
});

// Account welcome email
app.get('/account/welcome-email', (req, res) => {
  const username = req.username;
  res.render('account/welcome-email', {username, rootDomain: req.rootDomain})
});

// Account new user welcome 
app.get('/account/welcome', (req, res) => {
  const username = req.username;
  res.render('account/welcome', {username, rootDomain: req.rootDomain})
});

// Change username
app.get('/account/change-username', function (req, res) {
  res.render('account/change-username.ejs', { username: req.username })
});

// Change email
app.get('/account/change-email', function (req, res) {
  res.status(200);
  res.render('notices/generic-msg.ejs', { msgTitle: "Change email", msgBody: "To change the email on your account please <a href='/learn-faq'>contact an admin</a>. <a href='/account'>Return to account.</a>", username: req.username })
});


module.exports = app;