const express = require('express')
var db=require('../databases/database.ts');
var app = express.Router();
const moment = require('moment-timezone');
const crypto = require('crypto');
const { sendVerificationEmail } = require('./email.ts');
const {spawn} = require('child_process');
var tibl = require('./tibl.ts');
var secureRoute = require('./secure.ts');
var courseFinder = require('./api/course/course-find.ts');
//const calculateScores = require('./algorithm.js');
const { Worker } = require('worker_threads');

const blockedTerms = ['<', '>', '690420', '696969', 'VFD', 'fuck', 'gay','slut','james','cum','ass fuck','ass hole','assfucker','asshole','assshole', 'black cock', 'cockfucker','cocksuck','cocksucker','coon','coonnass','faggot','fuck off','fuck you','fuckass','fuckhole','homoerotic','mother fucker','motherfuck','motherfucker','penisfucker','sadist','slut','son of a bitch'];



function appStatus(callback) {
  try {
    var sqlQuery = 'SELECT * FROM globalapp ORDER BY revID DESC LIMIT 1;';
    //console.log(sqlQuery);
    db.query(sqlQuery, function (err, result, fields) {
      if (err) {
        callback(err, null);
        return;
      }  
      callback(null, result);
    });
  } catch (err) {
    callback(err, null);
  }
}

function validateAPIKey(apiKey = 1, userState) {
  //const validAPIKey = 'xyz123';
  //return apiKey === validAPIKey;
  return userState === "sysop";
}

/* codes schema:

codeID int NOT NULL AUTO_INCREMENT,
inst varchar(200) NOT NULL,
crs varchar(200) NOT NULL,
yr varchar(200) NOT NULL,
md varchar(30) NOT NULL,
codeDay varchar(20) NOT NULL,
groupCode varchar(20) NOT NULL,
checkinCode int NOT NULL,
timestamp varchar(30),
ip varchar(50),
useragent varchar(1000),
tk varchar(255),
deviceID varchar(50),
username varchar(100),
codeState varchar(1)
codeDesc varchar(255)
codeReps varchar(50)
PRIMARY KEY (codeID)




*/ 


// Function to encrypt using Base64 encoding
function encrypt(codeID) {
  // Convert codeID to its numeric value
  const numericValue = parseInt(codeID);
  // Base64 encode the numeric value
  const encodedValue = Buffer.from(numericValue.toString()).toString('base64');
  return encodedValue;
}

// Function to decrypt using Base64 decoding
function decrypt(encodedValue) {
  // Base64 decode the encoded value
  const numericValue = parseInt(Buffer.from(encodedValue, 'base64').toString());
  // Convert numeric value back to codeID
  const codeID = numericValue.toString();
  return codeID;
}

function submitcode(req, res, callback) { // Define function to submit code
  try {
    var inst = req.body.inst; // Institution code
    var crs = req.body.crs; // course code
    var yr = req.body.yr; // year code
    var moduleCode = req.body.md; // Module Code
    var codeDay = moment().tz('Europe/London').format('YYYY-MM-DD');
    var groupCode = req.body.grp; // Module Code
    var checkinCode = req.body.chc; // Module Code
    var mysqlTimestamp = moment().tz('Europe/London').format('YYYY-MM-DD HH:mm:ss');
    var ip = req.usersIP;
    var useragent = req.headers['user-agent'];
    var tk = req.body.tk; // tk Auth Code
    if (req.sessionID) { var deviceID = req.sessionID; } else {
      var deviceID = 'null';
    }
    var username = req.useremail;
    var codeState = '1';
    var codeDesc = '';
    var visState = '1';
    var source = 'SubmitAPI';
    //console.log("module code", moduleCode)
    // if (!validModuleCodes.includes(moduleCode)) {
    //   moduleCode = 'dontwork';
    // }

    // Check for repeat submissions
    var sqlspam = `SELECT * FROM codes WHERE (ip = ? AND codeDay = ?) OR tk = ?`;
    db.query(sqlspam, [ip, codeDay, tk], function(err,resultSpam) {
      
      var blockRepeat = "normal";
      var userMsg = "";

      if (err || resultSpam === undefined || moduleCode == 'dontwork') {
        blockRepeat = true;
        console.log("Blocked suspicious request ", moduleCode, groupCode, checkinCode, ip ,tk)
        userMsg = "Error: Something went wrong."
        callback(blockRepeat, userMsg)
        return;
      }
      if (resultSpam === undefined) {
        resultSpam = "[]"
      }
      for (const element of resultSpam) {
        //console.log(element.ip, ip, element.checkinCode, checkinCode)
        if (element.tk === tk && req.userState != 'sysop') {
          console.log("Blocked repeated tk: ", moduleCode, groupCode, checkinCode, ip ,tk)
          blockRepeat = "flagged";
          userMsg = "Error: You've already submitted. Try reloading the page or app."
          codeDesc = 'TK Repeat'
          codeState = '0'
          // callback(blockRepeat)
          // return;
        } else if ((element.ip == ip) && (element.checkinCode == checkinCode) && req.userState != 'sysop') {
          console.log("Blocked repeated code by same user: ", moduleCode, groupCode, checkinCode, ip ,tk)
          blockRepeat = "flagged";
          userMsg = `Warning: You've already submitted code `+checkinCode+`! Don't attempt this submission again.<br><br>If you are seeing this in error, try switching to a different network.`
          codeDesc = 'Code Repeat'
          codeState = '0'
        }
      }
      if ((resultSpam.length >= req.ipRateLimit) && (req.userState != 'sysop')) { // IP based rate limit
        blockRepeat = "ratelimit";
        console.log("Blocked ip rate limit", moduleCode, groupCode, checkinCode, ip, tk)
        userMsg = "Error: You've exceeded "+req.ipRateLimit+" submissions today."
        codeDesc = 'IP Limit'
        codeState = '0'
        // callback(blockRepeat)
        // return;
      } else if ((!/^\d{6}$/.test(checkinCode) || new Set(checkinCode).size === 1 || checkinCode.length !== 6 || checkinCode.charAt(0) === '0') && (req.userState != 'sysop')) { // Validate input
        blockRepeat = "flagged";
        console.log("Blocked flagged checkinCode", moduleCode, groupCode, checkinCode, ip, tk)
        userMsg = "Error: CheckOut code is invalid."
        codeDesc = 'Code Invalid'
        codeState = '0'
        // callback(blockRepeat)
        // return;
      } else if ((blockedTerms.some(item => groupCode.toString().includes(item))) || (blockedTerms.some(item => checkinCode.toString().includes(item))) || (blockedTerms.some(item => moduleCode.toString().includes(item)))) { // Blocked terms check
        console.log("Blocked flagged term ", moduleCode, groupCode, checkinCode, ip, tk)
        blockRepeat = "flagged";
        userMsg = "Error: Your code contains flagged terms."
        codeDesc = 'Term Blocked'
        codeState = '0'
        //callback(blockRepeat)
        //return;
      } else if ((tk === '' || tk === undefined) && (req.userState != 'sysop')) { // Empty tk check (will upgrade to validate tk soon)
        console.log("Blocked as no valid tk present ", moduleCode, groupCode, checkinCode, ip, tk)
        blockRepeat = "flagged";
        userMsg = "Error: Required security parameters not present."
        codeDesc = 'TK Null'
        codeState = '0'
        //callback(blockRepeat)
        //return;
      } else if (blockRepeat === 'normal') { // If no issues found, make database submission
        console.log("Allowed submission from", moduleCode, groupCode, checkinCode, ip ,tk)
      }
    
      var sql = `INSERT INTO codes (inst, crs, yr, md, codeDay, groupCode, checkinCode, timestamp, ip, useragent, tk, deviceID, username, codeState, codeDesc, codeReps, visState, source) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`; // prepare SQL statement
      if (useragent != "Mozilla/5.0 (compatible; ProjectShield-UrlCheck; +http://g.co/projectshield)") {
        // && blockRepeat != "flagged" && blockRepeat != "ratelimit" && moduleCode != 'dontwork'
        db.query(sql, [inst, crs, yr, moduleCode, codeDay, groupCode, checkinCode, mysqlTimestamp, ip, useragent, tk, deviceID, username, codeState, codeDesc, "0", visState, source], function(err, result) { // execute SQL query 
          if (err) {
            console.log(result)
            console.log("Malformed", err)
            blockRepeat = 'malformed'
            callback(blockRepeat, userMsg)
            return;
          } else {
            //console.log(blockRepeat)
            callback(blockRepeat, userMsg)
            return;
          }
        })
      } else {
        //res.render("ratelimit.ejs", {ip})
        console.log("Not completing request")
        callback(blockRepeat, userMsg)
        return;
      }
    })
  } catch (error) {
    //res.render("home.ejs")
    console.log(error)
    blockRepeat = 'malformed'
    callback(blockRepeat)
    return;
  }
}

