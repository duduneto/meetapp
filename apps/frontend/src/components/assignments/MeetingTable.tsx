import { ArrowLeft, Printer, Save, SquarePen, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { AssignmentPayload, Participant } from "../../api/types";
import { formatDateRange } from "../../hooks";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { cn } from "@/lib/utils";

type DraftAssignments = Record<string, string>;

export function MeetingTable({
  payload,
  participants,
  onSave,
  onBack,
  className,
}: {
  payload: AssignmentPayload;
  participants: Participant[];
  onSave: (body: { assignments: Array<{ partKey: string; position: number; participantId: string | null }>; weekendFields?: Record<string, string | null> }) => Promise<void>;
  onBack?: () => void;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draftAssignments, setDraftAssignments] = useState<DraftAssignments>({});
  const [weekendFields, setWeekendFields] = useState({
    publicTalkTheme: payload.meeting.publicTalkTheme ?? "",
    publicSpeakerName: payload.meeting.publicSpeakerName ?? "",
    publicSpeakerCongregation: payload.meeting.publicSpeakerCongregation ?? ""
  });

  useEffect(() => {
    const next: DraftAssignments = {};
    for (const section of payload.table.sections) {
      for (const part of section.parts) {
        for (const slot of part.slots) next[`${part.partKey}:${slot.position}`] = slot.participant?.id ?? "";
      }
    }
    setDraftAssignments(next);
    setWeekendFields({
      publicTalkTheme: payload.meeting.publicTalkTheme ?? "",
      publicSpeakerName: payload.meeting.publicSpeakerName ?? "",
      publicSpeakerCongregation: payload.meeting.publicSpeakerCongregation ?? ""
    });
  }, [payload]);

  const title = payload.meeting.type === "midweek" ? "Reunião de Meio de Semana" : "Reunião de Fim de Semana";
  const participantOptions = useMemo(() => participants.filter((participant) => !participant.deletedAt), [participants]);

  async function save() {
    await onSave({
      assignments: Object.entries(draftAssignments).map(([key, participantId]) => {
        const [partKey, position] = key.split(":");
        return { partKey, position: Number(position), participantId: participantId || null };
      }),
      weekendFields: payload.meeting.type === "weekend" ? weekendFields : undefined
    });
    setEditing(false);
  }

  return (
    <Card className={cn("overflow-visible py-0 print:ring-0", className)}>
      <CardHeader className="no-print border-b py-4">
        <div className="flex min-w-0 items-start gap-2">
          {onBack && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="-ml-2"
              onClick={onBack}
            >
              <ArrowLeft />
              Voltar
            </Button>
          )}
          <div className="min-w-0">
            <CardTitle className="text-xl">{title}</CardTitle>
            <CardDescription>{formatDateRange(payload.meeting.startAt, payload.meeting.endAt)}</CardDescription>
          </div>
        </div>
        <CardAction className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="icon" title="Imprimir" onClick={() => window.print()}>
            <Printer size={18} />
          </Button>
          {payload.canWrite && !editing && (
            <Button onClick={() => setEditing(true)}>
              <SquarePen size={16} />
              Editar
            </Button>
          )}
          {editing && (
            <>
              <Button variant="outline" onClick={() => setEditing(false)}>
                <X size={16} />
                Cancelar
              </Button>
              <Button onClick={save}>
                <Save size={16} />
                Salvar
              </Button>
            </>
          )}
        </CardAction>
      </CardHeader>

      <CardContent className="space-y-4 pb-4">

      {payload.meeting.bibleReading && <div className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">Leitura da semana: <strong className="text-foreground">{payload.meeting.bibleReading}</strong></div>}

      {payload.meeting.type === "midweek" && payload.table.songs && (
        <div className="meeting-song">
          <Field label="Cantico inicial" value={payload.table.songs.initial} editing={false} onChange={() => undefined} />
        </div>
      )}

      {payload.meeting.type === "weekend" && (
        <div className="weekend-fields">
          <Field label="Tema" value={weekendFields.publicTalkTheme} editing={editing} onChange={(value) => setWeekendFields((current) => ({ ...current, publicTalkTheme: value }))} />
          <Field label="Orador" value={weekendFields.publicSpeakerName} editing={editing} onChange={(value) => setWeekendFields((current) => ({ ...current, publicSpeakerName: value }))} />
          <Field label="Congregacao" value={weekendFields.publicSpeakerCongregation} editing={editing} onChange={(value) => setWeekendFields((current) => ({ ...current, publicSpeakerCongregation: value }))} />
        </div>
      )}

      <div className="meeting-table">
        {payload.table.sections.map((section) => (
          <div key={section.id} className="contents">
            <div className="meeting-section rounded-xl border bg-card shadow-xs">
              <h2>{section.title}</h2>
              {section.parts.map((part) => (
                <div className="assignment-row" key={part.id}>
                  <div className="part-title">{part.title}</div>
                  <div className="slots">
                    {part.slots.length === 0 && <span className="muted">Sem designacao</span>}
                    {part.slots.map((slot) => {
                      const key = `${part.partKey}:${slot.position}`;
                      return (
                        <label key={slot.id} className="slot">
                          <span>{slot.label}</span>
                          {editing && part.assignable ? (
                            <NativeSelect className="w-full" value={draftAssignments[key] ?? ""} onChange={(event) => setDraftAssignments((current) => ({ ...current, [key]: event.target.value }))}>
                              <NativeSelectOption value="">Sem Designacao</NativeSelectOption>
                              {participantOptions.map((participant) => (
                                <NativeSelectOption key={participant.id} value={participant.id}>
                                  {participant.name}
                                </NativeSelectOption>
                              ))}
                            </NativeSelect>
                          ) : (
                            <strong>{slot.participant?.name ?? "Sem Designacao"}</strong>
                          )}
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            {payload.meeting.type === "midweek" && payload.table.songs && section.sectionKey === "ministery" && (
              <div className="meeting-song">
                <Field label="Cantico de transicao" value={payload.table.songs.transitional} editing={false} onChange={() => undefined} />
              </div>
            )}
            {payload.meeting.type === "midweek" && payload.table.songs && section.sectionKey === "christianLife" && (
              <div className="meeting-song">
                <Field label="Cantico final" value={payload.table.songs.last} editing={false} onChange={() => undefined} />
              </div>
            )}
          </div>
        ))}
      </div>
      </CardContent>
    </Card>
  );
}

function Field({ label, value, editing, onChange }: { label: string; value: string; editing: boolean; onChange: (value: string) => void }) {
  return (
    <label>
      <span>{label}</span>
      {editing ? <Input value={value} onChange={(event) => onChange(event.target.value)} /> : <strong>{value || "Nao informado"}</strong>}
    </label>
  );
}
