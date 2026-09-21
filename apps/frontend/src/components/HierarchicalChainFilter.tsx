import {
  BriefcaseBusiness,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
  Mic2,
} from "lucide-react";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import { useEffect, useMemo, useRef, type ReactNode } from "react";
import { formatDateRange } from "@/hooks";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export type HierarchicalMonth = {
  year: number;
  month: number;
  weekCount: number;
};

export type HierarchicalWeek = {
  year: number;
  yearWeek: number;
  startAt: string;
  endAt: string;
  hasMidweek: boolean;
  hasWeekend: boolean;
};

export type HierarchicalMeetingType = "midweek" | "weekend";

type Selection = {
  year?: number;
  month?: number;
  week?: HierarchicalWeek;
  type?: HierarchicalMeetingType;
};

type HierarchicalChainFilterProps = {
  months: HierarchicalMonth[];
  weeks: HierarchicalWeek[];
  selection: Selection;
  loading?: boolean;
  error?: string | null;
  results?: ReactNode;
  onSelectMonth: (month: HierarchicalMonth) => void;
  onSelectWeek: (week: HierarchicalWeek) => void;
  onSelectType: (type: HierarchicalMeetingType) => void;
  onBack: () => void;
  onJumpToLevel: (level: 1 | 2 | 3) => void;
};

const monthFormatter = new Intl.DateTimeFormat("pt-BR", {
  month: "long",
  timeZone: "UTC",
});

function formatMonth(month: number) {
  const value = monthFormatter.format(new Date(Date.UTC(2024, month - 1, 1)));
  return value.charAt(0).toLocaleUpperCase("pt-BR") + value.slice(1);
}

function meetingTypeLabel(type: HierarchicalMeetingType) {
  return type === "midweek" ? "Meio de Semana" : "Fim de Semana";
}