function getCodesFromExtension(req, res, callback) { // Define function to submit code
  try {
    // var date = req.body.date; // Institution code
    // var time = req.body.time; // course code
    // var space = req.body.space; // year code
    // var activity = req.body.activity; // Module Code
    console.log(JSON.stringify(req.body))
    var largeDataSet = [];
    const python = spawn('/usr/abenv/bin/python3.10', ['/var/www/checkin/routes/rejectParser.py', JSON.stringify(req.body)]);
    // collect data from script
    python.stdout.on('data', function (data) {
        //console.log('Pipe data from python script ...');
        largeDataSet.push(data);
    });
    // in close event we are sure that stream is from child process is closed
    python.on('close', (code) => {
      //console.log(`child process close all stdio with code ${code}`);
      // send data to browser
      var resNoSpace = JSON.parse(largeDataSet.join("").toString().replace(/\r?\n|\r/g, " "));
      var md = resNoSpace['md']
      var grp = resNoSpace['grp']
      // Used to be getCodes("yrk", "cs", "1", md, grp, function (err, codesObject) {
      getCodes("yrk", "cs", "1", md, "%", function (err, codesObject) {
        if (err) {
          res.status(500);
          res.send("Error")
          console.log("Error in globalapp status", err);
          return;
        }
        callback(codesObject)
      });
    });
  }
  catch (error) {
    resNoSpace = []
    console.log(error)
    callback(resNoSpace)
  }
}

function getSessions(inst, crs, yr, md, req, res, callback) { // 
  try {

    // Old timetable reverseParser removed (used CSV data..)

    // var largeDataSet = [];
    // const python = spawn('/usr/abenv/bin/python3.10', ['/var/www/checkin/routes/reverseParser.py', md]);
    // // collect data from script
    // python.stdout.on('data', function (data) {
    //     //console.log('Pipe data from python script ...');
    //     largeDataSet.push(data);
    // });
    // // in close event we are sure that stream is from child process is closed
    // python.on('close', (code) => {
    //   //console.log(`child process close all stdio with code ${code}`);
    //   // send data to browser
    //   var resNoSpace = JSON.parse(largeDataSet.join("").toString().replace(/\r?\n|\r/g, " "));
    //   let htmlList = '<u>Timetable</u><ul>';
    //   resNoSpace.forEach(item => {
    //     // Construct a list item with styling tags
    //     htmlList += `<li>
    //                   <span class="class">${item.className}</span><span class="time"> <small>@</small>${item.startTime}</span><br>
    //                   <small><span class="location">${item.location}</span></small>
    //                 </li>`;
    //   });
    
    //   htmlList += '</ul><p>Enter check-out codes at <a target="_parent" class="sub-table-link" href="https://checkin.york.ac.uk/">checkin.york.ac.uk</a>';
    //   callback(htmlList)
    // });
    callback("")
  }
  catch (error) {
    console.log(error)
    callback(resNoSpace)
  }
}

// Old getCodes function
function getCodes(inst, crs, yr, md, grp, callback) {
  try {
    var codeDay = moment (Date.now ()).add(1, 'hours').format ('YYYY-MM-DD');
    var sqlQuery = 'SELECT groupCode, checkinCode FROM codes WHERE inst = ? AND crs = ? AND yr = ? AND md LIKE ? AND codeDay = ? AND groupCode LIKE ? AND codeState = "1";';
    //console.log(sqlQuery);
    db.query(sqlQuery, [inst, crs, yr, md, codeDay, grp], function (err, result, fields) {
      if (err) {
        callback(err, null);
        return;
      }  
      // Work out submission count
      const groupedData = {};

      // Group identical rows
      result.forEach((row) => {
        const key = JSON.stringify(row);
        if (groupedData[key]) {
          groupedData[key].count++;
        } else {
          groupedData[key] = { data: row, count: 1 };
        }
      });

      // Convert grouped data back to array
      const mergedArray = Object.values(groupedData).map(({ data, count }) => {
        if (count > 1) {
          //data.groupCode += ` (VFD${count})`; // disabled while new timetable based stuff is implemented
        }
        return { ...data, count }; // Return a new object with 'count' key
      });


      callback(null, mergedArray);
    });
  } catch (err) {
    callback(err, null);
  }
}

