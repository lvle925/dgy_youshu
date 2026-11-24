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
  sensitiveProjectContact: (id) => request('/projects/' + encodeURIComponent(id) + '/sensitive-contact', { method: 'POST' }),
  claimProject: (id) => request('/projects/' + encodeURIComponent(id) + '/claim', { method: 'POST' }),
  releaseProject: (id) => request('/projects/' + encodeURIComponent(id) + '/release', { method: 'POST' }),
  advanceProject: (id, stage) => request('/projects/' + encodeURIComponent(id) + '/stage', { method: 'POST', body: JSON.stringify({ stage }) }),
  completeVisit: (id, data) => request(`/visits/${encodeURIComponent(id)}/complete`, { method: 'POST', body: JSON.stringify(data) }),
  auditLogs: (params = {}) => request('/audit/logs?' + new URLSearchParams(params)),
  auditStatistics: () => request('/audit/statistics'),
  interfaceMetrics: () => request('/system/interface-metrics'),
  auditExport: (data) => request('/audit/export', { method: 'POST', body: JSON.stringify(data) }),
  resetDemoData: () => request('/demo/reset', { method: 'POST' }),
  memberUnlock: (id) => request('/members/' + encodeURIComponent(id) + '/unlock', { method: 'POST' }),
  memberForceLogout: (id) => request('/members/' + encodeURIComponent(id) + '/force-logout', { method: 'POST' }),
  memberResetPassword: (id, password) => request('/members/' + encodeURIComponent(id) + '/reset-password', { method: 'POST', body: JSON.stringify({ password }) }),
  memberImport: (rows) => request('/members/import', { method: 'POST', body: JSON.stringify(rows) }),
  memberLockStates: () => request('/members/lock-state'),
  changePassword: (password) => request('/auth/change-password', { method: 'POST', body: JSON.stringify({ password }) }),
};
