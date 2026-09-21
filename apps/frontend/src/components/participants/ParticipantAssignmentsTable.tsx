import { ExternalLink } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api/client";
import type { Participant, ParticipantAssignment, ParticipantAssignmentsPage } from "../../api/types";
import { formatDateRange } from "../../hooks";
import { Table, type TableColumn } from "../Table";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const PAGE_SIZE = 25;

export function ParticipantAssignmentsTable({ participant }: { participant: Participant }) {
  const [assignments, setAssignments] = useState<ParticipantAssignment[]>([]);
  const [nextOffset, setNextOffset] = useState<number | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);
  const requestGeneration = useRef(0);

  const loadPage = useCallback(async (offset: number, replace: boolean, generation: number) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    setError(null);
    try {
      const result = await api<ParticipantAssignmentsPage>(
        `/participants/${participant.id}/assignments?offset=${offset}&limit=${PAGE_SIZE}`
      );
      if (generation !== requestGeneration.current) return;
      setAssignments((current) => replace ? result.assignments : [...current, ...result.assignments]);
      setNextOffset(result.nextOffset);
      setInitialized(true);
    } catch (err) {
      if (generation !== requestGeneration.current) return;
      setError(err instanceof Error ? err.message : "Nao foi possivel carregar as designacoes.");
      setInitialized(true);
    } finally {
      if (generation === requestGeneration.current) {
        loadingRef.current = false;
        setLoading(false);
      }
    }
  }, [participant.id]);

  useEffect(() => {
    const generation = ++requestGeneration.current;
    loadingRef.current = false;
    setAssignments([]);
    setNextOffset(null);
    setInitialized(false);
    setError(null);
    void loadPage(0, true, generation);
    return () => {
      requestGeneration.current += 1;
      loadingRef.current = false;
    };
  }, [loadPage]);

  const loadMore = useCallback(() => {
    if (nextOffset === null || loadingRef.current) return;
    void loadPage(nextOffset, false, requestGeneration.current);
  }, [loadPage, nextOffset]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || nextOffset === null) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) loadMore();
      },
      { rootMargin: "240px" }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore, nextOffset]);

  const columns = useMemo<TableColumn<ParticipantAssignment>[]>(
    () => [
      {
        id: "week",
        header: "Semana",
        cell: (assignment) => formatDateRange(assignment.meeting.startAt, assignment.meeting.endAt),
      },
      {
        id: "meeting",
        header: "Reuniao",
        cell: (assignment) => (assignment.meeting.type === "midweek" ? "Meio de semana" : "Fim de semana"),
      },
      {
        id: "section",
        header: "Secao",
        cell: (assignment) => assignment.section.title,
        cellProps: () => ({ className: "min-w-44 whitespace-normal" }),
      },
      {
        id: "part",
        header: "Parte",
        cell: (assignment) => assignment.part.title,
        cellProps: () => ({ className: "min-w-56 whitespace-normal" }),
      },
      {
        id: "role",
        header: "Funcao",
        cell: (assignment) => assignment.slot.label,
      },
      {
        id: "actions",
        header: "",
        headerProps: { "aria-label": "Acoes" },
        cell: (assignment) => (
          <Link
            className={buttonVariants({ variant: "outline", size: "sm" })}
            to={`/app/assignments/${assignment.meeting.year}/${assignment.meeting.week}/${assignment.meeting.type}`}
          >
            <ExternalLink size={15} />
            Abrir reuniao
          </Link>
        ),
      },
    ],
    []
  );

  return (
    <Card className="participant-assignments min-w-0" aria-labelledby="participant-assignments-title">
      <CardHeader className="border-b">
        <CardTitle id="participant-assignments-title">Designacoes de {participant.name}</CardTitle>
        <CardDescription>Da reuniao mais recente para a mais antiga.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">

      {error && <div className="inline-error">{error}</div>}
      {!initialized && <p className="muted">Carregando designacoes...</p>}
      {initialized && assignments.length === 0 && !error && <p className="muted">Nenhuma designacao encontrada.</p>}

      {assignments.length > 0 && (
        <Table columns={columns} rows={assignments} getRowKey={(assignment) => assignment.id} />
      )}

      <div ref={sentinelRef} className="infinite-scroll-sentinel" aria-hidden="true" />
      {loading && initialized && <p className="muted" aria-live="polite">Carregando mais...</p>}
      {initialized && nextOffset === null && assignments.length > 0 && <p className="muted table-end">Todas as designacoes foram carregadas.</p>}
      </CardContent>
    </Card>
  );
}