const workerpool = require('workerpool');

// Worker pool for getCodesAlg
const pool = workerpool.pool(__dirname + '/scoresWorker.ts');

const cache = {};

function getCacheKey(inst, crs, yr, md, grp) {
  return `${inst}-${crs}-${yr}-${md}-${grp}`;
}

function getCodesAlg(inst, crs, yr, md, grp, callback) {
  const cacheKey = getCacheKey(inst, crs, yr, md, grp);
  const now = Date.now();
  //console.log(cache)

  if (cache[cacheKey] && (now - cache[cacheKey].timestamp < 100)) {
    // Return cached result if it's still valid (within .1 seconds)
    callback(null, cache[cacheKey].data);
    return;
  }

  try {
    const sqlQuery = 'SELECT * FROM codes;';
    db.query(sqlQuery, async function (err, result) {
      if (err) {
        callback(err, null);
        return;
      }
      try {
        const scoredCodes = await pool.exec('calculate', [inst, crs, yr, md, grp, result]);
        // Cache the result
        cache[cacheKey] = {
          data: scoredCodes,
          timestamp: now
        };
        callback(null, scoredCodes);
      } catch (workerErr) {
        callback(workerErr, null);
      }
    });
  } catch (err) {
    callback(err, null);
  }
}

// Gracefully shutdown the worker pool when the process exits
process.on('exit', () => {
  pool.terminate();
});


function fetchEverythingData(callback) {
  const query = `
    SELECT DISTINCT
      i.institution_id,
      i.name AS institution_name
    FROM 
      Institutions i
  `;

  db.query(query, (err, institutions) => {
    if (err) {
      console.error('Error fetching institutions: ' + err.stack);
      callback(err, null);
      return;
    }

    // Initialize formatted data
    const formattedData = {};

    // Function to fetch years, courses, and modules for each institution
    function fetchInstitutionData(institutionIndex) {
      if (institutionIndex >= institutions.length) {
        // All institutions processed, return formatted data
        callback(null, formattedData);
        return;
      }

      const institution = institutions[institutionIndex];
      const institutionId = institution.institution_id;

      // Fetch years for the current institution
      const yearsQuery = `
          SELECT year_number
          FROM Years
          WHERE institution_id = ?
      `;

      db.query(yearsQuery, [institutionId], (err, years) => {

        if (err) {
          console.error('Error fetching years for institution ' + institutionId + ': ' + err.stack);
          callback(err, null);
          return;
        }

        // Initialize years for the current institution
        const institutionYears = {};

        // Function to fetch courses and modules for each year
        function fetchYearData(yearIndex) {
          if (yearIndex >= years.length) {
            // All years processed, assign years data to institution and proceed to next institution
            formattedData[institutionId] = {
              name: institution.institution_name,
              years: institutionYears
            };
            fetchInstitutionData(institutionIndex + 1);
            return;
          }

          const year = years[yearIndex];
          const yearNumber = year.year_number;

          // Fetch courses for the current year
          const coursesQuery = `
              SELECT C.course_id, C.course_name, C.course_code
              FROM Courses C
              INNER JOIN Years Y ON C.year_id = Y.year_id
              WHERE C.institution_id = ? AND Y.year_number = ?
          `;

          db.query(coursesQuery, [institutionId, yearNumber], (err, courses) => {
            if (err) {
              console.error('Error fetching courses for year ' + yearNumber + ' in institution ' + institutionId + ': ' + err.stack);
              callback(err, null);
              return;
            }

            // Initialize courses for the current year
            const yearCourses = {};

            // Function to fetch modules for each course
            function fetchCourseData(courseIndex) {
              if (courseIndex >= courses.length) {
                // All courses processed, assign courses data to year and proceed to next year
                institutionYears[yearNumber] = { courses: yearCourses };
                fetchYearData(yearIndex + 1);
                return;
              }

              const course = courses[courseIndex];
              const courseId = course.course_id;
              const courseName = course.course_name;
              const courseCode = course.course_code;

              // Fetch modules for the current course
              const modulesQuery = `
                  SELECT module_code, module_name
                  FROM Modules
                  WHERE institution_id = ? AND course_id = ?
              `;

              db.query(modulesQuery, [institutionId, courseId], (err, modules) => {

                if (err) {
                  console.error('Error fetching modules for course ' + courseId + ' in year ' + yearNumber + ' in institution ' + institutionId + ': ' + err.stack);
                  callback(err, null);
                  return;
                }

                // Format modules for the current course
                const courseModules = {};
                modules.forEach(module => {
                  courseModules[module.module_code] = module.module_name;
                });

                // Assign modules data to course and proceed to next course
                yearCourses[courseCode] = { courseName: courseName, modules: courseModules };
                fetchCourseData(courseIndex + 1);
              });
            }

            // Start fetching data for the current year
            fetchCourseData(0);
          });
        }

        // Start fetching data for the current institution
        fetchYearData(0);
      });
    }

    // Start fetching data for the first institution
    fetchInstitutionData(0);
  });
}

// Used by submit form generator and view class
function getCourseInfo(inst, crs, yr, callback) {
  // Ensure all parameters are strings and concatenate them with '-' separator
  var code = (inst.toString() + '-' + crs.toString() + '-' + yr.toString()).toUpperCase();
  //console.log("Course info request", code);
  
  const query = `
  SELECT m.module_code, m.module_name
  FROM Modules m
  INNER JOIN Courses c ON m.course_id = c.course_id
  INNER JOIN Years y ON m.year_id = y.year_id
  WHERE m.institution_id = ? AND y.year_number = ? AND c.course_code = ?
`;
  
  // Execute the query with parameters
  db.query(query, [inst, yr, crs], (err, results) => {
    if (err) {
      console.error('Error fetching course information:', err);
      callback(err, null, code);
      return;
    }
    
    // Process query results
    const modules = results.map(row => ({
      module_code: row.module_code,
      module_name: row.module_name
    }));
    
    // Return module information
    callback(null, modules, code);
  });
}

// Old backup function
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

