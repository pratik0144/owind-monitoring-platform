const axios = require('axios');

const API_URL = 'http://192.168.1.2:3001/api/turbine';
const INTERVAL_MS = 5000;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

function randomInRange(min, max) {
  return Math.round((Math.random() * (max - min) + min) * 100) / 100;
}

function generateTelemetry() {
  const wind_speed = randomInRange(2, 8);
  const rpm = Math.round(randomInRange(80, 200));
  const voltage = randomInRange(3, 12);
  const current = randomInRange(0.2, 2);
  const power = Math.round(voltage * current * 100) / 100;

  return { wind_speed, rpm, voltage, current, power };
}

async function sendTelemetry(data, retries = 0) {
  try {
    const response = await axios.post(API_URL, data, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 5000
    });
    console.log(`✓ Sent: wind=${data.wind_speed}m/s rpm=${data.rpm} V=${data.voltage} I=${data.current}A P=${data.power}W`);
    return response.data;
  } catch (error) {
    const errMsg = error.response?.data?.error || error.message;
    
    if (retries < MAX_RETRIES) {
      console.log(`✗ Failed (${errMsg}). Retrying ${retries + 1}/${MAX_RETRIES}...`);
      await new Promise(r => setTimeout(r, RETRY_DELAY_MS));
      return sendTelemetry(data, retries + 1);
    }
    
    console.error(`✗ Failed after ${MAX_RETRIES} retries: ${errMsg}`);
    return null;
  }
}

async function run() {
  console.log(`OWind Turbine Simulator`);
  console.log(`Sending to: ${API_URL}`);
  console.log(`Interval: ${INTERVAL_MS / 1000}s\n`);

  setInterval(async () => {
    const data = generateTelemetry();
    await sendTelemetry(data);
  }, INTERVAL_MS);

  // Send first reading immediately
  const data = generateTelemetry();
  await sendTelemetry(data);
}

run();
