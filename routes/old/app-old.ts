// Old routes from app.js - kept for reference

// Verify user and generate secret token
// app.post('/api/app/account/verify', (req, res) => {
//   const email = req.body.email;
//   const code = req.body.code;
//   db.query('SELECT * FROM users WHERE email = ? AND code = ?', [email, code], (err, result) => {

//     // TODO: Set expiry for 6 digit code

//       if (err) throw err;
//       if (result.length > 0) {
//           if ((result[0]['secret_token'])&&(result[0]['secret_token'].length > 10)){
//             const secretToken = result[0]['secret_token']
//             // Secret token exists

//             res.cookie("logintoken", secretToken, {
//               maxAge: 31556952000 // Expires in 1 year 
//             });
//             res.json({ secret_token: secretToken });

//           } else {

//             // Secret token does not already exist
//             import('crypto-random-string').then(module => {
//               const cryptoRandomString = module.default;
//               const secretToken = cryptoRandomString({ length: 32, type: 'alphanumeric' });
//               const apitoken = cryptoRandomString({ length: 32, type: 'alphanumeric' });
//               db.query('UPDATE users SET secret_token = ?, api_token = ?, userstate = ? WHERE email = ?', [secretToken, apitoken, "normal", email], (err, result) => {
//                   if (err) throw err;
//                   res.cookie("logintoken", secretToken, { 
//                     maxAge: 31556952000 // Expires in 1 year 
//                 });
//                   res.json({ secret_token: secretToken });
//               });
//             }).catch(error => {
//               console.error('Error importing crypto-random-string:', error);
//           });
//           }
//       } else {
//           res.status(400).json({ message: 'Invalid email or code' });
//       }
//   });
// });

// // Delete user account
// app.delete('/api/app/account/delete', (req, res) => {
//   const secretToken = req.body.secret_token;
//   db.query('DELETE FROM users WHERE secret_token = ?', [secretToken], (err, result) => {
//       if (err) throw err;
//       res.json({ message: 'Account deleted successfully' });
//   });
// });

// // Register a user
// app.post('/api/app/account/register', (req, res) => {
//   const email = req.body.email;

//   // Check if the email already exists in the database
//   db.query('SELECT * FROM users WHERE email = ?', [email], (err, result) => {
//       if (err) {
//           console.error('Error checking existing user:', err);
//           res.status(500).json({ error: 'An error occurred while checking existing user' });
//           return;
//       }

//       if (result.length > 0) {
//           // User already exists, update the existing record with a new one-time code
//           import('crypto-random-string').then(module => {
//               const cryptoRandomString = module.default;
//               const newCode = cryptoRandomString({ length: 6, type: 'numeric' });

//               db.query('UPDATE users SET code = ? WHERE email = ?', [newCode, email], (err, result) => {
//                   if (err) {
//                       console.error('Error updating existing user:', err);
//                       res.status(500).json({ error: 'An error occurred while updating existing user' });
//                       return;
//                   }

//                   // Send verification email with the new code
//                   sendVerificationEmail(email, newCode)
//                       .then(() => {
//                           res.json({ message: 'Verification code email has been sent' });
//                       })
//                       .catch((error) => {
//                           console.error('Error sending email:', error);
//                           res.status(500).json({ error: 'An error occurred while sending the email' });
//                       });
//               });
//           }).catch(error => {
//               console.error('Error importing crypto-random-string:', error);
//           });
//       } else {
//           // User doesn't exist, proceed with registration
//           import('crypto-random-string').then(module => {
//               const cryptoRandomString = module.default;
//               const code = cryptoRandomString({ length: 6, type: 'numeric' });

//               db.query('INSERT INTO users (email, code, userstate, checkintoken, checkinstate) VALUES (?, ?, ?, ?, ?)', [email, code, "anon", "0", "0"], (err, result) => {
//                   if (err) {
//                       console.error('Error registering user:', err);
//                       res.status(500).json({ error: 'An error occurred while registering user' });
//                       return;
//                   }

//                   // Send verification email
//                   sendVerificationEmail(email, code)
//                       .then(() => {
//                           res.json({ message: 'Verification code email has been sent' });
//                       })
//                       .catch((error) => {
//                           console.error('Error sending email:', error);
//                           res.status(500).json({ error: 'An error occurred while sending the email' });
//                       });
//               });
//           }).catch(error => {
//               console.error('Error importing crypto-random-string:', error);
//           });
//       }
//   });
// });