// GlobalApp state
// Fetches general information about the whole CheckOut app and is always available
app.get('/api/app/state', function (req, res) {
  appStatus(function (err, result) {
    if (err) {
      res.status(500);
      res.send("Error")
      console.log("Error in globalapp status");
      return;
    }
    res.json(result);
  });
});

// All info
// Fetches all data from modules updwards
app.get('/api/app/everything', function (req, res) {
  fetchEverythingData(function (err, data) {
    if (err) {
      res.status(500);
      res.send("Error")
      console.log("Error in globalapp status", err, err.stack);
      return;
    }
    res.json({ Institutions: data });
  });
});

// All info
// Fetches all data from modules updwards and displays in pretty JSON
app.get('/api/app/everything/pretty', function (req, res) {
  fetchEverythingData(function (err, data) {
    if (err) {
      res.status(500);
      res.send("Error")
      console.log("Error in globalapp status", err, err.stack);
      return;
    }
    res.header("Content-Type",'application/json');
    res.send(JSON.stringify({ Institutions: data }, null, 2));
  });
});

// Endpoint to fetch institutions
app.get('/api/app/find/inst', function(req, res) {
  // Query to fetch all institutions
  const query = `
  SELECT institution_id, name
  FROM Institutions
  ORDER BY
    CASE
      WHEN institution_id = 'ysj' THEN 0
      WHEN institution_id = 'yrk' THEN 1
      WHEN institution_id = 'test' THEN 2
      ELSE 3
    END, name;
  `;

  // Execute the query
  db.query(query, function(err, results) {
    if (err) {
      console.error('Error fetching institutions:', err);
      return res.status(500).json({ success: false, reason: 'Internal server error' });
    }

    // Return the array of institutions
    res.json(results);
  });
});

// Endpoint to retrieve years given a specific institution
app.get('/api/app/find/:inst/yr', function(req, res) {
  // Extract institution code from request parameters
  const institutionId = req.params.inst;

  // Validate institution ID
  if (!institutionId) {
    res.status(400).json({ success: false, reason: 'Missing institution ID in request parameters.' });
    return;
  }

  // Fetch years for the specified institution from the database
  const query = `
    SELECT year_number
    FROM Years
    WHERE institution_id = '${institutionId}'
  `;

  db.query(query, function(err, years) {
    if (err) {
      console.error('Error fetching years for institution:', err);
      res.status(500).json({ success: false, reason: 'Internal server error' });
      return;
    }

    // Return the list of years for the institution
    const yearNumbers = years.map(year => year.year_number);
    res.json({ institution_id: institutionId, years: yearNumbers });
  });
});

// Endpoint to get courses for a specific institution and year
app.get('/api/app/find/:inst/:yr/crs', function(req, res) {
  // Extract institution ID and year number from request parameters
  const institutionId = req.params.inst;
  const yearNumber = req.params.yr;

  // Validate input data
  if (!institutionId || !yearNumber) {
    return res.status(400).json({ success: false, reason: 'Missing institution ID or year number in request parameters.' });
  }

  // Query to fetch courses for the given institution and year
  const query = `
    SELECT c.course_code, c.course_name
    FROM Courses c
    JOIN Years y ON c.year_id = y.year_id
    WHERE c.institution_id = ? AND y.year_number = ?
  `;

  // Execute the query
  db.query(query, [institutionId, yearNumber], function(err, result) {
    if (err) {
      console.error('Error fetching courses:', err);
      return res.status(500).json({ success: false, reason: 'Internal server error.' });
    }

    // Extract courses from the query result
    const courses = result.map(course => ({
      course_code: course.course_code,
      course_name: course.course_name
    }));

    // Return courses as JSON response
    res.json({ institution_id: institutionId, year: yearNumber, courses: courses });
  });
});

// Endpoint to get all modules for a specific course, year, and institution
app.get('/api/app/find/:inst/:yr/:crs/md', function(req, res) {
  // Extract institution ID, year number, course code from request parameters
  const institutionId = req.params.inst;
  const yearNumber = req.params.yr;
  const courseCode = req.params.crs;

  // Validate input data
  if (!institutionId || !yearNumber || !courseCode) {
      return res.status(400).json({ success: false, reason: 'Missing required parameters in request path.' });
  }

  // Query to fetch modules for the specified course, year, and institution
  const query = `
    SELECT M.module_code, M.module_name, I.name AS institution_name, C.course_name
    FROM Modules M
    INNER JOIN Courses C ON M.course_id = C.course_id
    INNER JOIN Years Y ON M.year_id = Y.year_id
    INNER JOIN Institutions I ON M.institution_id = I.institution_id
    WHERE M.institution_id = ? AND Y.year_number = ? AND C.course_code = ?
  `;

  // Execute the query
  db.query(query, [institutionId, yearNumber, courseCode], function(err, modules) {
    if (err) {
      console.error('Error fetching modules:', err);
      return res.status(500).json({ success: false, reason: 'Internal server error.' });
    }

    // Prepare the response
    const response = {
      institution_id: institutionId,
      institution_name: modules.length > 0 ? modules[0].institution_name : null,
      year: parseInt(yearNumber),
      course_code: courseCode,
      course_name: modules.length > 0 ? modules[0].course_name : null,
      modules: modules.map(module => ({
        module_code: module.module_code,
        module_name: module.module_name
      }))
    };

    // Return the response
    res.json(response);
  });
});

// Codes API
// Gets the days codes in json format for a given, institution (inst), course (crs), year (yr) and module code (md)
app.get('/api/app/codes/:inst/:crs/:yr/:md', function (req, res) {
  var inst = req.params.inst;
  var crs = req.params.crs;
  var yr = req.params.yr;
  var md = req.params.md;
  getCodes(inst, crs, yr, md, "%", function (err, codesObject) {
    if (err) {
      res.status(500);
      res.send("Error")
      console.log("Error in globalapp status", err);
      return;
    }
    res.json(codesObject)
  });
});

// Codes API
// Gets the days codes in json format for a given, institution (inst), course (crs), year (yr) and module code (md)
app.get('/api/app/codes2/:inst/:crs/:yr/:md', function (req, res) {
  var inst = req.params.inst;
  var crs = req.params.crs;
  var yr = req.params.yr;
  var md = req.params.md;
  getCodesAlg(inst, crs, yr, md, "%", function (err, codesObject) {
    if (err) {
      res.status(500);
      res.send("Error")
      console.log("Error in globalapp status", err);
      return;
    }
    res.json(codesObject)
  });
});

