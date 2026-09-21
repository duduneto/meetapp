import assert from "node:assert/strict";
import test from "node:test";
import { midweekStructureFromImport } from "./meetingStructures.js";

const legacyPayload = {
  year: 2026,
  ref: "0_2026_9_41",
  month: 9,
  startAt: "2026-10-05T03:00:00.000Z",
  meeting_week_ref: 0,
  endAt: "2026-10-11T03:00:00.000Z",
  yearWeek: 41,
  bibleReading: "JEREMIAS 40-41",
  songs: {
    initial: "Cântico 33",
    transitional: "Cântico 17",
    last: "Cântico 38"
  },
  treasures: {
    title: "TESOUROS DA PALAVRA DE DEUS",
    sections: [
      { title: "1. Tenha o ponto de vista correto sobre a proteção de Jeová", assigned_to: [] },
      { title: "2. Joias espirituais", assigned_to: [] },
      { title: "3. Leitura da Bíblia", assigned_to: [] }
    ]
  },
  ministery: {
    title: "FAÇA SEU MELHOR NO MINISTÉRIO",
    sections: [
      { title: "4. Iniciando conversas", assigned_to: [] },
      { title: "5. Iniciando conversas", assigned_to: [] },
      { title: "6. Iniciando conversas", assigned_to: [] },
      { title: "7. Explicando suas crenças", assigned_to: [] }
    ]
  },
  christianLife: {
    title: "NOSSA VIDA CRISTÃ",
    sections: [
      { title: "8. Jeová é o Protetor das viúvas", assigned_to: [] },
      { title: "9. Estudo bíblico de congregação", assigned_to: [] }
    ]
  }
};

test("normalizes the legacy midweek payload into stable sections, parts and slots", () => {
  const structure = midweekStructureFromImport(legacyPayload);

  assert.deepEqual(structure.map((section) => section.sectionKey), [
    "midweekOpening",
    "treasures",
    "ministery",
    "christianLife",
    "midweekClosing"
  ]);

  assert.equal(structure[1].title, legacyPayload.treasures.title);
  assert.deepEqual(
    structure[1].parts.map((part) => [part.partKey, part.title, part.slots]),
    [
      ["treasures.0", legacyPayload.treasures.sections[0].title, ["Designado"]],
      ["treasures.1", legacyPayload.treasures.sections[1].title, ["Designado"]],
      ["treasures.2", legacyPayload.treasures.sections[2].title, ["Leitor"]]
    ]
  );
  assert.equal(structure[2].parts.length, 4);
  assert.deepEqual(structure[2].parts[0].slots, ["Publicador", "Ajudante"]);
  assert.deepEqual(structure[3].parts[0].slots, ["Designado"]);
  assert.deepEqual(structure[3].parts[1].slots, ["Dirigente", "Leitor"]);
  assert.equal(structure[0].parts.find((part) => part.partKey === "volants")?.slots?.length, 2);
  assert.equal(structure[4].parts[0].partKey, "final_prayer");
});
