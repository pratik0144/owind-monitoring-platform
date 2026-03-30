import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 5000
});

export const getLatest = () => api.get('/latest');
export const getHistory = () => api.get('/history');
export const getEnergyToday = () => api.get('/analytics/energy-today');
export const getStats = () => api.get('/analytics/stats');

export default api;
