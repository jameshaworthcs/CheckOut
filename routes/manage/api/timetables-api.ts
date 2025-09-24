const express = require('express');
var db = require('../../../databases/database.ts');
var app = express.Router();

function buildWhere(filters, params){
  const where = [];
  if (filters.start_date) { where.push('start_date >= ?'); params.push(filters.start_date); }
  if (filters.end_date) { where.push('start_date <= ?'); params.push(filters.end_date); }
  if (filters.staff) { where.push('staff LIKE ?'); params.push('%' + filters.staff + '%'); }
  if (filters.location) { where.push('location LIKE ?'); params.push('%' + filters.location + '%'); }
  if (filters.module_id) {
    where.push('module_tibl_code IN (SELECT module_tibl_code FROM Modules WHERE module_id=?)');
    params.push(filters.module_id);
  }
  if (filters.course_id) {
    where.push('module_tibl_code IN (SELECT module_tibl_code FROM Modules WHERE course_id=?)');
    params.push(filters.course_id);
  }
  return where.length ? (' WHERE ' + where.join(' AND ')) : '';
}

// List sessions with filters
app.get('/manage/api/timetables/sessions', async function (req, res) {
  try {
    const filters = {
      start_date: req.query.start_date,
      end_date: req.query.end_date,
      staff: req.query.staff,
      location: req.query.location,
      course_id: req.query.course_id ? parseInt(req.query.course_id, 10) : undefined,
      module_id: req.query.module_id ? parseInt(req.query.module_id, 10) : undefined,
    };
    const params = [];
    const where = buildWhere(filters, params);
    const rows = await db.query('SELECT * FROM TimetableSessions' + where + ' ORDER BY start_date DESC, start_time DESC LIMIT 1000', params);
    res.json({ success: true, data: rows });
  } catch (e) {
    res.json({ success: false, msg: 'Database error' });
  }
});

// Create session
app.post('/manage/api/timetables/sessions', async function (req, res) {
  try {
    const f = req.body || {};
    const params = [
      f.activityID || 0,
      f.activity_reference || null,
      f.module_tibl_code || null,
      f.start_day || null,
      f.start_date || null,
      f.start_time || null,
      f.end_date || f.start_date || null,
      f.end_time || null,
      f.duration || null,
      f.type || null,
      f.staff || null,
      f.location || null,
      f.department || null,
      f.size || null,
      f.module_description || null,
      f.weekly_pattern || null,
      f.online_location || null,
      f.online_session_details || null,
      f.notes || null,
    ];
    await db.query('INSERT INTO TimetableSessions (activityID, activity_reference, module_tibl_code, start_day, start_date, start_time, end_date, end_time, duration, type, staff, location, department, size, module_description, weekly_pattern, online_location, online_session_details, notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)', params);
    res.json({ success: true });
  } catch (e) {
    res.json({ success: false, msg: 'Insert failed' });
  }
});

// Update session
app.put('/manage/api/timetables/sessions/:id', async function (req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    const f = req.body || {};
    const params = [
      f.activityID || 0,
      f.activity_reference || null,
      f.module_tibl_code || null,
      f.start_day || null,
      f.start_date || null,
      f.start_time || null,
      f.end_date || f.start_date || null,
      f.end_time || null,
      f.duration || null,
      f.type || null,
      f.staff || null,
      f.location || null,
      f.department || null,
      f.size || null,
      f.module_description || null,
      f.weekly_pattern || null,
      f.online_location || null,
      f.online_session_details || null,
      f.notes || null,
      id,
    ];
    await db.query('UPDATE TimetableSessions SET activityID=?, activity_reference=?, module_tibl_code=?, start_day=?, start_date=?, start_time=?, end_date=?, end_time=?, duration=?, type=?, staff=?, location=?, department=?, size=?, module_description=?, weekly_pattern=?, online_location=?, online_session_details=?, notes=? WHERE id=?', params);
    res.json({ success: true });
  } catch (e) {
    res.json({ success: false, msg: 'Update failed' });
  }
});

// Delete session
app.delete('/manage/api/timetables/sessions/:id', async function (req, res) {
  try {
    await db.query('DELETE FROM TimetableSessions WHERE id=?', [parseInt(req.params.id, 10)]);
    res.json({ success: true });
  } catch (e) {
    res.json({ success: false, msg: 'Delete failed' });
  }
});

// Duplicate session
app.post('/manage/api/timetables/sessions/:id/duplicate', async function (req, res) {
  try {
    const [row] = await db.query('SELECT * FROM TimetableSessions WHERE id=? LIMIT 1', [parseInt(req.params.id, 10)]);
    if (!row) return res.json({ success: false, msg: 'Not found' });
    const params = [
      row.activityID,
      row.activity_reference,
      row.module_tibl_code,
      row.start_day,
      row.start_date,
      row.start_time,
      row.end_date,
      row.end_time,
      row.duration,
      row.type,
      row.staff,
      row.location,
      row.department,
      row.size,
      row.module_description,
      row.weekly_pattern,
      row.online_location,
      row.online_session_details,
      row.notes,
    ];
    await db.query('INSERT INTO TimetableSessions (activityID, activity_reference, module_tibl_code, start_day, start_date, start_time, end_date, end_time, duration, type, staff, location, department, size, module_description, weekly_pattern, online_location, online_session_details, notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)', params);
    res.json({ success: true });
  } catch (e) {
    res.json({ success: false, msg: 'Duplicate failed' });
  }
});

module.exports = app;


