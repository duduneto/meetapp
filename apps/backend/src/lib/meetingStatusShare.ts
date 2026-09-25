import type { AssignmentResponseStatus } from "@prisma/client";

type StatusShareSlot = {
  label: string;
  responseStatus: AssignmentResponseStatus | null;
  participantName: string | null;
  publicSpeakerName: string | null;
  publicSpeakerCongregation: string | null;
  themeTitle: string | null;
};

type StatusSharePart = {
  partKey: string;
  title: string;
  slots: StatusShareSlot[];
};

type StatusShareSection = {
  sectionKey: string;
  title: string;
  parts: StatusSharePart[];
};

export type StatusShareInput = {
  meetingType: "midweek" | "weekend";
  meetingDate: Date | null;
  timezone: string;
  initialSong: string | null;
  songs?: { initial: string; transitional: string; last: string } | null;
  sections: StatusShareSection[];
};

function formatMeetingDate(date: Date, timezone: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: timezone
  }).format(date);
}

function statusLine(status: AssignmentResponseStatus | null) {
  if (status === "CONFIRMED") return "✅ Confirmado";
  if (status === "REJECTED") return "❌ Rejeitado";
  if (status === "PENDING") return "⏳ Aguardando";
  return null;
}

function speakerDisplay(slot: StatusShareSlot) {
  if (slot.participantName) return `*${slot.participantName}*`;
  if (slot.publicSpeakerName) {
    const congregation = slot.publicSpeakerCongregation
      ? ` (_${slot.publicSpeakerCongregation}_)`
      : "";
    return `*${slot.publicSpeakerName}*${congregation}`;
  }
  return "_Sem designação_";
}

export function createMeetingStatusShareMessage(input: StatusShareInput) {
  const title =
    input.meetingType === "weekend"
      ? "Reunião de Fim de Semana"
      : "Reunião de Meio de Semana";
  const lines: string[] = [`📋 *${title}*`];

  if (input.meetingDate) {
    lines.push(`📅 _${formatMeetingDate(input.meetingDate, input.timezone)}_`);
  }

  const initialSong =
    input.meetingType === "weekend"
      ? input.initialSong
      : (input.songs?.initial ?? null);
  if (initialSong) {
    lines.push(`🎵 Cântico inicial: \`${initialSong}\``);
  }

  lines.push("");

  for (const section of input.sections) {
    lines.push(`*${section.title}*`);

    if (section.sectionKey === "publicTalk") {
      const slot = section.parts.flatMap((part) => part.slots)[0];
      if (slot?.themeTitle) {
        lines.push(`• Tema: \`${slot.themeTitle}\``);
      }
      lines.push(`• Orador: ${slot ? speakerDisplay(slot) : "_Sem designação_"}`);
      const status = slot ? statusLine(slot.responseStatus) : null;
      if (status) lines.push(`  ${status}`);
      lines.push("");
      continue;
    }

    for (const part of section.parts) {
      for (const slot of part.slots) {
        const role =
          section.parts.length === 1 && part.slots.length === 1
            ? part.title
            : slot.label;
        lines.push(`• ${role}: ${speakerDisplay(slot)}`);
        const status = statusLine(slot.responseStatus);
        if (status && (slot.participantName || slot.publicSpeakerName)) {
          lines.push(`  ${status}`);
        }
      }
    }

    if (input.meetingType === "midweek" && section.sectionKey === "ministery" && input.songs?.transitional) {
      lines.push(`🎵 Cântico de transição: \`${input.songs.transitional}\``);
    }
    if (input.meetingType === "midweek" && section.sectionKey === "christianLife" && input.songs?.last) {
      lines.push(`🎵 Cântico final: \`${input.songs.last}\``);
    }

    lines.push("");
  }

  return lines
    .filter((line, index, all) => line !== "" || all[index - 1] !== "")
    .join("\n")
    .trim();
}
