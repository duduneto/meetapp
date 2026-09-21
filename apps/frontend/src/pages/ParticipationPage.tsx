import { CheckCircle2, Clock3, ExternalLink, XCircle } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { useParams } from "react-router-dom";
import { api, ApiError } from "@/api/client";
import type {
  AssignmentResponseStatus,
  ParticipationPayload,
} from "@/api/types";
import { formatDateRange } from "@/hooks";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

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

export function ParticipationPage() {
  const { code = "" } = useParams();
  const [legacyToken] = useState(tokenFromHash);
  const [token, setToken] = useState<string | null>(null);
  const [payload, setPayload] = useState<ParticipationPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<AssignmentResponseStatus | null>(null);

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

  async function respond(status: "CONFIRMED" | "REJECTED") {
    if (!token) return;
    setSaving(status);
    setError(null);
    try {
      const sendResponse = (accessToken: string) =>
        api<ParticipationPayload>("/participation/response", {
          method: "POST",
          authToken: accessToken,
          body: JSON.stringify({ status }),
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
            <CardTitle>Carregando participação</CardTitle>
            <CardDescription>Validando seu link de acesso...</CardDescription>
          </CardHeader>
        </Card>
      </ParticipationShell>
    );
  }

  const { assignment, publicMeetingLink } = payload;
  const confirmed = assignment.status === "CONFIRMED";
  const rejected = assignment.status === "REJECTED";

  return (
    <ParticipationShell>
      <Card className="overflow-hidden">
        <CardHeader className="border-b">
          <CardTitle>Olá, {assignment.participant.name}</CardTitle>
          <CardDescription>
            Confirme se poderá realizar esta participação.
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
          <div className="grid gap-3 rounded-xl bg-muted p-4">
            <Detail label="Reunião" value={assignment.meeting.type === "midweek" ? "Meio de Semana" : "Fim de Semana"} />
            <Detail label="Período" value={formatDateRange(assignment.meeting.startAt, assignment.meeting.endAt)} />
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
              <CheckCircle2 className="size-4 text-success" />
            ) : rejected ? (
              <XCircle className="size-4 text-destructive" />
            ) : (
              <Clock3 className="size-4 text-warning" />
            )}
            <span>
              {confirmed
                ? "Participação confirmada"
                : rejected
                  ? "Participação rejeitada"
                  : "Aguardando sua resposta"}
            </span>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="grid gap-2 sm:grid-cols-2">
            <Button
              type="button"
              onClick={() => respond("REJECTED")}
              disabled={saving !== null}
              variant="destructive"
            >
              <XCircle />
              {saving === "REJECTED" ? "Registrando..." : "Rejeitar"}
            </Button>
            <Button
              type="button"
              onClick={() => respond("CONFIRMED")}
              disabled={saving !== null}
              variant="default"
            >
              <CheckCircle2 />
              {saving === "CONFIRMED" ? "Confirmando..." : "Confirmar"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </ParticipationShell>
  );
}

function ParticipationShell({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-lg">
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
