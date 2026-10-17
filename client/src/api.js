export class ApiError extends Error {
  constructor(message, status, fields) {
    super(message);
    this.status = status;
    this.fields = fields;
  }
}

async function request(method, url, body) {
  let res;
  try {
    res = await fetch(`/api${url}`, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError('Не удалось связаться с сервером. Проверьте, что он запущен.', 0);
  }
  if (res.status === 204) return null;
  let data = null;
  try { data = await res.json(); } catch { /* пустое или не-JSON тело */ }
  if (!res.ok) {
    throw new ApiError(data?.error || `Ошибка сервера (${res.status})`, res.status, data?.fields);
  }
  return data;
}

const qs = (params) => {
  const s = new URLSearchParams(Object.entries(params).filter(([, v]) => v)).toString();
  return s ? `?${s}` : '';
};

export const api = {
  listSubscriptions: (filters = {}) => request('GET', `/subscriptions${qs(filters)}`),
  getSubscription: (id) => request('GET', `/subscriptions/${id}`),
  createSubscription: (data) => request('POST', '/subscriptions', data),
  updateSubscription: (id, data) => request('PUT', `/subscriptions/${id}`, data),
  deleteSubscription: (id) => request('DELETE', `/subscriptions/${id}`),
  categories: () => request('GET', '/categories'),
  stats: () => request('GET', '/stats'),
  upcoming: (days) => request('GET', `/upcoming${qs({ days })}`),
  settings: () => request('GET', '/settings'),
  saveSettings: (data) => request('PUT', '/settings', data),
};
