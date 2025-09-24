const express = require('express');
var db = require('../../../databases/database.ts');
var app = express.Router();

// List entities
app.get('/manage/api/courses/institutions', async function (req, res) {
  try {
    const rows = await db.query('SELECT * FROM Institutions ORDER BY institution_id');
    res.json({ success: true, data: rows });
  } catch (e) {
    res.json({ success: false, msg: 'Database error' });
  }
});

app.get('/manage/api/courses/years', async function (req, res) {
  try {
    const rows = await db.query('SELECT * FROM Years ORDER BY institution_id, year_number');
    res.json({ success: true, data: rows });
  } catch (e) {
    res.json({ success: false, msg: 'Database error' });
  }
});

app.get('/manage/api/courses/courses', async function (req, res) {
  try {
    const rows = await db.query('SELECT * FROM Courses ORDER BY institution_id, course_code');
    res.json({ success: true, data: rows });
  } catch (e) {
    res.json({ success: false, msg: 'Database error' });
  }
});

app.get('/manage/api/courses/modules', async function (req, res) {
  try {
    const rows = await db.query('SELECT * FROM Modules ORDER BY institution_id, course_id, module_code');
    res.json({ success: true, data: rows });
  } catch (e) {
    res.json({ success: false, msg: 'Database error' });
  }
});

// Create entities
app.post('/manage/api/courses/institutions', async function (req, res) {
  try {
    await db.query('INSERT INTO Institutions (institution_id, name) VALUES (?, ?)', [req.body.institution_id, req.body.name]);
    res.json({ success: true });
  } catch (e) {
    res.json({ success: false, msg: 'Insert failed' });
  }
});

app.post('/manage/api/courses/years', async function (req, res) {
  try {
    await db.query('INSERT INTO Years (institution_id, year_number) VALUES (?, ?)', [req.body.institution_id, req.body.year_number]);
    res.json({ success: true });
  } catch (e) {
    res.json({ success: false, msg: 'Insert failed' });
  }
});

app.post('/manage/api/courses/courses', async function (req, res) {
  try {
    await db.query('INSERT INTO Courses (institution_id, year_id, course_code, course_name, tibl) VALUES (?, ?, ?, ?, ?)', [req.body.institution_id, req.body.year_id, req.body.course_code, req.body.course_name, req.body.tibl ? 1 : 0]);
    res.json({ success: true });
  } catch (e) {
    res.json({ success: false, msg: 'Insert failed' });
  }
});

app.post('/manage/api/courses/modules', async function (req, res) {
  try {
    await db.query('INSERT INTO Modules (institution_id, year_id, course_id, module_code, module_name, module_tibl_code) VALUES (?, ?, ?, ?, ?, ?)', [req.body.institution_id, req.body.year_id, req.body.course_id, req.body.module_code, req.body.module_name, req.body.module_tibl_code || null]);
    res.json({ success: true });
  } catch (e) {
    res.json({ success: false, msg: 'Insert failed' });
  }
});

// Update entities
app.put('/manage/api/courses/institutions/:id', async function (req, res) {
  try {
    await db.query('UPDATE Institutions SET name=? WHERE institution_id=?', [req.body.name, req.params.id]);
    res.json({ success: true });
  } catch (e) {
    res.json({ success: false, msg: 'Update failed' });
  }
});

app.put('/manage/api/courses/years/:id', async function (req, res) {
  try {
    await db.query('UPDATE Years SET institution_id=?, year_number=? WHERE year_id=?', [req.body.institution_id, req.body.year_number, req.params.id]);
    res.json({ success: true });
  } catch (e) {
    res.json({ success: false, msg: 'Update failed' });
  }
});

app.put('/manage/api/courses/courses/:id', async function (req, res) {
  try {
    await db.query('UPDATE Courses SET institution_id=?, year_id=?, course_code=?, course_name=?, tibl=? WHERE course_id=?', [req.body.institution_id, req.body.year_id, req.body.course_code, req.body.course_name, req.body.tibl ? 1 : 0, req.params.id]);
    res.json({ success: true });
  } catch (e) {
    res.json({ success: false, msg: 'Update failed' });
  }
});

app.put('/manage/api/courses/modules/:id', async function (req, res) {
  try {
    await db.query('UPDATE Modules SET institution_id=?, year_id=?, course_id=?, module_code=?, module_name=?, module_tibl_code=? WHERE module_id=?', [req.body.institution_id, req.body.year_id, req.body.course_id, req.body.module_code, req.body.module_name, req.body.module_tibl_code || null, req.params.id]);
    res.json({ success: true });
  } catch (e) {
    res.json({ success: false, msg: 'Update failed' });
  }
});

// Delete entities
app.delete('/manage/api/courses/institutions/:id', async function (req, res) {
  try {
    await db.query('DELETE FROM Institutions WHERE institution_id=?', [req.params.id]);
    res.json({ success: true });
  } catch (e) {
    res.json({ success: false, msg: 'Delete failed' });
  }
});

app.delete('/manage/api/courses/years/:id', async function (req, res) {
  try {
    await db.query('DELETE FROM Years WHERE year_id=?', [req.params.id]);
    res.json({ success: true });
  } catch (e) {
    res.json({ success: false, msg: 'Delete failed' });
  }
});

app.delete('/manage/api/courses/courses/:id', async function (req, res) {
  try {
    await db.query('DELETE FROM Courses WHERE course_id=?', [req.params.id]);
    res.json({ success: true });
  } catch (e) {
    res.json({ success: false, msg: 'Delete failed' });
  }
});

app.delete('/manage/api/courses/modules/:id', async function (req, res) {
  try {
    await db.query('DELETE FROM Modules WHERE module_id=?', [req.params.id]);
    res.json({ success: true });
  } catch (e) {
    res.json({ success: false, msg: 'Delete failed' });
  }
});

module.exports = app;
