import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Cameras
export const getCameras = () => api.get('/cameras');
export const getCamera = (id) => api.get(`/cameras/${id}`);
export const createCamera = (data) => api.post('/cameras', data);
export const updateCamera = (id, data) => api.put(`/cameras/${id}`, data);
export const deleteCamera = (id) => api.delete(`/cameras/${id}`);
export const startCamera = (id) => api.post(`/cameras/${id}/start`);
export const stopCamera = (id) => api.post(`/cameras/${id}/stop`);
export const getCameraSettings = (id) => api.get(`/cameras/${id}/settings`);
export const updateCameraSettings = (id, data) => api.put(`/cameras/${id}/settings`, data);

// ROIs
export const getROIs = (cameraId) => api.get(`/rois/camera/${cameraId}`);
export const createROI = (data) => api.post('/rois', data);
export const updateROI = (id, data) => api.put(`/rois/${id}`, data);
export const deleteROI = (id) => api.delete(`/rois/${id}`);

// Detections
export const getDetections = (params) => api.get('/detections', { params });
export const getDetection = (id) => api.get(`/detections/${id}`);
export const deleteDetection = (id) => api.delete(`/detections/${id}`);

// Analytics
export const getAnalyticsSummary = () => api.get('/detections/analytics/summary');
export const getAlertTypes = (days = 7) => api.get('/detections/analytics/alert-types', { params: { days } });
export const getZoneAlerts = (days = 7) => api.get('/detections/analytics/zone-alerts', { params: { days } });
export const getRecentDetections = (limit = 10) => api.get('/detections/analytics/recent', { params: { limit } });

// Stream
export const getStreamUrl = (cameraId, raw = false) => `http://localhost:8000/api/stream/${cameraId}${raw ? '?raw=true' : ''}`;
export const getRawStreamUrl = (cameraId) => `http://localhost:8000/api/stream/${cameraId}?raw=true`;
export const getSnapshotUrl = (cameraId) => `http://localhost:8000/api/stream/snapshot/${cameraId}`;
export const getDetectionImageUrl = (imageName) => `http://localhost:8000/api/stream/detection-image/${imageName}`;

export default api;

