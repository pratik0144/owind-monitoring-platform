import React, { useState } from 'react';
import Dashboard from './components/Dashboard';
import MapAnalysis from './components/MapAnalysis';

const globalStyles = `
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }
  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background-color: #f8fafc;
    color: #1e293b;
    line-height: 1.5;
  }
`;

function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');

  return (
    <>
      <style>{globalStyles}</style>
      <nav style={navStyles.nav}>
        <div style={navStyles.logo}>🌀 OWind</div>
        <div style={navStyles.buttons}>
          <button
            style={{
              ...navStyles.button,
              backgroundColor: currentPage === 'dashboard' ? '#3b82f6' : 'transparent',
              color: currentPage === 'dashboard' ? '#fff' : '#64748b'
            }}
            onClick={() => setCurrentPage('dashboard')}
          >
            Dashboard
          </button>
          <button
            style={{
              ...navStyles.button,
              backgroundColor: currentPage === 'map' ? '#3b82f6' : 'transparent',
              color: currentPage === 'map' ? '#fff' : '#64748b'
            }}
            onClick={() => setCurrentPage('map')}
          >
            Map Analysis
          </button>
        </div>
      </nav>
      {currentPage === 'dashboard' ? <Dashboard /> : <MapAnalysis />}
    </>
  );
}

const navStyles = {
  nav: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 24px',
    backgroundColor: '#fff',
    borderBottom: '1px solid #e2e8f0',
    position: 'sticky',
    top: 0,
    zIndex: 100
  },
  logo: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#1e293b'
  },
  buttons: {
    display: 'flex',
    gap: '8px'
  },
  button: {
    padding: '8px 16px',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s'
  }
};

export default App;
