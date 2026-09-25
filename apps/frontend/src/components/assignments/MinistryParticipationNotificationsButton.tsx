import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Send,
} from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "@/api/client";
import type {
  AssignmentResponseStatus,
  ParticipationNotificationStatus,
} from "@/api/types";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";

export type MinistryNotificationAssignment = {
  assignmentId: string;
  participantName: string;
  partTitle: string;
  slotLabel: string;
  hasWhatsapp: boolean;
  responseStatus: AssignmentResponseStatus;
  notificationStatus: ParticipationNotificationStatus | null;
};

type NotificationResult = {
  assignmentId: string;
  participantName: string;
  status: "sent" | "failed" | "skipped";
  reason?: string;
};

type NotificationBatch = {
  ok: boolean;
  batchId: string;
  totals: {
    sent: number;
    failed: number;
    skipped: number;
    attempted: number;
  };
  results: NotificationResult[];
};

const skipLabels: Record<string, string> = {
  already_sent: "já recebeu o link atual",
  assignment_changed: "a designação mudou durante o envio",
  missing_or_invalid_whatsapp: "WhatsApp ausente ou inválido",
  participation_already_answered: "já respondeu à participação",
  send_in_progress: "envio já está em andamento",
};

function dateOnly(value: string) {
  return value.slice(0, 10);
}

function suggestedMeetingDate(startAt: string, endAt: string) {
  const suggested = new Date(startAt);
  suggested.setUTCDate(suggested.getUTCDate() + 2);
  const value = suggested.toISOString().slice(0, 10);
  return value > dateOnly(endAt) ? dateOnly(startAt) : value;
}

