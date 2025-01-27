// Consent View
// app.get('/cwall/:wallToken', isCKAuthenticated, function (req, res) { // Cookie Consent
//   var wallToken = req.params.wallToken
//   res.render('consent/consent-min.ejs', { wallToken })
// })

// Consent accept
// app.post('/caccept', isCKAuthenticated, function (req, res) { // Cookie Consent
//   res.cookie("cookieWall", "1", {
//     maxAge: 31556952000 // Expires in 1 year 
//   });
//   res.redirect("/")
// })


// Old classdata routes
// app.get('/classdata/soft1',isCKAuthenticated,function (req, res){
//   log(req,res)
//   // Query the database
//   try {
//     var moment = require ('moment'); // Import moment.js for timestamp
//     var codeDay = moment (Date.now ()).add(1, 'hours').format ('YYYY-MM-DD');
//     var sqlQuery = 'SELECT groupCode, checkinCode FROM soft1 WHERE codeDay = "'+codeDay.toString()+'" ORDER BY groupCode DESC;'
//     console.log(sqlQuery);
//     db.query (sqlQuery, function (err, result, fields) {
//       if (err) throw err;
//       console.log(result)
//       // Send the data as a JSON object
//       res.json(result);
//     });
// } catch (err) {
//   res.render('error.ejs', {err})
//   console.log("Unautharised user tried to access logdata, was rejected")
// }
// });

// app.get('/classdata/hcil',isCKAuthenticated,function (req, res){
//   log(req,res)
//   // Query the database
//   try {
//     var moment = require ('moment'); // Import moment.js for timestamp
//     var codeDay = moment (Date.now ()).add(1, 'hours').format ('YYYY-MM-DD');
//     var sqlQuery = 'SELECT groupCode, checkinCode FROM hcil WHERE codeDay = "'+codeDay.toString()+'" ORDER BY groupCode DESC;'
//     console.log(sqlQuery);
//     db.query (sqlQuery, function (err, result, fields) {
//       if (err) throw err;
//       console.log(result)
//       // Send the data as a JSON object
//       res.json(result);
//     });
// } catch (err) {
//   res.render('error.ejs', {err})
//   console.log("Unautharised user tried to access logdata, was rejected")
// }
// });
// app.get('/classdata/hcip',isCKAuthenticated,function (req, res){
//   log(req,res)
//   // Query the database
//   try {
//     var moment = require ('moment'); // Import moment.js for timestamp
//     var codeDay = moment (Date.now ()).add(1, 'hours').format ('YYYY-MM-DD');
//     var sqlQuery = 'SELECT groupCode, checkinCode FROM hcip WHERE codeDay = "'+codeDay.toString()+'" ORDER BY groupCode DESC;'
//     console.log(sqlQuery);
//     db.query (sqlQuery, function (err, result, fields) {
//       if (err) throw err;
//       console.log(result)
//       // Send the data as a JSON object
//       res.json(result);
//     });
// } catch (err) {
//   res.render('error.ejs', {err})
//   console.log("Unautharised user tried to access logdata, was rejected")
// }
// });
// app.get('/classdata/transition',isCKAuthenticated,function (req, res){
//   log(req,res)
//   // Query the database
//   try {
//     var moment = require ('moment'); // Import moment.js for timestamp
//     var codeDay = moment (Date.now ()).add(1, 'hours').format ('YYYY-MM-DD');
//     var sqlQuery = 'SELECT groupCode, checkinCode FROM transition WHERE codeDay = "'+codeDay.toString()+'" ORDER BY groupCode DESC;'
//     console.log(sqlQuery);
//     db.query (sqlQuery, function (err, result, fields) {
//       if (err) throw err;
//       console.log(result)
//       // Send the data as a JSON object
//       res.json(result);
//     });
// } catch (err) {
//   res.render('error.ejs', {err})
//   console.log("Unautharised user tried to access logdata, was rejected")
// }
// });

// Deprecated submit code
// app.get('/submitcode',isCKAuthenticated,function(req,res){ // Submission
//     log(req,res);
//     submitcode(req,res, (callback) => {
//       try {
//         var ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress; // Record the IP address
//         var ip = ip.toString().split(',')[0];
//         if (callback === "normal") {
//           var moduleCode = req.query.md;
//           var tk = req.query.tk;
//           // Construct the URLs for 'undo' and 'next'
//           var undo = "https://" + rootDomain + "/undo?tk=" + tk + "&md=" + moduleCode;
//           var next = "https://" + moduleCode + "." + rootDomain;

//           // Send JSON response instead of rendering EJS view
//           res.json({
//               success: "true",
//               next: next,
//               undo: undo
//           });
//         } else if (callback === "ratelimit"){
//           res.status(429);
//           var msg = "You've made too many submissions today."
//           res.json({
//             success: "false",
//             message: msg
//           });
//         } else if (callback === "flagged"){
//           res.status(403);
//           var msg = "Your request was flagged. Try reloading the page."
//           res.json({
//             success: "false",
//             message: msg
//           });
//         } else {
//           var msg = "Something went wrong."
//           res.json({
//             success: "false",
//             message: msg
//           });
//           res.render("error.ejs", {err})
//         }
//       } catch (err) {
//         console.log(err)
//       }
//   });
// })