// // Codes view
// // Gets the days codes in pretty html frame output for a given, institution (inst), course (crs), year (yr) and module code (md)
// app.get('/api/app/classframe/:inst/:crs/:yr/:md', function (req, res) {
//   var inst = req.params.inst;
//   var crs = req.params.crs;
//   var yr = req.params.yr;
//   var md = req.params.md;
//   if ((inst == "yrk"&&crs=="cs"&&yr=="1")) {
//     getCodesAlg(inst, crs, yr, "%", "%", function (err, codesObject) {
//       if (err) {
//         res.status(500);
//         res.send("Error")
//         console.log("Error in getCodes", err);
//         return;
//       } else {
//         tibl.webGenCodes(true, codesObject, inst, crs, yr, req, res, () => {
//           })
//       }
//     });
//   } else {
//     getCodesAlg(inst, crs, yr, md, "%", function (err, codesObject) {
//       if (err) {
//         res.status(500);
//         res.send("Error")
//         console.log("Error in getCodes", err);
//         return;
//       } else {
//         getCourseInfo(inst, crs, yr, function (err, modulesObject, code) {
//           if (err) {
//             res.status(500);
//             res.send("Error")
//             console.log("Error in getModuleList", err);
//             return;
//           }
          
//           let moduleName = null;

//           for (const module of modulesObject) {
//               if (module.module_code === md) {
//                   moduleName = module.module_name;
//                   break;
//               }
//           }
//           code = code+"-"+md.toUpperCase()
//           getSessions(inst, crs, yr, md, req, res, function(timetableBullets) {
//             res.render('classv2.ejs', { moduleName, classData: codesObject, code, timetableBullets, submitIntent: "Add yours <a target=\"_parent\" class=\"sub-table-link\" href=\"/\">here</a>."});
//           });
//         });
        
//       }
//     });
//   }
// });

// // Codes view for iOS
// // Gets the days codes in pretty html frame output for a given, institution (inst), course (crs), year (yr) and module code (md)
// app.get('/api/app/classframe/ios/:inst/:crs/:yr/:md', function (req, res) {
//   var inst = req.params.inst;
//   var crs = req.params.crs;
//   var yr = req.params.yr;
//   var md = req.params.md;
//   if ((inst == "yrk"&&crs=="cs"&&yr=="1")) {
//     getCodesAlg(inst, crs, yr, "%", "%", function (err, codesObject) {
//       if (err) {
//         res.status(500);
//         res.send("Error")
//         console.log("Error in getCodes", err);
//         return;
//       } else {
//         tibl.webGenCodes(true, codesObject, inst, crs, yr, req, res, () => {
//           })
//       }
//     });
//   } else {
//     getCodesAlg(inst, crs, yr, md, "%", function (err, codesObject) {
//       if (err) {
//         res.status(500);
//         res.send("Error")
//         console.log("Error in getCodes", err);
//         return;
//       } else {
//         getCourseInfo(inst, crs, yr, function (err, modulesObject, code) {
//           if (err) {
//             res.status(500);
//             res.send("Error")
//             console.log("Error in getModuleList", err);
//             return;
//           }
//           let moduleName = null;

//           for (const module of modulesObject) {
//               if (module.module_code === md) {
//                   moduleName = module.module_name;
//                   break;
//               }
//           }
//           code = code+"-"+md.toUpperCase()
//           getSessions(inst, crs, yr, md, req, res, function(timetableBullets) {
//             res.render('ios-classv2.ejs', { moduleName, classData: codesObject, code, timetableBullets, submitIntent: "Add yours in the submission view." });
//           });
//         });
//       }
//     });
//   }
// });

// // Web codes view
// // Gets the days codes in full html page output for a given, institution (inst), course (crs), year (yr) and module code (md)
// app.get('/api/app/class/:inst/:crs/:yr/:md', function (req, res) {
//   var inst = req.params.inst;
//   var crs = req.params.crs;
//   var yr = req.params.yr;
//   var md = req.params.md;
//     getCourseInfo(inst, crs, yr, function (err, modulesObject, code) {
//       if (err) {
//         res.status(500);
//         res.send("Error")
//         console.log("Error in getModuleList", err);
//         return;
//       }
//       let moduleName = null;

//       for (const module of modulesObject) {
//           if (module.module_code === md) {
//               moduleName = module.module_name;
//               break;
//           }
//       }
//       res.render('classv3.ejs', { moduleName, md, inst, crs, yr, rootDomain: req.rootDomain, code});
//     });
// });

// // Get the active classes (inactive)
// app.get('/api/app/class/:inst/:crs/:yr/:md', function (req, res) {
//   var inst = req.params.inst;
//   var crs = req.params.crs;
//   var yr = req.params.yr;
//   var md = req.params.md;
//     getCourseInfo(inst, crs, yr, function (err, modulesObject, code) {
//       if (err) {
//         res.status(500);
//         res.send("Error")
//         console.log("Error in getModuleList", err);
//         return;
//       }
//       let moduleName = null;

//       for (const module of modulesObject) {
//           if (module.module_code === md) {
//               moduleName = module.module_name;
//               break;
//           }
//       }
//       res.render('classv3.ejs', { moduleName, md, inst, crs, yr, rootDomain: req.rootDomain, code});
//     });
// });

