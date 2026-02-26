import axios from 'axios';
import camelcaseKeys from 'camelcase-keys';
import snakecaseKeys from 'snakecase-keys';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

const apiClient = axios.create({
  baseURL: BACKEND_URL,
  headers: { 'Content-Type': 'application/json' }
});

// 요청 인터셉터: camelCase → snake_case
apiClient.interceptors.request.use(
  (config) => {
    // FormData는 변환하지 않음
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

// 응답 인터셉터: snake_case → camelCase
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

// 프로젝트 목록 조회
export async function getProjectData(page = 1, limit = 12) {
  const skip = (page - 1) * limit;
  const response = await apiClient.get(`/project?skip=${skip}&limit=${limit}`);
  return response.data;
}

// 업로드 세션 생성
export async function postSessionClear(data) {
  const response = await apiClient.post('/project/upload/init', data);
  return response.data;
}

// 청크 업로드 (FormData)
export async function postUploadChunkSession(formData, params) {
  const response = await apiClient.post('/project/upload/chunk', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    params,
  });
  return response.data;
}

// 프로젝트 삭제
export async function deleteProject(projectId) {
  const response = await apiClient.delete(`/project/${projectId}`);
  return response.data;
}

// 프로젝트 등록
export async function postCreateProject(data) {
  const response = await apiClient.post('/project', data);
  return response.data;
}

// Nuclear Geometry
export async function postNuclearGeometry(data) {
  const response = await apiClient.post('/geometry/nuclear-buffer', data);
  return response.data;
}

// Disaster Geometry
export async function getDisasterGeometry(data) {
  const response = await apiClient.get('/geometry/disaster-buffer', { params: data });
  return response.data;
}

// Disaster Link Geometry (Road)
export async function getDisasterLinkGeometry(data) {
  const response = await apiClient.get('/road/geometry', { params: data });
  return response.data;
}

// 위치 데이터 업로드
export async function postUploadLocation(data) {
  const response = await apiClient.post(`/position/upload/${data.disasterType}/${data.directory}`);
  return response.data;
}

// 위치 데이터 조회
export async function getPositionData(disasterType, directory, time) {
  const response = await apiClient.get(`/position/${disasterType}`, {
    params: { directory, time }
    });
  return response.data;
}