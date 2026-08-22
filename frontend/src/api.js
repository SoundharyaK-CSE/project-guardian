const BASE = import.meta.env.VITE_API_URL || "/api"; 

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

export const api = {
  health: () => request("/health"),
  dashboard: () => request("/dashboard"),
  requirements: {
    list: () => request("/requirements"),
    get: (id) => request(`/requirements/${id}`),
    create: (data) => request("/requirements", { method: "POST", body: JSON.stringify(data) }),
    addVersion: (id, text) =>
      request(`/requirements/${id}/versions`, { method: "POST", body: JSON.stringify({ text }) }),
  },
  analysis: {
    runImpact: (id, body = {}) =>
      request(`/analysis/${id}/impact`, { method: "POST", body: JSON.stringify(body) }),
    history: (id) => request(`/analysis/${id}/impact`),
    generateSuggestions: (id) => request(`/analysis/${id}/suggestions`, { method: "POST" }),
    suggestions: (id) => request(`/analysis/${id}/suggestions`),
    decideSuggestion: (id, status) =>
      request(`/analysis/suggestions/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }),
  },
  traceability: {
    matrix: () => request("/traceability/matrix"),
    graph: (id) => request(`/traceability/${id}/graph`),
    link: (data) => request("/traceability", { method: "POST", body: JSON.stringify(data) }),
  },
  drift: {
    list: (status) => request(`/drift${status ? `?status=${status}` : ""}`),
    check: (data) => request("/drift/check", { method: "POST", body: JSON.stringify(data) }),
    decide: (id, status) => request(`/drift/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }),
  },
  components: {
    list: () => request("/components"),
    create: (data) => request("/components", { method: "POST", body: JSON.stringify(data) }),
  },
};
