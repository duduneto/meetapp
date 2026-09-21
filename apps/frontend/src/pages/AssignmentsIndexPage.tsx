import { useEffect, useState } from "react";
import { Briefcase, Mic } from "lucide-react";
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

export function AssignmentsIndexPage() {
  const [months, setMonths] = useState<Month[]>([]);
  const [selected, setSelected] = useState<TemporalMonth | null>(null);
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [selectedMeeting, setSelectedMeeting] = useState<SelectedMeeting | null>(null);

  useEffect(() => {
    api<{ months: Month[] }>("/assignment-months").then((data) => setMonths(data.months));
  }, []);

  useEffect(() => {
    if (!selected) return;
    setSelectedMeeting(null);
    api<{ weeks: Week[] }>(`/assignment-months/${selected.year}/${selected.month}/weeks`).then((data) => setWeeks(data.weeks));
  }, [selected]);

  return (
    <section className="flex h-full min-h-0 flex-col">
      <div className="flex min-h-0 flex-1 gap-4 overflow-x-auto">
        <TemporalNavigationDrawer
          months={months}
          selectedMonth={selected}
          onSelect={setSelected}
        />

        {selectedMeeting ? (
          <MeetingAssignmentView
            year={selectedMeeting.year}
            week={selectedMeeting.yearWeek}
            type={selectedMeeting.type}
            startAt={selectedMeeting.startAt}
            endAt={selectedMeeting.endAt}
            onBack={() => setSelectedMeeting(null)}
            className="h-full flex-1 overflow-y-auto"
          />
        ) : (
          <Card className="h-full flex-1">
            <CardHeader>
              <CardTitle>Semanas</CardTitle>
              <CardDescription>
                {selected
                  ? formatMonthYear(selected.year, selected.month)
                  : "Selecione um mês para continuar."}
              </CardDescription>
            </CardHeader>
            <CardContent className="min-h-0 flex-1 overflow-y-auto">
              {!selected && <p className="muted">Selecione um mês.</p>}
              {weeks.map((week) => (
                <div className="week-row" key={week.yearWeek}>
                  <span>{formatDateRange(week.startAt, week.endAt)}</span>
                  <div>
                    <Button
                      type="button"
                      variant="default"
                      size="default"
                      disabled={!week.hasMidweek}
                      onClick={() => setSelectedMeeting({ ...week, type: "midweek" })}
                    >
                      <Briefcase data-icon="inline-start" />
                      Meio de Semana
                    </Button>
                    <Button
                      type="button"
                      variant="default"
                      size="default"
                      disabled={!week.hasWeekend}
                      onClick={() => setSelectedMeeting({ ...week, type: "weekend" })}
                    >
                      <Mic data-icon="inline-start" />
                      Final de Semana
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </section>
  );
}
