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

// Change email
app.get('/account/change-email', function (req, res) {
  res.status(200);
  res.render('notices/generic-msg.ejs', { msgTitle: "Change email", msgBody: "To change the email on your account please <a href='/learn-faq'>contact an admin</a>. <a href='/account'>Return to account.</a>", username: req.username })
});


module.exports = app;