export function HierarchicalChainFilter({
  months,
  weeks,
  selection,
  loading = false,
  error,
  results,
  onSelectMonth,
  onSelectWeek,
  onSelectType,
  onBack,
  onJumpToLevel,
}: HierarchicalChainFilterProps) {
  const depth = selection.type ? 4 : selection.week ? 3 : selection.month ? 2 : 1;
  const previousDepth = useRef(depth);
  const direction = depth >= previousDepth.current ? 1 : -1;

  useEffect(() => {
    previousDepth.current = depth;
  }, [depth]);

  const groups = useMemo(() => {
    const byYear = new Map<number, HierarchicalMonth[]>();
    for (const month of [...months].sort((a, b) => a.year - b.year || a.month - b.month)) {
      const values = byYear.get(month.year) ?? [];
      values.push(month);
      byYear.set(month.year, values);
    }
    return [...byYear].map(([year, values]) => ({ year, months: values }));
  }, [months]);

  return (
    <LayoutGroup id="public-assignment-drilldown">
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col bg-background sm:min-h-[calc(100dvh-2rem)] sm:rounded-2xl sm:ring-1 sm:ring-foreground/10">
        <header className="sticky top-0 z-30 border-b bg-background/95 px-3 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/85">
          <div className="flex min-h-10 items-center gap-1 overflow-hidden">
            <AnimatePresence initial={false}>
              {depth > 1 && (
                <motion.div
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                >
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-10 shrink-0"
                    aria-label="Voltar um nível"
                    onClick={onBack}
                  >
                    <ChevronLeft />
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>

            {depth === 1 ? (
              <div className="min-w-0 px-1">
                <strong className="block font-heading text-base">Designações</strong>
                <span className="block text-xs text-muted-foreground">Selecione um mês</span>
              </div>
            ) : (
              <nav
                aria-label="Filtros selecionados"
                className="flex min-w-0 flex-1 items-center overflow-x-auto whitespace-nowrap text-sm [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              >
                {selection.year && (
                  <ChainSegment onClick={() => onJumpToLevel(1)}>{selection.year}</ChainSegment>
                )}
                {selection.month && (
                  <>
                    <ChainDivider />
                    <motion.span layoutId={`month-${selection.year}-${selection.month}`}>
                      <ChainSegment current={depth === 2} onClick={() => onJumpToLevel(2)}>
                        {formatMonth(selection.month)}
                      </ChainSegment>
                    </motion.span>
                  </>
                )}
                {selection.week && (
                  <>
                    <ChainDivider />
                    <motion.span layoutId={`week-${selection.week.yearWeek}`}>
                      <ChainSegment current={depth === 3} onClick={() => onJumpToLevel(3)}>
                        Sem. {String(selection.week.yearWeek).padStart(2, "0")}
                      </ChainSegment>
                    </motion.span>
                  </>
                )}
                {selection.type && (
                  <>
                    <ChainDivider />
                    <motion.strong
                      layoutId={`type-${selection.type}`}
                      className="truncate px-1 font-medium"
                    >
                      {meetingTypeLabel(selection.type)}
                    </motion.strong>
                  </>
                )}
              </nav>
            )}
          </div>
        </header>

        <div className="relative min-h-0 flex-1 overflow-hidden">
          <AnimatePresence initial={false} mode="popLayout" custom={direction}>
            <motion.div
              key={`level-${depth}`}
              custom={direction}
              variants={{
                enter: (value: number) => ({ opacity: 0, x: value * 36 }),
                center: { opacity: 1, x: 0 },
                exit: (value: number) => ({ opacity: 0, x: value * -28 }),
              }}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-0"
            >
              {depth === 1 && (
                <MonthLevel groups={groups} onSelect={onSelectMonth} loading={loading} />
              )}
              {depth === 2 && (
                <WeekLevel weeks={weeks} onSelect={onSelectWeek} loading={loading} />
              )}
              {depth === 3 && selection.week && (
                <MeetingTypeLevel week={selection.week} onSelect={onSelectType} />
              )}
              {depth === 4 && (
                <ScrollArea className="h-full">
                  <div className="p-3 pb-8">{results}</div>
                </ScrollArea>
              )}
            </motion.div>
          </AnimatePresence>

          {error && (
            <div className="absolute inset-x-3 bottom-3 z-40 rounded-lg border border-destructive/30 bg-background p-3 text-sm text-destructive shadow-lg">
              {error}
            </div>
          )}
        </div>
      </div>
    </LayoutGroup>
  );
}

function MonthLevel({
  groups,
  onSelect,
  loading,
}: {
  groups: Array<{ year: number; months: HierarchicalMonth[] }>;
  onSelect: (month: HierarchicalMonth) => void;
  loading: boolean;
}) {
  return (
    <ScrollArea className="h-full">
      <div className="pb-8">
        {loading && <LoadingMessage label="Carregando meses..." />}
        {!loading && groups.length === 0 && <EmptyMessage label="Nenhum mês disponível." />}
        {groups.map((group) => (
          <section key={group.year} aria-labelledby={`public-year-${group.year}`}>
            <h2
              id={`public-year-${group.year}`}
              className="sticky top-0 z-10 border-y border-primary/20 bg-primary px-4 py-2 text-xs font-semibold tracking-widest text-primary-foreground backdrop-blur"
            >
              {group.year}
            </h2>
            <div className="divide-y px-3">
              {group.months.map((month) => (
                <motion.button
                  key={`${month.year}-${month.month}`}
                  type="button"
                  whileTap={{ scale: 0.985 }}
                  className="flex min-h-16 w-full items-center justify-between gap-3 px-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => onSelect(month)}
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                      <CalendarDays className="size-5" />
                    </span>
                    <motion.strong
                      layoutId={`month-${month.year}-${month.month}`}
                      className="truncate font-medium"
                    >
                      {formatMonth(month.month)}
                    </motion.strong>
                  </span>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    {month.weekCount} sem.
                    <ChevronRight className="size-4" />
                  </span>
                </motion.button>
              ))}
            </div>
          </section>
        ))}
      </div>
    </ScrollArea>
  );
}

function WeekLevel({
  weeks,
  onSelect,
  loading,
}: {
  weeks: HierarchicalWeek[];
  onSelect: (week: HierarchicalWeek) => void;
  loading: boolean;
}) {
  return (
    <ScrollArea className="h-full">
      <div className="space-y-3 p-3 pb-8">
        {loading && <LoadingMessage label="Carregando semanas..." />}
        {!loading && weeks.length === 0 && <EmptyMessage label="Nenhuma semana disponível." />}
        {weeks.map((week) => (
          <motion.button
            key={week.yearWeek}
            type="button"
            whileTap={{ scale: 0.985 }}
            className="block w-full text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={() => onSelect(week)}
          >
            <Card className="py-0">
              <CardContent className="flex min-h-20 items-center justify-between gap-3 p-4">
                <span>
                  <motion.strong
                    layoutId={`week-${week.yearWeek}`}
                    className="block font-heading text-base"
                  >
                    Semana {String(week.yearWeek).padStart(2, "0")}
                  </motion.strong>
                  <span className="text-sm text-muted-foreground">
                    {formatDateRange(week.startAt, week.endAt)}
                  </span>
                </span>
                <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
              </CardContent>
            </Card>
          </motion.button>
        ))}
      </div>
    </ScrollArea>
  );
}

function MeetingTypeLevel({
  week,
  onSelect,
}: {
  week: HierarchicalWeek;
  onSelect: (type: HierarchicalMeetingType) => void;
}) {
  const choices = [
    {
      type: "midweek" as const,
      title: "Reunião de Meio de Semana",
      description: "Tesouros, Ministério e Vida Cristã",
      icon: BriefcaseBusiness,
      enabled: week.hasMidweek,
    },
    {
      type: "weekend" as const,
      title: "Reunião de Fim de Semana",
      description: "Discurso público e estudo de A Sentinela",
      icon: Mic2,
      enabled: week.hasWeekend,
    },
  ];

  return (
    <div className="space-y-3 p-3">
      <p className="px-1 text-sm text-muted-foreground">
        {formatDateRange(week.startAt, week.endAt)}
      </p>
      {choices.map((choice) => {
        const Icon = choice.icon;
        return (
          <motion.button
            key={choice.type}
            type="button"
            disabled={!choice.enabled}
            whileTap={choice.enabled ? { scale: 0.985 } : undefined}
            className="block w-full text-left outline-none disabled:opacity-45 focus-visible:ring-2 focus-visible:ring-ring"
            onClick={() => onSelect(choice.type)}
          >
            <Card className="py-0">
              <CardContent className="flex min-h-28 items-center gap-4 p-4">
                <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground">
                  <Icon className="size-6" />
                </span>
                <span className="min-w-0 flex-1">
                  <motion.strong
                    layoutId={`type-${choice.type}`}
                    className="block font-heading text-base"
                  >
                    {choice.title}
                  </motion.strong>
                  <span className="mt-1 block text-sm text-muted-foreground">
                    {choice.description}
                  </span>
                </span>
                <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
              </CardContent>
            </Card>
          </motion.button>
        );
      })}
    </div>
  );
}

function ChainSegment({
  children,
  current = false,
  onClick,
}: {
  children: ReactNode;
  current?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={cn(
        "min-h-10 rounded-md px-1 font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring",
        current ? "text-foreground" : "text-muted-foreground hover:text-foreground",
      )}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function ChainDivider() {
  return <span className="px-0.5 text-muted-foreground/60">/</span>;
}

function LoadingMessage({ label }: { label: string }) {
  return (
    <p className="flex items-center justify-center gap-2 p-8 text-sm text-muted-foreground">
      <LoaderCircle className="animate-spin" />
      {label}
    </p>
  );
}

function EmptyMessage({ label }: { label: string }) {
  return <p className="p-8 text-center text-sm text-muted-foreground">{label}</p>;
}