// Depricated submit function
// function submitcode(req, res, callback) { // Define function to write to LOG table
//     try {
//       var moduleCode = req.query.md // Module Code
//       var checkinCode = req.query.chc // Module Code
//       var groupCode = req.query.grp // Module Code
//       var tk = req.query.tk // tk Auth Code
//       var moment = require ('moment'); // Import moment.js for timestamp
//       var codeDay = moment (Date.now ()).add(0, 'hours').format ('YYYY-MM-DD');
//       //console.log("module code", moduleCode)
//       if (!validModuleCodes.includes(moduleCode)) {
//         moduleCode = 'dontwork';
//       }
//       var ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress // Record the IP address
//       var ip = ip.toString().split(',')[0]
//       var useragent = req.headers['user-agent']
//       if (ip === "82.6.108.214") { // Conceal home IP address
//         var ip = "82.XXX.XXX.XXX"
//       }
//       // Check for repeat submissions
//       var sqlspam = `SELECT * FROM \``+moduleCode.toString()+`\` WHERE (ip = ? AND codeDay = ?) OR tk = ?`;
//       db.query(sqlspam, [ip, codeDay, tk], function(err,resultSpam) {
//         //console.log(resultSpam)
//         if (err || resultSpam === undefined || moduleCode == 'dontwork') {
//           var blockRepeat = true;
//           console.log("Blocked suspicious request ", moduleCode, groupCode, checkinCode, ip ,tk)
//           callback(blockRepeat)
//           return;
//         }
//         if (resultSpam === undefined) {
//           var resultSpam = "[]"
//         }
//         for (const element of resultSpam) {
//           if (element.tk === tk) {
//             console.log("Blocked repeated tk: ", moduleCode, groupCode, checkinCode, ip ,tk)
//             var blockRepeat = "flagged";
//             callback(blockRepeat)
//             return;
//           }
//         }
//         if (resultSpam.length >= ipRateLimit) { // IP based rate limit
//           var blockRepeat = "ratelimit";
//           console.log("Blocked repeated request", moduleCode, groupCode, checkinCode, ip, tk)
//           callback(blockRepeat)
//           return;
//         } else if ((blockedTerms.some(item => groupCode.toString().includes(item))) || (blockedTerms.some(item => checkinCode.toString().includes(item))) || (blockedTerms.some(item => moduleCode.toString().includes(item)))) { // Blocked terms check
//           console.log("Blocked flagged term ", moduleCode, groupCode, checkinCode, ip, tk)
//           var blockRepeat = "flagged";
//           callback(blockRepeat)
//           return;
//         } else if (tk === '' || tk === undefined) { // Empty tk check (will upgrade to validate tk soon)
//           console.log("Blocked as no valid tk present ", moduleCode, groupCode, checkinCode, ip, tk)
//           var blockRepeat = "flagged";
//           callback(blockRepeat)
//           return;
//         } else { // If no issues found, make database submission
//           var blockRepeat = "normal";
//           console.log("Allowed submission from", moduleCode, groupCode, checkinCode, ip ,tk)
//         }
      
//         var sql = `INSERT INTO \``+moduleCode.toString()+`\` (codeDay, groupCode, checkinCode, timestamp, ip, useragent, tk) VALUES (?, ?, ?, ?, ?, ?, ?)`; // prepare SQL statement
//         var mysqlTimestamp = moment (Date.now ()).add(0, 'hours').format ('YYYY-MM-DD HH:mm:ss'); // Defines timestamp
//         if (useragent != "Mozilla/5.0 (compatible; ProjectShield-UrlCheck; +http://g.co/projectshield)" && blockRepeat != "flagged" && blockRepeat != "ratelimit" && moduleCode != 'dontwork') {
//           db.query(sql, [codeDay, groupCode, checkinCode, mysqlTimestamp, ip, useragent, tk], function(err, result) { // execute SQL query 
//             callback(blockRepeat)
//             return;
//             if (err) {
//               console.log(err)
//               //res.render("home.ejs")
//             }; // log error with log
//           })
//         } else {
//           //res.render("ratelimit.ejs", {ip})
//           callback(blockRepeat)
//           return;
//         }
//       })
//     } catch (error) {
//       //res.render("home.ejs")
//       console.log(error)
//       return;
//     }
// }

// app.get('/class',isCKAuthenticated,(req, res) => {
//     // Access the wildcard parameter using req.params[0]
//     res.render(`class-select.ejs`);
//   });


// Old IP log table code
//var useragent = req.headers['user-agent']
      //var sql = `INSERT INTO snaplog (timestamp, ip, useragent) VALUES (?, ?, ?)`; // prepare SQL statement
      //var mysqlTimestamp = moment (Date.now ()).add(0, 'hours').format ('YYYY-MM-DD HH:mm:ss'); // Defines timestamp
      // db.query(sql, [mysqlTimestamp, ip, useragent], function(err, result) { // execute SQL query
      //   console.log("Log:", mysqlTimestamp, ip, req.useremail, req.url, useragent) 
      //   if (err) {
      //     console.log(err)
      //   }; // log error with log
      // })


      // Old Log view
// app.get('/iplog',function(req,res){ // IP Log
//     if (req.query.password === passWord) {
//         res.render('log.ejs', {password : req.query.password})
//     } else {
//         if (req.query.password != undefined) {
//             res.render('login.ejs', {message : "Wrong password"})
//         } else {
//           res.render('login.ejs', {message : ""})
//         }
//     }
//   })

// Log data view
// app.get('/logdata', function (req, res){
//     // Query the database
//     try {
//     if (req.query.password === passWord) {
//       db.query ('SELECT timestamp, ip, useragent FROM snaplog ORDER BY timestamp DESC;', function (err, result, fields) {
//         if (err) throw err;
//         // Send the data as a JSON object
//         res.json (result);
//       });
//     } else {
//       res.render('deny.ejs')
//     }
//   } catch (err) {
//     res.render('deny.ejs')
//     console.log("Unautharised user tried to access logdata, was rejected")
//   }
// });

