import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "@/api/client";
import type { AssignmentPayload } from "@/api/types";
import {
  HierarchicalChainFilter,
  type HierarchicalMeetingType,
  type HierarchicalMonth,
  type HierarchicalWeek,
} from "@/components/HierarchicalChainFilter";
import { PublicAssignmentResults } from "@/components/public/PublicAssignmentResults";

function numberParam(value: string | null) {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function meetingTypeParam(value: string | null): HierarchicalMeetingType | undefined {
  return value === "midweek" || value === "weekend" ? value : undefined;
}

export function PublicPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const year = numberParam(searchParams.get("year"));
  const queryMonth = numberParam(searchParams.get("month"));
  const weekNumber = numberParam(searchParams.get("week"));
  const type = meetingTypeParam(searchParams.get("type"));

  const [months, setMonths] = useState<HierarchicalMonth[]>([]);
  const [weeks, setWeeks] = useState<HierarchicalWeek[]>([]);
  const [payload, setPayload] = useState<AssignmentPayload | null>(null);
  const [loadingMonths, setLoadingMonths] = useState(false);
  const [loadingWeeks, setLoadingWeeks] = useState(false);
  const [loadingMeeting, setLoadingMeeting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inferredMonth = payload
    ? new Date(payload.meeting.startAt).getUTCMonth() + 1
    : undefined;
  const month = queryMonth ?? inferredMonth;
  const selectedWeek = useMemo(
    () =>
      weeks.find((candidate) => candidate.yearWeek === weekNumber) ??
      (payload && weekNumber
        ? {
            year: payload.meeting.year,
            yearWeek: weekNumber,
            startAt: payload.meeting.startAt,
            endAt: payload.meeting.endAt,
            hasMidweek: payload.meeting.type === "midweek",
            hasWeekend: payload.meeting.type === "weekend",
          }
        : undefined),
    [payload, weekNumber, weeks],
  );

  useEffect(() => {
    if (!token) {
      setError("O link público está incompleto.");
      return;
    }

    let active = true;
    setLoadingMonths(true);
    setError(null);
    api<{ months: HierarchicalMonth[] }>(
      `/public/assignment-months?token=${encodeURIComponent(token)}`,
      { publicToken: token },
    )
      .then((response) => {
        if (active) setMonths(response.months);
      })
      .catch((reason) => {
        if (active) {
          setError(reason instanceof Error ? reason.message : "Não foi possível carregar os meses.");
        }
      })
      .finally(() => {
        if (active) setLoadingMonths(false);
      });
    return () => {
      active = false;
    };
  }, [token]);

  useEffect(() => {
    if (!token || !year || !month) {
      setWeeks([]);
      return;
    }

    let active = true;
    setLoadingWeeks(true);
    setError(null);
    api<{ weeks: HierarchicalWeek[] }>(
      `/public/assignment-months/${year}/${month}/weeks?token=${encodeURIComponent(token)}`,
      { publicToken: token },
    )
      .then((response) => {
        if (active) setWeeks(response.weeks);
      })
      .catch((reason) => {
        if (active) {
          setError(reason instanceof Error ? reason.message : "Não foi possível carregar as semanas.");
        }
      })
      .finally(() => {
        if (active) setLoadingWeeks(false);
      });
    return () => {
      active = false;
    };
  }, [month, token, year]);

  useEffect(() => {
    if (!token || !year || !weekNumber || !type) {
      setPayload(null);
      return;
    }

    let active = true;
    setLoadingMeeting(true);
    setError(null);
    api<AssignmentPayload>(
      `/public/assignments/${year}/${weekNumber}/${type}?token=${encodeURIComponent(token)}`,
      { publicToken: token },
    )
      .then((response) => {
        if (active) setPayload(response);
      })
      .catch((reason) => {
        if (active) {
          setError(reason instanceof Error ? reason.message : "Não foi possível carregar a reunião.");
        }
      })
      .finally(() => {
        if (active) setLoadingMeeting(false);
      });
    return () => {
      active = false;
    };
  }, [token, type, weekNumber, year]);

  useEffect(() => {
    if (!queryMonth && inferredMonth && year && weekNumber && type) {
      setSelection({ year, month: inferredMonth, week: weekNumber, type }, true);
    }
  }, [inferredMonth, queryMonth, type, weekNumber, year]);

  function setSelection(
    selection: {
      year?: number;
      month?: number;
      week?: number;
      type?: HierarchicalMeetingType;
    },
    replace = false,
  ) {
    const next = new URLSearchParams();
    if (token) next.set("token", token);
    if (selection.year) next.set("year", String(selection.year));
    if (selection.month) next.set("month", String(selection.month));
    if (selection.week) next.set("week", String(selection.week));
    if (selection.type) next.set("type", selection.type);
    setSearchParams(next, { replace });
  }

  const depth = type ? 4 : selectedWeek ? 3 : month ? 2 : 1;

  return (
    <main className="min-h-[100dvh] bg-muted/40 sm:p-4">
      <HierarchicalChainFilter
        months={months}
        weeks={weeks}
        selection={{ year, month, week: selectedWeek, type }}
        loading={
          depth === 1
            ? loadingMonths
            : depth === 2
              ? loadingWeeks
              : depth === 4
                ? loadingMeeting
                : false
        }
        error={error}
        results={
          loadingMeeting ? (
            <p className="p-8 text-center text-sm text-muted-foreground">Carregando designações...</p>
          ) : payload ? (
            <PublicAssignmentResults payload={{ ...payload, canWrite: false }} />
          ) : null
        }
        onSelectMonth={(selected) =>
          setSelection({ year: selected.year, month: selected.month })
        }
        onSelectWeek={(selected) =>
          setSelection({ year, month, week: selected.yearWeek })
        }
        onSelectType={(selectedType) =>
          setSelection({ year, month, week: selectedWeek?.yearWeek, type: selectedType })
        }
        onBack={() => {
          if (depth === 4) setSelection({ year, month, week: selectedWeek?.yearWeek });
          else if (depth === 3) setSelection({ year, month });
          else setSelection({});
        }}
        onJumpToLevel={(level) => {
          if (level === 1) setSelection({});
          if (level === 2) setSelection({ year, month });
          if (level === 3) setSelection({ year, month, week: selectedWeek?.yearWeek });
        }}
      />
    </main>
  );
}
