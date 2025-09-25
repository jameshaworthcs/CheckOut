var db = require('../databases/database.ts');

let moduleCache = null;
let cacheTimeout = null;

async function getModuleCodesForCourse(inst, crs, yr) {
  const query = `
    SELECT m.module_tibl_code
    FROM Modules m
    JOIN Courses c ON c.course_id = m.course_id
    JOIN Years y ON y.year_id = m.year_id
    WHERE c.institution_id = ?
      AND c.course_code = ?
      AND y.year_number = ?
      AND m.module_tibl_code IS NOT NULL
  `;
  const rows = await db.query(query, [inst, crs, Number(yr)]);
  return rows.map((r) => r.module_tibl_code);
}

async function getModuleInfo(tiblModuleCode) {
  // Initialize or refresh cache if needed
  if (!moduleCache) {
    await refreshModuleCache();
  }

  const moduleInfo = moduleCache.get(tiblModuleCode) || {
    moduleCode: null,
    moduleName: 'Other',
  };

  return moduleInfo;
}

async function refreshModuleCache() {
  try {
    const query = `
      SELECT module_tibl_code, module_code, module_name 
      FROM Modules
    `;
    const results = await db.query(query);

    moduleCache = new Map(
      results.map((row) => [
        row.module_tibl_code,
        {
          moduleCode: row.module_code,
          moduleName: row.module_name,
        },
      ])
    );

    // Clear existing timeout if any
    if (cacheTimeout) {
      clearTimeout(cacheTimeout);
    }

    // Set timeout to refresh cache after 1 minute
    cacheTimeout = setTimeout(refreshModuleCache, 60000);
  } catch (err) {
    console.error('Error refreshing module cache:', err);
    // Keep existing cache if refresh fails
  }
}

async function apiGenCodes(codesObject, inst, crs, yr, req, cachedUser = true) {
  /**
   * Determines the automatic check-in status based on user state and check-in conditions:
   * - 'setup-needed': User has auto check-in permissions but hasn't completed setup (checkinState = 0)
   * - 'join-waitlist': User hasn't checked in (checkinState = 0) and isn't on waitlist
   * - 'on-waitlist': User is currently on the waitlist
   * - 'error': Check-in attempt failed
   * - 'normal': Default state when none of above conditions are met
   */
  const autoInfo =
    req.checkinState === 0 &&
    (req.userState?.includes('autocheckin') || req.userState?.includes('sysop'))
      ? 'setup-needed'
      : req.checkinState === 0 && req.checkinReport !== 'Waitlist'
        ? 'join-waitlist'
        : req.checkinReport === 'Waitlist'
          ? 'on-waitlist'
          : req.checkinReport === 'Fail'
            ? 'error'
            : req.userState?.includes('anon')
              ? 'sign-in'
              : 'normal';

  const activeAPI = {
    success: true,
    api: 'active-codes/home-v2 (v.1.1.1)',
    userInfo: { username: req.username, perms: req.userState, autoInfo },
    tibl: true,
  };

  if (cachedUser) {
    activeAPI.userInfo = { username: 'Cached', perms: 'cached' };
  }

  try {
    const extractedData = await fetchInProgressRowsPromise(inst, crs, yr);
    const nextSessions = await fetchFutureActivityPromise(inst, crs, yr);
    activeAPI.nextSessions = nextSessions;

    if (extractedData.length === 0) {
      activeAPI.sessionCount = 0;
      activeAPI.msg = 'There are no classes in session.';
    } else {
      activeAPI.sessionCount = extractedData.length;
      activeAPI.msg = '';
      activeAPI.sessions = await Promise.all(
        extractedData.map(async (session) => {
          const moduleInfo = await getModuleInfo(session.tiblModuleCode);
          const start = session.startTime ? session.startTime.substring(0, 5) : '';
          const end = session.endTime ? session.endTime.substring(0, 5) : '';
          const sessionCodes = codesObject.filter(
            (codeObject) => codeObject.groupCode == session.activityID
          );

          return {
            startDate: session.date ? session.date.toISOString().substring(0, 10) : '',
            startTime: start,
            endTime: end,
            endDate: session.endDate ? session.endDate.toISOString().substring(0, 10) : '',
            description: session.activityReference,
            moduleName: moduleInfo.moduleName,
            moduleCode: moduleInfo.moduleCode,
            tiblModuleCode: session.tiblModuleCode,
            rejectID: session.activityID,
            location: session.location ? session.location.split(' ')[0] : '',
            codesCount: sessionCodes.length,
            codes: sessionCodes,
            notes: session.notes,
          };
        })
      );
    }

    return JSON.stringify(activeAPI, null, 2); // Return the formatted JSON
  } catch (err) {
    console.error('Error in apiGenCodes', err);
    throw new Error('Internal Server Error');
  }
}

