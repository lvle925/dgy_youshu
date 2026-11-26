import { apiFetch } from './http';

const request = async (path, options = {}) => {
  const response = await apiFetch(`/api${path}`, { ...options, headers: { 'Content-Type': 'application/json', ...options.headers } });
  if (!response.ok) throw new Error(`服务请求失败 (${response.status})`);
  return response.status === 204 ? null : response.json();
};
export const api = {
  list: (collection) => request(`/records/${collection}`),
  create: (collection, row) => request(`/records/${collection}`, { method: 'POST', body: JSON.stringify(row) }),
  update: (collection, row) => request(`/records/${collection}/${encodeURIComponent(row.id)}`, { method: 'PUT', body: JSON.stringify(row) }),
  remove: (collection, id) => request(`/records/${collection}/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  completeVisit: (id, data) => request(`/visits/${encodeURIComponent(id)}/complete`, { method: 'POST', body: JSON.stringify(data) }),
};
