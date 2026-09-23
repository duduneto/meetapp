import {
  CalendarDays,
  ChevronLeft,
  ExternalLink,
  ListFilter,
  LoaderCircle,
  Search,
  UserRoundSearch,
} from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "@/api/client";
import type {
  ParticipantAssignmentHistory,
  ParticipantAssignmentSummary,
  PublicParticipant,
} from "@/api/types";
import { formatDateRange } from "@/hooks";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

type Period = "upcoming" | "past";

type ParticipantAssignmentsSheetProps = {
  accessToken: string;
  participant?: PublicParticipant;
  triggerLabel: string;
  triggerClassName?: string;
  onOpenMeeting?: (assignment: ParticipantAssignmentSummary) => void;
};

export function ParticipantAssignmentsSheet({
  accessToken,
  participant,
  triggerLabel,
  triggerClassName,
  onOpenMeeting,
}: ParticipantAssignmentsSheetProps) {
  const [open, setOpen] = useState(false);
  const [selectedParticipant, setSelectedParticipant] = useState<PublicParticipant | null>(
    participant ?? null,
  );
  const [search, setSearch] = useState("");
  const [participants, setParticipants] = useState<PublicParticipant[]>([]);
  const [period, setPeriod] = useState<Period>("upcoming");
  const [assignments, setAssignments] = useState<ParticipantAssignmentSummary[]>([]);
  const [loadingParticipants, setLoadingParticipants] = useState(false);
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (participant) setSelectedParticipant(participant);
  }, [participant]);

  useEffect(() => {
    if (!open || participant || selectedParticipant) return;
    let active = true;
    setLoadingParticipants(true);
    setError(null);
    const timeout = window.setTimeout(() => {
      api<{ participants: PublicParticipant[] }>(
        `/public/participants?search=${encodeURIComponent(search)}&limit=20`,
        { authToken: accessToken },
      )
        .then((response) => {
          if (active) setParticipants(response.participants);
        })
        .catch((reason) => {
          if (active) {
            setError(
              reason instanceof Error
                ? reason.message
                : "Não foi possível buscar os participantes.",
            );
          }
        })
        .finally(() => {
          if (active) setLoadingParticipants(false);
        });
    }, 250);
    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
  }, [accessToken, open, participant, search, selectedParticipant]);

  useEffect(() => {
    if (!open || !selectedParticipant) return;
    let active = true;
    setLoadingAssignments(true);
    setAssignments([]);
    setError(null);
    const path = participant
      ? `/participation/assignments?period=${period}&limit=100`
      : `/public/participants/${encodeURIComponent(selectedParticipant.id)}/assignments?period=${period}&limit=100`;
    api<ParticipantAssignmentHistory>(path, { authToken: accessToken })
      .then((response) => {
        if (active) setAssignments(response.assignments);
      })
      .catch((reason) => {
        if (active) {
          setError(
            reason instanceof Error
              ? reason.message
              : "Não foi possível carregar as participações.",
          );
        }
      })
      .finally(() => {
        if (active) setLoadingAssignments(false);
      });
    return () => {
      active = false;
    };
  }, [accessToken, open, participant, period, selectedParticipant]);

  function chooseParticipant(nextParticipant: PublicParticipant) {
    setSelectedParticipant(nextParticipant);
    setPeriod("upcoming");
    setError(null);
  }

  function openMeeting(assignment: ParticipantAssignmentSummary) {
    if (onOpenMeeting) {
      onOpenMeeting(assignment);
      setOpen(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        className={cn(buttonVariants({ variant: "outline" }), triggerClassName)}
      >
        <ListFilter />
        {triggerLabel}
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader className="border-b pr-12">
          <SheetTitle>
            {participant ? "Outras participações" : "Participações por pessoa"}
          </SheetTitle>
          <SheetDescription>
            {participant
              ? `Consulte as participações anteriores e próximas de ${participant.name}.`
              : "Busque um participante e consulte suas participações."}
          </SheetDescription>
        </SheetHeader>

        {!selectedParticipant ? (
          <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="h-10 pl-9"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar participante..."
                autoFocus
              />
            </label>
            <div className="mt-3 space-y-2">
              {loadingParticipants && (
                <LoadingMessage label="Buscando participantes..." />
              )}
              {!loadingParticipants && participants.length === 0 && !error && (
                <EmptyMessage label="Nenhum participante encontrado." />
              )}
              {participants.map((candidate) => (
                <button
                  key={candidate.id}
                  type="button"
                  className="flex min-h-12 w-full items-center gap-3 rounded-xl border px-3 text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => chooseParticipant(candidate)}
                >
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                    <UserRoundSearch className="size-4" />
                  </span>
                  <strong className="truncate font-medium">{candidate.name}</strong>
                </button>
              ))}
            </div>
            {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="space-y-3 border-b px-4 pb-4">
              {!participant && (
                <Button
                  type="button"
                  variant="ghost"
                  className="-ml-2"
                  onClick={() => {
                    setSelectedParticipant(null);
                    setAssignments([]);
                    setError(null);
                  }}
                >
                  <ChevronLeft />
                  Trocar participante
                </Button>
              )}
              <strong className="block truncate text-base">{selectedParticipant.name}</strong>
              <div className="grid grid-cols-2 rounded-xl bg-muted p-1" aria-label="Período">
                <PeriodButton
                  active={period === "upcoming"}
                  onClick={() => setPeriod("upcoming")}
                >
                  Próximas
                </PeriodButton>
                <PeriodButton
                  active={period === "past"}
                  onClick={() => setPeriod("past")}
                >
                  Anteriores
                </PeriodButton>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-5">
              {loadingAssignments && (
                <LoadingMessage label="Carregando participações..." />
              )}
              {!loadingAssignments && assignments.length === 0 && !error && (
                <EmptyMessage
                  label={
                    period === "upcoming"
                      ? "Nenhuma próxima participação encontrada."
                      : "Nenhuma participação anterior encontrada."
                  }
                />
              )}
              {error && <p className="py-4 text-sm text-destructive">{error}</p>}
              <div className="space-y-3 pt-4">
                {assignments.map((assignment) => (
                  <AssignmentSummaryCard
                    key={assignment.id}
                    assignment={assignment}
                    canOpen={Boolean(onOpenMeeting || assignment.publicMeetingLink)}
                    href={onOpenMeeting ? undefined : assignment.publicMeetingLink ?? undefined}
                    onOpen={() => openMeeting(assignment)}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function PeriodButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={cn(
        "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        active ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
      )}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function AssignmentSummaryCard({
  assignment,
  canOpen,
  href,
  onOpen,
}: {
  assignment: ParticipantAssignmentSummary;
  canOpen: boolean;
  href?: string;
  onOpen: () => void;
}) {
  return (
    <article className="space-y-3 rounded-xl border p-4">
      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
          <CalendarDays className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <span className="block text-xs text-muted-foreground">
            {formatDateRange(assignment.meeting.startAt, assignment.meeting.endAt)} · {assignment.meeting.type === "midweek" ? "Meio de Semana" : "Fim de Semana"}
          </span>
          <strong className="mt-1 block leading-snug">{assignment.part.title}</strong>
          <span className="mt-1 block text-sm text-muted-foreground">
            {assignment.section.title} · {assignment.slot.label}
          </span>
        </div>
      </div>
      {href ? (
        <a
          className={buttonVariants({ variant: "outline", className: "w-full" })}
          href={href}
          target="_blank"
          rel="noreferrer"
          title="Ver detalhes completos da reunião"
        >
          <ExternalLink />
          Ver reunião
        </a>
      ) : (
        <Button
          type="button"
          variant="outline"
          className="w-full"
          disabled={!canOpen}
          title={canOpen ? "Ver detalhes completos da reunião" : "Link público indisponível"}
          onClick={onOpen}
        >
          <ExternalLink />
          Ver reunião
        </Button>
      )}
    </article>
  );
}

function LoadingMessage({ label }: { label: string }) {
  return (
    <p className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
      <LoaderCircle className="size-4 animate-spin" />
      {label}
    </p>
  );
}

function EmptyMessage({ label }: { label: string }) {
  return <p className="py-8 text-center text-sm text-muted-foreground">{label}</p>;
}
