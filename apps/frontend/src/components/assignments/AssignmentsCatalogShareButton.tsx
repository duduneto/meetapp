import { Check, ExternalLink, Loader2, Share2 } from "lucide-react";
import { useState } from "react";
import { api } from "@/api/client";
import { Button } from "@/components/ui/button";

export function AssignmentsCatalogShareButton() {
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function shareCatalog() {
    setLoading(true);
    setCopied(false);
    setError(null);
    try {
      const result = await api<{ link: string; expiresAt: string }>(
        "/assignments/public-link",
        { method: "POST" },
      );

      if (navigator.share) {
        try {
          await navigator.share({
            title: "Designações",
            text: "Veja as designações da congregação.",
            url: result.link,
          });
          return;
        } catch (reason) {
          if (reason instanceof DOMException && reason.name === "AbortError") return;
        }
      }

      await navigator.clipboard.writeText(result.link);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Não foi possível compartilhar as designações.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button type="button" variant="outline" onClick={shareCatalog} disabled={loading}>
        {loading ? <Loader2 className="animate-spin" /> : copied ? <Check /> : <Share2 />}
        {loading ? "Preparando..." : copied ? "Link copiado" : "Compartilhar"}
      </Button>
      {error && (
        <span className="max-w-72 text-right text-xs text-destructive">
          {error}{" "}
          {error.includes("Configuracoes") && (
            <a className="inline-flex items-center gap-1 underline" href="/app/settings">
              Abrir configurações <ExternalLink className="size-3" />
            </a>
          )}
        </span>
      )}
    </div>
  );
}
