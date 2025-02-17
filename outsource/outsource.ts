var tibl = require('../routes/tibl.ts');
const { spawn } = require('child_process');
const express = require('express');
var app = express.Router();

const outsource = () => {
  tibl.fetchInProgressRows((err, inProgressRows, extractedData) => {
    if (err) {
      // Handle error
      console.error(err);
      return;
    }

    //console.log(returnedValues)
    if (!(extractedData.length == 0)) {
      var largeDataSet = [];
      const python = spawn('/usr/abenv/bin/python3.10', ['/var/www/checkin/outsource/shrine.py']);
      // collect data from script
      python.stdout.on('data', function (data) {
        //console.log('Pipe data from python script ...');
        largeDataSet.push(data);
      });
      // in close event we are sure that stream is from child process is closed
      python.on('close', (code) => {
        //console.log(`child process close all stdio with code ${code}`);
        //console.log(largeDataSet)
      });
    } else {
      //console.log("no active classes")
    }
  });
};

// Start the interval
//setInterval(outsource, 5000);

module.exports = app;
