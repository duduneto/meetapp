import { History, LoaderCircle } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/api/client";
import type { MeetingActivity, MeetingActivityPage } from "@/api/types";
import { buttonVariants } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const PAGE_SIZE = 25;

const actionLabels: Record<string, string> = {
  ASSIGNMENT_CREATED: "adicionou uma designação",
  ASSIGNMENT_REASSIGNED: "alterou uma designação",
  ASSIGNMENT_REMOVED: "removeu uma designação",
  MEETING_FIELD_UPDATED: "alterou uma informação da reunião",
  PARTICIPATION_LINK_GENERATED: "gerou um link de confirmação",
  PARTICIPATION_NOTIFICATION_SENT: "enviou uma confirmação pelo WhatsApp",
  PARTICIPATION_NOTIFICATION_FAILED: "tentou enviar uma confirmação pelo WhatsApp",
  PARTICIPATION_CONFIRMED: "confirmou a participação",
  PARTICIPATION_REJECTED: "rejeitou a participação",
  PUBLIC_MEETING_LINK_SHARED: "compartilhou o link público da reunião",
  UPDATED: "realizou uma alteração",
};

const dateTimeFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});

export function MeetingActivityHistory({
  year,
  week,
  type,
}: {
  year: number;
  week: number;
  type: "midweek" | "weekend";
}) {
  const [open, setOpen] = useState(false);
  const [activity, setActivity] = useState<MeetingActivity[]>([]);
  const [nextOffset, setNextOffset] = useState<number | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);

  const loadPage = useCallback(
    async (offset: number, replace: boolean) => {
      if (loadingRef.current) return;
      loadingRef.current = true;
      setLoading(true);
      setError(null);
      try {
        const result = await api<MeetingActivityPage>(
          `/assignments/${year}/${week}/${type}/activity?offset=${offset}&limit=${PAGE_SIZE}`,
        );
        setActivity((current) =>
          replace ? result.activity : [...current, ...result.activity],
        );
        setNextOffset(result.nextOffset);
        setInitialized(true);
      } catch (reason) {
        setError(
          reason instanceof Error ? reason.message : "Não foi possível carregar o histórico.",
        );
        setInitialized(true);
      } finally {
        loadingRef.current = false;
        setLoading(false);
      }
    },
    [type, week, year],
  );

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (nextOpen) void loadPage(0, true);
  }

  useEffect(() => {
    setActivity([]);
    setNextOffset(null);
    setInitialized(false);
    setError(null);
  }, [type, week, year]);

  const loadMore = useCallback(() => {
    if (nextOffset === null) return;
    void loadPage(nextOffset, false);
  }, [loadPage, nextOffset]);

  useEffect(() => {
    const root = scrollRef.current;
    const sentinel = sentinelRef.current;
    if (!open || !root || !sentinel || nextOffset === null) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) loadMore();
      },
      { root, rootMargin: "160px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [activity.length, loadMore, nextOffset, open]);

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger
        className={buttonVariants({ variant: "outline", size: "icon" })}
        title="Histórico da reunião"
        aria-label="Abrir histórico da reunião"
      >
        <History />
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader className="border-b">
          <SheetTitle>Histórico da reunião</SheetTitle>
          <SheetDescription>
            Alterações administrativas e respostas dos participantes.
          </SheetDescription>
        </SheetHeader>
        <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
          {!initialized && (
            <p className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
              <LoaderCircle className="animate-spin" />
              Carregando histórico...
            </p>
          )}
          {error && <p className="py-4 text-sm text-destructive">{error}</p>}
          {initialized && activity.length === 0 && !error && (
            <p className="py-6 text-sm text-muted-foreground">
              Nenhuma atividade registrada.
            </p>
          )}
          <div className="divide-y">
            {activity.map((item) => (
              <ActivityItem key={item.id} item={item} />
            ))}
          </div>
          <div ref={sentinelRef} className="h-px" aria-hidden="true" />
          {loading && initialized && (
            <p className="flex items-center justify-center gap-2 py-4 text-xs text-muted-foreground">
              <LoaderCircle className="animate-spin" />
              Carregando mais...
            </p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function ActivityItem({ item }: { item: MeetingActivity }) {
  const context = item.context ?? {};
  const partTitle = typeof context.partTitle === "string" ? context.partTitle : null;
  const slotLabel = typeof context.slotLabel === "string" ? context.slotLabel : null;
  const previousParticipantName =
    typeof context.previousParticipantName === "string"
      ? context.previousParticipantName
      : null;
  const newParticipantName =
    typeof context.newParticipantName === "string" ? context.newParticipantName : null;
  const assignmentChange = previousParticipantName && newParticipantName;
  const tokenName = typeof context.tokenName === "string" ? context.tokenName : null;

  return (
    <div className="space-y-1 py-3 text-sm">
      <p>
        <strong>{item.actor.name}</strong>{" "}
        {assignmentChange ? (
          <>
            alterou uma designação de <strong>{previousParticipantName}</strong> para{" "}
            <strong>{newParticipantName}</strong>
          </>
        ) : (
          actionLabels[item.action] ?? actionLabels.UPDATED
        )}
      </p>
      {(partTitle || slotLabel) && (
        <p className="text-xs text-muted-foreground">
          {[partTitle, slotLabel].filter(Boolean).join(" · ")}
        </p>
      )}
      {tokenName && (
        <p className="text-xs text-muted-foreground">Token: {tokenName}</p>
      )}
      <time className="block text-xs text-muted-foreground" dateTime={item.changedAt}>
        {dateTimeFormatter.format(new Date(item.changedAt))}
      </time>
    </div>
  );
}
