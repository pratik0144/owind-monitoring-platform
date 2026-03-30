/**
 * WindService - Fetches wind data from Open-Meteo API
 */

const OPEN_METEO_URL = 'https://api.open-meteo.com/v1/forecast';

/**
 * Fetch current wind data for a location
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {Promise<{windSpeed: number, windDirection: number, windVector: {x: number, y: number}, currentTime: string}>}
 */
export const fetchWindData = async (lat, lng) => {
  const url = `${OPEN_METEO_URL}?latitude=${lat}&longitude=${lng}&current=wind_speed_10m,wind_direction_10m`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to fetch wind data');
  }

  const data = await response.json();
  
  const windSpeed = data.current.wind_speed_10m;
  const windDirection = data.current.wind_direction_10m;
  
  // Extract and format current time
  const currentTime = data.current.time;
  const formattedTime = formatTime(currentTime);

  // Convert wind direction to 2D vector
  const directionRad = ((windDirection + 180) % 360) * (Math.PI / 180);
  const windVector = {
    x: Math.cos(directionRad),
    y: Math.sin(directionRad)
  };

  return {
    windSpeed,
    windDirection,
    windVector,
    currentTime: formattedTime
  };
};

/**
 * Format ISO timestamp to local HH:MM
 */
const formatTime = (isoTime) => {
  try {
    const date = new Date(isoTime);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return isoTime;
  }
};

/**
 * Get cardinal direction name from degrees
 */
export const getCardinalDirection = (degrees) => {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const index = Math.round(degrees / 45) % 8;
  return directions[index];
};

export default {
  fetchWindData,
  getCardinalDirection
};
