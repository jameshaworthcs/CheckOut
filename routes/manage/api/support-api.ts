const express = require('express');
var db = require('../../../databases/database-v2.ts');
var app = express.Router();

// Get all support requests with optional filters
app.get('/manage/api/support/requests', async (req, res) => {
  try {
    const { completed, startDate, endDate, issueType, limit = 100 } = req.query;

    let sql = 'SELECT * FROM support_requests WHERE 1=1';
    const params = [];

    if (completed !== undefined) {
      sql += ' AND completed = ?';
      params.push(completed === 'true' ? 1 : 0);
    }

    if (startDate) {
      sql += ' AND created_at >= ?';
      params.push(startDate);
    }

    if (endDate) {
      sql += ' AND created_at <= ?';
      params.push(endDate);
    }

    if (issueType) {
      sql += ' AND JSON_EXTRACT(form_data, "$.issueType") = ?';
      params.push(issueType);
    }

    sql += ' ORDER BY created_at DESC LIMIT ?';
    params.push(parseInt(limit, 10));

    const [rows] = await db.query(sql, params);

    // Ensure form_data is parsed JSON
    const processedRows = rows.map((row) => ({
      ...row,
      form_data: typeof row.form_data === 'string' ? JSON.parse(row.form_data) : row.form_data,
    }));

    res.json(processedRows);
  } catch (error) {
    console.error('Error fetching support requests:', error);
    res.status(500).json({ error: 'Failed to fetch support requests' });
  }
});

// Update support request (mark as completed/uncompleted, add notes)
app.post('/manage/api/support/update/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { completed, notes } = req.body;

    // Build dynamic update query based on provided fields
    let sql = 'UPDATE support_requests SET ';
    const updates = [];
    const params = [];

    // Only include fields that are provided
    if (completed !== undefined) {
      updates.push('completed = ?');
      params.push(completed);
    }
    if (notes !== undefined) {
      updates.push('notes = ?');
      params.push(notes);
    }

    // If no fields to update, return early
    if (updates.length === 0) {
      return res.status(400).json({ success: false, msg: 'No fields to update' });
    }

    sql += updates.join(', ');
    sql += ' WHERE id = ?';
    params.push(id);

    const [result] = await db.execute(sql, params);

    if (result.affectedRows === 1) {
      res.json({ success: true, msg: 'Support request updated successfully' });
    } else {
      res.status(404).json({ success: false, msg: 'Support request not found' });
    }
  } catch (error) {
    console.error('Error updating support request:', error);
    res.status(500).json({ success: false, msg: 'Failed to update support request' });
  }
});

// Delete support request
app.delete('/manage/api/support/delete/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const sql = 'DELETE FROM support_requests WHERE id = ?';
    const [result] = await db.execute(sql, [id]);

    if (result.affectedRows === 1) {
      res.json({ success: true, msg: 'Support request deleted successfully' });
    } else {
      res.status(404).json({ success: false, msg: 'Support request not found' });
    }
  } catch (error) {
    console.error('Error deleting support request:', error);
    res.status(500).json({ success: false, msg: 'Failed to delete support request' });
  }
});

app.get('*', function (req, res) {
  res.status(404);
  res.json({ success: false, msg: 'Not a valid endpoint. (support-manage-api)' });
});

module.exports = app;
