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

test("accepts optional gender and a distinct WhatsApp number", () => {
  const result = bulkParticipantsSchema.parse([
    {
      name: "Adriana Oliveira",
      phone: "5585987210607",
      whatsapp: "5585999999999",
      gender: "Feminino"
    },
    {
      name: "Airton Lima",
      phone: "5585999607053",
      gender: null
    }
  ]);

  assert.deepEqual(result, [
    {
      name: "Adriana Oliveira",
      gender: "Feminino",
      phone: "5585987210607",
      whatsapp: "5585999999999"
    },
    {
      name: "Airton Lima",
      gender: null,
      phone: "5585999607053",
      whatsapp: "5585999607053"
    }
  ]);
});

test("rejects unsupported bulk participant fields", () => {
  assert.throws(() =>
    bulkParticipantsSchema.parse([
      { name: "Ana Lobo", phone: "5585999281986", email: "ana@example.com" }
    ])
  );
});

test("rejects unsupported bulk participant genders", () => {
  assert.throws(() =>
    bulkParticipantsSchema.parse([
      { name: "Ana Lobo", phone: "5585999281986", gender: "female" }
    ])
  );
});
