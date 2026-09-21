import { auth, isDevAuthBypass } from "@/auth/firebase";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3333";

export type ApiOptions = RequestInit & {
  publicToken?: string;
  authToken?: string;
};

export async function api<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const { publicToken, authToken, ...requestOptions } = options;
  const headers = new Headers(requestOptions.headers);
  headers.set("Content-Type", "application/json");
  const token = authToken ?? (publicToken ? undefined : await getAuthToken());
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(`${API_URL}${path}`, { ...requestOptions, headers });
  if (!response.ok) {
    const body = await response.json().catch(() => ({ message: "Erro na API." }));
    throw new Error(body.message ?? "Erro na API.");
  }
  return response.json();
}

async function getAuthToken() {
  if (isDevAuthBypass) return null;
  return auth?.currentUser?.getIdToken() ?? null;
}
