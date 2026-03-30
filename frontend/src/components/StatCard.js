import React from 'react';

const StatCard = ({ title, value, unit, icon, color = '#3b82f6' }) => {
  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <span style={{ ...styles.icon, backgroundColor: color }}>{icon}</span>
        <span style={styles.title}>{title}</span>
      </div>
      <div style={styles.valueContainer}>
        <span style={styles.value}>{value}</span>
        <span style={styles.unit}>{unit}</span>
      </div>
    </div>
  );
};

const styles = {
  card: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    minWidth: '160px',
    flex: '1'
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '12px'
  },
  icon: {
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '16px'
  },
  title: {
    fontSize: '14px',
    color: '#64748b',
    fontWeight: '500'
  },
  valueContainer: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '4px'
  },
  value: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#1e293b'
  },
  unit: {
    fontSize: '14px',
    color: '#94a3b8',
    fontWeight: '500'
  }
};

export default StatCard;
