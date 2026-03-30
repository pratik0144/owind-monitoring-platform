import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const Charts = ({ history }) => {
  const labels = history.map((_, i) => {
    const ago = (history.length - 1 - i) * 5;
    return ago === 0 ? 'now' : `-${ago}s`;
  });

  const windData = {
    labels,
    datasets: [{
      label: 'Wind Speed (m/s)',
      data: history.map(d => d.wind_speed),
      borderColor: '#3b82f6',
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      fill: true,
      tension: 0.4,
      pointRadius: 2
    }]
  };

  const powerData = {
    labels,
    datasets: [{
      label: 'Power (W)',
      data: history.map(d => d.power),
      borderColor: '#10b981',
      backgroundColor: 'rgba(16, 185, 129, 0.1)',
      fill: true,
      tension: 0.4,
      pointRadius: 2
    }]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false }
    },
    scales: {
      x: { 
        grid: { display: false },
        ticks: { maxTicksLimit: 10 }
      },
      y: { 
        grid: { color: '#f1f5f9' },
        beginAtZero: true
      }
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.chartCard}>
        <h3 style={styles.chartTitle}>Wind Speed</h3>
        <div style={styles.chartWrapper}>
          <Line data={windData} options={options} />
        </div>
      </div>
      <div style={styles.chartCard}>
        <h3 style={styles.chartTitle}>Power Output</h3>
        <div style={styles.chartWrapper}>
          <Line data={powerData} options={options} />
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
    gap: '20px',
    marginTop: '20px'
  },
  chartCard: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
  },
  chartTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: '16px'
  },
  chartWrapper: {
    height: '250px'
  }
};

export default Charts;
