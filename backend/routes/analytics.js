const express = require('express');
const router = express.Router();
const { getDb } = require('../database/db');

// GET /api/analytics/energy-today
router.get('/energy-today', (req, res) => {
  try {
    const db = getDb();
    const result = db.exec(`
      SELECT SUM(power) as total_power, COUNT(*) as record_count
      FROM turbine_data
      WHERE date(timestamp) = date('now')
    `);

    if (!result.length || !result[0].values[0][0]) {
      return res.json({ energy_today_wh: 0 });
    }

    const totalPower = result[0].values[0][0];
    const energyWs = totalPower * 5; // power × 5 seconds per record
    const energyWh = Math.round((energyWs / 3600) * 1000) / 1000; // Convert to Wh

    res.json({ energy_today_wh: energyWh });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/analytics/stats
router.get('/stats', (req, res) => {
  try {
    const db = getDb();
    const result = db.exec(`
      SELECT 
        AVG(wind_speed) as avg_wind_speed,
        MAX(wind_speed) as max_wind_speed,
        MAX(power) as max_power,
        COUNT(*) as total_records
      FROM turbine_data
    `);

    if (!result.length || !result[0].values[0][3]) {
      return res.json({
        average_wind_speed: 0,
        max_wind_speed: 0,
        max_power: 0,
        total_records: 0
      });
    }

    const [avgWind, maxWind, maxPower, totalRecords] = result[0].values[0];

    res.json({
      average_wind_speed: Math.round(avgWind * 100) / 100,
      max_wind_speed: Math.round(maxWind * 100) / 100,
      max_power: Math.round(maxPower * 100) / 100,
      total_records: totalRecords
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
