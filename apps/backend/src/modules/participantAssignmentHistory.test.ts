import assert from "node:assert/strict";
import test from "node:test";
import {
  participantAssignmentHistoryQuerySchema,
  publicParticipantSearchQuerySchema
} from "./participantAssignmentHistory.js";

test("defaults participant assignment history to upcoming assignments", () => {
  assert.deepEqual(participantAssignmentHistoryQuerySchema.parse({}), {
    period: "upcoming",
    limit: 50
  });
});

test("accepts the past assignment filter and a bounded limit", () => {
  assert.deepEqual(
    participantAssignmentHistoryQuerySchema.parse({ period: "past", limit: "25" }),
    { period: "past", limit: 25 }
  );
  assert.throws(() => participantAssignmentHistoryQuerySchema.parse({ limit: 101 }));
});

test("normalizes the public participant search", () => {
  assert.deepEqual(publicParticipantSearchQuerySchema.parse({ search: "  Maria  " }), {
    search: "Maria",
    limit: 20
  });
});
