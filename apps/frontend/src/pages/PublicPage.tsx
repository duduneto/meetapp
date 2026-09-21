import { useEffect, useState } from "react";
import { api } from "../api/client";
import type { AssignmentPayload, Participant } from "../api/types";
import { MeetingTable } from "../components/assignments/MeetingTable";

export function PublicPage() {
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token") ?? "";
  const [payload, setPayload] = useState<AssignmentPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const year = params.get("year");
    const week = params.get("week");
    const type = params.get("type");
    if (!year || !week || !type) {
      setError("Use um link direto com ano, semana e tipo de reuniao.");
      return;
    }
    api<AssignmentPayload>(`/public/assignments/${year}/${week}/${type}?token=${encodeURIComponent(token)}`, { publicToken: token })
      .then(setPayload)
      .catch((err) => setError(err.message));
  }, []);

  if (error) return <main className="public-page"><div className="empty-state"><h1>Link publico</h1><p>{error}</p></div></main>;
  if (!payload) return <main className="public-page"><div className="empty-state"><h1>Carregando</h1><p>Buscando designacoes.</p></div></main>;

  return (
    <main className="public-page">
      <MeetingTable payload={{ ...payload, canWrite: false }} participants={[] as Participant[]} onSave={async () => undefined} />
    </main>
  );
}