// // Old backup function
// function getModuleList(inst, crs, yr, callback) {
//   // Ensure all parameters are strings and concatenate them with '-' separator
//   var modulesObject = {}
//   var key = 'modules'
//   modulesObject[key] = []
//   var sampleModule1 = {
//     moduleCode: 'y1-soft-2',
//     moduleName: 'Software'
//   }
//   var sampleModule2 = {
//     moduleCode: 'y1-theory-2',
//     moduleName: 'Theory'
//   }
//   var sampleModule3 = {
//     moduleCode: 'y1-sd',
//     moduleName: 'Systems and Devices'
//   }
//   if ((inst == 'yrk')&&(crs == 'cs')&&(yr == '1')) {
//     // Temporary non-database vales for YRK-CS-1
//     modulesObject[key].push(sampleModule1, sampleModule2, sampleModule3)
//   }
//   var code = (inst.toString() + '-' + crs.toString() + '-' + yr.toString()).toUpperCase();
//   console.log("Module list request", code)
//   callback(null, modulesObject);
// }

// // Old getCodes function
// function getCodes(inst, crs, yr, md, grp, callback) {
//   try {
//     var codeDay = moment (Date.now ()).add(1, 'hours').format ('YYYY-MM-DD');
//     var sqlQuery = 'SELECT groupCode, checkinCode FROM codes WHERE inst = ? AND crs = ? AND yr = ? AND md LIKE ? AND codeDay = ? AND groupCode LIKE ? AND codeState = "1";';
//     //console.log(sqlQuery);
//     db.query(sqlQuery, [inst, crs, yr, md, codeDay, grp], function (err, result, fields) {
//       if (err) {
//         callback(err, null);
//         return;
//       }  
//       // Work out submission count
//       const groupedData = {};

//       // Group identical rows
//       result.forEach((row) => {
//         const key = JSON.stringify(row);
//         if (groupedData[key]) {
//           groupedData[key].count++;
//         } else {
//           groupedData[key] = { data: row, count: 1 };
//         }
//       });

//       // Convert grouped data back to array
//       const mergedArray = Object.values(groupedData).map(({ data, count }) => {
//         if (count > 1) {
//           //data.groupCode += ` (VFD${count})`; // disabled while new timetable based stuff is implemented
//         }
//         return { ...data, count }; // Return a new object with 'count' key
//       });


//       callback(null, mergedArray);
//     });
//   } catch (err) {
//     callback(err, null);
//   }
// }

// // Codes History
// // Gets past codes using users username, ip and deviceID
// app.get('/api/app/history', function (req, res) {
//   getPastCodes(req, res, function (err, codesObject) {
//     if (err) {
//       res.status(500);
//       res.send("Error")
//       console.log("Error in globalapp status", err);
//       return;
//     }
//     res.header("Content-Type",'application/json');
//     res.send(JSON.stringify(codesObject, null, 2));
//   });
// });

// app.post('/api/app/block/appeal', async (req, res) => {
//   const ip = req.usersIP; // Extract the requester's IP address
//   const reason = req.body.reason;
//   try {
//         // Database insertion (adjust column names if needed)
//         await db.query(
//             'INSERT INTO appeals (ip, appeal_text, status) VALUES (?, ?, ?)', 
//             [ip, reason, "not reviewed"] 
//         ); 
//         res.status(201).send('Appeal created'); // 201 Created is suitable
//     } catch (error) {
//       console.log(error)
//         res.status(500).send('Error creating appeal'); // Replace with better error handling 
//     }
// });

// app.get('/codes', function(req,res){
//   var redirectNotice = 0
//   if ((req.inst == "yrk"&&req.crs=="cs"&&req.yr=="1") && false) { // old
//     getCodesAlg(req.inst, req.crs, req.yr, "%", "%", function (err, codesObject) {
//       if (err) {
//         res.status(500);
//         res.send("Error")
//         console.log("Error in getCodes", err);
//         return;
//       } else {
//         tibl.webGenCodes(false, codesObject, req.inst, req.crs, req.yr, req, res, (err, returnedValues) => {
//           if (err) {
//             // Handle error
//             console.error(err);
//             return;
//           }
      
//           //console.log(returnedValues)
//           const [sessionOptionsHTML, code, timetableBullets, submitIntent] = returnedValues;
//           res.render('homev2.ejs', {redirectNotice, rootDomain: req.rootDomain, sessionOptionsHTML, code, timetableBullets, submitIntent, frame: "codes"})
//           })
//       }
//     });
//   } else if (req.inst!="null"&&req.crs!="null"&&req.yr!="null"){
//     res.redirect('/') // Do not enable /codes for non-timetabled courses
//   } else {
//     var onboardLink = '/api/app/onboarding'
//     res.redirect(onboardLink)
//   }
// }); 

