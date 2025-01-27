const express = require('express')
var db=require('../databases/database');
var app = express.Router();
function getClassData(md, callback) { // OLD
    try {
      var moment = require('moment');
      var codeDay = moment(Date.now()).add(0, 'hours').format('YYYY-MM-DD');
      var sqlQuery =
        'SELECT groupCode, checkinCode FROM `' +
        md.toString() +
        '` WHERE codeDay = "' +
        codeDay.toString() +
        '" ORDER BY groupCode ASC;';
      //console.log(sqlQuery);
      db.query(sqlQuery, function (err, result, fields) {
        if (err) {
          callback(err, null);
          return;
        }
  
        // Work out submission count
        const groupedData = {};
  
        // Group identical rows
        result.forEach((row) => {
          const key = JSON.stringify(row);
          if (groupedData[key]) {
            groupedData[key].count++;
          } else {
            groupedData[key] = { data: row, count: 1 };
          }
        });
  
        // Convert grouped data back to array
        const mergedArray = Object.values(groupedData).map(({ data, count }) => {
          if (count > 1) {
            data.groupCode += ` (VFD${count})`;
          }
          return data;
        });
  
        callback(null, mergedArray);
      });
    } catch (err) {
      callback(err, null);
    }
  }

  app.get('/classdata/*', function (req, res) { // OLD
    var md = req.params[0];
      getClassData(md, function (err, result) {
        if (err) {
          res.render('error.ejs', { err });
          console.log("Unauthenticated user tried to access class data, was rejected");
          return;
        }
        res.json(result);
      });
  });

app.use("*", (req, res) => { // Old
    var mdMsg = ''
    const md = req.headers.host.split('.')[0];
    if (md === 'transition') {
        mdMsg = `<br><u>-'s Transition Lecture:</u><br><ul>
        <li>Nothing to show here :(</li>
        </ul>`
    }
    if (md === 'hcip') {
        mdMsg = `<br><u>Friday's HCI Tutorials:</u><br><ul>
        <li>12:30 Grp 2</li>
        <li>15:30 Grp 3</li>
        <li>16:30 Grp 4</li>
        <li>17:30 Grp 5</li>
        </ul>`
    }
    if (md === 'theory1') {
        mdMsg = `<br><u>Friday's Theory 1 Q&A:</u><br><br><ul>
        <li>13:30 Theory 1 Lecture Review (Q&A)</li>
        </ul>`
    }
    getClassData(md, function (err, result) {
      if (err) {
          res.render('error.ejs', { err });
          console.log("Unauthenticated user tried to access class data, was rejected");
          return;
      }

      // Pass the result to the EJS renderer
      res.render('class.ejs', { md, mdMsg, classData: result });
    });
    return;
});
module.exports = app;

