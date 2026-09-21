import { Check, Link2 } from "lucide-react";
import { useState } from "react";
import { api } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ParticipationLinkButton({ assignmentId }: { assignmentId: string }) {
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [link, setLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function generateLink() {
    setLoading(true);
    setCopied(false);
    setError(null);
    try {
      const result = await api<{ link: string; token: string }>(
        `/assignments/${assignmentId}/participation-link`,
        { method: "POST" },
      );
      setLink(result.link);
      try {
        await navigator.clipboard.writeText(result.link);
        setCopied(true);
      } catch {
        setCopied(false);
      }
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Não foi possível gerar o link.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-2 space-y-2">
      <Button
        type="button"
        variant="outline"
        size="xs"
        onClick={generateLink}
        disabled={loading}
        title="Gerar um novo link invalida o link anterior"
      >
        {copied ? <Check /> : <Link2 />}
        {loading ? "Gerando..." : copied ? "Link copiado" : "Gerar link"}
      </Button>
      {link && !copied && (
        <Input
          readOnly
          value={link}
          aria-label="Link de confirmação da participação"
          onFocus={(event) => event.currentTarget.select()}
        />
      )}
      {error && <span className="block text-xs text-destructive">{error}</span>}
    </div>
  );
}
