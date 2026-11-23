const request = async (path, options = {}) => {
  const response = await fetch(`/api${path}`, { ...options, headers: { 'Content-Type': 'application/json', ...options.headers } });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    if (response.status === 401 || response.status === 403) window.dispatchEvent(new Event('workspace-access-changed'));
    throw new Error(body.message || `服务请求失败 (${response.status})`);
  }
  return response.status === 204 ? null : response.json();
};
export const api = {
  list: (collection) => request(`/records/${collection}`),
  create: (collection, row) => request(`/records/${collection}`, { method: 'POST', body: JSON.stringify(row) }),
  update: (collection, row) => request(`/records/${collection}/${encodeURIComponent(row.id)}`, { method: 'PUT', body: JSON.stringify(row) }),
  remove: (collection, id) => request(`/records/${collection}/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  saveConfig: (collection, id, data) => request('/records/' + collection + '/config/' + encodeURIComponent(id), { method: 'PUT', body: JSON.stringify(data) }),
  points: () => request('/workspace/points'),
  unlockProject: (id) => request('/workspace/projects/' + encodeURIComponent(id) + '/unlock', { method: 'POST' }),
  completeVisit: (id, data) => request(`/visits/${encodeURIComponent(id)}/complete`, { method: 'POST', body: JSON.stringify(data) }),
};
