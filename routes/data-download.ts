const express = require('express');
var app = express.Router();
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET;
import { AppRequest } from 'utils/types';
import { Response } from 'express';
const archiver = require('archiver');
var db = require('../databases/database.ts');
var db2 = require('../databases/database-v2.ts');

app.get('/secure/apps/data-download', (req: AppRequest, res: Response) => {
    const token = req.cookies.servicetoken;

    if (!token) {
        return res.redirect('/secure/hostedapps/service-reauth');
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const userID = decoded.userID;
        res.render('data-download.ejs', { username: req.username, userID: userID, email: req.useremail });
    } catch (err) {
        return res.redirect('/secure/hostedapps/service-reauth');
    }
});

/**
 * Handles the data download request.
 * Verifies the user's service token, fetches various user data from
 * different database tables (users, codes, request_log, autoCheckinLog),
 * parses specific fields (like 'sync'), packages the data into JSON files
 * within a zip archive, and streams the archive to the client.
 */
app.get('/secure/apps/data-download/download', async (req: AppRequest, res: Response) => {
    const token = req.cookies.servicetoken;

    if (!token) {
        return res.redirect('/secure/hostedapps/service-reauth');
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const userID = decoded.userID;
        const username = decoded.username;
        const useremail = decoded.useremail;

        res.header('Content-Type', 'application/zip');
        res.header('Content-Disposition', 'attachment; filename="checkout-data-download.zip"');

        const archive = archiver('zip', {
            zlib: { level: 9 }
        });

        archive.on('error', function(err) {
          console.error("Archiving error:", err);
          if (!res.headersSent) {
             res.status(500).send({success: false, error: err.message});
          }
        });

        archive.pipe(res);

        const accountRows = await db.query('SELECT * FROM users WHERE id = ?', [userID]);

        let accountDataToAppend = {};

        if (accountRows && accountRows.length > 0) {
            accountDataToAppend = accountRows[0];

            if (accountDataToAppend.sync && typeof accountDataToAppend.sync === 'string') {
               try {
                 accountDataToAppend.sync = JSON.parse(accountDataToAppend.sync);
               } catch (e) {
                 console.error('Error parsing sync JSON for download:', e);
               }
            }
        } else {
            console.log("No account data found for user:", userID);
        }
        archive.append(JSON.stringify(accountDataToAppend, null, 2), { name: 'account.json' });


        const tkResult = await db.query(
            `SELECT * FROM codes WHERE
             (username != 'anon@checkout.ac.uk' AND username != 'guest@checkout.ac.uk' AND username = ?)
             ORDER BY timestamp DESC`,
            [useremail]
          );
        archive.append(JSON.stringify(tkResult || [], null, 2), { name: 'tk_log.json' });

        const [requestLogResult] = await db2.query(
            'SELECT * FROM request_log WHERE user_id = ? ORDER BY timestamp DESC',
            [userID]
        );
        archive.append(JSON.stringify(requestLogResult || [], null, 2), { name: 'request_log.json' });


        const autoCheckinResult = await db.query(
            'SELECT * FROM autoCheckinLog WHERE email = ? ORDER BY timestamp DESC',
            [useremail]
        );
        archive.append(JSON.stringify(autoCheckinResult || [], null, 2), { name: 'auto_checkin_log.json' });

        await archive.finalize();

    } catch (err) {
        console.error("Data download error:", err);
        if (!res.headersSent) {
             res.status(500).json({ success: false, message: 'Failed to generate data download.' });
        }
    }
});

module.exports = app;


