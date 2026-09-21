import assert from "node:assert/strict";
import test from "node:test";
import { bulkParticipantsSchema } from "./participants.js";

test("normalizes a bulk participant and copies phone to WhatsApp", () => {
  const result = bulkParticipantsSchema.parse([
    { name: "  Alexandre  Oliveira  ", phone: "5585987210607" }
  ]);

  assert.deepEqual(result, [
    {
      name: "Alexandre Oliveira",
      gender: null,
      phone: "5585987210607",
      whatsapp: "5585987210607"
    }
  ]);
});

test("rejects unsupported bulk participant fields", () => {
  assert.throws(() =>
    bulkParticipantsSchema.parse([
      { name: "Ana Lobo", phone: "5585999281986", gender: "female" }
    ])
  );
});
