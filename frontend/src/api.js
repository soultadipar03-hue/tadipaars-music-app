import axios from 'axios';

// In dev, empty base = same origin, routed through the Vite proxy to the backend.
// In production (e.g. Render), the frontend and backend are separate services,
// so we need an explicit backend URL set via VITE_API_URL at build time.
const API_BASE_URL = import.meta.env.VITE_API_URL || '';
const api = axios.create({ baseURL: API_BASE_URL });

api.interceptors.request.use(config => {
  const code = localStorage.getItem('tadipaar_code');
  if (code) config.headers['x-access-code'] = code;
  return config;
});

export const getGoogleAuthUrl = () => api.get('/api/auth/google').then(r => r.data.url);
export const verifyCode = (accessCode) => api.post('/api/auth/verify', { accessCode });

export const getAlbums = () => api.get('/api/albums').then(r => r.data);
export const createAlbum = (name) => api.post('/api/albums', { name }).then(r => r.data);
export const deleteAlbum = (id) => api.delete(`/api/albums/${id}`);

export const getSongs = (albumId) => api.get(`/api/songs/${albumId}`).then(r => r.data);
export const uploadSong = (albumId, file, title, onProgress) => {
  const form = new FormData();
  form.append('file', file);
  form.append('title', title);
  return api.post(`/api/songs/${albumId}/upload`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: e => onProgress && onProgress(Math.round((e.loaded * 100) / e.total)),
  }).then(r => r.data);
};
export const deleteSong = (id) => api.delete(`/api/songs/${id}`);

export const getStreamUrl = (songId) => {
  const params = new URLSearchParams();
  const code = localStorage.getItem('tadipaar_code');
  if (code) params.set('code', code);
  const query = params.toString();
  return `${API_BASE_URL}/api/songs/${songId}/stream${query ? `?${query}` : ''}`;
};
