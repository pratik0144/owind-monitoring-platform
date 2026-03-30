import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

// Replace with your Mapbox access token
mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_TOKEN;

const MapAnalysis = () => {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const marker = useRef(null);
  
  const [coordinates, setCoordinates] = useState(null);
  const [loading, setLoading] = useState(false);
  const [buildingsData, setBuildingsData] = useState(null);

  useEffect(() => {
    if (map.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [73.8567, 18.5204], // Default: Pune, India
      zoom: 14
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

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
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  const fetchBuildings = async () => {
    if (!coordinates) return;

    setLoading(true);
    setBuildingsData(null);

    const radius = 200; // meters
    const query = `
      [out:json][timeout:25];
      (
        way["building"](around:${radius},${coordinates.lat},${coordinates.lng});
        relation["building"](around:${radius},${coordinates.lat},${coordinates.lng});
      );
      out body;
      >;
      out skel qt;
    `;

    try {
      const response = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        body: `data=${encodeURIComponent(query)}`,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      const data = await response.json();
      setBuildingsData(data);
      console.log('Buildings data:', data);
    } catch (error) {
      console.error('Failed to fetch buildings:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>📍 Map Analysis</h2>
        <p style={styles.subtitle}>Click on the map to select a location for building analysis</p>
      </div>

      <div style={styles.content}>
        <div style={styles.mapWrapper}>
          <div ref={mapContainer} style={styles.map} />
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
            {loading ? '⏳ Loading...' : '🏢 Load Buildings'}
          </button>

          {buildingsData && (
            <div style={styles.card}>
              <h3 style={styles.cardTitle}>Buildings Found</h3>
              <div style={styles.statsBox}>
                <div style={styles.statItem}>
                  <span style={styles.statValue}>
                    {buildingsData.elements?.filter(e => e.type === 'way').length || 0}
                  </span>
                  <span style={styles.statLabel}>Buildings</span>
                </div>
                <div style={styles.statItem}>
                  <span style={styles.statValue}>
                    {buildingsData.elements?.filter(e => e.type === 'node').length || 0}
                  </span>
                  <span style={styles.statLabel}>Nodes</span>
                </div>
              </div>
              <p style={styles.hint}>Check console for full data</p>
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
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
  },
  map: {
    width: '100%',
    height: '100%'
  },
  sidebar: {
    width: '300px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
  },
  cardTitle: {
    fontSize: '16px',
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
    fontSize: '14px',
    color: '#64748b'
  },
  coordValue: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#1e293b',
    fontFamily: 'monospace'
  },
  placeholder: {
    fontSize: '14px',
    color: '#94a3b8',
    fontStyle: 'italic'
  },
  button: {
    backgroundColor: '#3b82f6',
    color: '#fff',
    border: 'none',
    borderRadius: '10px',
    padding: '14px 20px',
    fontSize: '15px',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    transition: 'background-color 0.2s'
  },
  statsBox: {
    display: 'flex',
    gap: '16px'
  },
  statItem: {
    flex: 1,
    textAlign: 'center',
    padding: '12px',
    backgroundColor: '#f8fafc',
    borderRadius: '8px'
  },
  statValue: {
    display: 'block',
    fontSize: '24px',
    fontWeight: '700',
    color: '#3b82f6'
  },
  statLabel: {
    fontSize: '12px',
    color: '#64748b'
  },
  hint: {
    fontSize: '12px',
    color: '#94a3b8',
    marginTop: '12px',
    textAlign: 'center'
  }
};

export default MapAnalysis;
