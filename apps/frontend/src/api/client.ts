const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3333";

export type ApiOptions = RequestInit & { publicToken?: string };

export async function api<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  const token = options.publicToken ? undefined : await getAuthToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (!response.ok) {
    const body = await response.json().catch(() => ({ message: "Erro na API." }));
    throw new Error(body.message ?? "Erro na API.");
  }
  return response.json();
}

async function getAuthToken() {
  return localStorage.getItem("varjotapp.devToken") ?? import.meta.env.VITE_DEV_AUTH_EMAIL ?? "admin@varjotapp.local";
}
