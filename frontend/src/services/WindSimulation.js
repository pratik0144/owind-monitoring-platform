/**
 * WindSimulation - Simulates wind interaction with buildings
 */

// Wind effect constants
const UPWIND_REDUCTION = 0.40;      // 40% reduction from upwind buildings
const GAP_ACCELERATION = 0.20;       // 20% increase in narrow gaps
const ROOF_EDGE_ACCELERATION = 0.15; // 15% increase at roof edges
const WAKE_ZONE_REDUCTION = 0.50;    // 50% reduction in wake zone

/**
 * Roof zones for turbine placement analysis
 */
export const ROOF_ZONES = ['north', 'south', 'east', 'west', 'center'];

/**
 * Calculate centroid of a building polygon
 */
const getCentroid = (coords) => {
  let sumLng = 0, sumLat = 0;
  const n = coords.length - 1;
  for (let i = 0; i < n; i++) {
    sumLng += coords[i][0];
    sumLat += coords[i][1];
  }
  return [sumLng / n, sumLat / n];
};

/**
 * Determine if a neighbor is upwind of the target
 * @param {string} neighborDirection - Direction of neighbor (north/south/east/west)
 * @param {number} windDirection - Wind direction in degrees (where wind comes FROM)
 * @returns {boolean}
 */
const isUpwind = (neighborDirection, windDirection) => {
  // Wind coming from N (0°) means north neighbor is upwind
  const windSector = {
    north: windDirection >= 315 || windDirection < 45,
    east: windDirection >= 45 && windDirection < 135,
    south: windDirection >= 135 && windDirection < 225,
    west: windDirection >= 225 && windDirection < 315
  };
  return windSector[neighborDirection];
};

/**
 * Determine if a neighbor is downwind (creates wake zone)
 */
const isDownwind = (neighborDirection, windDirection) => {
  const opposite = {
    north: 'south',
    south: 'north',
    east: 'west',
    west: 'east'
  };
  return isUpwind(opposite[neighborDirection], windDirection);
};

/**
 * Check if there's a narrow gap creating acceleration
 * @param {Object} target - Target building feature
 * @param {Object} neighbor - Neighbor building feature
 * @returns {boolean}
 */
const hasNarrowGap = (target, neighbor) => {
  if (!neighbor) return false;
  
  const targetCentroid = getCentroid(target.geometry.coordinates[0]);
  const neighborCentroid = getCentroid(neighbor.geometry.coordinates[0]);
  
  const distance = Math.sqrt(
    Math.pow(targetCentroid[0] - neighborCentroid[0], 2) +
    Math.pow(targetCentroid[1] - neighborCentroid[1], 2)
  );
  
  // Consider gap narrow if buildings are within ~30m (0.0003 degrees)
  return distance < 0.0003;
};

/**
 * Simulate wind speeds across roof zones
 * @param {number} baseWindSpeed - Base wind speed from weather API
 * @param {number} windDirection - Wind direction in degrees
 * @param {Object} buildings - { target, north, south, east, west }
 * @returns {Object} Wind speeds for each roof zone
 */
export const simulateWindZones = (baseWindSpeed, windDirection, buildings) => {
  const { target, north, south, east, west } = buildings;
  const neighbors = { north, south, east, west };
  
  const zoneWindSpeeds = {};
  const zoneEffects = {};

  ROOF_ZONES.forEach(zone => {
    let windSpeed = baseWindSpeed;
    const effects = [];

    if (zone === 'center') {
      // Center has base conditions, slight reduction from surrounding edges
      windSpeed *= 0.95;
      effects.push('center-baseline');
    } else {
      // Edge zones
      const neighbor = neighbors[zone];
      
      // Check upwind effects
      if (neighbor && isUpwind(zone, windDirection)) {
        windSpeed *= (1 - UPWIND_REDUCTION);
        effects.push('upwind-obstruction');
        
        // Check for gap acceleration
        if (hasNarrowGap(target, neighbor)) {
          windSpeed *= (1 + GAP_ACCELERATION);
          effects.push('gap-acceleration');
        }
      }
      
      // Check downwind (wake zone) effects
      if (neighbor && isDownwind(zone, windDirection)) {
        windSpeed *= (1 - WAKE_ZONE_REDUCTION);
        effects.push('wake-zone');
      }
      
      // Roof edge acceleration (if not blocked)
      if (!neighbor || !isUpwind(zone, windDirection)) {
        windSpeed *= (1 + ROOF_EDGE_ACCELERATION);
        effects.push('roof-edge-acceleration');
      }
    }

    zoneWindSpeeds[zone] = Math.round(windSpeed * 100) / 100;
    zoneEffects[zone] = effects;
  });

  return { zoneWindSpeeds, zoneEffects };
};

/**
 * Get wind exposure factor for a zone based on orientation
 * @param {string} zone - Roof zone name
 * @param {number} windDirection - Wind direction in degrees
 * @returns {number} Exposure factor (0-1)
 */
export const getExposureFactor = (zone, windDirection) => {
  if (zone === 'center') return 0.7;

  // Calculate how aligned the zone is with wind direction
  const zoneAngles = {
    north: 0,
    east: 90,
    south: 180,
    west: 270
  };

  const zoneAngle = zoneAngles[zone];
  // Wind coming FROM direction, so opposite is where wind goes TO
  const windTo = (windDirection + 180) % 360;
  
  let angleDiff = Math.abs(zoneAngle - windTo);
  if (angleDiff > 180) angleDiff = 360 - angleDiff;

  // Higher exposure when zone faces the wind
  // Also high exposure on perpendicular edges (corner acceleration)
  if (angleDiff < 45) {
    return 1.0; // Windward edge
  } else if (angleDiff > 135) {
    return 0.5; // Leeward edge
  } else {
    return 0.85; // Side edges (corner effects)
  }
};

/**
 * Calculate turbulence penalty based on nearby obstructions
 */
export const getTurbulencePenalty = (zone, buildings, windDirection) => {
  const neighbors = { 
    north: buildings.north, 
    south: buildings.south, 
    east: buildings.east, 
    west: buildings.west 
  };

  if (zone === 'center') {
    return 0.9; // Slight penalty for being in turbulent roof center
  }

  const neighbor = neighbors[zone];
  
  if (neighbor && isUpwind(zone, windDirection)) {
    // Significant turbulence behind upwind buildings
    return 0.7;
  }
  
  if (neighbor && isDownwind(zone, windDirection)) {
    // Wake turbulence
    return 0.6;
  }

  // Clear approach
  return 0.95;
};

export default {
  ROOF_ZONES,
  simulateWindZones,
  getExposureFactor,
  getTurbulencePenalty
};