function fetchInProgressRowsPromise(inst, crs, yr) {
  return new Promise((resolve, reject) => {
    fetchInProgressRowsUnified(inst, crs, yr, (err, inProgressRows, extractedData) => {
      if (err) {
        reject(err);
      } else {
        resolve(extractedData);
      }
    });
  });
}

async function fetchInProgressRowsUnified(inst, crs, yr, callback) {
  try {
    const moduleCodes = await getModuleCodesForCourse(inst, crs, yr);
    if (!moduleCodes || moduleCodes.length === 0) {
      return callback(null, [], []);
    }
    const placeholders = moduleCodes.map(() => '?').join(',');
    const query = `
      SELECT *
      FROM TimetableSessions
      WHERE module_tibl_code IN (${placeholders})
        AND DATE_FORMAT(CONVERT_TZ(NOW(), 'UTC', 'Europe/London'), '%Y-%m-%d') BETWEEN DATE_FORMAT(start_date, '%Y-%m-%d') AND DATE_FORMAT(end_date, '%Y-%m-%d')
        AND CONVERT_TZ(NOW(), 'UTC', 'Europe/London') BETWEEN 
            STR_TO_DATE(CONCAT(DATE_FORMAT(start_date, '%Y-%m-%d'), ' ', TIME_FORMAT(start_time, '%H:%i')), '%Y-%m-%d %H:%i') AND
            STR_TO_DATE(CONCAT(DATE_FORMAT(end_date, '%Y-%m-%d'), ' ', TIME_FORMAT(end_time, '%H:%i')), '%Y-%m-%d %H:%i');
    `;
    const result = await db.query(query, moduleCodes);
    const inProgressRows = result.filter((row) => true);
    const extractedData = await Promise.all(
      inProgressRows.map(async (row) => {
        const moduleInfo = await getModuleInfo(row['module_tibl_code']);
        return {
          activityReference: row['activity_reference'],
          size: row['size'],
          startTime: row['start_time'],
          endTime: row['end_time'],
          location: row['location'],
          sysMd: row['module_tibl_code'],
          moduleCode: moduleInfo.moduleCode,
          tiblModuleCode: row['module_tibl_code'],
          activityID: row['activityID'],
          day: row['start_day'],
          date: row['start_date'],
          endDate: row['end_date'],
          notes: row['notes'],
        };
      })
    );
    callback(null, inProgressRows, extractedData);
  } catch (err) {
    console.error('Error fetching in-progress rows (unified):', err);
    callback(err);
  }
}

function fetchFutureActivityPromise(inst, crs, yr) {
  return new Promise((resolve, reject) => {
    fetchFutureActivity(inst, crs, yr, (err, nextSessions) => {
      if (err) {
        reject(err);
      } else {
        resolve(nextSessions);
      }
    });
  });
}

