const express = require('express');
const router = express.Router();
const { getDb, saveDb } = require('../database/db');

// POST /api/turbine - Insert new turbine telemetry data
router.post('/turbine', (req, res) => {
  const { wind_speed, rpm, voltage, current, power } = req.body;

  if (wind_speed == null || rpm == null || voltage == null || current == null || power == null) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const db = getDb();
    db.run(`
      INSERT INTO turbine_data (wind_speed, rpm, voltage, current, power)
      VALUES (?, ?, ?, ?, ?)
    `, [wind_speed, rpm, voltage, current, power]);
    
    const result = db.exec('SELECT last_insert_rowid() as id');
    const id = result[0].values[0][0];
    saveDb();
    
    res.status(201).json({
      message: 'Telemetry data recorded',
      id: id
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/latest - Return latest turbine record
router.get('/latest', (req, res) => {
  try {
    const db = getDb();
    const result = db.exec(`
      SELECT * FROM turbine_data ORDER BY id DESC LIMIT 1
    `);
    
    if (!result.length || !result[0].values.length) {
      return res.status(404).json({ error: 'No data found' });
    }
    
    const columns = result[0].columns;
    const values = result[0].values[0];
    const row = {};
    columns.forEach((col, i) => row[col] = values[i]);
    
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/history - Return last 200 records
router.get('/history', (req, res) => {
  try {
    const db = getDb();
    const result = db.exec(`
      SELECT * FROM turbine_data ORDER BY id DESC LIMIT 200
    `);
    
    if (!result.length) {
      return res.json([]);
    }
    
    const columns = result[0].columns;
    const rows = result[0].values.map(values => {
      const row = {};
      columns.forEach((col, i) => row[col] = values[i]);
      return row;
    });
    
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
