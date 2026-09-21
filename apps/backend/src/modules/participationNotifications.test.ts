import assert from "node:assert/strict";
import test from "node:test";
import {
  createParticipationNotificationMessage,
  isValidDateOnly,
  normalizeWhatsappNumber,
  participationNotificationRequestSchema
} from "./participationNotifications.js";

test("normalizes valid WhatsApp numbers and rejects invalid values", () => {
  assert.equal(normalizeWhatsappNumber("+55 (85) 99999-9999"), "5585999999999");
  assert.equal(normalizeWhatsappNumber("123"), null);
});

test("creates a participation message with role, companion and link", () => {
  const message = createParticipationNotificationMessage({
    participantName: "Maria",
    meetingDate: new Date("2026-09-23T03:00:00.000Z"),
    timezone: "America/Fortaleza",
    sectionTitle: "FAÇA SEU MELHOR NO MINISTÉRIO",
    partTitle: "4. Iniciando conversas",
    slotLabel: "Publicador",
    companions: [{ label: "Ajudante", name: "Joana" }],
    link: "https://example.com/participation/code"
  });

  assert.match(message, /quarta-feira, 23\/09\/2026/u);
  assert.match(message, /Função: `Publicador`/u);
  assert.match(message, /Ajudante: Joana/u);
  assert.match(message, /https:\/\/example\.com\/participation\/code/u);
});

test("validates the selected meeting date and optional individual assignment", () => {
  assert.equal(isValidDateOnly("2026-09-23"), true);
  assert.equal(isValidDateOnly("2026-02-30"), false);
  assert.deepEqual(
    participationNotificationRequestSchema.parse({
      meetingDate: "2026-09-23",
      assignmentIds: ["assignment-1"]
    }),
    {
      force: false,
      meetingDate: "2026-09-23",
      assignmentIds: ["assignment-1"]
    }
  );
  assert.throws(() =>
    participationNotificationRequestSchema.parse({ meetingDate: "2026-02-30" })
  );
  assert.throws(() =>
    participationNotificationRequestSchema.parse({
      meetingDate: "2026-09-23",
      assignmentIds: ["assignment-1", "assignment-1"]
    })
  );
});
