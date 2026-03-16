import api from './api';

export const getSnapshotSummary = () =>
  api.get('/api/trends/snapshot-summary');

export const getRisingSkills = (limit = 8, scope = 'combined') =>
  api.get('/api/trends/rising', { params: { limit, marketScope: scope } });

export const getFallingSkills = (limit = 8, scope = 'combined') =>
  api.get('/api/trends/falling', { params: { limit, marketScope: scope } });

export const getSkillsList = (params) =>
  api.get('/api/trends/skills', { params });

export const getSkillDetail = (skill, scope = 'combined') =>
  api.get(`/api/trends/skills/${encodeURIComponent(skill)}`, {
    params: { marketScope: scope },
  });