/**
 * @api {get} /api/app/v2 Get all data for user's home view
 * @apiName GetHomeData
 * @apiVersion 1.1.1
 * @apiGroup Home
 *
 * @apiSuccess {Object} userInfo User information
 * @apiSuccess {String} userInfo.username Username
 * @apiSuccess {Number} sessionCount Number of sessions
 * @apiSuccess {Boolean} tibl Tibl status
 * @apiSuccess {String} msg Message
 * @apiSuccess {String} api API version
 *
 * @apiError (403) Forbidden Course information not set or course not supported
 * @apiError (500) InternalServerError Error processing request
 */

app.get('/api/app/v2', async function (req, res) {
  const { inst, crs, yr, username, initCourse } = req;
  handleCourseRequest(inst, crs, yr, username, initCourse, res, req, false, false);
});

/**
 * @api {get} /api/app/active/:inst/:crs/:yr Get active codes for the day
 * @apiName GetActiveCodes
 * @apiVersion 1.1.1
 * @apiGroup Codes
 *
 * @apiSuccess {Object} userInfo User information
 * @apiSuccess {String} userInfo.username Username
 * @apiSuccess {Number} sessionCount Number of sessions
 * @apiSuccess {Boolean} tibl Tibl status
 * @apiSuccess {String} msg Message
 * @apiSuccess {String} api API version
 *
 * @apiError (403) Forbidden Course not supported
 * @apiError (500) InternalServerError Error processing request
 */

app.get('/api/app/active/:inst/:crs/:yr', function (req, res) {
  const { inst, crs, yr } = req.params;
  const { username } = req;
  const initCourse = true; // Assumed to be true as per the requirement
  handleCourseRequest(inst, crs, yr, username, initCourse, res, req, false, false);
});

async function handleCourseRequest(inst, crs, yr, username, initCourse, res, req, returnAsJson = false, cachedUser = false) {
  const userInfo = { username };
  const apiVersion = 'home-v2 (v.1.1.2)';
  const courseInfo = await courseFinder.courseDetails(inst, crs, yr);

  // Check user has course saved
  if (!initCourse) {
    const response = {
      success: false,
      userInfo,
      sessionCount: 0,
      tibl: false,
      msg: 'Course information not set. Please re-onboard <a class="error-link" href="/api/app/onboarding">here</a>.',
      api: apiVersion
    };
    return returnAsJson ? response : res.status(403).json(response);
  }

  // Check course exists
  if (!courseInfo['success']) {
    const response = {
      success: false,
      userInfo,
      sessionCount: 0,
      tibl: false,
      msg: `${courseInfo['reason']} Please re-onboard <a class="error-link" href="/api/app/onboarding">here</a>.`,
      api: apiVersion
    };
    return returnAsJson ? response : res.status(403).json(response);
  }

  // Timetabled courses
  if (courseInfo['tibl']) {
    try {
      const codesObject = await new Promise((resolve, reject) => {
        getCodesAlg(inst, crs, yr, "%", "%", (err, codesObject) => {
          if (err) reject(err);
          else resolve(codesObject);
        });
      });

      // true to cache user data
      const responseJson = await tibl.apiGenCodes(codesObject, inst, crs, yr, req, cachedUser);
      if (returnAsJson) {
        return JSON.parse(responseJson);
      } else {
        res.header("Content-Type", 'application/json');
        return res.send(responseJson);
      }
    } catch (err) {
      console.error("Error in getCodes or apiGenCodes", err);
      if (returnAsJson) {
        return { success: false, userInfo, sessionCount: 0, tibl: false, msg: 'Error processing codes request', api: apiVersion };
      } else {
        return res.status(500).send("Error processing codes request");
      }
    }
  } else { // Non-timetabled courses
    return new Promise((resolve, reject) => {
      getCourseInfo(inst, crs, yr, function (err, resultModules, code) {
        if (err) {
          if (returnAsJson) {
            reject(err);
          } else {
            res.status(500).send("Error");
            console.log("Error in legacy status");
          }
          return;
        }
        const response = {
          success: true,
          userInfo,
          sessionCount: 0,
          tibl: false,
          msg: 'Non-timetabled course.',
          api: apiVersion,
          courseInfo,
          legacy_modules: resultModules
        };
        if (returnAsJson) {
          resolve(response);
        } else {
          res.json(response);
        }
      });
    });
  }
}

// Get next class
app.get('/api/app/nextclass', function (req, res) {
  const { inst, crs, yr } = req;
  tibl.fetchFutureActivity(inst, crs, yr, function (err, futureActivities) {
    if (err) {
      res.status(500);
      res.json({success: false, msg: 'Error fetching future activities. Make sure course is set.'});
      //console.log("Error in getCodes", err);
      return;
    }
    res.json(futureActivities);
  });
});

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

// Generate submission form (Legacy)
// Creates the code submission form for a given, institution (inst), course (crs) and year (yr)
app.get('/api/app/form/:inst/:crs/:yr', function (req, res) {
  var inst = req.params.inst;
  var crs = req.params.crs;
  var yr = req.params.yr;
  
  if ((inst == "yrk"&&crs=="cs"&&yr=="2") || (inst == "test"&&crs=="test_course"&&yr=="0")) {

    tibl.webGen(true, false, inst, crs, yr, req, res, () => {

    })

  } else {
    getCourseInfo(inst, crs, yr, function (err, resultModules, code) {
      if (err) {
        res.status(500);
        res.send("Error");
        console.log("Error in globalapp status");
        return;
      }

      // Generate HTML elements dynamically from resultModules
      var moduleOptionsHTML = '';
      resultModules.forEach(module => {
        moduleOptionsHTML += `<div class="moduleOption" data-value="${module.module_code}">${module.module_name}</div>`;
      });

      const crypto = require('crypto');
      const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      let randomString = '';

      for (let i = 0; i < 10; i++) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        randomString += characters.charAt(randomIndex);
      }
      
      // Pass the generated HTML elements to the EJS view
      res.render('courseForm.ejs', { randomString, rootDomain: req.rootDomain, code: code, inst, crs, yr, moduleOptionsHTML });
    });
  };
});

