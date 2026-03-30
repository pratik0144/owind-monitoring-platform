const express = require('express');
const { initDb } = require('./database/db');
const turbineRoutes = require('./routes/turbine');
const analyticsRoutes = require('./routes/analytics');

const app = express();
const PORT = 3001;

app.use(express.json());

// CORS for frontend
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

app.use('/api', turbineRoutes);
app.use('/api/analytics', analyticsRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'OWind Telemetry API', version: '1.0.0' });
});

initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`OWind server running on http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});
