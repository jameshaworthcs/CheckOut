const express = require('express');
const router = express.Router();
const db = require('../../../database');
const crypto = require('crypto');

function getPastCodes(req, res, callback) {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;

    if (req.userState == 'sysop') {
      var sqlQuery = `SELECT * FROM codes ORDER BY timestamp DESC LIMIT ? OFFSET ?;`;
      var countQuery = `SELECT COUNT(*) as total FROM codes;`;
      var params = [limit, offset];
      var countParams = [];
    } else {
      var sqlQuery = `SELECT * FROM codes WHERE 
    (ip = ? OR deviceID = ? OR 
    (username != 'anon@checkout.ac.uk' AND username != 'guest@checkout.ac.uk' AND username = ?)) 
    ORDER BY timestamp DESC LIMIT ? OFFSET ?;`;
      var countQuery = `SELECT COUNT(*) as total FROM codes WHERE 
    (ip = ? OR deviceID = ? OR 
    (username != 'anon@checkout.ac.uk' AND username != 'guest@checkout.ac.uk' AND username = ?));`;
      var params = [req.usersIP, deviceID, req.useremail, limit, offset];
      var countParams = [req.usersIP, deviceID, req.useremail];
    }

    if (req.sessionID) { var deviceID = req.sessionID; } else {
      var deviceID = 'null';
    }
    
    // Generate a random secret of 64 bytes and convert to hex string
    const secret = crypto.randomBytes(64).toString('hex');

    // First get total count
    db.query(countQuery, countParams, function(err, countResult) {
      if (err) {
        callback(err, null);
        return;
      }

      const totalCount = countResult[0].total;

      // Then get paginated results
      db.query(sqlQuery, params, function (err, result) {
        if (err) {
          callback(err, null);
          return;
        }

        // Calculate statistics for current page
        const usernameCounts = {};
        const ipCounts = {};
        const deviceIDCounts = {};

        result.forEach(row => {
          // Hash usernames if not anon or guest
          if (row.username && row.username !== 'anon@checkout.ac.uk' && row.username !== 'guest@checkout.ac.uk') {
            const hashedUsername = crypto.createHash('sha256').update(secret + row.username).digest('hex').substring(0, 10);
            usernameCounts[hashedUsername] = (usernameCounts[hashedUsername] || 0) + 1;
          } else {
            usernameCounts[row.username] = (usernameCounts[row.username] || 0) + 1;
          }
      
          // Hash IPs
          const hashedIp = crypto.createHash('sha256').update(secret + (row.ip || '')).digest('hex').substring(0, 10);
          ipCounts[hashedIp] = (ipCounts[hashedIp] || 0) + 1;
      
          // Hash deviceIDs
          const hashedDeviceID = crypto.createHash('sha256').update(secret + (row.deviceID || '')).digest('hex').substring(0, 10);
          deviceIDCounts[hashedDeviceID] = (deviceIDCounts[hashedDeviceID] || 0) + 1;
        });

        // Hash the results
        const hashedResult = result.map(row => {
          const hashTimestamp = crypto.createHash('sha256');
          const hashIp = crypto.createHash('sha256');
          const hashUseragent = crypto.createHash('sha256');
          const hashDeviceID = crypto.createHash('sha256');
          const hashUsername = crypto.createHash('sha256');
          
          hashTimestamp.update(secret + (row.timestamp || ''));
          const hashedTimestamp = hashTimestamp.digest('hex').substring(0, 10);

          hashIp.update(secret + (row.ip || ''));
          const hashedIp = hashIp.digest('hex').substring(0, 10);

          hashUseragent.update(secret + (row.useragent || ''));
          const hashedUseragent = hashUseragent.digest('hex').substring(0, 10);

          hashDeviceID.update(secret + (row.deviceID || ''));
          const hashedDeviceID = hashDeviceID.digest('hex').substring(0, 10);

          let hashedUsername = '';
          if (row.username && row.username !== 'anon@checkout.ac.uk' && row.username !== 'guest@checkout.ac.uk') {
            hashUsername.update(secret + row.username);
            hashedUsername = hashUsername.digest('hex').substring(0, 10);
          }

          return {
            ...row,
            timestamp: hashedTimestamp,
            ip: hashedIp,
            useragent: hashedUseragent,
            deviceID: hashedDeviceID,
            username: hashedUsername
          };
        });

        // Return data with pagination info
        const dataWithStats = {
          stats: {
            totalCount,
            usernameCounts,
            ipCounts,
            deviceIDCounts
          },
          pagination: {
            offset,
            limit,
            total: totalCount,
            hasMore: offset + result.length < totalCount
          },
          pastCodes: hashedResult
        };

        callback(null, dataWithStats);
      });
    });

  } catch (err) {
    callback(err, null);
  }
}

// History endpoint
router.get('/api/history/history', function (req, res) {
  getPastCodes(req, res, function (err, codesObject) {
    if (err) {
      res.status(500);
      res.send("Error")
      console.log("Error in history status", err);
      return;
    }
    res.header("Content-Type",'application/json');
    res.send(JSON.stringify(codesObject, null, 2));
  });
});

router.get('*', function (req, res) {
    res.status(404);
    res.json({ 'success': false, msg: 'Not a valid endpoint. (history-api)' });
})

module.exports = router; 