// Generate submission form for iOS
// Creates the code submission form for a given, institution (inst), course (crs) and year (yr)
app.get('/api/app/form/ios/:inst/:crs/:yr', function (req, res) {
  var inst = req.params.inst;
  var crs = req.params.crs;
  var yr = req.params.yr;

  if ((inst == "yrk"&&crs=="cs"&&yr=="1")) {

    tibl.webGen(true, true, inst, crs, yr, req, res, () => {

    })

  } else {
  
    getCourseInfo(inst, crs, yr, function (err, resultModules, code) {
      if (err) {
        res.status(500);
        res.send("Error");
        console.log("Error in globalapp status");
        return;
      }

      // Generate HTML elements dynamically from resultModules
      var moduleOptionsHTML = '';
      resultModules.forEach(module => {
        moduleOptionsHTML += `<div class="moduleOption" data-value="${module.module_code}">${module.module_name}</div>`;
      });
      const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      let randomString = '';

      for (let i = 0; i < 34; i++) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        randomString += characters.charAt(randomIndex);
      }
      var rootDomain = 'rejectdopamine.com';
      
      // Pass the generated HTML elements to the EJS view
      res.render('ios-courseForm.ejs', { randomString, rootDomain, code: code, inst, crs, yr, moduleOptionsHTML });
    });
  }
});

// Submit endpoint
// Takes a POST body input with a new code, body input contains institution (inst), course (crs), year (yr), module code (md), group code (grp), checkout code (chc) and tk token (tk)
app.post('/api/app/submit',function(req,res){ // Submission
  secureRoute.auth("apisubmit", req, res, () => {
    submitcode(req,res, (callback, userMsg) => {
      try {
        if (callback === "normal") {
          var inst = req.body.inst; // Institution code
          var crs = req.body.crs; // course code
          var yr = req.body.yr; // year code
          var moduleCode = req.body.md // Module Code
          var tk = req.body.tk;
          // Construct the URLs for 'undo' and 'next'
          //var undo = "https://" + req.rootDomain + "/undo?tk=" + tk + "&md=" + moduleCode;
          var undo = "https://" + req.rootDomain + "/history"
          var next = "https://"+req.rootDomain+"/api/app/class/"+inst+"/"+crs+"/"+yr+"/"+moduleCode

          // Send JSON response instead of rendering EJS view
          res.json({
              success: "true",
              next: next,
              undo: undo
          });
        } else if (callback === "ratelimit"){
          res.status(429);
          //var msg = "You've made too many submissions today."
          res.json({
            success: "false",
            message: userMsg
          });
        } else if (callback === "flagged"){
          res.status(403);
          //var msg = "Your request was flagged. Try reloading the page."
          res.json({
            success: "false",
            message: userMsg
          });
        } else {
          console.log(callback)
          //var msg = "Something went wrong."
          res.json({
            success: "false",
            message: userMsg
          });
          res.render("error.ejs", {err})
        }
      } catch (err) {
        console.log(err)
      }
    });
  });
})

app.post('/api/app/visibility/:vis',function(req,res){ // Hide/Show submission
  var tk = req.body.tk;
  var vis = req.params.vis;
  if (req.undoEnable === true) {
    var visSQL = `UPDATE codes SET visState = ? WHERE tk = ?`;
    db.query(visSQL, [vis, tk], function(err,visResult) {
      if (err) {
        console.log(err);
        res.json({"success": false, "msg":"Failed to change visibility of submission"});
      } else {
        res.json({"success": true, "msg":"Visibility of code updated. It can take up to a minute for this change to be reflected on CheckOut."});
      }
    })
  } else {
    var err = "Undo submission is currently disabled.";
    res.json({"success": false, "msg":err});
  }
})

// Give codes to extension
app.post('/api/app/extension/codes',function(req,res){ 
  res.status(404)
  res.json({"success:": "false", "api": "extension/1.2", "msg": "This api is retired. Please refer to the api documentation for reference on the 'active' codes api."})
})

// API endpoint to add an institution
app.post('/api/app/add/institution', function(req, res) {
  // Validate API key
  const apiKey = req.body.apiKey;
  if (!validateAPIKey(apiKey, req.userState)) {
    res.status(403).json({ success: false, reason: 'Invalid API key' });
    return;
  }

  // Check if required parameters are present in the request body
  if (!req.body.inst || !req.body.institutionName) {
    res.status(400).json({ success: false, reason: 'Missing required parameters' });
    return;
  }

  // Database logic to add a new institution
  const institutionId = req.body.inst;
  const institutionName = req.body.institutionName;

  // Example SQL query to insert data into the Institutions table
  const query = `
    INSERT INTO Institutions (institution_id, name)
    VALUES ('${institutionId}', '${institutionName}')
  `;
  
  // Execute the SQL query
  db.query(query, (err, result) => {
    if (err) {
      console.error('Error adding institution:', err);
      res.status(500).json({ success: false, reason: 'Internal server error' });
      return;
    }

    // Respond with success message
    const response = {
      success: true,
      databaseresponse: `New institution added: ${institutionId} - ${institutionName}`
    };
    res.json(response);
  });
});

// Endpoint for adding a year to an institution
app.post('/api/app/add/year', function(req, res) {
  // Extract institution ID and year number from request body
  const institutionId = req.body.inst;
  const yearNumber = req.body.yr;

  // Validate API key
  if (!validateAPIKey(req.body.apiKey, req.userState)) {
      return res.status(403).json({ success: false, reason: 'Invalid API key.' });
  }

  // Validate input data
  if (!institutionId || !yearNumber) {
      return res.status(400).json({ success: false, reason: 'Missing institution ID or year number in request body.' });
  }

  // Insert the year into the database
  const query = `
      INSERT INTO Years (institution_id, year_number)
      VALUES ('${institutionId}', ${yearNumber})
  `;

  db.query(query, function(err, result) {
      if (err) {
          console.error('Error adding year to institution:', err);
          return res.status(500).json({ success: false, reason: 'Internal server error.' });
      }

      // Return success response
      res.json({ success: true, message: 'Year added to institution successfully.' });
  });
});

// Endpoint for adding a new course to an institution's year
app.post('/api/app/add/course', function(req, res) {
  // Extract institution ID, year number, new course name, and course code from request body
  const institutionId = req.body.inst;
  const yearNumber = req.body.yr;
  const newCourseName = req.body.newCourseName;
  const newCourseCode = req.body.crs;

  // Validate API key
  if (!validateAPIKey(req.body.apiKey, req.userState)) {
      return res.status(403).json({ success: false, reason: 'Invalid API key.' });
  }

  // Validate input data
  if (!institutionId || !yearNumber || !newCourseName || !newCourseCode) {
      return res.status(400).json({ success: false, reason: 'Missing required parameters in request body.' });
  }

  // Insert the new course into the database
  const query = `
      INSERT INTO Courses (institution_id, year_id, course_code, course_name)
      SELECT '${institutionId}', Y.year_id, '${newCourseCode}', '${newCourseName}'
      FROM Years Y
      WHERE Y.institution_id = '${institutionId}' AND Y.year_number = ${yearNumber}
  `;

  db.query(query, function(err, result) {
      if (err) {
          console.error('Error adding new course to institution year:', err);
          return res.status(500).json({ success: false, reason: 'Internal server error.' });
      }

      // Return success response
      res.json({ success: true, message: 'New course added to institution year successfully.' });
  });
});

