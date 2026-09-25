import assert from "node:assert/strict";
import test from "node:test";
import { createMeetingStatusShareMessage } from "./meetingStatusShare.js";

test("builds a weekend status share message with theme and statuses", () => {
  const message = createMeetingStatusShareMessage({
    meetingType: "weekend",
    meetingDate: new Date("2026-09-26T15:00:00.000Z"),
    timezone: "America/Fortaleza",
    initialSong: "12",
    sections: [
      {
        sectionKey: "weekendOpening",
        title: "Abertura",
        parts: [
          {
            partKey: "president",
            title: "Presidente",
            slots: [
              {
                label: "Presidente",
                responseStatus: "CONFIRMED",
                participantName: "João",
                publicSpeakerName: null,
                publicSpeakerCongregation: null,
                themeTitle: null
              }
            ]
          }
        ]
      },
      {
        sectionKey: "publicTalk",
        title: "Discurso publico",
        parts: [
          {
            partKey: "public_talk",
            title: "Orador visitante",
            slots: [
              {
                label: "Orador",
                responseStatus: "PENDING",
                participantName: "Carlos",
                publicSpeakerName: null,
                publicSpeakerCongregation: null,
                themeTitle: "1 - Você conhece bem a Deus?"
              }
            ]
          }
        ]
      }
    ]
  });

  assert.match(message, /Reunião de Fim de Semana/u);
  assert.match(message, /Cântico inicial: `12`/u);
  assert.match(message, /Tema: `1 - Você conhece bem a Deus\?`/u);
  assert.match(message, /Orador: \*Carlos\*/u);
  assert.match(message, /✅ Confirmado/u);
  assert.match(message, /⏳ Aguardando/u);
});
