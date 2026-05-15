import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' }
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('ae_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('ae_token');
      localStorage.removeItem('ae_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
  verify: () => api.get('/auth/verify'),
  updateProfile: (formData) => api.put('/auth/profile', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  googleLogin: () => { window.location.href = `${API_BASE}/auth/google`; }
};

// Confessions
export const confessionsAPI = {
  submit: (data) => api.post('/confessions', data),
  getPublic: (params) => api.get('/confessions/public', { params }),
  getPending: () => api.get('/confessions/pending'),
  getAll: (params) => api.get('/confessions/all', { params }),
  review: (id, data) => api.put(`/confessions/${id}/review`, data),
  delete: (id) => api.delete(`/confessions/${id}`)
};

// Songs
export const songsAPI = {
  getAll: () => api.get('/songs'),
  upload: (formData) => api.post('/songs', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  delete: (id) => api.delete(`/songs/${id}`),
  incrementPlay: (id) => api.put(`/songs/${id}/play`)
};

// Reports
export const reportsAPI = {
  submit: (data) => api.post('/reports', data),
  getAll: (params) => api.get('/reports', { params }),
  review: (id, data) => api.put(`/reports/${id}/review`, data)
};

// Admin
export const adminAPI = {
  getStats: () => api.get('/admin/stats'),
  getUsers: (params) => api.get('/admin/users', { params }),
  updateRole: (id, role) => api.put(`/admin/users/${id}/role`, { role }),
  banUser: (id, banned, reason) => api.put(`/admin/users/${id}/ban`, { banned, reason }),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),
  getJourneyLogs: (params) => api.get('/admin/journey-logs', { params }),
  uploadImage: (formData) => api.post('/admin/upload-image', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  getConfessions: (params) => api.get('/admin/confessions', { params })
};

// Moderator
export const moderatorAPI = {
  getStats: () => api.get('/moderator/stats'),
  getReports: (params) => api.get('/moderator/reports', { params }),
  reviewReport: (id, data) => api.put(`/moderator/reports/${id}`, data),
  getPendingConfessions: () => api.get('/moderator/confessions/pending'),
  reviewConfession: (id, data) => api.put(`/moderator/confessions/${id}/review`, data)
};

// Notices
export const noticesAPI = {
  getActive: () => api.get('/notices'),
  getAll: () => api.get('/notices/all'),
  create: (data) => api.post('/notices', data),
  update: (id, data) => api.put(`/notices/${id}`, data),
  delete: (id) => api.delete(`/notices/${id}`)
};

// Journey Logs
export const journeyAPI = {
  getMine: (params) => api.get('/journeys/mine', { params }),
  create: (data) => api.post('/journeys', data)
};

// iTunes Search (free, no auth)
export const searchSong = async (query) => {
  const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&limit=8`);
  return res.json();
};

export default api;
