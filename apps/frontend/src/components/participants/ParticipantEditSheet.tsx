import { Loader2, Pencil, Save } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { api } from "@/api/client";
import type { Participant } from "@/api/types";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

type ParticipantForm = {
  name: string;
  gender: string;
  phone: string;
  whatsapp: string;
};

function formFromParticipant(participant: Participant): ParticipantForm {
  return {
    name: participant.name,
    gender: participant.gender ?? "",
    phone: participant.phone ?? "",
    whatsapp: participant.whatsapp ?? "",
  };
}

export function ParticipantEditSheet({
  participant,
  onSaved,
}: {
  participant: Participant;
  onSaved: (participant: Participant) => void;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(() => formFromParticipant(participant));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) setForm(formFromParticipant(participant));
  }, [open, participant]);

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    setError(null);
    if (nextOpen) setForm(formFromParticipant(participant));
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = form.name.trim();
    if (!name) {
      setError("Informe o nome do participante.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const result = await api<{ participant: Participant }>(
        `/participants/${participant.id}`,
        {
          method: "PUT",
          body: JSON.stringify({
            name,
            gender: form.gender || null,
            phone: form.phone.trim() || null,
            whatsapp: form.whatsapp.trim() || null,
          }),
        },
      );
      onSaved(result.participant);
      setOpen(false);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Não foi possível atualizar o participante.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger
        className={buttonVariants({ variant: "outline", size: "default" })}
        aria-label={`Editar ${participant.name}`}
      >
        <Pencil />
        Editar
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader className="border-b">
          <SheetTitle>Editar participante</SheetTitle>
          <SheetDescription>
            Atualize os dados de contato e as informações pessoais.
          </SheetDescription>
        </SheetHeader>

        <form className="flex min-h-0 flex-1 flex-col" onSubmit={save}>
          <div className="grid gap-4 overflow-y-auto px-4">
            <label className="grid gap-1.5 text-sm font-medium">
              Nome
              <Input
                autoFocus
                required
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              />
            </label>

            <label className="grid gap-1.5 text-sm font-medium">
              Gênero
              <NativeSelect
                className="w-full"
                value={form.gender}
                onChange={(event) => setForm((current) => ({ ...current, gender: event.target.value }))}
              >
                <NativeSelectOption value="">Não informado</NativeSelectOption>
                <NativeSelectOption value="Masculino">Masculino</NativeSelectOption>
                <NativeSelectOption value="Feminino">Feminino</NativeSelectOption>
              </NativeSelect>
            </label>

            <label className="grid gap-1.5 text-sm font-medium">
              Telefone
              <Input
                type="tel"
                inputMode="tel"
                value={form.phone}
                placeholder="Ex.: 5585999999999"
                onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
              />
            </label>

            <label className="grid gap-1.5 text-sm font-medium">
              WhatsApp
              <Input
                type="tel"
                inputMode="tel"
                value={form.whatsapp}
                placeholder="Ex.: 5585999999999"
                onChange={(event) => setForm((current) => ({ ...current, whatsapp: event.target.value }))}
              />
            </label>

            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <SheetFooter className="border-t">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving || !form.name.trim()}>
              {saving ? <Loader2 className="animate-spin" /> : <Save />}
              {saving ? "Salvando..." : "Salvar alterações"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
