const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: "include",
    headers:
      init?.body instanceof FormData
        ? init?.headers
        : { "Content-Type": "application/json", ...init?.headers },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export interface User {
  id: string;
  email: string;
}

export const api = {
  signup: (email: string, password: string) =>
    request<User>("/auth/signup", { method: "POST", body: JSON.stringify({ email, password }) }),
  login: (email: string, password: string) =>
    request<User>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  logout: () => request("/auth/logout", { method: "POST" }),
  me: () => request<User>("/auth/me"),

  listApiKeys: () =>
    request<{ keys: Array<{ id: string; provider: string; label: string; maskedPreview: string }> }>(
      "/api-keys"
    ),
  addApiKey: (provider: string, label: string, apiKey: string) =>
    request("/api-keys", { method: "POST", body: JSON.stringify({ provider, label, apiKey }) }),
  deleteApiKey: (id: string) => request(`/api-keys/${id}`, { method: "DELETE" }),
  getOpenrouterModels: () =>
    request<{ models: Array<{ value: string; label: string }> }>("/providers/openrouter/models"),

  createJob: (form: FormData) => request<{ documentId: string; status: string }>("/jobs", { method: "POST", body: form }),

  listDocuments: (contentType?: string) =>
    request<{ documents: any[] }>(`/documents${contentType ? `?contentType=${contentType}` : ""}`),
  getDocument: (id: string) => request<any>(`/documents/${id}`),
  updateDocument: (id: string, body: { title?: string; contentType?: string }) =>
    request(`/documents/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  updateTransition: (docId: string, transitionId: string, description: string) =>
    request(`/documents/${docId}/transitions/${transitionId}`, {
      method: "PATCH",
      body: JSON.stringify({ description }),
    }),
  submitFeedback: (docId: string, body: { rating?: number; text?: string; frameTransitionId?: string }) =>
    request(`/documents/${docId}/feedback`, { method: "POST", body: JSON.stringify(body) }),
  exportUrl: (docId: string) => `${API_URL}/documents/${docId}/export`,

  getGallery: () => request<{ patterns: any[] }>("/gallery"),

  createRecreate: (form: FormData) =>
    request<{ blueprintId: string; status: string }>("/recreate", { method: "POST", body: form }),
  getRecreate: (id: string) => request<any>(`/recreate/${id}`),
};
