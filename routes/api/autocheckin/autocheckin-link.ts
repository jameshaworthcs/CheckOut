const express = require('express');
const moment = require('moment-timezone');
const axios = require('axios');
require('dotenv').config();
var app = express.Router();
var db = require('../../../databases/database.ts');
const appRouter = require('../../app.ts');
const handleCourseRequest = appRouter.handleCourseRequest;

// Wrapper functions for making requests to the autocheckin server
const makeAutoCheckinRequest = {
  get: async (endpoint: string, includeDetails: boolean = false) => {
    const startTime = Date.now();
    const fullUrl = `${process.env.CHK_AUTO_API}/${endpoint}`;
    try {
      const response = await axios.get(fullUrl, {
        family: 6,
        timeout: 10000, // 10 seconds
        // You might also want to add retry logic
        retry: 3,
        retryDelay: 1000,
        headers: {
          'x-checkout-key': process.env.CHECKOUT_API_KEY,
        },
      });
      const requestDuration = Date.now() - startTime;

      if (includeDetails) {
        const urlObject = new URL(response.config.url || fullUrl);
        return {
          success: true,
          data: response.data,
          requestDetails: {
            url: fullUrl,
            parsedUrl: {
              protocol: urlObject.protocol,
              hostname: urlObject.hostname,
              port: urlObject.port || (urlObject.protocol === 'https:' ? '443' : '80'),
              pathname: urlObject.pathname,
              search: urlObject.search,
            },
            method: 'GET',
            duration: requestDuration,
            status: response.status,
            statusText: response.statusText,
            headers: response.headers,
            requestHeaders: response.config.headers,
            networkDetails: {
              httpVersion: response.request?.httpVersion,
              localAddress: response.request?.socket?.localAddress,
              localPort: response.request?.socket?.localPort,
              remoteAddress: response.request?.socket?.remoteAddress,
              remotePort: response.request?.socket?.remotePort,
            },
          },
        };
      }
      return { success: true, data: response.data };
    } catch (error) {
      const requestDuration = Date.now() - startTime;
      console.error(`Error making GET request to ${endpoint}:`, error);

      if (includeDetails) {
        const urlObject = new URL(fullUrl);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error occurred',
          requestDetails: {
            url: fullUrl,
            parsedUrl: {
              protocol: urlObject.protocol,
              hostname: urlObject.hostname,
              port: urlObject.port || (urlObject.protocol === 'https:' ? '443' : '80'),
              pathname: urlObject.pathname,
              search: urlObject.search,
            },
            method: 'GET',
            duration: requestDuration,
            errorName: error instanceof Error ? error.name : 'Unknown',
            errorMessage: error instanceof Error ? error.message : 'Unknown error occurred',
            errorStack: error instanceof Error ? error.stack : undefined,
            axiosError: axios.isAxiosError(error)
              ? {
                  status: error.response?.status,
                  statusText: error.response?.statusText,
                  headers: error.response?.headers,
                  data: error.response?.data,
                  requestHeaders: error.config?.headers,
                  networkDetails: {
                    httpVersion: error.request?.httpVersion,
                    localAddress: error.request?.socket?.localAddress,
                    localPort: error.request?.socket?.localPort,
                    remoteAddress: error.request?.socket?.remoteAddress,
                    remotePort: error.request?.socket?.remotePort,
                  },
                }
              : undefined,
          },
        };
      }
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  },
  post: async (endpoint: string, body: any = {}) => {
    try {
      const response = await axios.post(`${process.env.CHK_AUTO_API}/${endpoint}`, body, {
        headers: {
          'x-checkout-key': process.env.CHECKOUT_API_KEY,
        },
      });
      return { success: true, data: response.data };
    } catch (error) {
      console.error(`Error making POST request to ${endpoint}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  },
};

interface LogRequest {
  email: string;
  state: 'Normal' | string;
  message?: string;
}

interface LogResponse {
  logsuccess: boolean;
  err?: any;
}

// Account token
app.get('/api/autocheckin/test', (req, res) => {
  res.json({ success: true, msg: 'CheckOut instance reachable and authenticated' });
});

// Get all users that are autoCheckin enabled
app.get('/api/autocheckin/users', (req, res) => {
  db.query(
    'SELECT email, checkintoken, checkinReport, checkinReportTime, sync FROM users WHERE checkinstate = 1',
    (err, result) => {
      if (err) throw err;
      res.json({ success: true, autoCheckinUsers: result });
    }
  );
});

// Get the active codes for a course
app.get('/api/autocheckin/codes/:inst/:crs/:yr', function (req, res) {
  const { inst, crs, yr } = req.params;
  const { username } = req;
  const initCourse = true; // Assumed to be true as per the requirement

  handleCourseRequest(inst, crs, yr, username, initCourse, res, req, false, false);
});

// Log an event to the autoCheckinLog table and update the checkinReport field
app.post('/api/autocheckin/log', async function (req, res) {
  try {
    const { email, state, message } = req.body as LogRequest;

    if (!email || !state) {
      return res.status(400).json({
        success: false,
        err: 'Missing required fields: email and state',
      });
    }

    const mysqlTimestamp = moment().tz('UTC').format('YYYY-MM-DD HH:mm:ss');

    // Update checkin report for all cases
    await new Promise((resolve, reject) => {
      const reportQuery = `UPDATE users SET checkinReport = ?, checkinReportTime = ? WHERE email = ?`;
      db.query(reportQuery, [state, mysqlTimestamp, email], (err, result) => {
        if (err) reject(err);
        else resolve(result);
      });
    });

    // Only log to autoCheckinLog if state is not Normal
    if (state !== 'Normal') {
      await new Promise((resolve, reject) => {
        const query = `INSERT INTO autoCheckinLog (email, state, message, timestamp) VALUES (?, ?, ?, ?)`;
        db.query(query, [email, state, message, mysqlTimestamp], (err, result) => {
          if (err) reject(err);
          else resolve(result);
        });
      });
    }

    res.json({ success: true, message: 'Log entry created successfully' });
  } catch (err) {
    console.error('Error in log endpoint:', err);
    res.status(500).json({
      success: false,
      err: err instanceof Error ? err.message : 'Unknown error occurred',
    });
  }
});

// Update the checkin token for a user
app.post('/api/autocheckin/update', function (req, res) {
  var oldtoken = req.body.oldtoken || 'donotuse';
  var newtoken = req.body.newtoken;
  var email = req.body.email;
  if (newtoken && oldtoken && email) {
    db.query(
      'UPDATE users SET checkintoken = ? WHERE checkintoken = ? OR email = ?',
      [newtoken, oldtoken, email],
      (err, result) => {
        if (err) throw err;
        res.json({ success: true, result });
      }
    );
  } else {
    res.status(400).json({
      success: false,
      err: 'Missing required fields: newtoken',
    });
  }
});

// Update sync data for a user with special merge logic
app.post('/api/autocheckin/update-sync', async function (req, res) {
  try {
    const { sync, email } = req.body;

    if (!sync || !email) {
      return res.status(400).json({
        success: false,
        err: 'Missing required fields: sync and email',
      });
    }

    // First, get the existing sync data
    const [existingData] = await new Promise((resolve, reject) => {
      db.query('SELECT sync FROM users WHERE email = ?', [email], (err, result) => {
        if (err) reject(err);
        else resolve(result);
      });
    });

    let existingSync = existingData?.sync || {};
    console.log(existingSync);
    let newSync = { ...existingSync };

    // Deep merge function that handles the special case for attendanceData
    const deepMerge = (target, source) => {
      for (const key in source) {
        if (key === 'attendanceData') {
          if (!target[key]) target[key] = {};
          
          // Handle attendanceData specially
          for (const year in source[key]) {
            if (!target[key][year]) target[key][year] = {};
            
            // For each week in the year, completely replace if exists
            for (const week in source[key][year]) {
              target[key][year][week] = source[key][year][week];
            }
          }
        } else if (source[key] !== null && typeof source[key] === 'object') {
          // For non-attendanceData objects, merge recursively
          target[key] = target[key] || {};
          deepMerge(target[key], source[key]);
        } else {
          // For primitive values, simply replace
          target[key] = source[key];
        }
      }
      return target;
    };

    // Merge the new sync data with existing data
    newSync = deepMerge(newSync, sync);
    console.log(newSync);
    // Update the database with the merged sync data
    await new Promise((resolve, reject) => {
      db.query(
        'UPDATE users SET sync = ? WHERE email = ?',
        [JSON.stringify(newSync), email],
        (err, result) => {
          if (err) reject(err);
          else resolve(result);
        }
      );
    });

    res.json({ success: true, message: 'Sync data updated successfully' });
  } catch (err) {
    console.error('Error in update-sync endpoint:', err);
    res.status(500).json({
      success: false,
      err: err instanceof Error ? err.message : 'Unknown error occurred',
    });
  }
});

// Test connection to autocheckin server
app.get('/api/autocheckin/test-server', async (req, res) => {
  const response = await makeAutoCheckinRequest.get('state', true);
  if (response.success) {
    res.json({
      success: response.data.success,
      reportedConnection: response.data.data.connected,
      requestDetails: response.requestDetails,
    });
  } else {
    res.json({
      success: false,
      reportedConnection: false,
      error: response.error,
      requestDetails: response.requestDetails,
    });
  }
});

app.get('*', function (req, res) {
  res.status(404);
  res.json({ success: false, msg: 'Not a valid endpoint. (autocheckin-api)' });
});

module.exports = app;
module.exports.makeAutoCheckinRequest = makeAutoCheckinRequest;
