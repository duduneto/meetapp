import { AlertCircle, CheckCircle2, CircleMinus, Loader2, Plus } from "lucide-react";
import { useState, type FormEvent } from "react";
import { api } from "@/api/client";
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
import { ScrollArea } from "@/components/ui/scroll-area";

export type ImportedMeetingWeek = {
  id: string;
  ref: string;
  year: number;
  month: number;
  yearWeek: number;
  startAt: string;
  endAt: string;
};

type ImportWeekResult = {
  url: string;
  status: "created" | "skipped" | "failed";
  reason?: string;
  id?: string;
  ref?: string;
  year?: number;
  month?: number;
  yearWeek?: number;
  startAt?: string;
  endAt?: string;
};

type ImportReport = {
  outcome: "success" | "partial" | "failure";
  sourceUrl: string;
  summary: {
    total: number;
    created: number;
    skipped: number;
    failed: number;
  };
  weeks: ImportWeekResult[];
};

const weekFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

function resultTitle(result: ImportWeekResult) {
  if (result.startAt && result.endAt) {
    return `${weekFormatter.format(new Date(result.startAt))} – ${weekFormatter.format(new Date(result.endAt))}`;
  }
  return result.ref ?? "Semana não identificada";
}

function isCreatedWeek(result: ImportWeekResult): result is ImportWeekResult & ImportedMeetingWeek {
  return result.status === "created" &&
    Boolean(result.id && result.ref && result.year && result.month && result.yearWeek && result.startAt && result.endAt);
}

export function AddWeekPopover({
  onImported,
}: {
  onImported: (weeks: ImportedMeetingWeek[]) => Promise<void> | void;
}) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<ImportReport | null>(null);

  function handleOpenChange(nextOpen: boolean) {
    if (loading) return;
    setOpen(nextOpen);
    setError(null);
    if (!nextOpen) setReport(null);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const sourceUrl = url.trim();
    if (!sourceUrl) return;

    setLoading(true);
    setError(null);
    setReport(null);
    try {
      const response = await api<ImportReport>(
        "/script/import-midweek",
        {
          method: "POST",
          body: JSON.stringify({ url: sourceUrl }),
        },
      );
      setReport(response);
      setUrl("");
      const createdWeeks = response.weeks.filter(isCreatedWeek);
      if (createdWeeks.length > 0) await onImported(createdWeeks);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Não foi possível importar a apostila.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger className={buttonVariants({ variant: "default" })}>
        <Plus />
        Add Semana
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(94vw,36rem)]">
        <form className="space-y-4" onSubmit={submit}>
          <div className="space-y-1">
            <PopoverTitle>Importar apostila do JW.org</PopoverTitle>
            <PopoverDescription>
              Cole a URL de uma apostila completa ou de uma semana. Todas as semanas encontradas serão analisadas automaticamente.
            </PopoverDescription>
          </div>

          <label className="grid gap-1.5 text-sm font-medium">
            URL da apostila ou semana
            <Input
              type="url"
              required
              autoFocus
              disabled={loading}
              value={url}
              placeholder="https://www.jw.org/pt/biblioteca/jw-apostila-do-mes/..."
              onChange={(event) => setUrl(event.target.value)}
            />
          </label>

          {error && <p className="text-sm text-destructive">{error}</p>}

          {report && (
            <section className="space-y-3 rounded-lg border bg-muted/30 p-3" aria-live="polite">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold">Resultado da importação</p>
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant="success">{report.summary.created} criada(s)</Badge>
                  <Badge variant="secondary">{report.summary.skipped} ignorada(s)</Badge>
                  {report.summary.failed > 0 && (
                    <Badge variant="destructive">{report.summary.failed} falha(s)</Badge>
                  )}
                </div>
              </div>

              <ScrollArea className="max-h-64 pr-3">
                <ul className="space-y-2">
                  {report.weeks.map((week, index) => {
                    const content = week.status === "created"
                      ? { label: "Criada", variant: "success" as const, Icon: CheckCircle2 }
                      : week.status === "skipped"
                        ? { label: "Ignorada", variant: "secondary" as const, Icon: CircleMinus }
                        : { label: "Falhou", variant: "destructive" as const, Icon: AlertCircle };
                    return (
                      <li
                        key={`${week.url}-${index}`}
                        className="flex items-start gap-2 rounded-md border bg-background p-2.5"
                      >
                        <content.Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="text-sm font-medium">{resultTitle(week)}</span>
                            <Badge variant={content.variant}>{content.label}</Badge>
                          </div>
                          {week.reason && (
                            <p className="mt-1 text-xs text-muted-foreground">{week.reason}</p>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </ScrollArea>
            </section>
          )}

          <div className="flex items-center justify-end gap-2">
            <Button type="button" variant="ghost" disabled={loading} onClick={() => handleOpenChange(false)}>
              {report ? "Fechar" : "Cancelar"}
            </Button>
            <Button type="submit" disabled={loading || !url.trim()}>
              {loading ? <Loader2 className="animate-spin" /> : <CheckCircle2 />}
              {loading ? "Importando..." : "Importar"}
            </Button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  );
}
