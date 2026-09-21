import { useAdminAuth } from "./auth/AuthContext";

export function useSession() {
  const { session, error } = useAdminAuth();
  return { session, error };
}

export function formatDateRange(startAt: string, endAt: string) {
  const formatter = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" });
  return `${formatter.format(new Date(startAt))} a ${formatter.format(new Date(endAt))}`;
}
