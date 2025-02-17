const express = require('express');
var app = express.Router();
var courseFinder = require('./course-find.ts');

// Endpoint to get all modules for a specific course, year, and institution
app.get('/api/course/find/:inst/:crs/:yr', async function (req, res) {
  // Extract institution ID, year number, and course code from request parameters
  const institutionId = req.params.inst;
  const yearNumber = req.params.yr;
  const courseCode = req.params.crs;

  // Validate input data
  if (!institutionId || !yearNumber || !courseCode) {
    return res
      .status(400)
      .json({ success: false, reason: 'Missing required parameters in request path.' });
  }

  try {
    // Use the courseDetails function to get the data
    const response = await courseFinder.courseDetails(institutionId, courseCode, yearNumber);
    // Return the data as JSON
    res.json(response);
  } catch (error) {
    res.status(500).json({ success: false, reason: 'Internal server error.' });
  }
});

app.get('*', function (req, res) {
  res.status(404);
  res.json({ success: false, msg: 'Not a valid endpoint. (course-api)' });
});

module.exports = app;
