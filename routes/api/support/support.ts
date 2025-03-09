const express = require('express');
const router = express.Router();
const db = require('../../../databases/database-v2.ts');
const { sendEmail } = require('../../email.ts');

// Submit a support request
router.post('/api/support/submit', async function (req, res) {
  try {
    const { issueType, email, newEmail, codeId, chc, message } = req.body;

    // Check rate limit for IP
    const rateLimitQuery = `
            SELECT COUNT(*) as request_count 
            FROM support_requests 
            WHERE JSON_EXTRACT(form_data, '$.ip') = ? 
            AND created_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)
        `;
    const [rateLimitResult] = await db.execute(rateLimitQuery, [req.usersIP]);

    if (rateLimitResult[0].request_count >= 5) {
      return res.status(429).json({
        success: false,
        msg: 'You have exceeded the maximum number of support requests (5) allowed in 24 hours. Please try again later or contact us through alternative means if your matter is urgent.',
      });
    }

    // Create form_data object with all submitted fields
    const formData = {
      issueType,
      email,
      newEmail,
      codeId,
      chc,
      message,
      userState: req.userState || 'anon',
      userId: req.userID || null,
      deviceId: req.sessionID,
      ip: req.usersIP,
    };

    // Insert into database
    const query = 'INSERT INTO support_requests (form_data) VALUES (?)';
    const [result] = await db.execute(query, [JSON.stringify(formData)]);

    if (result.affectedRows === 1) {
      // Send response immediately
      res.json({
        success: true,
        msg: 'Support request submitted successfully',
        requestId: result.insertId,
      });

      // Send email notification asynchronously
      const timestamp = new Date().toLocaleString('en-GB', {
        dateStyle: 'full',
        timeStyle: 'long',
        timeZone: 'Europe/London',
      });

      sendEmail(
        'james@jameshaworth.dev',
        `New Support Request [${issueType}] [${result.insertId}]`,
        `
                <p><strong>New support request received</strong></p>
                <p>Issue Type: ${issueType}</p>
                <p>Submitted: ${timestamp}</p>
                `
      ).catch((err) => {
        // Silently log email errors without affecting the response
        console.error('Error sending support notification email:', err);
      });
      sendEmail(
        'checkout-support-request@jemedia.xyz',
        `New CheckOut Support Request [${issueType}] [${result.insertId}]`,
        `
                <p><strong>New support request received (thank you <3)</strong></p>
                <p>Issue Type: ${issueType}</p>
                <p>Submitted: ${timestamp}</p>
                `
      ).catch((err) => {
        // Silently log email errors without affecting the response
        console.error('Error sending support notification email:', err);
      });
    } else {
      throw new Error('Failed to insert support request');
    }
  } catch (error) {
    console.error('Error submitting support request:', error);
    res.status(500).json({
      success: false,
      msg: 'Failed to submit support request',
    });
  }
});

// Catch-all for invalid endpoints
router.get('*', function (req, res) {
  res.status(404);
  res.json({ success: false, msg: 'Not a valid endpoint. (support-api)' });
});

module.exports = router;
