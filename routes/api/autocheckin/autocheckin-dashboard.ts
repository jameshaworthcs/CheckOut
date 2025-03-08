const express = require('express');
const moment = require('moment-timezone');
const axios = require('axios');
require('dotenv').config();
var app = express.Router();
var db = require('../../../databases/database.ts');
var secureRoute = require('../../secure.ts');

// Get data for a users autoCheckin dashboard
app.get('/api/autocheckin/dashboard/v1', (req, res, next) => {
  // Check if a custom email is specified
  const customEmail = req.query.email;
  
  // If custom email is provided and different from user's email, verify sysop permissions
  if (customEmail && customEmail !== req.useremail) {
    return secureRoute.auth('sysop', req, res, () => {
      fetchDashboardData(customEmail, req, res);
    });
  }
  
  // Otherwise use the user's own email
  fetchDashboardData(req.useremail, req, res);
});

// Serve dashboard JavaScript file with injected data
app.get('/api/autocheckin/dashboard/app/js', (req, res, next) => {
  // Check if a custom email is specified
  const customEmail = req.query.email;
  
  // If custom email is provided and different from user's email, verify sysop permissions
  if (customEmail && customEmail !== req.useremail) {
    return secureRoute.auth('sysop', req, res, () => {
      fetchDashboardJsWithData(customEmail, req, res);
    });
  }
  
  // Otherwise use the user's own email
  fetchDashboardJsWithData(req.useremail, req, res);
});

function fetchDashboardJsWithData(email, req, res) {
  const query = `
    SELECT 
      u.username,
      u.email,
      u.checkinstate,
      u.checkinReport,
      u.checkinReportTime,
      u.sync,
      JSON_ARRAYAGG(
        IF(l.email IS NOT NULL,
          JSON_OBJECT(
            'email', l.email,
            'state', l.state,
            'timestamp', l.timestamp,
            'message', l.message
          ),
          NULL
        )
      ) as autoLogData
    FROM users u
    LEFT JOIN autoCheckinLog l ON u.email = l.email AND l.state != 'Normal'
    WHERE u.email = ?
    GROUP BY u.email, u.username, u.checkinstate, u.checkinReport, u.checkinReportTime, u.sync`;

  db.query(query, [email], (err, result) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).send('// Error: An error occurred while fetching dashboard data');
    }
    
    if (!result || result.length === 0) {
      return res.status(404).send('// Error: User not found');
    }
    
    try {
      const dashboardData = {
        username: result[0].username,
        email: result[0].email,
        checkinstate: result[0].checkinstate,
        checkinReport: result[0].checkinReport,
        checkinReportTime: result[0].checkinReportTime,
        sync: result[0].sync,
        autoLogData: result[0].autoLogData 
          ? result[0].autoLogData
              .filter(item => item !== null)
              .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
          : []
      };

      // Set content type to JavaScript
      res.setHeader('Content-Type', 'application/javascript');
      
      // Render the dashboard-js.ejs template with the dashboard data
      res.render('autocheckin/dashboard/dashboard-js', {
        dashboardData: JSON.stringify(dashboardData),
        isJsRoute: true
      });
    } catch (error) {
      console.error('Response processing error:', error);
      res.status(500).send('// Error: An error occurred while processing the response');
    }
  });
}

function fetchDashboardData(email, req, res) {
  const query = `
    SELECT 
      u.username,
      u.email,
      u.checkinstate,
      u.checkinReport,
      u.checkinReportTime,
      u.sync,
      JSON_ARRAYAGG(
        IF(l.email IS NOT NULL,
          JSON_OBJECT(
            'email', l.email,
            'state', l.state,
            'timestamp', l.timestamp,
            'message', l.message
          ),
          NULL
        )
      ) as autoLogData
    FROM users u
    LEFT JOIN autoCheckinLog l ON u.email = l.email AND l.state != 'Normal'
    WHERE u.email = ?
    GROUP BY u.email, u.username, u.checkinstate, u.checkinReport, u.checkinReportTime, u.sync`;

  db.query(query, [email], (err, result) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ 
        success: false, 
        error: 'An error occurred while fetching dashboard data'
      });
    }
    
    if (!result || result.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    try {
      const response = {
        success: true,
        autoCheckinDashboardData: {
          username: result[0].username,
          email: result[0].email,
          checkinstate: result[0].checkinstate,
          checkinReport: result[0].checkinReport,
          checkinReportTime: result[0].checkinReportTime,
          sync: result[0].sync,
          autoLogData: result[0].autoLogData 
            ? result[0].autoLogData
                .filter(item => item !== null)
                .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            : []
        }
      };

      
      res.json(response);
    } catch (error) {
      console.error('Response processing error:', error);
      res.status(500).json({
        success: false,
        error: 'An error occurred while processing the response'
      });
    }
  });
}

app.get('*', function (req, res) {
  res.status(404);
  res.json({ success: false, msg: 'Not a valid endpoint. (autocheckin-dashboard-api)' });
});

module.exports = app;
