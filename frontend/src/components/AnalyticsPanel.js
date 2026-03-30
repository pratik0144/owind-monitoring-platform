import React from 'react';
import StatCard from './StatCard';

const AnalyticsPanel = ({ energyToday, stats }) => {
  return (
    <div style={styles.container}>
      <h3 style={styles.title}>Analytics</h3>
      <div style={styles.grid}>
        <StatCard
          title="Energy Today"
          value={energyToday?.toFixed(2) || '0'}
          unit="Wh"
          icon="⚡"
          color="#fbbf24"
        />
        <StatCard
          title="Avg Wind Speed"
          value={stats?.average_wind_speed?.toFixed(1) || '0'}
          unit="m/s"
          icon="📊"
          color="#8b5cf6"
        />
        <StatCard
          title="Max Wind Speed"
          value={stats?.max_wind_speed?.toFixed(1) || '0'}
          unit="m/s"
          icon="🌪️"
          color="#06b6d4"
        />
        <StatCard
          title="Max Power"
          value={stats?.max_power?.toFixed(1) || '0'}
          unit="W"
          icon="🔋"
          color="#f43f5e"
        />
      </div>
    </div>
  );
};

const styles = {
  container: {
    marginTop: '24px'
  },
  title: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: '16px'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '16px'
  }
};

export default AnalyticsPanel;
