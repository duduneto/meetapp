import { useMemo, useState } from "react";
import { CalendarRange, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type TemporalMonth = {
  year: number;
  month: number;
  weekCount?: number;
};

export type TemporalMonthGroup = {
  year: number;
  months: TemporalMonth[];
};

export function groupMonthsByYear(
  months: readonly TemporalMonth[],
): TemporalMonthGroup[] {
  const groups = new Map<number, TemporalMonth[]>();

  [...months]
    .filter(({ month }) => month >= 1 && month <= 12)
    .sort((a, b) => a.year - b.year || a.month - b.month)
    .forEach((month) => {
      const yearMonths = groups.get(month.year) ?? [];
      yearMonths.push(month);
      groups.set(month.year, yearMonths);
    });

  return [...groups].map(([year, yearMonths]) => ({
    year,
    months: yearMonths,
  }));
}

type TemporalNavigationDrawerProps = {
  months: readonly TemporalMonth[];
  selectedMonth: TemporalMonth | null;
  onSelect: (month: TemporalMonth) => void;
  className?: string;
  title?: string;
};

const fullMonthFormatter = new Intl.DateTimeFormat("pt-BR", {
  month: "long",
  timeZone: "UTC",
});

const shortMonthFormatter = new Intl.DateTimeFormat("pt-BR", {
  month: "short",
  timeZone: "UTC",
});

function capitalize(value: string) {
  return value.charAt(0).toLocaleUpperCase("pt-BR") + value.slice(1);
}

function formatMonth(month: number, abbreviated = false) {
  const date = new Date(Date.UTC(2024, month - 1, 1));
  const formatter = abbreviated ? shortMonthFormatter : fullMonthFormatter;

  return capitalize(formatter.format(date));
}

export function TemporalNavigationDrawer({
  months,
  selectedMonth,
  onSelect,
  className,
  title = "Meses",
}: TemporalNavigationDrawerProps) {
  const [collapsed, setCollapsed] = useState(false);
  const groups = useMemo(() => groupMonthsByYear(months), [months]);

  function selectMonth(month: TemporalMonth) {
    onSelect(month);
    setCollapsed(true);
  }

  return (
    <aside
      className={cn(
        "relative z-10 flex h-full shrink-0 flex-col overflow-visible rounded-xl border bg-card text-card-foreground shadow-sm transition-all duration-300 ease-in-out",
        collapsed ? "w-16" : "w-64 max-w-[72vw]",
        className,
      )}
      aria-label="Navegação temporal"
    >
      <div className="flex h-16 shrink-0 items-center gap-3 overflow-hidden border-b px-4">
        <CalendarRange className="size-5 shrink-0 text-muted-foreground" />
        {!collapsed && (
          <div className="min-w-0 whitespace-nowrap">
            <h2 className="font-heading font-semibold">{title}</h2>
            <p className="text-xs text-muted-foreground">Selecione um período</p>
          </div>
        )}
      </div>

      <Button
        type="button"
        variant="outline"
        size="icon"
        className="absolute right-0 top-8 z-20 size-7 -translate-y-1/2 translate-x-1/2 rounded-full bg-background shadow-sm"
        onClick={() => setCollapsed((current) => !current)}
        aria-label={collapsed ? "Expandir navegação temporal" : "Recolher navegação temporal"}
        aria-expanded={!collapsed}
      >
        {collapsed ? <ChevronRight /> : <ChevronLeft />}
      </Button>

      <nav className="min-h-0 flex-1 overflow-y-auto py-2">
        {groups.length === 0 && !collapsed && (
          <p className="px-4 py-3 text-sm text-muted-foreground">
            Nenhum mês disponível.
          </p>
        )}

        {groups.map((group) => (
          <section key={group.year} aria-labelledby={`temporal-year-${group.year}`}>
            <h3
              id={`temporal-year-${group.year}`}
              className={cn(
                "sticky top-0 z-10 bg-card/95 py-2 text-xs font-semibold text-muted-foreground backdrop-blur-sm",
                collapsed ? "px-2 text-center" : "px-4",
              )}
            >
              {group.year}
            </h3>

            <div className="grid gap-1 px-2 pb-2">
              {group.months.map((month) => {
                const active =
                  selectedMonth?.year === month.year &&
                  selectedMonth.month === month.month;
                const fullLabel = formatMonth(month.month);

                return (
                  <Button
                    key={`${month.year}-${month.month}`}
                    type="button"
                    variant={active ? "default" : "ghost"}
                    className={cn(
                      "w-full overflow-hidden transition-colors",
                      collapsed ? "justify-center px-1 text-xs" : "justify-between px-3",
                    )}
                    onClick={() => selectMonth(month)}
                    aria-current={active ? "date" : undefined}
                    title={collapsed ? fullLabel : undefined}
                  >
                    <span className="truncate">
                      {formatMonth(month.month, collapsed)}
                    </span>
                    {!collapsed && month.weekCount !== undefined && (
                      <span className="ml-2 text-xs opacity-70">{month.weekCount}</span>
                    )}
                  </Button>
                );
              })}
            </div>
          </section>
        ))}
      </nav>
    </aside>
  );
}
