import { BookOpenText, CheckCircle2, Clock3, Music2, XCircle } from "lucide-react";
import type { AssignmentPayload, AssignmentResponseStatus } from "@/api/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const sectionHeaderClass: Record<string, string> = {
  treasures: "border-transparent bg-[#3c7f8b] text-white",
  ministery: "border-transparent bg-[#d68f00] text-white",
  christianLife: "border-transparent bg-[#bf2f13] text-white",
};

function getSectionHeaderClass(sectionKey: string) {
  return (
    sectionHeaderClass[sectionKey] ??
    "border-transparent bg-primary text-primary-foreground"
  );
}

export function PublicAssignmentResults({ payload }: { payload: AssignmentPayload }) {
  const initialSong =
    payload.meeting.type === "weekend"
      ? payload.meeting.initialSong
      : payload.table.songs?.initial;

  return (
    <div className="space-y-3">
      {payload.meeting.bibleReading && (
        <Card size="sm">
          <CardContent className="flex items-center gap-3">
            <BookOpenText className="size-5 shrink-0 text-primary" />
            <span>
              <span className="block text-xs text-muted-foreground">Leitura da semana</span>
              <strong>{payload.meeting.bibleReading}</strong>
            </span>
          </CardContent>
        </Card>
      )}

      {initialSong && <Song label="Cântico inicial" value={initialSong} />}

      {payload.table.sections.map((section) => (
        <div key={section.id} className="space-y-3">
          <Card className="gap-0 overflow-hidden py-0">
            <CardHeader className={cn("border-b py-3", getSectionHeaderClass(section.sectionKey))}>
              <CardTitle className="text-inherit">{section.title}</CardTitle>
            </CardHeader>
            <CardContent className="divide-y px-4">
              {payload.meeting.type === "weekend" && section.sectionKey === "publicTalk" ? (
                <div className="grid gap-3 py-4 sm:grid-cols-3">
                  <Detail label="Tema do discurso" value={payload.meeting.publicTalkTheme} />
                  <Detail label="Nome do orador" value={payload.meeting.publicSpeakerName} />
                  <Detail
                    label="Congregação do orador"
                    value={payload.meeting.publicSpeakerCongregation}
                  />
                </div>
              ) : section.parts.map((part) => (
                <div key={part.id} className="space-y-3 py-4">
                  <strong className="block leading-snug">{part.title}</strong>
                  <div className="space-y-3">
                    {part.slots.map((slot) => (
                      <div key={slot.id} className="flex items-start justify-between gap-3">
                        <span className="min-w-0">
                          <span className="block text-xs text-muted-foreground">{slot.label}</span>
                          <span className="block truncate font-medium">
                            {slot.participant?.name ?? "Sem designação"}
                          </span>
                        </span>
                        {slot.responseStatus && <StatusBadge status={slot.responseStatus} />}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {section.sectionKey === "ministery" && payload.table.songs?.transitional && (
            <Song label="Cântico de transição" value={payload.table.songs.transitional} />
          )}
          {section.sectionKey === "christianLife" && payload.table.songs?.last && (
            <Song label="Cântico final" value={payload.table.songs.last} />
          )}
        </div>
      ))}
    </div>
  );
}

function StatusBadge({ status }: { status: AssignmentResponseStatus }) {
  const content =
    status === "CONFIRMED"
      ? { label: "Confirmado", icon: CheckCircle2, variant: "success" as const }
      : status === "REJECTED"
        ? { label: "Rejeitado", icon: XCircle, variant: "destructive" as const }
        : { label: "Pendente", icon: Clock3, variant: "warning" as const };
  const Icon = content.icon;

  return (
    <Badge variant={content.variant} className="mt-0.5">
      <Icon data-icon="inline-start" />
      {content.label}
    </Badge>
  );
}

function Song({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-[#c5e3f5] bg-[#e8f4fc] px-4 py-3 text-sm">
      <Music2 className="size-4 shrink-0 text-primary" />
      <span>
        <span className="text-muted-foreground">{label}: </span>
        <strong>{value}</strong>
      </span>
    </div>
  );
}

function Detail({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <span className="block text-xs text-muted-foreground">{label}</span>
      <strong className="font-medium">{value || "Não informado"}</strong>
    </div>
  );
}
