var db = require('../../../database');
var db2 = require('../../../database-v2');
const moment = require('moment-timezone');
const crypto = require('crypto');
var autoApp = require('../../autocheckin');
const fetchAutoCheckers = autoApp.fetchAutoCheckers;

// Async function to check for repeat submissions
async function checkRepeatSubmissions(submissionData) {
    const { ip, codeDay, tk } = submissionData;
    const sqlspam = `SELECT * FROM codes WHERE (ip = ? AND codeDay = ?) OR tk = ?`;
    try {
        const [rows] = await db2.query(sqlspam, [ip, codeDay, tk]);
        return rows;
    } catch (error) {
        console.error('Error checking for repeat submissions:', error);
        throw error;
    }
}

// Async function to insert new submission
async function insertCode(submissionData) {
    const {
        inst, crs, yr, md, codeDay, groupCode, checkinCode, mysqlTimestamp,
        ip, useragent, tk, deviceID, username, codeState, codeDesc, visState, source, verifiedInfo
    } = submissionData;

    const sqlInsert = `INSERT INTO codes (inst, crs, yr, md, codeDay, groupCode, checkinCode, timestamp, ip, useragent, tk, deviceID, username, codeState, codeDesc, codeReps, visState, source, verifiedInfo) 
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    try {
        const [result] = await db2.query(sqlInsert, [
            inst, crs, yr, md, codeDay, groupCode, checkinCode, mysqlTimestamp, ip,
            useragent, tk, deviceID, username, codeState, codeDesc, "0", visState, source, verifiedInfo
        ]);
        return result;
    } catch (error) {
        console.error('Error inserting code:', error);
        throw error;
    }
}

// Main async function to submit code
async function submitCode(submissionData) {
    try {
        // Destructure values from submissionData
        const {
            inst, crs, yr, md: moduleCode, grp: groupCode, chc: checkinCode,
            ip, useragent, deviceID, useremail: username, userState, ipRateLimit
        } = submissionData;

        const codeDay = moment().tz('Europe/London').format('YYYY-MM-DD');
        const mysqlTimestamp = moment().tz('Europe/London').format('YYYY-MM-DD HH:mm:ss');
        const tk = crypto.randomBytes(16).toString('hex');
        let codeState = '1';
        let codeDesc = '';
        const visState = '1';
        const source = 'Web/App';
        let blockRepeat = 'normal';
        let userMsg = '';
        const verifiedInfo = JSON.stringify({});

        // Check for repeat submissions
        const repeatResults = await checkRepeatSubmissions({ ip, codeDay, tk });

        for (const element of repeatResults) {
            //console.log(repeatResults, element.ip, ip, element.checkinCode, checkinCode);
            if (element.tk === tk && userState !== 'sysop') {
                blockRepeat = 'flagged';
                userMsg = "Error: You've already submitted. Try reloading the page or app.";
                codeDesc = 'TK Repeat';
                codeState = '0';
            } else if (element.ip === ip && element.checkinCode === checkinCode && userState !== 'sysop') {
                blockRepeat = 'flagged';
                userMsg = `Warning: You've already submitted code ${checkinCode}! Don't attempt this submission again.`;
                codeDesc = 'Code Repeat';
                codeState = '0';
            }
        }

        // Additional validation checks
        //console.log(repeatResults.length, ipRateLimit)
        if ((repeatResults.length >= ipRateLimit) && (userState !== 'sysop')) {
            blockRepeat = 'ratelimit';
            userMsg = `Error: You've exceeded ${ipRateLimit} submissions today.`;
            codeDesc = 'IP Limit';
            codeState = '0';
        } else if (!/^\d{6}$/.test(checkinCode) || new Set(checkinCode).size === 1 || checkinCode.length !== 6 || checkinCode.charAt(0) === '0') {
            blockRepeat = 'flagged';
            userMsg = "Error: CheckOut code is invalid.";
            codeDesc = 'Code Invalid';
            codeState = '0';
        } else if ((tk === '' || tk === undefined) && userState !== 'sysop') {
            blockRepeat = 'flagged';
            userMsg = "Error: Required security parameters not present.";
            codeDesc = 'TK Null';
            codeState = '0';
        }

        // Insert code into database if no errors
        if (blockRepeat === 'normal' || true) {
            const result = await insertCode({
                inst, crs, yr, md: moduleCode, codeDay, groupCode, checkinCode, mysqlTimestamp,
                ip, useragent, tk, deviceID, username, codeState, codeDesc, visState, source, verifiedInfo
            });

            // Run AutoCheckin
            if (process.env.CHK_SRV == "PROD") {
                fetchAutoCheckers();
            }

            return {
                success: true,
                submit: (codeState == '1') ? true : false,
                msg: userMsg,
                result,
            };
        } else {
            return {
                success: false,
                msg: userMsg || 'Submission blocked due to invalid data.',
                blockReason: blockRepeat,
            };
        }
    } catch (error) {
        console.error('Error submitting code:', error);
        return {
            success: false,
            msg: 'Error processing submission.',
            error,
        };
    }
}


module.exports = { submitCode };