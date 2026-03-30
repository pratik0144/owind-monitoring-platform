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
  // Meteorological convention: direction wind is coming FROM
  // Convert to radians and calculate vector (direction wind is going TO)
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
 * @param {string} isoTime - ISO timestamp from API
 * @returns {string} Formatted time string
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
 * @param {number} degrees - Wind direction in degrees
 * @returns {string} Cardinal direction (N, NE, E, etc.)
 */
export const getCardinalDirection = (degrees) => {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const index = Math.round(degrees / 45) % 8;
  return directions[index];
};

/**
 * Generate wind arrow GeoJSON for visualization
 * @param {number} lat - Center latitude
 * @param {number} lng - Center longitude
 * @param {number} windDirection - Wind direction in degrees
 * @param {number} windSpeed - Wind speed for scaling
 * @returns {Object} GeoJSON FeatureCollection with arrow lines
 */
export const generateWindArrows = (lat, lng, windDirection, windSpeed) => {
  const features = [];
  const gridSize = 5; // 5x5 grid of arrows
  const spacing = 0.001; // ~100m spacing
  const arrowLength = 0.0003 * Math.min(windSpeed / 5, 2); // Scale with wind speed

  // Direction wind is going TO (opposite of meteorological direction)
  const directionRad = ((windDirection + 180) % 360) * (Math.PI / 180);
  const dx = Math.sin(directionRad) * arrowLength;
  const dy = Math.cos(directionRad) * arrowLength;

  for (let i = -Math.floor(gridSize / 2); i <= Math.floor(gridSize / 2); i++) {
    for (let j = -Math.floor(gridSize / 2); j <= Math.floor(gridSize / 2); j++) {
      const centerLng = lng + i * spacing;
      const centerLat = lat + j * spacing;

      // Arrow line
      features.push({
        type: 'Feature',
        properties: { type: 'arrow-line' },
        geometry: {
          type: 'LineString',
          coordinates: [
            [centerLng - dx / 2, centerLat - dy / 2],
            [centerLng + dx / 2, centerLat + dy / 2]
          ]
        }
      });

      // Arrow head (two short lines)
      const headLength = arrowLength * 0.3;
      const headAngle = Math.PI / 6; // 30 degrees

      const tipLng = centerLng + dx / 2;
      const tipLat = centerLat + dy / 2;

      // Left head line
      const leftAngle = directionRad + Math.PI - headAngle;
      features.push({
        type: 'Feature',
        properties: { type: 'arrow-head' },
        geometry: {
          type: 'LineString',
          coordinates: [
            [tipLng, tipLat],
            [tipLng + Math.sin(leftAngle) * headLength, tipLat + Math.cos(leftAngle) * headLength]
          ]
        }
      });

      // Right head line
      const rightAngle = directionRad + Math.PI + headAngle;
      features.push({
        type: 'Feature',
        properties: { type: 'arrow-head' },
        geometry: {
          type: 'LineString',
          coordinates: [
            [tipLng, tipLat],
            [tipLng + Math.sin(rightAngle) * headLength, tipLat + Math.cos(rightAngle) * headLength]
          ]
        }
      });
    }
  }

  return {
    type: 'FeatureCollection',
    features
  };
};

export default {
  fetchWindData,
  getCardinalDirection,
  generateWindArrows
};
