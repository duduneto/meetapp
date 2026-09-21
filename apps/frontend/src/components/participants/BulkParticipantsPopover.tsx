import { CheckCircle2, Loader2, UserPlus } from "lucide-react";
import { useState, type FormEvent } from "react";
import { api } from "@/api/client";
import type { Participant } from "@/api/types";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";

type BulkParticipantInput = {
  name: string;
  phone: string;
  gender?: "Masculino" | "Feminino" | null;
  whatsapp?: string;
};

type BulkParticipantsResponse = {
  createdCount: number;
  participants: Participant[];
};

const examplePayload = `[
  {
    "name": "Adriana Oliveira",
    "phone": "5585987210607",
    "whatsapp": "5585999999999",
    "gender": "Feminino"
  },
  {
    "name": "Airton Lima",
    "phone": "5585999607053"
  }
]`;

function parsePayload(value: string): BulkParticipantInput[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error("O conteúdo informado não é um JSON válido.");
  }

  if (!Array.isArray(parsed)) {
    throw new Error("O JSON deve ser uma lista de participantes.");
  }
  if (parsed.length === 0) {
    throw new Error("Adicione pelo menos um participante.");
  }
  if (parsed.length > 500) {
    throw new Error("Cada importação pode conter no máximo 500 participantes.");
  }

  return parsed.map((item, index) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new Error(`O participante ${index + 1} deve ser um objeto.`);
    }

    const record = item as Record<string, unknown>;
    const unsupportedField = Object.keys(record).find(
      (key) => !["name", "phone", "gender", "whatsapp"].includes(key),
    );
    if (unsupportedField) {
      throw new Error(
        `O participante ${index + 1} possui o campo não permitido “${unsupportedField}”. Use apenas name, phone, gender e whatsapp.`,
      );
    }
    if (typeof record.name !== "string" || !record.name.trim()) {
      throw new Error(`Informe um name válido para o participante ${index + 1}.`);
    }
    if (typeof record.phone !== "string" || !record.phone.trim()) {
      throw new Error(`Informe um phone válido para o participante ${index + 1}.`);
    }
    if (
      record.gender !== undefined &&
      record.gender !== null &&
      record.gender !== "Masculino" &&
      record.gender !== "Feminino"
    ) {
      throw new Error(
        `O gender do participante ${index + 1} deve ser “Masculino”, “Feminino” ou null.`,
      );
    }
    if (
      record.whatsapp !== undefined &&
      (typeof record.whatsapp !== "string" || !record.whatsapp.trim())
    ) {
      throw new Error(`Informe um whatsapp válido para o participante ${index + 1}.`);
    }

    return {
      name: record.name,
      phone: record.phone,
      gender: record.gender as BulkParticipantInput["gender"],
      whatsapp: record.whatsapp as string | undefined,
    };
  });
}

export function BulkParticipantsPopover({
  onImported,
}: {
  onImported: (participants: Participant[]) => Promise<void> | void;
}) {
  const [open, setOpen] = useState(false);
  const [payload, setPayload] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdCount, setCreatedCount] = useState<number | null>(null);

  function handleOpenChange(nextOpen: boolean) {
    if (loading) return;
    setOpen(nextOpen);
    setError(null);
    if (!nextOpen) {
      setPayload("");
      setCreatedCount(null);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setCreatedCount(null);

    let participants: BulkParticipantInput[];
    try {
      participants = parsePayload(payload);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "JSON inválido.");
      return;
    }

    setLoading(true);
    try {
      const response = await api<BulkParticipantsResponse>("/participants/bulk", {
        method: "POST",
        body: JSON.stringify(participants),
      });
      setCreatedCount(response.createdCount);
      setPayload("");
      try {
        await onImported(response.participants);
      } catch {
        setError(
          "Os participantes foram adicionados, mas a lista não pôde ser atualizada. Recarregue a página para vê-los.",
        );
      }
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Não foi possível adicionar os participantes.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger className={buttonVariants({ variant: "default" })}>
        <UserPlus />
        Adicionar em lote
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(94vw,38rem)]">
        <form className="space-y-4" onSubmit={submit}>
          <div className="space-y-1">
            <PopoverTitle>Adicionar participantes em lote</PopoverTitle>
            <PopoverDescription>
              Cole uma lista JSON com name e phone. Gender e whatsapp são opcionais; sem whatsapp, será usado o phone.
            </PopoverDescription>
          </div>

          <label className="grid gap-1.5 text-sm font-medium">
            Participantes em JSON
            <Textarea
              required
              autoFocus
              spellCheck={false}
              disabled={loading}
              value={payload}
              placeholder={examplePayload}
              className="min-h-72 resize-y font-mono text-xs"
              aria-invalid={Boolean(error)}
              onChange={(event) => setPayload(event.target.value)}
            />
          </label>

          {error && <p className="text-sm text-destructive">{error}</p>}

          {createdCount !== null && (
            <div className="flex items-center gap-2 rounded-lg border border-success/30 bg-success/10 p-3 text-sm">
              <CheckCircle2 className="size-4 text-success" />
              <span>Importação concluída.</span>
              <Badge variant="success">
                {createdCount} participante{createdCount === 1 ? "" : "s"}
              </Badge>
            </div>
          )}

          <div className="flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              disabled={loading}
              onClick={() => handleOpenChange(false)}
            >
              {createdCount !== null ? "Fechar" : "Cancelar"}
            </Button>
            <Button type="submit" disabled={loading || !payload.trim()}>
              {loading ? <Loader2 className="animate-spin" /> : <UserPlus />}
              {loading ? "Adicionando..." : "Adicionar participantes"}
            </Button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  );
}
