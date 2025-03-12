const express = require('express');
var db2 = require('../../../databases/database-v2.ts');
var app = express.Router();
const secureRoute = require('../../secure.ts');
const ejs = require('ejs');
const path = require('path');
const fs = require('fs').promises;
const { sendEmail } = require('../../email.ts');

// Function to send ticket email
const sendTicketEmail = async (email, username) => {
  try {
    const templatePath = path.join(process.cwd(), 'views', 'autocheckin', 'ticket-email.html');
    const template = await fs.readFile(templatePath, 'utf-8');
    const html = ejs.render(template, { name: username });
    
    await sendEmail(
      email,
      'The wait is over... your ticket for AutoCheckin is here!',
      html,
      ['AutoCheckin_ticket_banner_v1.png']
    );
    
    return true;
  } catch (error) {
    console.error('Error sending ticket email:', error);
    throw error;
  }
};

// POST endpoint to grant AutoCheckin access to a user
app.post('/manage/api/autocheckin/grant-auto', async (req, res) => {
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'User ID is required' });
  }

  try {
    // First, check if the user exists and get their current information
    const [userRows] = await db2.query('SELECT id, email, username, userstate FROM users WHERE id = ?', [userId]);
    
    if (userRows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userRows[0];
    
    // Check if user already has autocheckin access
    if (user.userstate && user.userstate.includes('autocheckin')) {
      return res.json({ 
        success: true, 
        message: 'User already has AutoCheckin access',
        userStateUpdated: false,
        emailSent: false
      });
    }

    // Update userstate to add autocheckin access
    const newUserState = user.userstate ? `${user.userstate}, autocheckin` : 'normal, autocheckin';
    await db2.query('UPDATE users SET userstate = ? WHERE id = ?', [newUserState, userId]);
    
    // Send ticket email
    await sendTicketEmail(user.email, user.username);
    
    res.json({ 
      success: true, 
      message: 'AutoCheckin access granted and ticket email sent successfully',
      userStateUpdated: true,
      userState: newUserState,
      emailSent: true
    });
  } catch (error) {
    console.error('Error granting AutoCheckin access:', error);
    res.status(500).json({ error: 'Failed to grant AutoCheckin access' });
  }
});

// POST endpoint to send ticket email
app.post('/manage/api/autocheckin/send-ticket', async (req, res) => {
  const { email, username } = req.body;

  if (!email || !username) {
    return res.status(400).json({ error: 'Email and username are required' });
  }

  try {
    await sendTicketEmail(email, username);
    res.json({ success: true, message: 'Ticket email sent successfully' });
  } catch (error) {
    console.error('Error sending ticket email:', error);
    res.status(500).json({ error: 'Failed to send ticket email' });
  }
});

// Get all users and their AutoCheckin info
app.get('/manage/api/autocheckin/autocheckers', async (req, res) => {
  try {
    let sql = `SELECT id, email, checkintoken, checkinstate, fullName, checkinReport, checkinReportTime, userstate 
        FROM users`;
    //WHERE checkinstate = 1 OR checkinReport = 'Waitlist' OR userstate LIKE '%autocheckin%'`;

    const [rows] = await db2.query(sql);
    console.log(secureRoute.checkPermissions('sysop'));

    // Add autoAccess flag based on permissions check
    const enrichedRows = rows.map(async (row) => {
      const permResults = await secureRoute.checkPermissions(row.userstate);
      const allowedServices = permResults.flatMap((result) => result.routes);
      return {
        ...row,
        autoAccess: allowedServices.some((route) => route === 'autocheckin'),
      };
    });

    // Since map with async returns an array of promises, we need to wait for all of them
    const resolvedRows = await Promise.all(enrichedRows);

    res.json(resolvedRows);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get AutoCheckin logs for query email
app.get('/manage/api/autocheckin/logs', async (req, res) => {
  const email = req.query.email;

  if (!email) {
    return res.status(400).json({ error: 'Email parameter is required' });
  }

  try {
    let sql = 'SELECT * FROM autoCheckinLog WHERE email = ? ORDER BY timestamp DESC';

    const [autoCheckinLogs] = await db2.query(sql, [email]);
    res.json(autoCheckinLogs);
  } catch (error) {
    console.error('Error fetching autocheckin logs:', error);
    res.status(500).json({ error: 'Failed to fetch autocheckin logs' });
  }
});

// Delete a specific log entry
app.delete('/manage/api/autocheckin/logs/:id', async (req, res) => {
  const logId = req.params.id;

  if (!logId) {
    return res.status(400).json({ error: 'Log ID is required' });
  }

  try {
    const sql = 'DELETE FROM autoCheckinLog WHERE logID = ?';
    const [result] = await db2.query(sql, [logId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Log entry not found' });
    }

    res.json({ success: true, message: 'Log entry deleted successfully' });
  } catch (error) {
    console.error('Error deleting log entry:', error);
    res.status(500).json({ error: 'Failed to delete log entry' });
  }
});

// Update a specific log entry
app.put('/manage/api/autocheckin/logs/:id', async (req, res) => {
  const logId = req.params.id;
  const { message, timestamp } = req.body;

  if (!logId || !message || !timestamp) {
    return res.status(400).json({ error: 'Log ID, message, and timestamp are required' });
  }

  try {
    // Convert ISO string to MySQL datetime format
    const mysqlTimestamp = new Date(timestamp).toISOString().slice(0, 19).replace('T', ' ');
    const sql = 'UPDATE autoCheckinLog SET message = ?, timestamp = ? WHERE logID = ?';
    const [result] = await db2.query(sql, [message, mysqlTimestamp, logId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Log entry not found' });
    }

    res.json({ success: true, message: 'Log entry updated successfully' });
  } catch (error) {
    console.error('Error updating log entry:', error);
    res.status(500).json({ error: 'Failed to update log entry' });
  }
});

app.get('*', function (req, res) {
  res.status(404);
  res.json({ success: false, msg: 'Not a valid endpoint. (autocheckin-manage-api)' });
});

module.exports = app;
