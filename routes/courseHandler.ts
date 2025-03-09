const courseFinder = require('./api/course/course-find.ts');
const tibl = require('./tibl.ts');
const db = require('../databases/database.ts');
const workerpool = require('workerpool');

// Worker pool for getCodesAlg
const pool = workerpool.pool(__dirname + '/scoresWorker.ts');

// Gracefully shutdown the worker pool when the process exits
process.on('exit', () => {
  pool.terminate();
});

async function handleCourseRequest(
  inst,
  crs,
  yr,
  username,
  initCourse,
  res,
  req,
  returnAsJson = false,
  cachedUser = false
) {
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
      api: apiVersion,
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
      api: apiVersion,
    };
    return returnAsJson ? response : res.status(403).json(response);
  }

  // Timetabled courses
  if (courseInfo['tibl']) {
    try {
      const codesObject = await new Promise((resolve, reject) => {
        getCodesAlg(inst, crs, yr, '%', '%', (err, codesObject) => {
          if (err) reject(err);
          else resolve(codesObject);
        });
      });

      // true to cache user data
      const responseJson = await tibl.apiGenCodes(codesObject, inst, crs, yr, req, cachedUser);
      if (returnAsJson) {
        return JSON.parse(responseJson);
      } else {
        res.header('Content-Type', 'application/json');
        return res.send(responseJson);
      }
    } catch (err) {
      console.error('Error in getCodes or apiGenCodes', err);
      if (returnAsJson || true) {
        return {
          success: false,
          userInfo,
          sessionCount: 0,
          tibl: false,
          msg: 'Error processing codes request',
          api: apiVersion,
        };
      } else {
        return res.status(500).send('Error processing codes request');
      }
    }
  } else {
    // Non-timetabled courses
    return new Promise((resolve, reject) => {
      getCourseInfo(inst, crs, yr, function (err, resultModules) {
        if (err) {
          if (returnAsJson) {
            reject(err);
          } else {
            res.status(500).send('Error');
            console.log('Error in legacy status');
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
          legacy_modules: resultModules,
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

// Helper function used by handleCourseRequest
function getCourseInfo(inst, crs, yr, callback) {
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
      callback(err, null);
      return;
    }

    // Process query results
    const modules = results.map((row) => ({
      module_code: row.module_code,
      module_name: row.module_name,
    }));

    // Return module information
    callback(null, modules);
  });
}

// Helper function used by handleCourseRequest
function getCodesAlg(inst, crs, yr, md, grp, callback) {
  try {
    const sqlQuery = 'SELECT * FROM codes;';
    db.query(sqlQuery, async function (err, result) {
      if (err) {
        callback(err, null);
        return;
      }
      try {
        const scoredCodes = await pool.exec('calculate', [inst, crs, yr, md, grp, result]);
        callback(null, scoredCodes);
      } catch (workerErr) {
        callback(workerErr, null);
      }
    });
  } catch (err) {
    callback(err, null);
  }
}

module.exports = handleCourseRequest;