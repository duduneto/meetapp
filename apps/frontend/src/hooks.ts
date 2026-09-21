import { useEffect, useState } from "react";
import { api } from "./api/client";
import type { Session } from "./api/types";

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    api<Session>("/me").then(setSession).catch((err) => setError(err.message));
  }, []);
  return { session, error };
}

export function formatDateRange(startAt: string, endAt: string) {
  const formatter = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" });
  return `${formatter.format(new Date(startAt))} até ${formatter.format(new Date(endAt))}`;
}
