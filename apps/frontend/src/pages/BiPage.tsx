import { useEffect, useState } from "react";
import { api } from "../api/client";

type Row = { participantId: string; name: string; totalAssignments: number; lastAssignmentAt: string | null; lastAssignmentTitle: string | null };

export function BiPage() {
  const [rows, setRows] = useState<Row[]>([]);
  useEffect(() => {
    api<{ rows: Row[] }>("/reports/participant-usage").then((data) => setRows(data.rows));
  }, []);
  return (
    <section>
      <p className="mb-4 text-sm text-muted-foreground">Distribuicao simples por participante.</p>
      <div className="data-list">
        {rows.map((row) => (
          <div className="data-row" key={row.participantId}>
            <div>
              <strong>{row.name}</strong>
              <span>Ultima: {row.lastAssignmentTitle ?? "Sem designacao"}</span>
            </div>
            <strong>{row.totalAssignments}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}
