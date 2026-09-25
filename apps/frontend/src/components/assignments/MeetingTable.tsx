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
import { MeetingStatusShareButton } from "./MeetingStatusShareButton";
import { PublicSpeakThemeSelect } from "./PublicSpeakThemeSelect";
import { PublicSpeakerSelect, type PublicTalkSpeakerValue } from "./PublicSpeakerSelect";

type DraftAssignments = Record<string, string>;

type PublicTalkDraft = {
  publicSpeakThemeId: string | null;
  publicSpeakThemeLabel: string;
  speaker: PublicTalkSpeakerValue;
};

const midweekNotificationSectionKeys = new Set([
  "midweekOpening",
  "treasures",
  "ministery",
  "christianLife",
  "midweekClosing",
]);

const weekendNotificationSectionKeys = new Set([
  "weekendOpening",
  "publicTalk",
  "watchtower",
]);

function findPublicTalkSlot(payload: AssignmentPayload) {
  for (const section of payload.table.sections) {
    for (const part of section.parts) {
      if (part.partKey !== "public_talk") continue;
      return { part, slot: part.slots[0] ?? null };
    }
  }
  return { part: null, slot: null };
}

function publicTalkDraftFromPayload(
  payload: AssignmentPayload,
  participants: Participant[] = [],
): PublicTalkDraft {
  const { slot } = findPublicTalkSlot(payload);
  if (!slot) {
    return {
      publicSpeakThemeId: null,
      publicSpeakThemeLabel: "",
      speaker: { participantId: null, publicSpeakerId: null, congregationName: "" },
    };
  }

  const local = slot.participant
    ? participants.find((participant) => participant.id === slot.participant?.id)
    : undefined;

  return {
    publicSpeakThemeId: slot.publicSpeakTheme?.id ?? null,
    publicSpeakThemeLabel: slot.publicSpeakTheme?.fullTitle ?? "",
    speaker: {
      participantId: slot.participant?.id ?? null,
      publicSpeakerId: slot.publicSpeaker?.id ?? null,
      congregationName:
        slot.publicSpeaker?.congregation?.name ??
        slot.participant?.congregation?.name ??
        local?.congregation?.name ??
        "",
    },
  };
}

