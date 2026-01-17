import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If token expired, try to refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        const response = await axios.post(`${API_BASE_URL}/auth/refresh-token`, {
          refreshToken,
        });

        const { accessToken } = response.data.data;
        localStorage.setItem('accessToken', accessToken);

        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed, logout user
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  getCurrentUser: () => api.get('/auth/me'),
  refreshToken: (refreshToken) => api.post('/auth/refresh-token', { refreshToken }),
};

// Politicians API
export const politiciansAPI = {
  getAll: (params) => api.get('/politicians', { params }),
  getById: (id) => api.get(`/politicians/${id}`),
  getTransactions: (id, params) => api.get(`/politicians/${id}/transactions`, { params }),
  search: (query) => api.get('/politicians/search', { params: { q: query } }),
};

// Transactions API
export const transactionsAPI = {
  getAll: (params) => api.get('/transactions', { params }),
  getById: (id) => api.get(`/transactions/${id}`),
  getFeed: (limit = 100) => api.get('/transactions/feed', { params: { limit } }),
  search: (query) => api.get('/transactions/search', { params: { q: query } }),
};

// Assets API
export const assetsAPI = {
  getAll: (params) => api.get('/assets', { params }),
  getByTicker: (ticker) => api.get(`/assets/${ticker}`),
  getTransactions: (ticker, params) => api.get(`/assets/${ticker}/transactions`, { params }),
  getMostTraded: (period = '30d', limit = 20) =>
    api.get('/assets/most-traded', { params: { period, limit } }),
  search: (query) => api.get('/assets/search', { params: { q: query } }),
};

// Alerts API
export const alertsAPI = {
  getAll: () => api.get('/alerts'),
  create: (data) => api.post('/alerts', data),
  update: (id, data) => api.put(`/alerts/${id}`, data),
  delete: (id) => api.delete(`/alerts/${id}`),
};

// Analytics API
export const analyticsAPI = {
  getAnalytics: () => api.get('/analytics'),
  getTrending: (period = '7d', limit = 10) =>
    api.get('/analytics/trending', { params: { period, limit } }),
  getSectors: (period = '30d') =>
    api.get('/analytics/sectors', { params: { period } }),
  getTopTraders: (period = '90d', limit = 20) =>
    api.get('/analytics/top-traders', { params: { period, limit } }),
  getPartyComparison: (period = '90d') =>
    api.get('/analytics/party-comparison', { params: { period } }),
  getTimeline: (period = '90d') =>
    api.get('/analytics/timeline', { params: { period } }),
};

// Users API
export const usersAPI = {
  changePassword: (currentPassword, newPassword) =>
    api.patch('/users/password', { currentPassword, newPassword }),
  updatePreferences: (preferences) =>
    api.patch('/users/preferences', preferences),
  deleteAccount: () =>
    api.delete('/users/account'),
};

export default api;
