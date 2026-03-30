import React, { useState, useEffect, useCallback } from 'react';
import { getLatest, getHistory, getEnergyToday, getStats } from '../services/api';
import StatCard from './StatCard';
import Charts from './Charts';
import AnalyticsPanel from './AnalyticsPanel';

const Dashboard = () => {
  const [latest, setLatest] = useState(null);
  const [history, setHistory] = useState([]);
  const [energyToday, setEnergyToday] = useState(0);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const [latestRes, historyRes, energyRes, statsRes] = await Promise.all([
        getLatest(),
        getHistory(),
        getEnergyToday(),
        getStats()
      ]);

      setLatest(latestRes.data);
      setHistory(historyRes.data.slice(0, 50).reverse());
      setEnergyToday(energyRes.data.energy_today_wh);
      setStats(statsRes.data);
      setLastUpdate(new Date());
      setError(null);
    } catch (err) {
      setError('Failed to fetch data');
      console.error(err);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, [fetchData]);

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>🌀 OWind Dashboard</h1>
          <p style={styles.subtitle}>Wind Turbine Monitoring System</p>
        </div>
        <div style={styles.status}>
          {error ? (
            <span style={styles.errorBadge}>● Offline</span>
          ) : (
            <span style={styles.onlineBadge}>● Live</span>
          )}
          {lastUpdate && (
            <span style={styles.timestamp}>
              Updated: {lastUpdate.toLocaleTimeString()}
            </span>
          )}
        </div>
      </header>

      {error && <div style={styles.errorBar}>{error}</div>}

      <section style={styles.section}>
        <h3 style={styles.sectionTitle}>Current Readings</h3>
        <div style={styles.statGrid}>
          <StatCard
            title="Wind Speed"
            value={latest?.wind_speed?.toFixed(1) || '-'}
            unit="m/s"
            icon="💨"
            color="#3b82f6"
          />
          <StatCard
            title="RPM"
            value={latest?.rpm || '-'}
            unit="rpm"
            icon="🔄"
            color="#8b5cf6"
          />
          <StatCard
            title="Voltage"
            value={latest?.voltage?.toFixed(1) || '-'}
            unit="V"
            icon="⚡"
            color="#f59e0b"
          />
          <StatCard
            title="Current"
            value={latest?.current?.toFixed(2) || '-'}
            unit="A"
            icon="🔌"
            color="#06b6d4"
          />
          <StatCard
            title="Power"
            value={latest?.power?.toFixed(1) || '-'}
            unit="W"
            icon="💡"
            color="#10b981"
          />
        </div>
      </section>

      <AnalyticsPanel energyToday={energyToday} stats={stats} />

      {history.length > 0 && <Charts history={history} />}

      <footer style={styles.footer}>
        <span>Total Records: {stats?.total_records || 0}</span>
      </footer>
    </div>
  );
};

const styles = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '24px'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '24px'
  },
  title: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#1e293b',
    margin: 0
  },
  subtitle: {
    fontSize: '14px',
    color: '#64748b',
    marginTop: '4px'
  },
  status: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: '4px'
  },
  onlineBadge: {
    color: '#10b981',
    fontWeight: '600',
    fontSize: '14px'
  },
  errorBadge: {
    color: '#ef4444',
    fontWeight: '600',
    fontSize: '14px'
  },
  timestamp: {
    fontSize: '12px',
    color: '#94a3b8'
  },
  errorBar: {
    backgroundColor: '#fef2f2',
    color: '#dc2626',
    padding: '12px 16px',
    borderRadius: '8px',
    marginBottom: '16px',
    fontSize: '14px'
  },
  section: {
    marginBottom: '8px'
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: '16px'
  },
  statGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '16px'
  },
  footer: {
    marginTop: '32px',
    paddingTop: '16px',
    borderTop: '1px solid #e2e8f0',
    fontSize: '13px',
    color: '#94a3b8',
    textAlign: 'center'
  }
};

export default Dashboard;
