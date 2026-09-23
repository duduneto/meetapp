import { ArrowLeft, CheckCircle2, Clock3, Printer, Save, SquarePen, Trash2, X, XCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type {
  AssignmentPayload,
  AssignmentResponseStatus,
  Participant,
} from "../../api/types";
import { formatDateRange } from "../../hooks";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { cn } from "@/lib/utils";
import { ParticipantSuggestionsPopover } from "./ParticipantSuggestionsPopover";
import { MeetingActivityHistory } from "./MeetingActivityHistory";
import { MinistryParticipationNotificationsButton } from "./MinistryParticipationNotificationsButton";
import { ParticipationLinkButton } from "./ParticipationLinkButton";
import { MeetingShareButton } from "./MeetingShareButton";

type DraftAssignments = Record<string, string>;

const notificationSectionKeys = new Set([
  "midweekOpening",
  "treasures",
  "ministery",
  "christianLife",
  "midweekClosing",
]);

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
  const [saving, setSaving] = useState(false);
  const [draftAssignments, setDraftAssignments] = useState<DraftAssignments>({});
  const [weekendFields, setWeekendFields] = useState({
    initialSong: payload.meeting.initialSong ?? "",
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
      initialSong: payload.meeting.initialSong ?? "",
      publicTalkTheme: payload.meeting.publicTalkTheme ?? "",
      publicSpeakerName: payload.meeting.publicSpeakerName ?? "",
      publicSpeakerCongregation: payload.meeting.publicSpeakerCongregation ?? ""
    });
  }, [payload]);

  const title = payload.meeting.type === "midweek" ? "Reunião de Meio de Semana" : "Reunião de Fim de Semana";
  const participantOptions = useMemo(() => participants.filter((participant) => !participant.deletedAt), [participants]);
  const participantSelectOptions = useMemo(
    () => [
      { value: "", label: "Sem Designação" },
      ...participantOptions.map((participant) => ({
        value: participant.id,
        label: participant.name,
      })),
    ],
    [participantOptions],
  );

  async function save() {
    setSaving(true);
    try {
      await onSave({
        assignments: Object.entries(draftAssignments).map(([key, participantId]) => {
          const [partKey, position] = key.split(":");
          return { partKey, position: Number(position), participantId: participantId || null };
        }),
        weekendFields: payload.meeting.type === "weekend" ? weekendFields : undefined
      });
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className={cn("flex h-full min-h-0 flex-col gap-0 overflow-hidden py-0 print:ring-0", className)}>
      <CardHeader className="no-print shrink-0 border-b bg-card py-4 has-data-[slot=card-action]:grid-cols-1">
        <div className="flex w-full min-w-0 flex-col gap-3 @min-[640px]/card-header:flex-row @min-[640px]/card-header:items-start @min-[640px]/card-header:justify-between">
          <div className="flex min-w-0 items-start gap-2">
            {onBack && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="-ml-2 shrink-0"
                onClick={onBack}
              >
                <ArrowLeft />
                Voltar
              </Button>
            )}
            <div className="min-w-0">
              <CardTitle className="text-xl">{title}</CardTitle>
              <CardDescription>
                {formatDateRange(payload.meeting.startAt, payload.meeting.endAt)}
              </CardDescription>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 @max-[639px]/card-header:w-full">
            {payload.canSharePublicLink && (
              <MeetingShareButton
                year={payload.meeting.year}
                week={payload.meeting.week}
                type={payload.meeting.type}
              />
            )}
            {payload.canWrite && (
              <MeetingActivityHistory
                year={payload.meeting.year}
                week={payload.meeting.week}
                type={payload.meeting.type}
              />
            )}
            <Button variant="outline" size="icon" title="Imprimir" onClick={() => window.print()}>
              <Printer size={18} />
            </Button>
            {payload.canWrite && !editing && (
              <Button type="button" onClick={() => setEditing(true)}>
                <SquarePen size={16} />
                Editar
              </Button>
            )}
            {editing && (
              <>
                <Button type="button" variant="outline" disabled={saving} onClick={() => setEditing(false)}>
                  <X size={16} />
                  Cancelar
                </Button>
                <Button type="button" disabled={saving} onClick={save}>
                  <Save size={16} />
                  {saving ? "Salvando..." : "Salvar"}
                </Button>
              </>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain pb-4">

      {payload.meeting.bibleReading && <div className="rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground">Leitura da semana: <strong>{payload.meeting.bibleReading}</strong></div>}

      {payload.meeting.type === "midweek" && payload.table.songs && (
        <div className="meeting-song">
          <Field label="Cantico inicial" value={payload.table.songs.initial} editing={false} onChange={() => undefined} />
        </div>
      )}

      {payload.meeting.type === "weekend" && (
        <div className="meeting-song">
          <Field
            label="Cântico inicial"
            value={weekendFields.initialSong}
            editing={editing}
            onChange={(value) =>
              setWeekendFields((current) => ({ ...current, initialSong: value }))
            }
          />
        </div>
      )}

      <div className="meeting-table">
        {payload.table.sections.map((section) => (
          <div key={section.id} className="contents">
            <div
              className="meeting-section rounded-xl border bg-card shadow-xs"
              data-section={section.sectionKey}
            >
              <div className="meeting-section-header">
                <h2>{section.title}</h2>
                {payload.canWrite &&
                  !editing &&
                  payload.meeting.type === "midweek" &&
                  notificationSectionKeys.has(section.sectionKey) && (
                    <MinistryParticipationNotificationsButton
                      year={payload.meeting.year}
                      week={payload.meeting.week}
                      startAt={payload.meeting.startAt}
                      endAt={payload.meeting.endAt}
                      sectionKey={section.sectionKey}
                      sectionTitle={section.title}
                      assignments={section.parts.flatMap((part) =>
                        part.slots.flatMap((slot) =>
                          slot.assignmentId && slot.participant && slot.responseStatus
                            ? [
                                {
                                  assignmentId: slot.assignmentId,
                                  participantName: slot.participant.name,
                                  partTitle: part.title,
                                  slotLabel: slot.label,
                                  hasWhatsapp: slot.participant.hasWhatsapp,
                                  responseStatus: slot.responseStatus,
                                  notificationStatus: slot.participationNotificationStatus,
                                },
                              ]
                            : [],
                        ),
                      )}
                    />
                  )}
              </div>
              {payload.meeting.type === "weekend" && section.sectionKey === "publicTalk" && (
                <div className="weekend-fields">
                  <Field label="Tema do discurso" value={weekendFields.publicTalkTheme} editing={editing} onChange={(value) => setWeekendFields((current) => ({ ...current, publicTalkTheme: value }))} />
                  <Field label="Nome do orador" value={weekendFields.publicSpeakerName} editing={editing} onChange={(value) => setWeekendFields((current) => ({ ...current, publicSpeakerName: value }))} />
                  <Field label="Congregação do orador" value={weekendFields.publicSpeakerCongregation} editing={editing} onChange={(value) => setWeekendFields((current) => ({ ...current, publicSpeakerCongregation: value }))} />
                </div>
              )}
              {!(payload.meeting.type === "weekend" && section.sectionKey === "publicTalk") && section.parts.map((part) => (
                <div className="assignment-row" key={part.id}>
                  <div className="part-title">
                    <span className="block">{part.title}</span>
                    {editing &&
                      part.assignable &&
                      section.sectionKey === "ministery" && (
                        <div className="mt-2">
                          <ParticipantSuggestionsPopover
                            year={payload.meeting.year}
                            week={payload.meeting.week}
                            onSelect={(role, participantId) => {
                              const roleLabel = role === "publisher" ? "publicador" : "ajudante";
                              const slot = part.slots.find(
                                (candidate) =>
                                  candidate.label.trim().toLocaleLowerCase("pt-BR") === roleLabel,
                              );
                              if (!slot) return;

                              setDraftAssignments((current) => ({
                                ...current,
                                [`${part.partKey}:${slot.position}`]: participantId,
                              }));
                            }}
                          />
                        </div>
                      )}
                  </div>
                  <div className="slots">
                    {part.slots.length === 0 && <span className="muted">Sem designacao</span>}
                    {part.slots.map((slot) => {
                      const key = `${part.partKey}:${slot.position}`;
                      return (
                        <div key={slot.id} className="slot">
                          <span>{slot.label}</span>
                          {editing && part.assignable ? (
                            <div className="flex items-center gap-2">
                              <div className="min-w-0 flex-1">
                                <SearchableSelect
                                  options={participantSelectOptions}
                                  value={draftAssignments[key] ?? ""}
                                  placeholder="Buscar participante..."
                                  emptyMessage="Nenhum participante encontrado."
                                  onValueChange={(participantId) =>
                                    setDraftAssignments((current) => ({
                                      ...current,
                                      [key]: participantId,
                                    }))
                                  }
                                />
                              </div>
                              <Button
                                type="button"
                                size="icon"
                                variant="outline"
                                className="shrink-0 text-destructive hover:text-destructive"
                                disabled={!draftAssignments[key]}
                                title={`Remover ${slot.label}`}
                                aria-label={`Remover participante de ${slot.label}`}
                                onClick={() =>
                                  setDraftAssignments((current) => ({ ...current, [key]: "" }))
                                }
                              >
                                <Trash2 />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex flex-col items-start gap-1.5">
                              <strong>{slot.participant?.name ?? "Sem Designacao"}</strong>
                              {slot.participant && slot.responseStatus && (
                                <ResponseStatus status={slot.responseStatus} />
                              )}
                              {payload.canWrite && slot.assignmentId && slot.participant && (
                                <ParticipationLinkButton assignmentId={slot.assignmentId} />
                              )}
                            </div>
                          )}
                        </div>
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

function ResponseStatus({ status }: { status: AssignmentResponseStatus }) {
  const content =
    status === "CONFIRMED"
      ? { label: "Confirmado", icon: CheckCircle2, variant: "success" as const }
      : status === "REJECTED"
        ? { label: "Rejeitado", icon: XCircle, variant: "destructive" as const }
        : { label: "Aguardando confirmação", icon: Clock3, variant: "warning" as const };
  const Icon = content.icon;

  return (
    <Badge variant={content.variant}>
      <Icon data-icon="inline-start" />
      {content.label}
    </Badge>
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
