import { useCallback, useEffect, useState } from "react";
import { Briefcase, CalendarRange, Mic } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import { formatDateRange } from "../hooks";
import {
  MeetingAssignmentView,
  type MeetingType,
} from "@/components/assignments/MeetingAssignmentView";
import {
  TemporalNavigationDrawer,
  type TemporalMonth,
} from "@/components/TemporalNavigationDrawer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AddWeekPopover,
  type ImportedMeetingWeek,
} from "@/components/assignments/AddWeekPopover";
import { AssignmentsCatalogShareButton } from "@/components/assignments/AssignmentsCatalogShareButton";

type Month = TemporalMonth & { weekCount: number };
type Week = { year: number; yearWeek: number; startAt: string; endAt: string; hasMidweek: boolean; hasWeekend: boolean };
type SelectedMeeting = Week & { type: MeetingType };

const monthYearFormatter = new Intl.DateTimeFormat("pt-BR", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

function formatMonthYear(year: number, month: number) {
  const value = monthYearFormatter.format(new Date(Date.UTC(year, month - 1, 1)));
  return value.charAt(0).toLocaleUpperCase("pt-BR") + value.slice(1);
}

function monthFromSearchParams(params: URLSearchParams): TemporalMonth | null {
  const year = Number(params.get("year"));
  const month = Number(params.get("month"));
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return null;
  }
  return { year, month };
}

export function AssignmentsIndexPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [months, setMonths] = useState<Month[]>([]);
  const [selected, setSelected] = useState<TemporalMonth | null>(() =>
    monthFromSearchParams(searchParams),
  );
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [selectedMeeting, setSelectedMeeting] = useState<SelectedMeeting | null>(null);

  const loadMonths = useCallback(async () => {
    const data = await api<{ months: Month[] }>("/assignment-months");
    setMonths(data.months);
    return data.months;
  }, []);

  useEffect(() => {
    void loadMonths();
  }, [loadMonths]);

  useEffect(() => {
    if (!selected) {
      setWeeks([]);
      return;
    }

    let active = true;
    api<{ weeks: Week[] }>(
      `/assignment-months/${selected.year}/${selected.month}/weeks`,
    ).then((data) => {
      if (active) setWeeks(data.weeks);
    });

    return () => {
      active = false;
    };
  }, [selected?.month, selected?.year]);

  useEffect(() => {
    if (!selected || selectedMeeting) return;
    const queryMonth = monthFromSearchParams(searchParams);
    const queryWeek = Number(searchParams.get("week"));
    const queryType = searchParams.get("type");
    if (
      !queryMonth ||
      queryMonth.year !== selected.year ||
      queryMonth.month !== selected.month ||
      !Number.isInteger(queryWeek) ||
      (queryType !== "midweek" && queryType !== "weekend")
    ) {
      return;
    }

    const week = weeks.find((candidate) => candidate.yearWeek === queryWeek);
    if (week) setSelectedMeeting({ ...week, type: queryType });
  }, [searchParams, selected, selectedMeeting, weeks]);

  function selectMonth(month: TemporalMonth) {
    setSelected(month);
    setSelectedMeeting(null);
    setSearchParams({ year: String(month.year), month: String(month.month) });
  }

  function selectMeeting(week: Week, type: MeetingType) {
    setSelectedMeeting({ ...week, type });
    setSearchParams({
      year: String(week.year),
      month: String(selected?.month ?? new Date(week.startAt).getUTCMonth() + 1),
      week: String(week.yearWeek),
      type,
    });
  }

  function backToWeeks() {
    setSelectedMeeting(null);
    if (selected) {
      setSearchParams({ year: String(selected.year), month: String(selected.month) });
    }
  }

  async function handleImported(importedWeeks: ImportedMeetingWeek[]) {
    const nextMonths = await loadMonths();
    const week = importedWeeks.at(-1);
    if (!week) return;
    const importedMonth = nextMonths.find(
      (month) => month.year === week.year && month.month === week.month,
    ) ?? { year: week.year, month: week.month };
    setSelected(importedMonth);
    setSelectedMeeting(null);
    setSearchParams({ year: String(week.year), month: String(week.month) });
    const data = await api<{ weeks: Week[] }>(
      `/assignment-months/${week.year}/${week.month}/weeks`,
    );
    setWeeks(data.weeks);
  }

  return (
    <section className="flex h-full min-h-0 flex-col">
      <header className="mb-4 flex shrink-0 items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-xl font-semibold">Designações</h1>
          <p className="text-sm text-muted-foreground">Gerencie as semanas e reuniões.</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <AssignmentsCatalogShareButton />
          <AddWeekPopover onImported={handleImported} />
        </div>
      </header>
      <div className="flex min-h-0 flex-1 gap-4 overflow-x-auto">
        <TemporalNavigationDrawer
          months={months}
          selectedMonth={selected}
          onSelect={selectMonth}
        />

        {selectedMeeting ? (
          <MeetingAssignmentView
            year={selectedMeeting.year}
            week={selectedMeeting.yearWeek}
            type={selectedMeeting.type}
            startAt={selectedMeeting.startAt}
            endAt={selectedMeeting.endAt}
            onBack={backToWeeks}
            className="h-full min-h-0 flex-1"
          />
        ) : (
          <Card className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
            <CardHeader className="shrink-0">
              <CardTitle>Semanas</CardTitle>
              <CardDescription>
                {selected
                  ? formatMonthYear(selected.year, selected.month)
                  : "Selecione um mês para continuar."}
              </CardDescription>
            </CardHeader>
            <CardContent className="min-h-0 flex-1 overflow-y-auto">
              {!selected ? (
                <div className="flex h-full min-h-48 flex-col items-center justify-center gap-3 px-4 py-10 text-center">
                  <div className="flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                    <CalendarRange className="size-7" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-heading text-base font-medium">Nenhuma semana para exibir</p>
                    <p className="max-w-xs text-sm text-muted-foreground">
                      Selecione um mês na navegação ao lado para ver as reuniões disponíveis.
                    </p>
                  </div>
                </div>
              ) : (
                weeks.map((week) => (
                  <div className="week-row" key={week.yearWeek}>
                    <span>{formatDateRange(week.startAt, week.endAt)}</span>
                    <div>
                      <Button
                        type="button"
                        variant="default"
                        size="default"
                        disabled={!week.hasMidweek}
                        onClick={() => selectMeeting(week, "midweek")}
                      >
                        <Briefcase data-icon="inline-start" />
                        Meio de Semana
                      </Button>
                      <Button
                        type="button"
                        variant="default"
                        size="default"
                        disabled={!week.hasWeekend}
                        onClick={() => selectMeeting(week, "weekend")}
                      >
                        <Mic data-icon="inline-start" />
                        Final de Semana
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </section>
  );
}
