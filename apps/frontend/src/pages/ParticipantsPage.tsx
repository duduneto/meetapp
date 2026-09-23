import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Plus, X } from "lucide-react";
import { api } from "@/api/client";
import type { Participant } from "@/api/types";
import { BulkParticipantsPopover } from "@/components/participants/BulkParticipantsPopover";
import { ParticipantAssignmentsTable } from "@/components/participants/ParticipantAssignmentsTable";
import { ParticipantEditSheet } from "@/components/participants/ParticipantEditSheet";
import { ParticipationPreferencesFields } from "@/components/participants/ParticipationPreferencesFields";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Modal,
  ModalClose,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from "@/components/ui/modal";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  emptyPreferencesFormState,
  preferencesToPayload,
  type PreferencesFormState,
} from "@/lib/participationPreferences";

type CreateParticipantForm = {
  name: string;
  gender: string;
  phone: string;
  whatsapp: string;
  preferences: PreferencesFormState;
};

function emptyCreateForm(): CreateParticipantForm {
  return {
    name: "",
    gender: "",
    phone: "",
    whatsapp: "",
    preferences: emptyPreferencesFormState(),
  };
}

export function ParticipantsPage() {
  const [deleted, setDeleted] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState<CreateParticipantForm>(emptyCreateForm);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  async function load() {
    setParticipants(
      (await api<{ participants: Participant[] }>(`/participants?deleted=${deleted}`)).participants,
    );
  }

  useEffect(() => {
    void load();
  }, [deleted]);

  useEffect(() => {
    if (!selectedParticipant) return;
    const stillVisible = participants.find((participant) => participant.id === selectedParticipant.id);
    if (!stillVisible) {
      setSelectedParticipant(null);
      return;
    }
    if (stillVisible !== selectedParticipant) {
      setSelectedParticipant(stillVisible);
    }
  }, [participants, selectedParticipant]);

  const participantOptions = useMemo(
    () =>
      participants.map((participant) => ({
        value: participant.id,
        label: participant.name,
      })),
    [participants],
  );

  const filterCleared = selectedParticipant === null;

  function handleCreateOpenChange(open: boolean) {
    setCreateOpen(open);
    setCreateError(null);
    if (open) setForm(emptyCreateForm());
  }

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = form.name.trim();
    if (!name) {
      setCreateError("Informe o nome do participante.");
      return;
    }

    setCreating(true);
    setCreateError(null);
    try {
      await api("/participants", {
        method: "POST",
        body: JSON.stringify({
          name,
          gender: form.gender || null,
          phone: form.phone.trim() || null,
          whatsapp: form.whatsapp.trim() || null,
          preferences: preferencesToPayload(form.preferences),
        }),
      });
      setForm(emptyCreateForm());
      setCreateOpen(false);
      await load();
    } catch (reason) {
      setCreateError(
        reason instanceof Error ? reason.message : "Não foi possível criar o participante.",
      );
    } finally {
      setCreating(false);
    }
  }

  function participantSaved(updated: Participant) {
    setParticipants((current) =>
      current
        .map((participant) => (participant.id === updated.id ? updated : participant))
        .sort((left, right) => left.name.localeCompare(right.name, "pt-BR")),
    );
    setSelectedParticipant((current) => (current?.id === updated.id ? updated : current));
  }

  function selectParticipant(participantId: string) {
    if (!participantId) {
      setSelectedParticipant(null);
      return;
    }
    const participant = participants.find((candidate) => candidate.id === participantId) ?? null;
    setSelectedParticipant(participant);
  }

  async function removeOrRestore(participant: Participant) {
    if (deleted) {
      await api(`/participants/${participant.id}/restore`, { method: "POST" });
    } else {
      await api(`/participants/${participant.id}`, { method: "DELETE" });
    }
    if (selectedParticipant?.id === participant.id) setSelectedParticipant(null);
    await load();
  }

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden">
      <header className="mb-4 flex shrink-0 flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-xl font-semibold">Participantes</h1>
          <p className="text-sm text-muted-foreground">
            Selecione um participante para ver o histórico de designações.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!deleted && <BulkParticipantsPopover onImported={async () => load()} />}
          {!deleted && (
            <Button type="button" onClick={() => handleCreateOpenChange(true)}>
              <Plus />
              Novo participante
            </Button>
          )}
        </div>
      </header>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain pr-1">
        <div className="participants-layout">
          <div className="sticky top-0 z-20 space-y-3 bg-background pb-1">
            <div className="flex flex-wrap items-center gap-2">
              <SearchableSelect
                className="min-w-[16rem] flex-1"
                options={participantOptions}
                value={selectedParticipant?.id ?? ""}
                onValueChange={selectParticipant}
                placeholder="Buscar e selecionar participante..."
                emptyMessage="Nenhum participante encontrado."
              />
              {selectedParticipant && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedParticipant(null)}
                >
                  <X />
                  Limpar filtro
                </Button>
              )}
              <div className="segmented">
                <Button
                  variant={!deleted ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setDeleted(false);
                    setSelectedParticipant(null);
                  }}
                >
                  Ativos
                </Button>
                <Button
                  variant={deleted ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setDeleted(true);
                    setSelectedParticipant(null);
                  }}
                >
                  Excluídos
                </Button>
              </div>
            </div>

            {selectedParticipant && (
              <Card className="shadow-sm">
                <CardHeader>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <CardTitle className="text-lg">{selectedParticipant.name}</CardTitle>
                      <CardDescription>
                        {[
                          selectedParticipant.gender,
                          selectedParticipant.phone
                            ? `Tel. ${selectedParticipant.phone}`
                            : "Sem telefone",
                          selectedParticipant.whatsapp
                            ? `WhatsApp ${selectedParticipant.whatsapp}`
                            : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </CardDescription>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <ParticipantEditSheet
                        participant={selectedParticipant}
                        onSaved={participantSaved}
                      />
                      <Button
                        type="button"
                        variant={deleted ? "default" : "destructive"}
                        size="sm"
                        onClick={() => void removeOrRestore(selectedParticipant)}
                      >
                        {deleted ? "Restaurar" : "Excluir"}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            )}
          </div>

          {selectedParticipant && (
            <ParticipantAssignmentsTable participant={selectedParticipant} />
          )}

          {filterCleared && (
            <div className="data-list participant-list">
              {participants.length === 0 ? (
                <p className="px-1 py-4 text-sm text-muted-foreground">
                  Nenhum participante {deleted ? "excluído" : "ativo"} encontrado.
                </p>
              ) : (
                participants.map((participant) => (
                  <div
                    className="data-row cursor-pointer"
                    key={participant.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedParticipant(participant)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setSelectedParticipant(participant);
                      }
                    }}
                  >
                    <div>
                      <strong>{participant.name}</strong>
                      <span>
                        {participant.phone || "Sem telefone"}
                        {participant.whatsapp ? ` · WhatsApp ${participant.whatsapp}` : ""}
                      </span>
                    </div>
                    <div className="row-actions" onClick={(event) => event.stopPropagation()}>
                      <ParticipantEditSheet participant={participant} onSaved={participantSaved} />
                      <Button
                        type="button"
                        variant={deleted ? "default" : "destructive"}
                        size="sm"
                        onClick={() => void removeOrRestore(participant)}
                      >
                        {deleted ? "Restaurar" : "Excluir"}
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      <Modal open={createOpen} onOpenChange={handleCreateOpenChange}>
        <ModalContent className="max-h-[90vh] max-w-xl overflow-y-auto">
          <form className="grid gap-4" onSubmit={create}>
            <ModalHeader>
              <ModalTitle>Novo participante</ModalTitle>
              <ModalDescription>
                Preencha os dados para cadastrar um participante ativo.
              </ModalDescription>
            </ModalHeader>

            <div className="grid gap-3">
              <Input
                placeholder="Nome"
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                autoFocus
                required
              />
              <NativeSelect
                className="w-full min-w-0"
                value={form.gender}
                onChange={(event) => setForm({ ...form, gender: event.target.value })}
              >
                <NativeSelectOption value="">Gênero</NativeSelectOption>
                <NativeSelectOption value="Masculino">Masculino</NativeSelectOption>
                <NativeSelectOption value="Feminino">Feminino</NativeSelectOption>
              </NativeSelect>
              <Input
                placeholder="Telefone"
                value={form.phone}
                onChange={(event) => setForm({ ...form, phone: event.target.value })}
              />
              <Input
                placeholder="WhatsApp"
                value={form.whatsapp}
                onChange={(event) => setForm({ ...form, whatsapp: event.target.value })}
              />
              <ParticipationPreferencesFields
                value={form.preferences}
                onChange={(preferences) => setForm((current) => ({ ...current, preferences }))}
              />
              {createError && <p className="text-sm text-destructive">{createError}</p>}
            </div>

            <ModalFooter>
              <ModalClose
                render={<Button type="button" variant="outline" disabled={creating} />}
              >
                Cancelar
              </ModalClose>
              <Button type="submit" disabled={creating || !form.name.trim()}>
                {creating ? "Criando..." : "Criar"}
              </Button>
            </ModalFooter>
          </form>
        </ModalContent>
      </Modal>
    </section>
  );
}
