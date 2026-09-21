import { useEffect, useState } from "react";
import { api } from "../api/client";
import type { Participant } from "../api/types";
import { Button } from "../components/Button";
import { InputText } from "../components/InputText";
import { ParticipantAssignmentsTable } from "../components/participants/ParticipantAssignmentsTable";
import { Select } from "../components/Select";

const empty = { name: "", gender: "", phone: "", whatsapp: "" };

const genderOptions = [
  { value: "Masculino", label: "Masculino" },
  { value: "Feminino", label: "Feminino" },
];

export function ParticipantsPage() {
  const [deleted, setDeleted] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null);
  const [form, setForm] = useState(empty);

  async function load() {
    setParticipants((await api<{ participants: Participant[] }>(`/participants?deleted=${deleted}`)).participants);
  }

  useEffect(() => {
    load();
  }, [deleted]);

  async function create() {
    await api("/participants", { method: "POST", body: JSON.stringify(form) });
    setForm(empty);
    await load();
  }

  return (
    <section>
      <div className="page-header">
        <h1>Participantes</h1>
        <div className="segmented">
          <Button variant={!deleted ? "selected" : "secondary"} onClick={() => { setDeleted(false); setSelectedParticipant(null); }}>
            Ativos
          </Button>
          <Button variant={deleted ? "selected" : "secondary"} onClick={() => { setDeleted(true); setSelectedParticipant(null); }}>
            Excluidos
          </Button>
        </div>
      </div>
      {!deleted && (
        <div className="form-row">
          <InputText placeholder="Nome" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
          <Select
            placeholder="Genero"
            options={genderOptions}
            value={form.gender}
            onChange={(event) => setForm({ ...form, gender: event.target.value })}
          />
          <InputText placeholder="Telefone" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
          <InputText placeholder="WhatsApp" value={form.whatsapp} onChange={(event) => setForm({ ...form, whatsapp: event.target.value })} />
          <Button onClick={create} disabled={!form.name}>
            Criar
          </Button>
        </div>
      )}
      <div className="participants-layout">
        <div className="data-list participant-list">
          {participants.map((participant) => (
            <div className={`data-row${selectedParticipant?.id === participant.id ? " participant-selected" : ""}`} key={participant.id}>
              <div>
                <strong>{participant.name}</strong>
                <span>{participant.phone || "Sem telefone"} {participant.whatsapp ? `· WhatsApp ${participant.whatsapp}` : ""}</span>
              </div>
              <div className="row-actions">
                <Button
                  variant={selectedParticipant?.id === participant.id ? "selected" : "secondary"}
                  aria-pressed={selectedParticipant?.id === participant.id}
                  onClick={() => setSelectedParticipant(participant)}
                >
                  Designacoes
                </Button>
                {deleted ? (
                  <Button onClick={async () => { await api(`/participants/${participant.id}/restore`, { method: "POST" }); if (selectedParticipant?.id === participant.id) setSelectedParticipant(null); await load(); }}>
                    Restaurar
                  </Button>
                ) : (
                  <Button variant="danger" onClick={async () => { await api(`/participants/${participant.id}`, { method: "DELETE" }); if (selectedParticipant?.id === participant.id) setSelectedParticipant(null); await load(); }}>
                    Excluir
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
        {selectedParticipant ? (
          <ParticipantAssignmentsTable participant={selectedParticipant} />
        ) : (
          <div className="empty-state participant-history-empty">
            <h2>Historico de designacoes</h2>
            <p className="muted">Selecione um participante para consultar todas as suas designacoes.</p>
          </div>
        )}
      </div>
    </section>
  );
}
