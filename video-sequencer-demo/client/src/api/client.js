import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const client = axios.create({
  baseURL: API_BASE_URL,
  timeout: 7200000, // 2 hours
});

export const uploadClips = async (files) => {
  const formData = new FormData();
  Array.from(files).forEach(file => {
    formData.append('videos', file);
  });

  const response = await client.post('/clips/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });

  return response.data;
};

export const fetchExistingClips = async () => {
  const response = await client.get('/clips/existing');
  return response.data;
};

export const analyzeClips = async (sessionId, clipIds) => {
  const response = await client.post('/clips/analyze', {
    sessionId,
    clipIds
  });

  return response.data;
};

export const scoreClips = async (clips, sessionId) => {
  const response = await client.post('/clips/score', {
    clips,
    sessionId
  });

  return response.data;
};

export const generateSequence = async (clips, sessionId) => {
  const response = await client.post('/sequence/generate', {
    clips,
    sessionId
  });

  return response.data;
};

export const generateSoundtrack = async (audioSettings, clips, sequence, sessionId) => {
  const response = await client.post('/soundtrack/generate', {
    audioSettings,
    clips,
    sequence,
    sessionId
  });

  return response.data;
};

export const exportData = async (sessionId) => {
  const response = await client.get(`/export/${sessionId}`, {
    responseType: 'blob'
  });

  const blob = new Blob([response.data], { type: 'application/json' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `video-sequence-${sessionId}.json`;
  link.click();
  window.URL.revokeObjectURL(url);
};

// Session management functions
export const listSavedSessions = async () => {
  const response = await client.get('/clips/sessions');
  return response.data;
};

export const loadSession = async (sessionId) => {
  const response = await client.get(`/clips/sessions/${sessionId}`);
  return response.data;
};

export const importMissingClips = async (sessionId) => {
  const response = await client.post(`/clips/sessions/${sessionId}/import-missing`);
  return response.data;
};

export const convertSequencedClips = async (sessionId, sequence) => {
  const response = await client.post('/clips/convert', {
    sessionId,
    sequence
  });
  return response.data;
};