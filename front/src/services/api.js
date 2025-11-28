import axios from 'axios';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

export async function postNuclearGeometry(data) {
  try {
    const response = await axios.post(
      `${BACKEND_URL}/api/geometry/nuclear-buffer`,
      data,  // ⭐ body 데이터
      {
        headers: {'Content-Type': 'application/json'}
      }
    );
    return response.data;
  } catch (error) {
    console.error('Nuclear Geometry API 에러:', error);
    throw error;
  }
}

export async function postDisasterGeometry(data) {
  try {
    const response = await axios.post(
      `${BACKEND_URL}/api/geometry/disaster-buffer`,
      data,
      {
        headers: {'Content-Type': 'application/json'}
      }
    );
    return response.data;
  } catch (error) {
    console.error('Disaster Geometry API 에러:', error);
    throw error;
  }
}

export async function postDisasterLinkGeometry(data) {
  try {
    const response = await axios.post(
      `${BACKEND_URL}/api/road/geometry`,
      data,
      {
        headers: {'Content-Type': 'application/json'}
      }
    );
    return response.data;
  } catch (error) {
    console.error('Disaster Geometry API 에러:', error);
    throw error;
  }
}