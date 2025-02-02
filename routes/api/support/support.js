const express = require('express');
const router = express.Router();
const db = require('../../../databases/database-v2');

// Submit a support request
router.post('/api/support/submit', async function (req, res) {
    try {
        const {
            issueType,
            email,
            newEmail,
            codeId,
            chc,
            message
        } = req.body;

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
            deviceId: req.sessionID
        };

        // Insert into database
        const query = 'INSERT INTO support_requests (form_data) VALUES (?)';
        const [result] = await db.execute(query, [JSON.stringify(formData)]);

        if (result.affectedRows === 1) {
            res.json({
                success: true,
                msg: 'Support request submitted successfully',
                requestId: result.insertId
            });
        } else {
            throw new Error('Failed to insert support request');
        }
    } catch (error) {
        console.error('Error submitting support request:', error);
        res.status(500).json({
            success: false,
            msg: 'Failed to submit support request'
        });
    }
});

// Catch-all for invalid endpoints
router.get('*', function (req, res) {
    res.status(404);
    res.json({ 'success': false, msg: 'Not a valid endpoint. (support-api)' });
});

module.exports = router; 