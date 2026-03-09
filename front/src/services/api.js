import axios from 'axios';
import camelcaseKeys from 'camelcase-keys';
import snakecaseKeys from 'snakecase-keys';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

const apiClient = axios.create({
  baseURL: BACKEND_URL,
  headers: { 'Content-Type': 'application/json' }
});

apiClient.interceptors.request.use(
  (config) => {
    if (config.data && !(config.data instanceof FormData)) {
      config.data = snakecaseKeys(config.data, { deep: true });
    }
    if (config.params) {
      config.params = snakecaseKeys(config.params, { deep: true });
    }
    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => {
    if (response.data) {
      response.data = camelcaseKeys(response.data, { deep: true });
    }
    return response;
  },
  (error) => {
    if (error.response?.data) {
      error.response.data = camelcaseKeys(error.response.data, { deep: true });
    }
    return Promise.reject(error);
  }
);

export async function getProjectData(page = 1, limit = 12) {
  const skip = (page - 1) * limit;
  const response = await apiClient.get(`/project?skip=${skip}&limit=${limit}`);
  return response.data;
}

export async function postSessionClear(data) {
  const response = await apiClient.post('/project/upload/init', data);
  return response.data;
}

export async function postUploadChunkSession(formData, params) {
  const response = await apiClient.post('/project/upload/chunk', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    params,
  });
  return response.data;
}

export async function deleteProject(projectId) {
  const response = await apiClient.delete(`/project/${projectId}`);
  return response.data;
}

export async function postCreateProject(data) {
  const response = await apiClient.post('/project', data);
  return response.data;
}

export async function getNuclearGeometry(data) {
  const response = await apiClient.get('/geometry/nuclear-buffer', { params: data });
  return response.data;
}

export async function getDisasterGeometry(data) {
  const response = await apiClient.get('/geometry/disaster-buffer', { params: data });
  return response.data;
}

export async function getDisasterLinkGeometry(data) {
  const response = await apiClient.get('/road/geometry', { params: data });
  return response.data;
}

export async function postUploadLocation(data) {
  const response = await apiClient.post(`/position/upload/${data.disasterType}/${data.directory}`);
  return response.data;
}

export async function getPositionData(disasterType, directory, time) {
  const response = await apiClient.get(`/position/${disasterType}`, {
    params: { directory, time }
    });
  return response.data;
}