async function fetchFutureActivity(inst, crs, yr, callback) {
  try {
    const moduleCodes = await getModuleCodesForCourse(inst, crs, yr);
    if (!moduleCodes || moduleCodes.length === 0) {
      return callback(null, []);
    }
    const placeholders = moduleCodes.map(() => '?').join(',');
    const firstQuery = `
      SELECT start_date, start_time
      FROM TimetableSessions
      WHERE module_tibl_code IN (${placeholders})
        AND DATE_FORMAT(CONVERT_TZ(NOW(), 'UTC', 'Europe/London'), '%Y-%m-%d %H:%i') < DATE_FORMAT(STR_TO_DATE(CONCAT(start_date, ' ', start_time), '%Y-%m-%d %H:%i:%s'), '%Y-%m-%d %H:%i')
      ORDER BY start_date ASC, start_time ASC
      LIMIT 1
    `;
    const result = await db.query(firstQuery, moduleCodes);
    if (!result || result.length === 0) {
      return callback(null, []);
    }
    const nextStartDate = result[0]['start_date'];
    const nextStartTime = result[0]['start_time'];
    const tsString = `${nextStartDate.toISOString().substring(0, 10)} ${nextStartTime}`;

    const nextSessionsQuery = `
      SELECT *
      FROM TimetableSessions
      WHERE module_tibl_code IN (${placeholders})
        AND STR_TO_DATE(CONCAT(start_date, ' ', start_time), '%Y-%m-%d %H:%i:%s') = STR_TO_DATE(?, '%Y-%m-%d %H:%i:%s')
    `;
    const nextSessionsResult = await db.query(nextSessionsQuery, [...moduleCodes, tsString]);
    const extractedData = nextSessionsResult.map((row) => ({
      activityReference: row['activity_reference'],
      startTime: row['start_time'],
      location: row['location'],
      activityID: row['activityID'],
      startDate: row['start_date'],
      notes: row['notes'],
    }));
    callback(null, extractedData);
  } catch (err) {
    console.error('Error fetching future activity (unified):', err);
    callback(err);
  }
}

// only for legacy site:

function webGen(frame, ios, inst, crs, yr, req, res, next) {
  fetchInProgressRowsUnified(inst, crs, yr, (err, inProgressRows, extractedData) => {
    if (err) {
      return next(err);
    }

    let sessionOptionsHTML = '';
    let sessionsLabel = '';
    let OP = 0;
    let sl = '';

    if (extractedData.length === 0) {
      sessionsLabel =
        '<br><br>There are no classes currently in session. Check back here when your class starts.';
    } else if (extractedData.length === 1) {
      sessionsLabel = '';
      OP = 1;
      sl = ' selected';
    } else if (extractedData.length > 1) {
      sessionsLabel = `Select from ${extractedData.length} activities currently in session:`;
      OP = extractedData.length;
    }

    extractedData.forEach((session) => {
      let md;
      let moduleCode;

      switch (session.moduleCode) {
        case 'sd':
          md = 'Systems and Devices';
          moduleCode = 'sd';
          break;
        case 'soft2':
          md = 'Software';
          moduleCode = 'soft2';
          break;
        case 'theory2':
          md = 'Theory';
          moduleCode = 'theory2';
          break;
        default:
          md = 'Other';
          moduleCode = 'other';
          break;
      }

      const start = String(session.startTime).substring(0, 5);
      const end = String(session.endTime).substring(0, 5);
      sessionOptionsHTML += `<div class="sessionOption${sl}" data-module="${moduleCode}" data-activityid="${session.activityID}">${session.activityReference}<br><p class="sessionInfo">${md} &#8226; ${start} - ${end}</p></div>`;
    });

    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let randomString = '';

    for (let i = 0; i < 10; i++) {
      const randomIndex = Math.floor(Math.random() * characters.length);
      randomString += characters.charAt(randomIndex);
    }

    const code = 'production';
    if (frame) {
      if (ios) {
        const courseChange = '';
        const submitURL = '/checkin-ios/api/app/submit';
        let iosCode = 'v1.6.iOS';
        if (req.query.dev === '1') {
          iosCode += '<br>experimental mode';
        }
        return res.render('tiblForm.ejs', {
          randomString,
          rootDomain: req.rootDomain,
          code: iosCode,
          inst,
          crs,
          yr,
          sessionOptionsHTML,
          sessionsLabel,
          OP,
          courseChange,
          submitURL,
        });
      }
      return res.render('tiblForm.ejs', {
        randomString,
        rootDomain: req.rootDomain,
        code,
        inst,
        crs,
        yr,
        sessionOptionsHTML,
        sessionsLabel,
        OP,
      });
    } else {
      next(null, [randomString, code, inst, crs, yr, sessionOptionsHTML, sessionsLabel, OP]);
    }
  });
}

