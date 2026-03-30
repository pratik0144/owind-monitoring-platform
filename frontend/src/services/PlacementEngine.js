/**
 * PlacementEngine - Evaluates and recommends optimal turbine placement
 */

import { ROOF_ZONES, simulateWindZones, getExposureFactor, getTurbulencePenalty } from './WindSimulation';

// Physical constants
const AIR_DENSITY = 1.225;    // kg/m³
const ROTOR_AREA = 0.5;       // m²
const EFFICIENCY = 0.35;      // 35% efficiency

/**
 * Calculate power output using simplified wind power formula
 * P = 0.5 × ρ × A × v³ × η
 * @param {number} windSpeed - Wind speed in m/s
 * @returns {number} Power in watts
 */
export const calculatePower = (windSpeed) => {
  const power = 0.5 * AIR_DENSITY * ROTOR_AREA * Math.pow(windSpeed, 3) * EFFICIENCY;
  return Math.round(power * 100) / 100;
};

/**
 * Calculate placement score for a zone
 * score = windSpeed × exposure × turbulencePenalty
 */
const calculateZoneScore = (windSpeed, exposure, turbulencePenalty) => {
  return windSpeed * exposure * turbulencePenalty;
};

/**
 * Evaluate all roof zones and recommend optimal placement
 * @param {number} baseWindSpeed - Base wind speed from weather API
 * @param {number} windDirection - Wind direction in degrees
 * @param {Object} buildings - { target, north, south, east, west }
 * @returns {Object} Placement recommendation
 */
export const evaluatePlacement = (baseWindSpeed, windDirection, buildings) => {
  const { zoneWindSpeeds, zoneEffects } = simulateWindZones(
    baseWindSpeed,
    windDirection,
    buildings
  );

  const zoneScores = {};
  const zoneDetails = {};

  ROOF_ZONES.forEach(zone => {
    const windSpeed = zoneWindSpeeds[zone];
    const exposure = getExposureFactor(zone, windDirection);
    const turbulence = getTurbulencePenalty(zone, buildings, windDirection);
    
    const score = calculateZoneScore(windSpeed, exposure, turbulence);
    const power = calculatePower(windSpeed);

    zoneScores[zone] = score;
    zoneDetails[zone] = {
      windSpeed,
      exposure: Math.round(exposure * 100),
      turbulence: Math.round(turbulence * 100),
      score: Math.round(score * 100) / 100,
      power,
      effects: zoneEffects[zone]
    };
  });

  // Find best zone
  let bestZone = 'center';
  let bestScore = 0;
  
  Object.entries(zoneScores).forEach(([zone, score]) => {
    if (score > bestScore) {
      bestScore = score;
      bestZone = zone;
    }
  });

  const recommendation = {
    bestZone,
    location: formatLocation(bestZone),
    windSpeed: zoneDetails[bestZone].windSpeed,
    power: zoneDetails[bestZone].power,
    score: zoneDetails[bestZone].score,
    confidence: calculateConfidence(zoneDetails, bestZone),
    allZones: zoneDetails
  };

  return recommendation;
};

/**
 * Format zone name for display
 */
const formatLocation = (zone) => {
  if (zone === 'center') return 'Roof Center';
  return `${zone.charAt(0).toUpperCase() + zone.slice(1)} Edge`;
};

/**
 * Calculate confidence level based on score margin
 */
const calculateConfidence = (zoneDetails, bestZone) => {
  const scores = Object.values(zoneDetails).map(z => z.score);
  const bestScore = zoneDetails[bestZone].score;
  const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
  
  // Higher confidence if best zone is significantly better than average
  const margin = (bestScore - avgScore) / avgScore;
  
  if (margin > 0.3) return 'High';
  if (margin > 0.15) return 'Medium';
  return 'Low';
};

/**
 * Get zone position from actual building polygon coordinates
 * @param {string} zone - Roof zone
 * @param {Array} centroid - Building centroid [lng, lat] (fallback)
 * @param {number} offset - Offset distance in degrees (fallback)
 * @param {Array} polygonCoords - Building polygon coordinates [[lng, lat], ...]
 * @returns {Array} [lng, lat] position
 */
export const getZonePosition = (zone, centroid, offset = 0.00015, polygonCoords = null) => {
  // If polygon coordinates provided, calculate from actual building geometry
  if (polygonCoords && polygonCoords.length >= 3) {
    return calculateZoneFromPolygon(zone, polygonCoords);
  }
  
  // Fallback to offset-based calculation
  const offsets = {
    north: [0, offset],
    south: [0, -offset],
    east: [offset, 0],
    west: [-offset, 0],
    center: [0, 0]
  };

  const [dx, dy] = offsets[zone];
  return [centroid[0] + dx, centroid[1] + dy];
};

/**
 * Calculate zone position from polygon geometry
 */
const calculateZoneFromPolygon = (zone, coords) => {
  // Find bounding box
  let minLng = Infinity, maxLng = -Infinity;
  let minLat = Infinity, maxLat = -Infinity;
  
  coords.forEach(([lng, lat]) => {
    minLng = Math.min(minLng, lng);
    maxLng = Math.max(maxLng, lng);
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
  });
  
  const centerLng = (minLng + maxLng) / 2;
  const centerLat = (minLat + maxLat) / 2;
  
  switch (zone) {
    case 'north':
      // Midpoint of top (north) edge
      return [centerLng, maxLat];
    case 'south':
      // Midpoint of bottom (south) edge
      return [centerLng, minLat];
    case 'east':
      // Midpoint of right (east) edge
      return [maxLng, centerLat];
    case 'west':
      // Midpoint of left (west) edge
      return [minLng, centerLat];
    case 'center':
    default:
      // Centroid of polygon
      return [centerLng, centerLat];
  }
};

/**
 * Generate summary text for recommendation
 */
export const generateSummary = (recommendation, windDirection) => {
  const { bestZone, windSpeed, power, confidence } = recommendation;
  
  const directionText = getWindDirectionText(windDirection);
  
  return {
    title: `Recommended: ${formatLocation(bestZone)}`,
    description: `With wind from ${directionText}, the ${bestZone} edge offers optimal placement.`,
    stats: [
      { label: 'Expected Wind Speed', value: `${windSpeed} m/s` },
      { label: 'Estimated Power', value: `${power} W` },
      { label: 'Confidence', value: confidence }
    ]
  };
};

const getWindDirectionText = (degrees) => {
  const directions = ['North', 'Northeast', 'East', 'Southeast', 'South', 'Southwest', 'West', 'Northwest'];
  const index = Math.round(degrees / 45) % 8;
  return directions[index];
};

export default {
  calculatePower,
  evaluatePlacement,
  getZonePosition,
  generateSummary
};