export function MeetingTable({
  payload,
  participants,
  onSave,
  onBack,
  className,
}: {
  payload: AssignmentPayload;
  participants: Participant[];
  onSave: (body: {
    assignments: Array<{
      partKey: string;
      position: number;
      participantId?: string | null;
      publicSpeakerId?: string | null;
      publicSpeakThemeId?: string | null;
    }>;
    weekendFields?: { initialSong?: string | null };
  }) => Promise<void>;
  onBack?: () => void;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draftAssignments, setDraftAssignments] = useState<DraftAssignments>({});
  const [initialSong, setInitialSong] = useState(payload.meeting.initialSong ?? "");
  const [publicTalkDraft, setPublicTalkDraft] = useState<PublicTalkDraft>(() =>
    publicTalkDraftFromPayload(payload, participants),
  );

  useEffect(() => {
    const next: DraftAssignments = {};
    for (const section of payload.table.sections) {
      for (const part of section.parts) {
        if (part.partKey === "public_talk") continue;
        for (const slot of part.slots) next[`${part.partKey}:${slot.position}`] = slot.participant?.id ?? "";
      }
    }
    setDraftAssignments(next);
    setInitialSong(payload.meeting.initialSong ?? "");
    setPublicTalkDraft(publicTalkDraftFromPayload(payload, participants));
  }, [payload, participants]);

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

  const publicTalkSlot = findPublicTalkSlot(payload);

  async function save() {
    setSaving(true);
    try {
      const assignments: Array<{
        partKey: string;
        position: number;
        participantId?: string | null;
        publicSpeakerId?: string | null;
        publicSpeakThemeId?: string | null;
      }> = Object.entries(draftAssignments).map(([key, participantId]) => {
        const [partKey, position] = key.split(":");
        return { partKey, position: Number(position), participantId: participantId || null };
      });

      if (payload.meeting.type === "weekend" && publicTalkSlot.part && publicTalkSlot.slot) {
        assignments.push({
          partKey: publicTalkSlot.part.partKey,
          position: publicTalkSlot.slot.position,
          participantId: publicTalkDraft.speaker.participantId,
          publicSpeakerId: publicTalkDraft.speaker.publicSpeakerId,
          publicSpeakThemeId: publicTalkDraft.publicSpeakThemeId,
        });
      }

      await onSave({
        assignments,
        weekendFields:
          payload.meeting.type === "weekend" ? { initialSong: initialSong || null } : undefined,
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
              <MeetingStatusShareButton
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
            value={initialSong}
            editing={editing}
            onChange={setInitialSong}
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
                  ((payload.meeting.type === "midweek" &&
                    midweekNotificationSectionKeys.has(section.sectionKey)) ||
                    (payload.meeting.type === "weekend" &&
                      weekendNotificationSectionKeys.has(section.sectionKey))) && (
                    <MinistryParticipationNotificationsButton
                      year={payload.meeting.year}
                      week={payload.meeting.week}
                      meetingType={payload.meeting.type}
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
                                  slotLabel:
                                    part.partKey === "public_talk" ? "Orador" : slot.label,
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
                  {editing ? (
                    <>
                      <PublicSpeakThemeSelect
                        value={publicTalkDraft.publicSpeakThemeId ?? ""}
                        label={publicTalkDraft.publicSpeakThemeLabel}
                        onValueChange={(themeId, theme) =>
                          setPublicTalkDraft((current) => ({
                            ...current,
                            publicSpeakThemeId: themeId || null,
                            publicSpeakThemeLabel: theme?.fullTitle ?? "",
                          }))
                        }
                      />
                      <PublicSpeakerSelect
                        participants={participants}
                        value={publicTalkDraft.speaker}
                        speakerLabel={
                          publicTalkDraft.speaker.participantId || publicTalkDraft.speaker.publicSpeakerId
                            ? publicTalkSlot.slot?.participant?.name ??
                              publicTalkSlot.slot?.publicSpeaker?.name ??
                              ""
                            : ""
                        }
                        onValueChange={(speaker) =>
                          setPublicTalkDraft((current) => ({ ...current, speaker }))
                        }
                      />
                      <label className="block space-y-1 text-sm">
                        <span>Congregação do orador</span>
                        <strong className="block min-h-8 rounded-lg border border-transparent px-0 py-1.5">
                          {publicTalkDraft.speaker.congregationName || "Não informado"}
                        </strong>
                      </label>
                    </>
                  ) : (
                    <>
                      <Field
                        label="Tema do discurso"
                        value={publicTalkSlot.slot?.publicSpeakTheme?.fullTitle ?? ""}
                        editing={false}
                        onChange={() => undefined}
                      />
                      <div className="space-y-1 text-sm">
                        <span className="block text-muted-foreground">Nome do orador</span>
                        <div className="flex flex-col items-start gap-1.5">
                          <strong>
                            {publicTalkSlot.slot?.participant?.name ??
                              publicTalkSlot.slot?.publicSpeaker?.name ??
                              "Nao informado"}
                          </strong>
                          {publicTalkSlot.slot?.participant && publicTalkSlot.slot.responseStatus && (
                            <ResponseStatus status={publicTalkSlot.slot.responseStatus} />
                          )}
                          {payload.canWrite &&
                            publicTalkSlot.slot?.assignmentId &&
                            publicTalkSlot.slot.participant && (
                              <ParticipationLinkButton
                                assignmentId={publicTalkSlot.slot.assignmentId}
                              />
                            )}
                        </div>
                      </div>
                      <Field
                        label="Congregação do orador"
                        value={
                          publicTalkDraft.speaker.congregationName ||
                          publicTalkSlot.slot?.publicSpeaker?.congregation?.name ||
                          publicTalkSlot.slot?.participant?.congregation?.name ||
                          ""
                        }
                        editing={false}
                        onChange={() => undefined}
                      />
                    </>
                  )}
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
