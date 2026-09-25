import { Check, ClipboardList, Loader2 } from "lucide-react";
import { useState } from "react";
import { api } from "@/api/client";
import { Button } from "@/components/ui/button";

type MeetingStatusShareButtonProps = {
  year: number;
  week: number;
  type: "midweek" | "weekend";
};

export function MeetingStatusShareButton({ year, week, type }: MeetingStatusShareButtonProps) {
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function shareStatus() {
    setLoading(true);
    setCopied(false);
    setError(null);
    try {
      const result = await api<{ message: string }>(
        `/assignments/${year}/${week}/${type}/status-share`,
        { method: "POST" },
      );
      await navigator.clipboard.writeText(result.message);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Não foi possível gerar o status da reunião.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button type="button" variant="outline" onClick={() => void shareStatus()} disabled={loading}>
        {loading ? <Loader2 className="animate-spin" /> : copied ? <Check /> : <ClipboardList />}
        {loading ? "Gerando..." : copied ? "Status copiado" : "Compartilhar Status"}
      </Button>
      {error && <span className="max-w-72 text-right text-xs text-destructive">{error}</span>}
    </div>
  );
}
