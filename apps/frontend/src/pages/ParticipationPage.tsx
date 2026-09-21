import {
  CheckCircle2,
  ChevronDown,
  Clock3,
  ExternalLink,
  ListChecks,
  XCircle,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { useParams } from "react-router-dom";
import { api, ApiError } from "@/api/client";
import type {
  AssignmentResponseStatus,
  ParticipationPayload,
} from "@/api/types";
import { formatDateRange } from "@/hooks";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

type ParticipationAssignment = ParticipationPayload["assignments"][number];

function tokenFromHash() {
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  return params.get("token") ?? "";
}

async function exchangeParticipationCode(code: string) {
  const session = await api<{ accessToken: string; expiresIn: number }>(
    "/participation/session",
    {
      method: "POST",
      body: JSON.stringify({ code }),
    },
  );
  return session.accessToken;
}

function firstPendingAssignmentId(payload: ParticipationPayload) {
  return payload.assignments.find((assignment) => assignment.status === "PENDING")?.id ?? null;
}

function nextPendingAssignmentId(
  payload: ParticipationPayload,
  answeredAssignmentId: string,
) {
  const answeredIndex = payload.assignments.findIndex(
    (assignment) => assignment.id === answeredAssignmentId,
  );
  const assignmentsAfterAnswer = payload.assignments.slice(answeredIndex + 1);
  return (
    assignmentsAfterAnswer.find((assignment) => assignment.status === "PENDING")?.id ??
    firstPendingAssignmentId(payload)
  );
}

export function ParticipationPage() {
  const { code = "" } = useParams();
  const [legacyToken] = useState(tokenFromHash);
  const [token, setToken] = useState<string | null>(null);
  const [payload, setPayload] = useState<ParticipationPayload | null>(null);
  const [openAssignmentId, setOpenAssignmentId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<{
    assignmentId: string;
    status: AssignmentResponseStatus;
  } | null>(null);

  useEffect(() => {
    if (!code && !legacyToken) {
      setError("O link de participação está incompleto.");
      return;
    }

    let active = true;
    setError(null);
    setPayload(null);

    void (async () => {
      try {
        const accessToken = code
          ? await exchangeParticipationCode(code)
          : legacyToken;
        if (!accessToken) throw new Error("O link de participação está incompleto.");
        const nextPayload = await api<ParticipationPayload>("/participation", {
          authToken: accessToken,
        });
        if (!active) return;
        setToken(accessToken);
        setPayload(nextPayload);
        setOpenAssignmentId(
          firstPendingAssignmentId(nextPayload) ?? nextPayload.assignments[0]?.id ?? null,
        );
      } catch (reason) {
        if (!active) return;
        setError(
          reason instanceof Error
            ? reason.message
            : "Não foi possível abrir esta participação.",
        );
      }
    })();

    return () => {
      active = false;
    };
  }, [code, legacyToken]);

  async function respond(
    assignmentId: string,
    status: "CONFIRMED" | "REJECTED",
  ) {
    if (!token) return;
    setSaving({ assignmentId, status });
    setError(null);
    try {
      const sendResponse = (accessToken: string) =>
        api<ParticipationPayload>("/participation/response", {
          method: "POST",
          authToken: accessToken,
          body: JSON.stringify({ assignmentId, status }),
        });

      let updated: ParticipationPayload;
      try {
        updated = await sendResponse(token);
      } catch (reason) {
        if (!(reason instanceof ApiError) || reason.status !== 401 || !code) {
          throw reason;
        }
        const renewedToken = await exchangeParticipationCode(code);
        setToken(renewedToken);
        updated = await sendResponse(renewedToken);
      }
      setPayload(updated);
      const nextAssignmentId = nextPendingAssignmentId(updated, assignmentId);
      setOpenAssignmentId(nextAssignmentId);
      if (nextAssignmentId) {
        window.setTimeout(() => {
          document
            .getElementById(`participation-${nextAssignmentId}`)
            ?.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 0);
      }
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Não foi possível registrar sua resposta.",
      );
    } finally {
      setSaving(null);
    }
  }

  if (error && !payload) {
    return (
      <ParticipationShell>
        <Card>
          <CardHeader>
            <CardTitle>Participação indisponível</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
        </Card>
      </ParticipationShell>
    );
  }

  if (!payload) {
    return (
      <ParticipationShell>
        <Card>
          <CardHeader>
            <CardTitle>Carregando participações</CardTitle>
            <CardDescription>Validando seu link de acesso...</CardDescription>
          </CardHeader>
        </Card>
      </ParticipationShell>
    );
  }

  const { participant, meeting, assignments, publicMeetingLink } = payload;
  const pendingCount = assignments.filter((assignment) => assignment.status === "PENDING").length;

  return (
    <ParticipationShell>
      <Card className="overflow-hidden">
        <CardHeader className="border-b">
          <CardTitle>Olá, {participant.name}</CardTitle>
          <CardDescription>
            {assignments.length === 1
              ? "Confirme se poderá realizar esta participação."
              : "Revise e responda cada uma das suas participações."}
          </CardDescription>
          <CardAction>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!publicMeetingLink}
              title={
                publicMeetingLink
                  ? "Ver designações da reunião"
                  : "Link público indisponível"
              }
              onClick={() => {
                if (!publicMeetingLink) return;
                window.open(publicMeetingLink, "_blank", "noopener,noreferrer");
              }}
            >
              <ExternalLink />
              Ver Reunião
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-3 rounded-xl bg-muted p-4 sm:grid-cols-2">
            <Detail
              label="Reunião"
              value={meeting.type === "midweek" ? "Meio de Semana" : "Fim de Semana"}
            />
            <Detail
              label="Período"
              value={formatDateRange(meeting.startAt, meeting.endAt)}
            />
          </div>

          {assignments.length > 1 && (
            <div className="flex items-start gap-3 rounded-xl border-2 border-warning bg-warning/10 p-4">
              <ListChecks className="mt-0.5 size-6 shrink-0 text-warning" />
              <div>
                <strong className="block text-base">
                  Você tem {assignments.length} participações nesta reunião
                </strong>
                <span className="text-sm text-muted-foreground">
                  {pendingCount > 0
                    ? `Ainda ${pendingCount === 1 ? "falta 1 resposta" : `faltam ${pendingCount} respostas`}.`
                    : "Todas as participações foram respondidas."}
                </span>
              </div>
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="space-y-3">
            {assignments.map((assignment, index) => (
              <ParticipationAssignmentCard
                key={assignment.id}
                assignment={assignment}
                index={index}
                total={assignments.length}
                open={openAssignmentId === assignment.id}
                saving={saving}
                onOpenChange={(open) => setOpenAssignmentId(open ? assignment.id : null)}
                onRespond={(status) => void respond(assignment.id, status)}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </ParticipationShell>
  );
}

function ParticipationAssignmentCard({
  assignment,
  index,
  total,
  open,
  saving,
  onOpenChange,
  onRespond,
}: {
  assignment: ParticipationAssignment;
  index: number;
  total: number;
  open: boolean;
  saving: { assignmentId: string; status: AssignmentResponseStatus } | null;
  onOpenChange: (open: boolean) => void;
  onRespond: (status: "CONFIRMED" | "REJECTED") => void;
}) {
  const confirmed = assignment.status === "CONFIRMED";
  const rejected = assignment.status === "REJECTED";
  const savingThisAssignment = saving?.assignmentId === assignment.id;

  return (
    <Collapsible open={open} onOpenChange={onOpenChange}>
      <div
        id={`participation-${assignment.id}`}
        className={cn(
          "overflow-hidden rounded-xl border bg-card transition-colors",
          open && "border-primary/40 ring-2 ring-primary/10",
        )}
      >
        <CollapsibleTrigger className="flex w-full items-center gap-3 p-4 text-left hover:bg-muted/50">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">
            {index + 1}
          </span>
          <span className="min-w-0 flex-1">
            <strong className="block truncate">{assignment.part.title}</strong>
            <span className="block truncate text-xs text-muted-foreground">
              {assignment.section.title} · {assignment.slot.label}
            </span>
          </span>
          <ParticipationStatusBadge status={assignment.status} />
          <ChevronDown
            className={cn("size-4 shrink-0 transition-transform", open && "rotate-180")}
          />
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="space-y-4 border-t p-4">
            {total > 1 && (
              <p className="text-xs font-medium text-muted-foreground">
                Participação {index + 1} de {total}
              </p>
            )}
            <div className="grid gap-3 rounded-xl bg-muted p-4 sm:grid-cols-2">
              <Detail label="Seção" value={assignment.section.title} />
              <Detail label="Parte" value={assignment.part.title} />
              <Detail label="Função" value={assignment.slot.label} />
              {(assignment.companions ?? []).map((companion) => (
                <Detail
                  key={`${companion.position}:${companion.label}`}
                  label={companion.label}
                  value={companion.participant?.name ?? "Sem designação"}
                />
              ))}
            </div>

            <ParticipationStatus status={assignment.status} />

            <div className="grid gap-2 sm:grid-cols-2">
              <Button
                type="button"
                onClick={() => onRespond("REJECTED")}
                disabled={saving !== null}
                variant="destructive"
              >
                <XCircle />
                {savingThisAssignment && saving?.status === "REJECTED"
                  ? "Registrando..."
                  : rejected
                    ? "Rejeitado"
                    : "Rejeitar"}
              </Button>
              <Button
                type="button"
                onClick={() => onRespond("CONFIRMED")}
                disabled={saving !== null}
                variant="default"
              >
                <CheckCircle2 />
                {savingThisAssignment && saving?.status === "CONFIRMED"
                  ? "Confirmando..."
                  : confirmed
                    ? "Confirmado"
                    : "Confirmar"}
              </Button>
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

function ParticipationStatusBadge({ status }: { status: AssignmentResponseStatus }) {
  return status === "CONFIRMED" ? (
    <Badge variant="success">Confirmado</Badge>
  ) : status === "REJECTED" ? (
    <Badge variant="destructive">Rejeitado</Badge>
  ) : (
    <Badge variant="warning">Pendente</Badge>
  );
}

function ParticipationStatus({ status }: { status: AssignmentResponseStatus }) {
  const confirmed = status === "CONFIRMED";
  const rejected = status === "REJECTED";
  return (
    <div
      className={
        confirmed
          ? "flex items-center gap-2 rounded-lg border border-success/20 bg-success/10 px-3 py-2 text-sm font-medium text-success"
          : rejected
            ? "flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive"
            : "flex items-center gap-2 rounded-lg border border-warning/20 bg-warning/10 px-3 py-2 text-sm font-medium text-warning"
      }
    >
      {confirmed ? (
        <CheckCircle2 className="size-4" />
      ) : rejected ? (
        <XCircle className="size-4" />
      ) : (
        <Clock3 className="size-4" />
      )}
      <span>
        {confirmed
          ? "Participação confirmada"
          : rejected
            ? "Participação rejeitada"
            : "Aguardando sua resposta"}
      </span>
    </div>
  );
}

function ParticipationShell({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-2xl">
        <div className="mb-5 text-center">
          <div className="mx-auto mb-2 flex size-10 items-center justify-center rounded-xl bg-primary font-heading font-semibold text-primary-foreground">
            V
          </div>
          <strong className="font-heading text-lg">Varjotapp</strong>
        </div>
        {children}
      </div>
    </main>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="block text-xs text-muted-foreground">{label}</span>
      <strong className="block font-medium">{value}</strong>
    </div>
  );
}