// Add a module to a course
app.post('/api/app/add/module', function(req, res) {
  // Extract institution ID, year number, course code, module code, and module name from request body
  const institutionId = req.body.inst;
  const yearNumber = req.body.yr;
  const courseCode = req.body.crs;
  const moduleCode = req.body.md;
  const moduleName = req.body.newModuleName;

  // Validate API key
  if (!validateAPIKey(req.body.apiKey, req.userState)) {
      return res.status(403).json({ success: false, reason: 'Invalid API key.' });
  }

  // Validate input data
  if (!institutionId || !yearNumber || !courseCode || !moduleCode || !moduleName) {
      return res.status(400).json({ success: false, reason: 'Missing required parameters in request body.' });
  }

  // Insert the new module into the database
  const query = `
      INSERT INTO Modules (institution_id, year_id, course_id, module_code, module_name)
      SELECT ?, Y.year_id, C.course_id, ?, ?
      FROM Years Y
      JOIN Courses C ON Y.institution_id = C.institution_id AND Y.year_id = C.year_id
      WHERE Y.institution_id = ? AND Y.year_number = ? AND C.course_code = ?
  `;

  db.query(query, [institutionId, moduleCode, moduleName, institutionId, yearNumber, courseCode], function(err, result) {

      if (err) {
          console.error('Error adding new module:', err);
          return res.status(500).json({ success: false, reason: 'Internal server error.' });
      }

      // Return success response
      res.json({ success: true, message: 'New module added successfully.' });
  });
});


app.get('/api/app/onboarding', function(req,res) {
  res.status(200)
  const query = `
  SELECT institution_id, name
  FROM Institutions
  ORDER BY
    CASE
      WHEN institution_id = 'ysj' THEN 0
      WHEN institution_id = 'yrk' THEN 1
      WHEN institution_id = 'test' THEN 2
      ELSE 3
    END, name;
  `;
  db.query(query, function(err, results) {
    if (err) {
      console.error('Error fetching institutions:', err);
      return res.status(500).json({ success: false, reason: 'Error fetching institutions' });
    }
    res.render("onboarding-non-min.ejs", {instData: results})
  });
})


app.get('/api/app/on/yrk', function(req,res) {
  res.status(200)
  res.render("yrk-auto.ejs")
})


app.get('/api/app/onboardingbeta', function(req,res) {
  res.status(200)
  const query = `
  SELECT institution_id, name
  FROM Institutions
  ORDER BY
    CASE
      WHEN institution_id = 'ysj' THEN 0
      WHEN institution_id = 'yrk' THEN 1
      WHEN institution_id = 'test' THEN 2
      ELSE 3
    END, name;
  `;
  db.query(query, function(err, results) {
    if (err) {
      console.error('Error fetching institutions:', err);
      return res.status(500).json({ success: false, reason: 'Error fetching institutions' });
    }
    console.log(results)
    res.render("onboarding-non-min.ejs", {instData: results})
  });
})

app.get('/api/app/onboarding2/ios', function(req,res) {
  res.status(200)
  const query = `
  SELECT institution_id, name
  FROM Institutions
  ORDER BY
    CASE
      WHEN institution_id = 'ysj' THEN 0
      WHEN institution_id = 'yrk' THEN 1
      WHEN institution_id = 'demo' THEN 2
      ELSE 3
    END, name;
  `;
  db.query(query, function(err, results) {
    if (err) {
      console.error('Error fetching institutions:', err);
      return res.status(500).json({ success: false, reason: 'Error fetching institutions' });
    }
    res.render("ios-onboarding.ejs", {instData: results})
  });
})

app.get('/api/app/onboarding/ios', function(req,res) {
  res.status(200);
  res.render("ios-account.ejs");
})

app.get('/api/app/session', (req, res) => {
  res.send(req.session)
});

app.get('/api/app/sessionID', (req, res) => {
  const sessionID = req.sessionID
  res.json({success: true, deviceID: sessionID})
});

// Register a user
app.post('/api/app/account/register', (req, res) => {
  res.status(500).json({ message: 'Sign in is currently disabled.' });
});

// Login with API key
app.get('/api/app/hashtransfer', (req, res) => {
  //console.log(req.headers.host, req.rootDomain, req.url)
  if (!req.headers.host.includes(req.rootDomain)) {
    var redirectURL = "https://"+req.rootDomain+req.url;
    res.redirect(redirectURL);
  } else {
    const apikey = req.query.apikey;
    var intent = req.query.intent || '';
    if (intent == "manage" || intent == "delete") {
      intent = "account";
    }
    if (intent == "home" || intent == "/") {
      intent = "";
    }
    var sqluser = `SELECT id FROM users WHERE api_token = ?`;
    db.query(sqluser, [apikey], function(err, result) { // execute SQL query
      if (result.length == 0) {
        res.status(403)
        res.send("API Key invalid")
      } else {
        // const secretToken = result[0]['secret_token']
        // res.cookie("logintoken", secretToken, {
        //   maxAge: 31556952000 // Expires in 1 year 
        // });

        const userID = result[0]['id'];
        // Set user information in the session
        req.session.user = { id: userID };

        const queryParams = req.query;
        var redirectURL = "https://"+req.rootDomain+"/"+intent;
        redirectURL += '?' + new URLSearchParams(queryParams).toString();
        res.redirect(redirectURL)
      }
    })
  }
});

// Account info
app.post('/api/app/account/info', (req, res) => {
  const secretToken = req.body.secret_token;
  db.query('SELECT email, api_token FROM users WHERE secret_token = ? OR api_token = ?', [secretToken, req.apikey], (err, result) => {
      if (err) throw err;
      res.json({ accountinfo: result });
  });
});

const NodeCache = require('node-cache');
const homeCourseRequestCache = new NodeCache({ stdTTL: 30, deleteOnExpire: false }); // Cache for 30 seconds, keep expired entries