export function MinistryParticipationNotificationsButton({
  year,
  week,
  meetingType = "midweek",
  startAt,
  endAt,
  sectionKey,
  sectionTitle,
  assignments,
}: {
  year: number;
  week: number;
  meetingType?: "midweek" | "weekend";
  startAt: string;
  endAt: string;
  sectionKey: string;
  sectionTitle: string;
  assignments: MinistryNotificationAssignment[];
}) {
  const [open, setOpen] = useState(false);
  const [meetingDate, setMeetingDate] = useState(() =>
    meetingType === "weekend" ? dateOnly(endAt) : suggestedMeetingDate(startAt, endAt),
  );
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<NotificationBatch | null>(null);
  const [notificationStatuses, setNotificationStatuses] = useState<
    Record<string, ParticipationNotificationStatus | null>
  >({});

  useEffect(() => {
    setMeetingDate(
      meetingType === "weekend" ? dateOnly(endAt) : suggestedMeetingDate(startAt, endAt),
    );
  }, [endAt, meetingType, startAt]);

  useEffect(() => {
    setNotificationStatuses(
      Object.fromEntries(
        assignments.map((assignment) => [
          assignment.assignmentId,
          assignment.notificationStatus,
        ]),
      ),
    );
  }, [assignments]);

  async function send(
    force: boolean,
    assignmentIds: string[] | undefined,
    actionKey: string,
  ) {
    if (!meetingDate) {
      setError("Selecione a data da reunião.");
      return;
    }

    setActiveAction(actionKey);
    setError(null);
    setResult(null);
    try {
      const response = await api<NotificationBatch>(
        `/assignments/${year}/${week}/${meetingType}/sections/${encodeURIComponent(sectionKey)}/participation-notifications`,
        {
          method: "POST",
          body: JSON.stringify({
            force,
            meetingDate,
            ...(assignmentIds ? { assignmentIds } : {}),
          }),
        },
      );
      setResult(response);
      setNotificationStatuses((current) => {
        const next = { ...current };
        for (const item of response.results) {
          if (item.status === "sent" || item.reason === "already_sent") {
            next[item.assignmentId] = "SENT";
          } else if (item.status === "failed") {
            next[item.assignmentId] = "FAILED";
          }
        }
        return next;
      });
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Não foi possível enviar as confirmações.",
      );
    } finally {
      setActiveAction(null);
    }
  }

  const noteworthyResults = result?.results.filter(
    (item) => item.status === "failed" || item.reason === "missing_or_invalid_whatsapp",
  );
  const loading = activeAction !== null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={buttonVariants({
          variant: "secondary",
          size: "sm",
          className: "no-print",
        })}
      >
        <Send />
        Enviar confirmações
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(94vw,38rem)] space-y-4">
        <div className="space-y-1">
          <PopoverTitle>Enviar confirmações pelo WhatsApp</PopoverTitle>
          <PopoverDescription>
            {sectionTitle}: selecione a data usada na mensagem e envie individualmente ou em lote.
          </PopoverDescription>
        </div>

        <label className="grid gap-1.5 text-sm font-medium">
          <span className="flex items-center gap-1.5">
            <CalendarDays className="size-4" />
            Data da reunião
          </span>
          <Input
            required
            type="date"
            min={dateOnly(startAt)}
            max={dateOnly(endAt)}
            value={meetingDate}
            disabled={loading}
            onChange={(event) => setMeetingDate(event.target.value)}
          />
        </label>

        <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
          {assignments.length === 0 && (
            <p className="rounded-lg border p-3 text-sm text-muted-foreground">
              Não há participantes designados nesta seção.
            </p>
          )}
          {assignments.map((assignment) => {
            const notificationStatus = notificationStatuses[assignment.assignmentId] ?? null;
            const answered = assignment.responseStatus !== "PENDING";
            const pendingSend = notificationStatus === "PENDING";
            const actionLabel =
              notificationStatus === "SENT"
                ? "Reenviar"
                : notificationStatus === "FAILED"
                  ? "Tentar novamente"
                  : "Enviar";
            const itemLoading = activeAction === assignment.assignmentId;

            return (
              <div
                key={assignment.assignmentId}
                className="flex items-center justify-between gap-3 rounded-lg border p-3"
              >
                <div className="min-w-0">
                  <strong className="block truncate text-sm">{assignment.participantName}</strong>
                  <span className="block truncate text-xs text-muted-foreground">
                    {assignment.partTitle} · {assignment.slotLabel}
                  </span>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {answered ? (
                      <Badge variant="secondary">Participação respondida</Badge>
                    ) : !assignment.hasWhatsapp ? (
                      <Badge variant="destructive">Sem WhatsApp</Badge>
                    ) : notificationStatus === "SENT" ? (
                      <Badge variant="success">Enviado</Badge>
                    ) : notificationStatus === "FAILED" ? (
                      <Badge variant="destructive">Falhou</Badge>
                    ) : pendingSend ? (
                      <Badge variant="warning">Em andamento</Badge>
                    ) : (
                      <Badge variant="outline">Não enviado</Badge>
                    )}
                  </div>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant={notificationStatus === "SENT" ? "outline" : "default"}
                  disabled={
                    loading ||
                    !meetingDate ||
                    answered ||
                    !assignment.hasWhatsapp ||
                    pendingSend
                  }
                  onClick={() =>
                    void send(
                      notificationStatus === "SENT",
                      [assignment.assignmentId],
                      assignment.assignmentId,
                    )
                  }
                >
                  {itemLoading ? (
                    <Loader2 className="animate-spin" />
                  ) : notificationStatus === "SENT" ? (
                    <RefreshCw />
                  ) : (
                    <Send />
                  )}
                  {itemLoading ? "Enviando..." : actionLabel}
                </Button>
              </div>
            );
          })}
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertTriangle className="mt-0.5 size-4" />
            <span>{error}</span>
          </div>
        )}

        {result && (
          <div className="space-y-3">
            <div
              className={
                result.ok
                  ? "flex items-start gap-2 rounded-lg border border-success/35 bg-success/15 p-3 text-sm"
                  : "flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/18 p-3 text-sm"
              }
            >
              {result.ok ? (
                <CheckCircle2 className="mt-0.5 size-4 text-success" />
              ) : (
                <AlertTriangle className="mt-0.5 size-4 text-warning" />
              )}
              <div className="flex flex-wrap gap-2">
                <Badge variant="success">{result.totals.sent} enviados</Badge>
                {result.totals.failed > 0 && (
                  <Badge variant="destructive">{result.totals.failed} falharam</Badge>
                )}
                <Badge variant="secondary">{result.totals.skipped} ignorados</Badge>
              </div>
            </div>
            {noteworthyResults && noteworthyResults.length > 0 && (
              <ul className="max-h-28 space-y-1 overflow-y-auto text-xs text-muted-foreground">
                {noteworthyResults.map((item) => (
                  <li key={`${item.assignmentId}:${item.status}`}>
                    <strong>{item.participantName}:</strong>{" "}
                    {item.reason ? (skipLabels[item.reason] ?? item.reason) : "falha no envio"}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            disabled={loading || !meetingDate || assignments.length === 0}
            onClick={() => void send(true, undefined, "bulk-resend")}
            title="Gera novos links para todos os participantes que ainda não responderam"
          >
            {activeAction === "bulk-resend" ? (
              <Loader2 className="animate-spin" />
            ) : (
              <RefreshCw />
            )}
            Reenviar pendentes
          </Button>
          <Button
            type="button"
            disabled={loading || !meetingDate || assignments.length === 0}
            onClick={() => void send(false, undefined, "bulk-new")}
          >
            {activeAction === "bulk-new" ? <Loader2 className="animate-spin" /> : <Send />}
            {activeAction === "bulk-new" ? "Enviando..." : "Enviar não enviados"}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
