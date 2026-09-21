import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { api } from "@/api/client";
import type { AssignmentPayload, Participant } from "@/api/types";
import { formatDateRange } from "@/hooks";
import { cn } from "@/lib/utils";
import { MeetingTable } from "./MeetingTable";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export type MeetingType = "midweek" | "weekend";

type MeetingAssignmentViewProps = {
  year: number | string;
  week: number | string;
  type: MeetingType;
  startAt?: string;
  endAt?: string;
  onBack?: () => void;
  className?: string;
};

function meetingTitle(type: MeetingType) {
  return type === "midweek"
    ? "Reunião de Meio de Semana"
    : "Reunião de Fim de Semana";
}

export function MeetingAssignmentView({
  year,
  week,
  type,
  startAt,
  endAt,
  onBack,
  className,
}: MeetingAssignmentViewProps) {
  const [payload, setPayload] = useState<AssignmentPayload | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    setPayload(null);
    setError(null);

    Promise.all([
      api<AssignmentPayload>(`/assignments/${year}/${week}/${type}`),
      api<{ participants: Participant[] }>("/participants"),
    ])
      .then(([nextPayload, participantResult]) => {
        if (!active) return;
        setPayload(nextPayload);
        setParticipants(participantResult.participants);
      })
      .catch((reason: unknown) => {
        if (!active) return;
        setError(reason instanceof Error ? reason.message : "Erro ao carregar.");
      });

    return () => {
      active = false;
    };
  }, [type, week, year]);

  if (error) {
    return (
      <MeetingStateCard
        title={meetingTitle(type)}
        detail={error}
        startAt={startAt}
        endAt={endAt}
        onBack={onBack}
        className={className}
      />
    );
  }

  if (!payload) {
    return (
      <MeetingStateCard
        title={meetingTitle(type)}
        detail="Buscando designações..."
        startAt={startAt}
        endAt={endAt}
        onBack={onBack}
        className={className}
      />
    );
  }

  return (
    <MeetingTable
      payload={payload}
      participants={participants}
      onBack={onBack}
      className={className}
      onSave={async (body) => {
        const updated = await api<AssignmentPayload>(
          `/assignments/${year}/${week}/${type}`,
          { method: "PUT", body: JSON.stringify(body) },
        );
        setPayload(updated);
      }}
    />
  );
}

function MeetingStateCard({
  title,
  detail,
  startAt,
  endAt,
  onBack,
  className,
}: {
  title: string;
  detail: string;
  startAt?: string;
  endAt?: string;
  onBack?: () => void;
  className?: string;
}) {
  return (
    <Card className={cn("py-0", className)}>
      <CardHeader className="border-b py-4">
        <div className="flex items-start gap-2">
          {onBack && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="-ml-2"
              onClick={onBack}
            >
              <ArrowLeft />
              Voltar
            </Button>
          )}
          <div>
            <CardTitle className="text-xl">{title}</CardTitle>
            {startAt && endAt && (
              <CardDescription>{formatDateRange(startAt, endAt)}</CardDescription>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="py-6 text-muted-foreground">{detail}</CardContent>
    </Card>
  );
}