function webGenCodes(frame, codesObject, inst, crs, yr, req, res, next) {
  fetchInProgressRowsUnified(inst, crs, yr, (err, inProgressRows, extractedData) => {
    if (err) {
      return next(err);
    }

    let sessionOptionsHTML = '';
    let sessionsLabel = '';
    let OP = 0;
    let sl = '';
    let codeTrue = false;

    if (extractedData.length === 0) {
      sessionsLabel =
        '<br><br>There are no classes currently in session. Check back here when your class starts.';
      sessionOptionsHTML =
        'No classes currently in session. Please refresh the page once your class starts.';
    } else if (extractedData.length === 1) {
      sessionsLabel = '';
      OP = 1;
      sl = ' selected';
    } else if (extractedData.length > 1) {
      sessionsLabel = `Select from ${extractedData.length} activities currently in session:`;
      OP = extractedData.length;
    }

    extractedData.forEach((session) => {
      let md;

      switch (session.moduleCode) {
        case 'sd':
          md = 'Systems and Devices';
          break;
        case 'soft2':
          md = 'Software';
          break;
        case 'theory2':
          md = 'Theory';
          break;
        default:
          md = 'Other';
          break;
      }

      const start = String(session.startTime).substring(0, 5);
      const end = String(session.endTime).substring(0, 5);
      let sessionCodes = [];

      codesObject.forEach((codeObject) => {
        if (codeObject.groupCode == session.activityID) {
          sessionCodes.push(codeObject);
        }
      });

      if (sessionCodes.length > 0) {
        sessionCodes.sort((a, b) => b.rejectScore - a.rejectScore);

        var codeTable = `<h4>Codes:</h4><table>`;
        codeTrue = true;
        sessionCodes.forEach((codes) => {
          codeTable += `<tr><td>${codes.checkinCode}</td>
          <td><button onclick=copyText("${codes.checkinCode}") class="share-button">Copy</button></td>
          </tr>`;
        });
        codeTable += `</table>`;
      } else {
        codeTable = `<h4>No code submitted yet. Add yours <a target="_parent" class="sub-table-link" href="https://checkout.ac/">here</a>.`;
      }

      sessionOptionsHTML += `<div class="sessionOption${sl}" data-module="${session.moduleCode}" data-activityid="${session.activityID}"><div class="toprowdiv"><p class="toprowclass">&#8226; ${session.activityReference}</p><p class="sessionInfo toprowclass" style="text-align:right;">${start} - ${end}<br>${md}</p></div>${codeTable}</div>`;
    });

    if (codeTrue) {
      sessionOptionsHTML += `Copy the code and submit at <a target="_parent" class="sub-table-link" href="https://checkin.york.ac.uk">checkin.york.ac.uk</a>.`;
    }

    const code = 'v5.2.prod';
    const timetableBullets = '';
    const submitIntent = 'Add yours <a target="_parent" class="sub-table-link" href="/">here</a>.';

    if (frame) {
      return res.render('classv4.ejs', {
        sessionOptionsHTML,
        code,
        timetableBullets,
        submitIntent,
      });
    } else {
      next(null, [sessionOptionsHTML, code, timetableBullets, submitIntent]);
    }
  });
}

module.exports = {
  fetchInProgressRows: fetchInProgressRowsUnified,
  webGen,
  webGenCodes,
  apiGenCodes,
  fetchFutureActivity,
  fetchFutureActivityPromise,
};