app.get('/', async function(req,res){
  // rejectdopamine.com (maybe?) check and course check
  //console.log(!req.headers.host.includes('rejectdopamine.com'))
  if (((!req.headers.host.includes('rejectdopamine.com') || !req.headers.host.includes('www.checkout.ac'))) || req.query.hash=="y") {
    if (req.query.r == "y") { 
      var redirectNotice = 1
    } else {
      var redirectNotice = 0
    }
    //if (req.inst=="yrk"&&req.crs=="cs"&&req.yr=="1"){
    if (true) {
      if (redirectNotice) {
        var site_notice = `You've been redirected from rejectdopamine.com to checkout.ac - the new home of CheckOut.`
      }

      try {
        const inst = req.inst;
        const crs = req.crs;
        const yr = req.yr;
        const username = "Cached";
        const initCourse = req.initCourse;

        const cacheKey = `${inst}-${crs}-${yr}-${username}-${initCourse}`;

        //console.log(cacheKey);
        //mykeys = homeCourseRequestCache.keys(); 
        //console.log( mykeys );

        // Try to fetch data from cache, even if expired
        let cachedResponse = homeCourseRequestCache.get(cacheKey);

        if (!cachedResponse) {
          //console.log('No cache data found, fetching fresh data...');
          // If no cache data exists at all, fetch fresh data
          cachedResponse = await Promise.race([
            handleCourseRequest(inst, crs, yr, username, initCourse, false, false, true, true),
            new Promise((resolve) => setTimeout(() => resolve({}), 3000))
          ]);
          if ((Object.keys(cachedResponse).length !== 0) || true) { // check its not {}
            homeCourseRequestCache.set(cacheKey, cachedResponse); // Cache the fresh data
          } else { // Disabled for now as testing is not done
            // Force cache harder requests
            handleCourseRequest(inst, crs, yr, username, initCourse, false, false, true, true)
              .then((freshData) => {
                homeCourseRequestCache.set(cacheKey, freshData); // Update the cache with fresh data
              })
              .catch((error) => {
                console.error('Error fetching fresh course data:', error);
              });
          }
        } else {
          // Trigger an async cache update if the cached version is expired
          if (homeCourseRequestCache.getTtl(cacheKey) && Date.now() > homeCourseRequestCache.getTtl(cacheKey)) {
            handleCourseRequest(inst, crs, yr, username, initCourse, false, false, true, true)
              .then((freshData) => {
                homeCourseRequestCache.set(cacheKey, freshData); // Update the cache with fresh data
              })
              .catch((error) => {
                console.error('Error fetching fresh course data:', error);
              });
          }
        }

        // Render the response using the cached or fresh data
        res.render('home/home-v3.ejs', {
          rootDomain: req.rootDomain,
          username: req.username,
          site_notice,
          v2Data: JSON.stringify(cachedResponse),
          cacheUsername: true
        });

        // Optional: Clean up entries older than 1 day (86400 seconds)
        homeCourseRequestCache.keys().forEach((key) => {
          const ttl = homeCourseRequestCache.getTtl(key);
          if (ttl && (Date.now() - ttl > 86400000)) { // 1 day in milliseconds
            homeCourseRequestCache.del(key); // Delete entries older than 1 day
          }
        });

      } catch (error) {
        console.error('Error handling course request:', error);
        res.status(500).render('notices/generic-msg.ejs', { msgTitle: "Error", msgBody: "CheckOut not available due to an internal error.", username: 'Error' })
      }


      // Commented code used to auto-gen submit form etc

      // tibl.webGen(false, false, req.inst, req.crs, req.yr, req, res, (err, returnedValues) => {
      //   if (err) {
      //       // Handle error
      //       console.error(err);
      //       return;
      //   }
    
      //   //console.log(returnedValues)
      //   const [randomString, code, inst, crs, yr, sessionOptionsHTML, sessionsLabel, OP] = returnedValues;
      //   var currentCodesView = `<iframe id="currentClasses" src="https://`+req.rootDomain+`/api/app/classframe/yrk/cs/1/all" style="border:0px #000000 solid;margin-bottom:100px;" name="myiFrame" scrolling="no" frameborder="1" marginheight="0px" marginwidth="0px" height="100%" width="950px" allowfullscreen=""></iframe>`
      //   res.render('homev2.ejs', {redirectNotice, rootDomain: req.rootDomain, randomString, code, inst, crs, yr, sessionOptionsHTML, sessionsLabel, OP, currentCodesView, frame: "submit", userState: req.userState})
      // });
    } else { //if (req.inst!="null"&&req.crs!="null"&&req.yr!="null"){
      // Old setup for non-timetabled courses
      res.render('homev2.ejs', {redirectNotice, rootDomain: req.rootDomain, frame: "iframesubmit"})
      //res.render('home/home-v3.ejs', {rootDomain: req.rootDomain})
    } 
    // else {
    //   const queryParams = req.query;
    //   var onboardLink = '/api/app/on/yrk';
    //   onboardLink += '?' + new URLSearchParams(queryParams).toString();
    //   res.redirect(onboardLink);
    // }
  } else {
    if (req.headers.host.includes('rejectdopamine.com')) {
      var redirectURL = "https://"+req.rootDomain+'/r=y';
    } else {
      var redirectURL = "https://"+req.rootDomain+'/';
    }
    // if (req.userState != "anon" && !(req.query.hash == "y")) {
    //   var redirectURL = "https://"+req.rootDomain+'/api/app/hashtransfer?hash=y&r=y&intent=home&apikey='+req.apitoken;
    // } else if (req.headers.host.includes('rejectdopamine.com')) {
    //   var redirectURL = "https://"+req.rootDomain+req.url+'?r=y&rejecthash=n';
    // } else {
    //   var redirectURL = "https://"+req.rootDomain+'/api/app/on/yrk?r=n';
    // }
    // res.cookie("inst", "yrk", {
    //   maxAge: 31556952000 // Expires in 1 year 
    // });
    // res.cookie("crs", "cs", {
    //   maxAge: 31556952000 // Expires in 1 year 
    // });
    // res.cookie("yr", "1", {
    //   maxAge: 31556952000 // Expires in 1 year 
    // });
    res.redirect(redirectURL);
  }
});

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

app.get('*', function(req,res) {
  res.status(404);
  res.json({ 'success': false, msg: 'Not a valid endpoint. (app-api)' });
})

module.exports = app;

