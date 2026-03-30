import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import MapboxGeocoder from '@mapbox/mapbox-gl-geocoder';
import 'mapbox-gl/dist/mapbox-gl.css';
import '@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css';
import { fetchWindData, getCardinalDirection } from '../services/WindService';
import { evaluatePlacement, getZonePosition } from '../services/PlacementEngine';
import WindStreamLayer from './WindStreamLayer';

mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_TOKEN;

const BUILDINGS_SOURCE = 'buildings-source';
const BUILDINGS_3D_LAYER = 'buildings-3d-layer';
const TARGET_3D_LAYER = 'target-3d-layer';

const MapAnalysis = () => {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const marker = useRef(null);
  const turbineMarker = useRef(null);
  const windStreamLayer = useRef(null);
  
  const [coordinates, setCoordinates] = useState(null);
  const [loading, setLoading] = useState(false);
  const [buildingCount, setBuildingCount] = useState(null);
  const [windData, setWindData] = useState(null);
  const [recommendation, setRecommendation] = useState(null);
  const [buildingsRef, setBuildingsRef] = useState(null);

  // Calculate centroid of a polygon
  const getCentroid = (coords) => {
    let sumLng = 0, sumLat = 0;
    const n = coords.length - 1;
    for (let i = 0; i < n; i++) {
      sumLng += coords[i][0];
      sumLat += coords[i][1];
    }
    return [sumLng / n, sumLat / n];
  };

  // Calculate distance between two points
  const getDistance = (p1, p2) => {
    const dx = p1[0] - p2[0];
    const dy = p1[1] - p2[1];
    return Math.sqrt(dx * dx + dy * dy);
  };

  // Determine cardinal direction from target to building
  const getDirection = (targetCentroid, buildingCentroid) => {
    const dx = buildingCentroid[0] - targetCentroid[0];
    const dy = buildingCentroid[1] - targetCentroid[1];
    
    if (Math.abs(dy) > Math.abs(dx)) {
      return dy > 0 ? 'north' : 'south';
    } else {
      return dx > 0 ? 'east' : 'west';
    }
  };

  // Calculate building height from properties
  const calculateBuildingHeight = (properties) => {
    if (properties.height) {
      const h = parseFloat(properties.height);
      if (!isNaN(h)) return h;
    }
    if (properties['building:levels']) {
      const levels = parseInt(properties['building:levels']);
      if (!isNaN(levels)) return levels * 3;
    }
    return 10; // default height
  };

  // Select target building + nearest neighbor in each direction
  const selectWindBuildings = (features, clickPoint) => {
    if (features.length === 0) return { selected: [], buildingRefs: null };

    const buildingsWithCentroid = features.map(f => ({
      feature: f,
      centroid: getCentroid(f.geometry.coordinates[0])
    }));

    let targetIdx = 0;
    let minDist = Infinity;
    buildingsWithCentroid.forEach((b, i) => {
      const dist = getDistance(b.centroid, clickPoint);
      if (dist < minDist) {
        minDist = dist;
        targetIdx = i;
      }
    });

    const target = buildingsWithCentroid[targetIdx];
    target.feature.properties.role = 'target';
    target.feature.properties.extrudeHeight = calculateBuildingHeight(target.feature.properties);

    const directions = { north: null, south: null, east: null, west: null };
    const directionDist = { north: Infinity, south: Infinity, east: Infinity, west: Infinity };

    buildingsWithCentroid.forEach((b, i) => {
      if (i === targetIdx) return;

      const dir = getDirection(target.centroid, b.centroid);
      const dist = getDistance(target.centroid, b.centroid);

      if (dist < directionDist[dir]) {
        directionDist[dir] = dist;
        directions[dir] = { ...b, direction: dir };
      }
    });

    const selected = [target.feature];
    const buildingRefs = {
      target: target.feature,
      targetCentroid: target.centroid,
      north: null,
      south: null,
      east: null,
      west: null
    };

    Object.entries(directions).forEach(([dir, b]) => {
      if (b) {
        b.feature.properties.role = dir;
        b.feature.properties.extrudeHeight = calculateBuildingHeight(b.feature.properties);
        selected.push(b.feature);
        buildingRefs[dir] = b.feature;
      }
    });

    return { selected, buildingRefs };
  };

  // Convert Overpass response to GeoJSON
  const convertToGeoJSON = (overpassData) => {
    const nodes = {};
    const features = [];

    overpassData.elements.forEach(el => {
      if (el.type === 'node') {
        nodes[el.id] = [el.lon, el.lat];
      }
    });

    overpassData.elements.forEach(el => {
      if (el.type === 'way' && el.nodes) {
        const coords = el.nodes
          .map(nodeId => nodes[nodeId])
          .filter(coord => coord !== undefined);

        if (coords.length >= 3) {
          if (coords[0][0] !== coords[coords.length - 1][0] ||
              coords[0][1] !== coords[coords.length - 1][1]) {
            coords.push(coords[0]);
          }

          features.push({
            type: 'Feature',
            properties: {
              id: el.id,
              ...el.tags
            },
            geometry: {
              type: 'Polygon',
              coordinates: [coords]
            }
          });
        }
      }
    });

    return { type: 'FeatureCollection', features };
  };

  // Clear all layers
  const clearAllLayers = () => {
    if (!map.current) return;

    const layers = [BUILDINGS_3D_LAYER, TARGET_3D_LAYER];
    layers.forEach(layer => {
      if (map.current.getLayer(layer)) {
        map.current.removeLayer(layer);
      }
    });

    if (map.current.getSource(BUILDINGS_SOURCE)) {
      map.current.removeSource(BUILDINGS_SOURCE);
    }

    // Stop wind animation
    if (windStreamLayer.current) {
      windStreamLayer.current.stop();
    }
  };

  // Render 3D buildings on map
  const render3DBuildings = (geojson) => {
    if (!map.current) return;

    // Clear existing layers
    [BUILDINGS_3D_LAYER, TARGET_3D_LAYER].forEach(layer => {
      if (map.current.getLayer(layer)) {
        map.current.removeLayer(layer);
      }
    });
    if (map.current.getSource(BUILDINGS_SOURCE)) {
      map.current.removeSource(BUILDINGS_SOURCE);
    }

    map.current.addSource(BUILDINGS_SOURCE, {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: geojson.features }
    });

    // Neighbor buildings (gray 3D)
    map.current.addLayer({
      id: BUILDINGS_3D_LAYER,
      type: 'fill-extrusion',
      source: BUILDINGS_SOURCE,
      filter: ['!=', ['get', 'role'], 'target'],
      paint: {
        'fill-extrusion-color': '#b0b0b0',
        'fill-extrusion-opacity': 0.85,
        'fill-extrusion-height': ['get', 'extrudeHeight'],
        'fill-extrusion-base': 0
      }
    });

    // Target building (blue 3D)
    map.current.addLayer({
      id: TARGET_3D_LAYER,
      type: 'fill-extrusion',
      source: BUILDINGS_SOURCE,
      filter: ['==', ['get', 'role'], 'target'],
      paint: {
        'fill-extrusion-color': '#3b82f6',
        'fill-extrusion-opacity': 0.9,
        'fill-extrusion-height': ['get', 'extrudeHeight'],
        'fill-extrusion-base': 0
      }
    });

    // Tilt map for 3D perspective
    map.current.easeTo({
      pitch: 60,
      bearing: 20,
      duration: 1000
    });
  };

  // Add animated turbine marker
  const addTurbineMarker = (position, power) => {
    if (turbineMarker.current) {
      turbineMarker.current.remove();
    }

    const el = document.createElement('div');
    el.className = 'turbine-marker';
    el.innerHTML = `
      <div class="turbine-icon">
        <svg width="40" height="40" viewBox="0 0 40 40">
          <circle cx="20" cy="20" r="18" fill="#10b981" opacity="0.3"/>
          <circle cx="20" cy="20" r="12" fill="#10b981" opacity="0.5"/>
          <g class="turbine-blades" style="transform-origin: 20px 20px;">
            <path d="M20 20 L20 4 L23 20 Z" fill="#065f46"/>
            <path d="M20 20 L33 28 L20 23 Z" fill="#065f46"/>
            <path d="M20 20 L7 28 L20 23 Z" fill="#065f46"/>
          </g>
          <circle cx="20" cy="20" r="4" fill="#047857"/>
        </svg>
      </div>
      <div class="turbine-label">Turbine Placement</div>
    `;
    
    // Add spinning animation style
    const style = document.createElement('style');
    style.textContent = `
      .turbine-marker {
        display: flex;
        flex-direction: column;
        align-items: center;
        cursor: pointer;
      }
      .turbine-blades {
        animation: spin 3s linear infinite;
      }
      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
      .turbine-label {
        background: #047857;
        color: white;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 11px;
        font-weight: 600;
        margin-top: 4px;
        white-space: nowrap;
      }
    `;
    document.head.appendChild(style);

    turbineMarker.current = new mapboxgl.Marker({ element: el, anchor: 'center' })
      .setLngLat(position)
      .setPopup(new mapboxgl.Popup({ offset: 25 }).setHTML(`
        <div style="text-align: center; padding: 8px;">
          <strong style="color: #047857;">🌀 Optimal Turbine Location</strong>
          <br/><span style="color: #64748b;">Est. Power: ${power} W</span>
        </div>
      `))
      .addTo(map.current);
  };

  // Reset everything
  const handleReset = () => {
    clearAllLayers();
    setBuildingCount(null);
    setCoordinates(null);
    setWindData(null);
    setRecommendation(null);
    setBuildingsRef(null);
    
    if (marker.current) {
      marker.current.remove();
      marker.current = null;
    }
    if (turbineMarker.current) {
      turbineMarker.current.remove();
      turbineMarker.current = null;
    }

    // Reset map view
    if (map.current) {
      map.current.easeTo({
        pitch: 0,
        bearing: 0,
        duration: 500
      });
    }
  };

  // Ref to hold the analysis function to avoid dependency issues
  const runAnalysisRef = useRef(null);

  // Run the full analysis pipeline
  const runAnalysis = async (lat, lng) => {
    console.log('Running analysis for:', lat, lng);
    
    setLoading(true);
    setBuildingCount(null);
    setWindData(null);
    setRecommendation(null);

    try {
      // Fetch wind data
      const wind = await fetchWindData(lat, lng);
      console.log('Wind data received:', wind);
      setWindData(wind);

      // Start wind animation
      if (windStreamLayer.current) {
        windStreamLayer.current.setWind(wind.windSpeed, wind.windDirection, [lng, lat]);
        windStreamLayer.current.start();
      }

      // Fetch buildings
      const radius = 200;
      const query = `
        [out:json][timeout:25];
        (
          way["building"](around:${radius},${lat},${lng});
          relation["building"](around:${radius},${lat},${lng});
        );
        out body;
        >;
        out skel qt;
      `;

      const response = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        body: `data=${encodeURIComponent(query)}`,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      const data = await response.json();
      const geojson = convertToGeoJSON(data);
      
      const clickPoint = [lng, lat];
      const { selected, buildingRefs } = selectWindBuildings(geojson.features, clickPoint);
      
      if (selected.length === 0) {
        console.log('No buildings found');
        setLoading(false);
        return;
      }

      console.log('Buildings found:', selected.length);
      setBuildingsRef(buildingRefs);
      setBuildingCount(selected.length);

      const filteredGeoJSON = {
        type: 'FeatureCollection',
        features: selected
      };

      // Tilt map for 3D view
      if (map.current) {
        map.current.easeTo({
          pitch: 60,
          bearing: 20,
          duration: 1000
        });
      }

      render3DBuildings(filteredGeoJSON);

      // Run placement engine
      const placementResult = evaluatePlacement(
        wind.windSpeed,
        wind.windDirection,
        buildingRefs
      );

      console.log('Placement result:', placementResult);
      setRecommendation(placementResult);

      // Add turbine marker at recommended location using actual building polygon
      if (buildingRefs.target && buildingRefs.target.geometry) {
        const polygonCoords = buildingRefs.target.geometry.coordinates[0];
        const turbinePos = getZonePosition(
          placementResult.bestZone,
          buildingRefs.targetCentroid,
          0.00015,
          polygonCoords
        );
        addTurbineMarker(turbinePos, placementResult.power);
      } else if (buildingRefs.targetCentroid) {
        const turbinePos = getZonePosition(
          placementResult.bestZone,
          buildingRefs.targetCentroid
        );
        addTurbineMarker(turbinePos, placementResult.power);
      }

    } catch (error) {
      console.error('Analysis pipeline failed:', error);
    } finally {
      setLoading(false);
    }
  };

  // Keep ref updated
  runAnalysisRef.current = runAnalysis;

  useEffect(() => {
    if (map.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [73.8567, 18.5204],
      zoom: 17,
      pitch: 0,
      bearing: 0,
      antialias: true,
      dragRotate: true,
      touchZoomRotate: true,
      pitchWithRotate: true
    });

    // Navigation control with compass for rotation
    map.current.addControl(new mapboxgl.NavigationControl({
      visualizePitch: true,
      showCompass: true
    }), 'top-right');

    // Initialize everything after map loads
    map.current.on('load', () => {
      // Initialize wind stream layer
      windStreamLayer.current = new WindStreamLayer(map.current);

      // Add geocoder search control
      const geocoder = new MapboxGeocoder({
        accessToken: mapboxgl.accessToken,
        mapboxgl: mapboxgl,
        marker: false,
        placeholder: 'Search location...',
        zoom: 17
      });

      map.current.addControl(geocoder, 'top-left');

      // Handle search result selection - directly trigger analysis
      geocoder.on('result', (e) => {
        console.log('Search result received:', e.result);
        const [lng, lat] = e.result.center;
        
        // Update coordinates and marker
        setCoordinates({ lat: lat.toFixed(6), lng: lng.toFixed(6) });
        
        if (marker.current) {
          marker.current.setLngLat([lng, lat]);
        } else {
          marker.current = new mapboxgl.Marker({ color: '#3b82f6' })
            .setLngLat([lng, lat])
            .addTo(map.current);
        }

        // Fly to location
        map.current.flyTo({
          center: [lng, lat],
          zoom: 17,
          duration: 1500
        });

        // Directly trigger analysis using ref
        if (runAnalysisRef.current) {
          runAnalysisRef.current(lat, lng);
        }
      });
    });

    // Handle map clicks
    map.current.on('click', (e) => {
      const { lng, lat } = e.lngLat;
      
      setCoordinates({ lat: lat.toFixed(6), lng: lng.toFixed(6) });

      if (marker.current) {
        marker.current.setLngLat([lng, lat]);
      } else {
        marker.current = new mapboxgl.Marker({ color: '#3b82f6' })
          .setLngLat([lng, lat])
          .addTo(map.current);
      }
    });

    return () => {
      if (windStreamLayer.current) {
        windStreamLayer.current.destroy();
      }
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []); // Empty dependency array - only run once

  // Wrapper for button click - uses coordinates from state
  const fetchBuildings = async () => {
    if (!coordinates) return;
    const lat = parseFloat(coordinates.lat);
    const lng = parseFloat(coordinates.lng);
    await runAnalysis(lat, lng);
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>🌀 Wind Turbine Placement Analysis</h2>
        <p style={styles.subtitle}>Click on the map to analyze optimal turbine placement</p>
      </div>

      <div style={styles.content}>
        <div style={styles.mapWrapper} id="map-container">
          <div ref={mapContainer} style={styles.map} />
          
          {/* 3D Controls hint */}
          <div style={styles.controlsHint}>
            <span>🖱️ Right-drag to rotate • Ctrl+drag to tilt</span>
          </div>
          
          {/* Overlay info card */}
          {windData && recommendation && (
            <div style={styles.overlayCard}>
              <div style={styles.overlayRow}>
                <span style={styles.overlayIcon}>🕐</span>
                <span style={styles.overlayLabel}>Time</span>
                <span style={styles.overlayValue}>{windData.currentTime || '--:--'}</span>
              </div>
              <div style={styles.overlayRow}>
                <span style={styles.overlayIcon}>💨</span>
                <span style={styles.overlayLabel}>Wind</span>
                <span style={styles.overlayValue}>{windData.windSpeed} m/s</span>
              </div>
              <div style={styles.overlayRow}>
                <span style={styles.overlayIcon}>🧭</span>
                <span style={styles.overlayLabel}>Direction</span>
                <span style={styles.overlayValue}>{windData.windDirection}° {getCardinalDirection(windData.windDirection)}</span>
              </div>
              <div style={styles.overlayDivider} />
              <div style={styles.overlayRow}>
                <span style={styles.overlayIcon}>📍</span>
                <span style={styles.overlayLabel}>Best Zone</span>
                <span style={styles.overlayValue}>{recommendation.location}</span>
              </div>
              <div style={styles.overlayRow}>
                <span style={styles.overlayIcon}>⚡</span>
                <span style={styles.overlayLabel}>Power</span>
                <span style={styles.overlayValueHighlight}>{recommendation.power} W</span>
              </div>
            </div>
          )}
        </div>

        <div style={styles.sidebar}>
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>Selected Location</h3>
            {coordinates ? (
              <div style={styles.coordsBox}>
                <div style={styles.coordRow}>
                  <span style={styles.coordLabel}>Latitude:</span>
                  <span style={styles.coordValue}>{coordinates.lat}</span>
                </div>
                <div style={styles.coordRow}>
                  <span style={styles.coordLabel}>Longitude:</span>
                  <span style={styles.coordValue}>{coordinates.lng}</span>
                </div>
              </div>
            ) : (
              <p style={styles.placeholder}>Click on the map to select a location</p>
            )}
          </div>

          <button
            style={{
              ...styles.button,
              opacity: coordinates && !loading ? 1 : 0.5,
              cursor: coordinates && !loading ? 'pointer' : 'not-allowed'
            }}
            onClick={fetchBuildings}
            disabled={!coordinates || loading}
          >
            {loading ? '⏳ Analyzing...' : '🔍 Analyze Location'}
          </button>

          <button
            style={{
              ...styles.button,
              backgroundColor: '#ef4444',
              opacity: (coordinates || buildingCount !== null) ? 1 : 0.5,
              cursor: (coordinates || buildingCount !== null) ? 'pointer' : 'not-allowed'
            }}
            onClick={handleReset}
            disabled={!coordinates && buildingCount === null}
          >
            🔄 Reset
          </button>

          {windData && (
            <div style={styles.card}>
              <h3 style={styles.cardTitle}>💨 Wind Conditions</h3>
              <div style={styles.coordsBox}>
                <div style={styles.coordRow}>
                  <span style={styles.coordLabel}>Current Time:</span>
                  <span style={styles.coordValue}>{windData.currentTime || '--:--'}</span>
                </div>
                <div style={styles.coordRow}>
                  <span style={styles.coordLabel}>Wind Speed:</span>
                  <span style={styles.coordValue}>{windData.windSpeed} m/s</span>
                </div>
                <div style={styles.coordRow}>
                  <span style={styles.coordLabel}>Direction:</span>
                  <span style={styles.coordValue}>
                    {windData.windDirection}° ({getCardinalDirection(windData.windDirection)})
                  </span>
                </div>
              </div>
            </div>
          )}

          {buildingCount !== null && (
            <div style={styles.card}>
              <h3 style={styles.cardTitle}>🏢 3D Building Analysis</h3>
              <div style={styles.statsBox}>
                <div style={styles.statItem}>
                  <span style={styles.statValue}>{buildingCount}</span>
                  <span style={styles.statLabel}>Buildings</span>
                </div>
              </div>
              <p style={styles.hint}>Target (blue) + N/S/E/W neighbors</p>
            </div>
          )}

          {recommendation && (
            <div style={{ ...styles.card, backgroundColor: '#f0fdf4', borderLeft: '4px solid #10b981' }}>
              <h3 style={{ ...styles.cardTitle, color: '#047857' }}>🌀 Turbine Recommendation</h3>
              <div style={styles.recommendBox}>
                <div style={styles.recommendMain}>
                  <span style={styles.recommendLabel}>Best Location</span>
                  <span style={styles.recommendValue}>{recommendation.location}</span>
                </div>
                <div style={styles.recommendStats}>
                  <div style={styles.recommendStat}>
                    <span style={styles.recommendStatValue}>{recommendation.windSpeed}</span>
                    <span style={styles.recommendStatLabel}>m/s</span>
                  </div>
                  <div style={styles.recommendStat}>
                    <span style={styles.recommendStatValue}>{recommendation.power}</span>
                    <span style={styles.recommendStatLabel}>Watts</span>
                  </div>
                </div>
                <div style={styles.confidenceBadge}>
                  Confidence: {recommendation.confidence}
                </div>
              </div>
            </div>
          )}

          {recommendation && (
            <div style={styles.card}>
              <h3 style={styles.cardTitle}>📊 Zone Analysis</h3>
              <div style={styles.zoneGrid}>
                {Object.entries(recommendation.allZones).map(([zone, data]) => (
                  <div 
                    key={zone} 
                    style={{
                      ...styles.zoneItem,
                      backgroundColor: zone === recommendation.bestZone ? '#dbeafe' : '#f8fafc',
                      borderColor: zone === recommendation.bestZone ? '#3b82f6' : '#e2e8f0'
                    }}
                  >
                    <span style={styles.zoneName}>{zone}</span>
                    <span style={styles.zoneSpeed}>{data.windSpeed} m/s</span>
                    <span style={styles.zonePower}>{data.power} W</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    padding: '24px',
    maxWidth: '1400px',
    margin: '0 auto'
  },
  header: {
    marginBottom: '20px'
  },
  title: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#1e293b',
    margin: 0
  },
  subtitle: {
    fontSize: '14px',
    color: '#64748b',
    marginTop: '4px'
  },
  content: {
    display: 'flex',
    gap: '20px',
    height: 'calc(100vh - 180px)',
    minHeight: '500px'
  },
  mapWrapper: {
    flex: 1,
    borderRadius: '12px',
    overflow: 'hidden',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    position: 'relative'
  },
  map: {
    width: '100%',
    height: '100%'
  },
  overlayCard: {
    position: 'absolute',
    top: '12px',
    left: '12px',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: '10px',
    padding: '12px 16px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    minWidth: '180px',
    zIndex: 10
  },
  overlayRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '6px'
  },
  overlayIcon: {
    fontSize: '14px'
  },
  overlayLabel: {
    fontSize: '12px',
    color: '#64748b',
    flex: 1
  },
  overlayValue: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#1e293b'
  },
  overlayValueHighlight: {
    fontSize: '13px',
    fontWeight: '700',
    color: '#047857'
  },
  overlayDivider: {
    height: '1px',
    backgroundColor: '#e2e8f0',
    margin: '8px 0'
  },
  controlsHint: {
    position: 'absolute',
    bottom: '30px',
    left: '50%',
    transform: 'translateX(-50%)',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    color: '#fff',
    padding: '8px 16px',
    borderRadius: '20px',
    fontSize: '12px',
    zIndex: 10,
    pointerEvents: 'none'
  },
  sidebar: {
    width: '320px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    overflowY: 'auto'
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    padding: '16px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
  },
  cardTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: '12px'
  },
  coordsBox: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  coordRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  coordLabel: {
    fontSize: '13px',
    color: '#64748b'
  },
  coordValue: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#1e293b',
    fontFamily: 'monospace'
  },
  placeholder: {
    fontSize: '13px',
    color: '#94a3b8',
    fontStyle: 'italic'
  },
  button: {
    backgroundColor: '#3b82f6',
    color: '#fff',
    border: 'none',
    borderRadius: '10px',
    padding: '12px 16px',
    fontSize: '14px',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    cursor: 'pointer',
    transition: 'background-color 0.2s'
  },
  statsBox: {
    display: 'flex',
    gap: '12px'
  },
  statItem: {
    flex: 1,
    textAlign: 'center',
    padding: '10px',
    backgroundColor: '#f8fafc',
    borderRadius: '8px'
  },
  statValue: {
    display: 'block',
    fontSize: '20px',
    fontWeight: '700',
    color: '#3b82f6'
  },
  statLabel: {
    fontSize: '11px',
    color: '#64748b'
  },
  hint: {
    fontSize: '11px',
    color: '#94a3b8',
    marginTop: '10px',
    textAlign: 'center'
  },
  recommendBox: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  recommendMain: {
    textAlign: 'center'
  },
  recommendLabel: {
    display: 'block',
    fontSize: '11px',
    color: '#047857',
    marginBottom: '4px'
  },
  recommendValue: {
    display: 'block',
    fontSize: '18px',
    fontWeight: '700',
    color: '#047857'
  },
  recommendStats: {
    display: 'flex',
    gap: '12px'
  },
  recommendStat: {
    flex: 1,
    textAlign: 'center',
    padding: '8px',
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: '8px'
  },
  recommendStatValue: {
    display: 'block',
    fontSize: '18px',
    fontWeight: '700',
    color: '#047857'
  },
  recommendStatLabel: {
    fontSize: '10px',
    color: '#065f46'
  },
  confidenceBadge: {
    textAlign: 'center',
    fontSize: '11px',
    fontWeight: '600',
    color: '#047857',
    backgroundColor: 'rgba(255,255,255,0.7)',
    padding: '6px 12px',
    borderRadius: '20px'
  },
  zoneGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '8px'
  },
  zoneItem: {
    padding: '10px',
    borderRadius: '8px',
    border: '1px solid',
    textAlign: 'center'
  },
  zoneName: {
    display: 'block',
    fontSize: '11px',
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'capitalize',
    marginBottom: '4px'
  },
  zoneSpeed: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '700',
    color: '#1e293b'
  },
  zonePower: {
    display: 'block',
    fontSize: '11px',
    color: '#64748b'
  }
};

export default MapAnalysis;
