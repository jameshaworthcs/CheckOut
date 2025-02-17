var db = require('../databases/database.ts');

let moduleCache = null;
let cacheTimeout = null;

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

  const tibl_id = `tibl_${inst}_${crs}_${yr}`;

  try {
    const extractedData = await fetchInProgressRowsPromise(tibl_id);
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

function fetchInProgressRowsPromise(tibl_id) {
  return new Promise((resolve, reject) => {
    fetchInProgressRows(tibl_id, (err, inProgressRows, extractedData) => {
      if (err) {
        reject(err);
      } else {
        resolve(extractedData);
      }
    });
  });
}

async function fetchInProgressRows(tibl_id, callback) {
  const query = `
    SELECT *
    FROM ${tibl_id}  
    WHERE DATE_FORMAT(CONVERT_TZ(NOW(), 'UTC', 'Europe/London'), '%Y-%m-%d') BETWEEN DATE_FORMAT(STR_TO_DATE(\`Start date\`, '%Y-%m-%d'), '%Y-%m-%d')
        AND DATE_FORMAT(STR_TO_DATE(\`End date\`, '%Y-%m-%d'), '%Y-%m-%d')
        AND CONVERT_TZ(NOW(), 'UTC', 'Europe/London') BETWEEN 
            STR_TO_DATE(CONCAT(\`Start date\`, ' ', \`Start time\`), '%Y-%m-%d %H:%i') AND
            STR_TO_DATE(CONCAT(\`End date\`, ' ', \`End time\`), '%Y-%m-%d %H:%i');
  `;

  try {
    const result = await db.query(query);
    const inProgressRows = result.filter((row) => true);
    const extractedData = await Promise.all(
      inProgressRows.map(async (row) => {
        const moduleInfo = await getModuleInfo(row['Module code']);
        return {
          activityReference: row['Activity reference'],
          size: row['Size'],
          startTime: row['Start time'],
          endTime: row['End time'],
          location: row['Location(s)'],
          sysMd: row['Module code'],
          moduleCode: moduleInfo.moduleCode,
          tiblModuleCode: row['Module code'],
          activityID: row['activityID'],
          day: row['Start day'],
          date: row['Start date'],
          endDate: row['End date'],
        };
      })
    );
    callback(null, inProgressRows, extractedData);
  } catch (err) {
    console.error('Error fetching in-progress rows:', err);
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
  const tibl_id = db.escapeId(`tibl_${inst}_${crs}_${yr}`);
  const query = `
    SELECT *
    FROM ${tibl_id}
    WHERE DATE_FORMAT(CONVERT_TZ(NOW(), 'UTC', 'Europe/London'), '%Y-%m-%d %H:%i') < STR_TO_DATE(CONCAT(\`Start date\`, ' ', \`Start time\`), '%Y-%m-%d %H:%i')
    ORDER BY STR_TO_DATE(CONCAT(\`Start date\`, ' ', \`Start time\`), '%Y-%m-%d %H:%i')
    LIMIT 1;
  `;

  try {
    const result = await db.query(query);
    //console.log('result:', result);
    if (result.length === 0) {
      return callback(null, [], []);
    }

    const nextStartTime = result[0]['Start time'];
    const nextStartDate = result[0]['Start date'];
    //console.log('nextStartTime:', nextStartTime);
    //console.log('nextStartDate:', nextStartDate);

    const nextSessionsQuery = `
      SELECT *
      FROM ${tibl_id}
      WHERE STR_TO_DATE(CONCAT(\`Start date\`, ' ', \`Start time\`), '%Y-%m-%d %H:%i:%s') = STR_TO_DATE('${nextStartDate.toISOString().substring(0, 10)} ${nextStartTime}', '%Y-%m-%d %H:%i:%s');
    `;
    //console.log('nextSessionsQuery:', nextSessionsQuery);

    const nextSessionsResult = await db.query(nextSessionsQuery);
    const extractedData = nextSessionsResult.map((row) => ({
      activityReference: row['Activity reference'],
      //size: row['Size'],
      startTime: row['Start time'],
      //endTime: row['End time'],
      location: row['Location(s)'],
      //sysMd: row['Module code'],
      //moduleCode: moduleCodeMapping[row['Module code']] || null,
      activityID: row['activityID'],
      //day: row['Start day'],
      startDate: row['Start date'],
      //endDate: row['End date'],
    }));

    callback(null, extractedData);
  } catch (err) {
    console.error('Error fetching future activity:', err);
    callback(err);
  }
}

// only for legacy site:

function webGen(frame, ios, inst, crs, yr, req, res, next) {
  const tibl_id = db.escapeId(`tibl_${inst}_${crs}_${yr}`);
  fetchInProgressRows(tibl_id, (err, inProgressRows, extractedData) => {
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
  fetchInProgressRows('tibl_yrk_cs_1', (err, inProgressRows, extractedData) => {
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
  fetchInProgressRows,
  webGen,
  webGenCodes,
  apiGenCodes,
  fetchFutureActivity,
  fetchFutureActivityPromise,
};
