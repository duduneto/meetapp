import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  normalizeParticipationPreferences,
  matchesParticipationSlot,
  participationPreferencesSchema,
  roleKeyFromSlotLabel
} from "./participationPreferences.js";

describe("participationPreferencesSchema", () => {
  it("accepts null", () => {
    assert.equal(participationPreferencesSchema.parse(null), null);
  });

  it("accepts midweek section + roles allow-list", () => {
    const parsed = participationPreferencesSchema.parse({
      midweek: {
        enabled: true,
        sections: {
          ministery: { enabled: true, roles: ["publisher", "assistant"] }
        }
      }
    });
    assert.deepEqual(parsed, {
      midweek: {
        enabled: true,
        sections: {
          ministery: { enabled: true, roles: ["publisher", "assistant"] }
        }
      }
    });
  });

  it("rejects unknown role keys", () => {
    assert.throws(() =>
      participationPreferencesSchema.parse({
        midweek: {
          enabled: true,
          sections: { treasures: { enabled: true, roles: ["unknown"] } }
        }
      })
    );
  });
});

describe("normalizeParticipationPreferences", () => {
  it("returns null for empty object", () => {
    assert.equal(normalizeParticipationPreferences({}), null);
  });

  it("keeps disabled meetings and drops disabled sections", () => {
    assert.deepEqual(
      normalizeParticipationPreferences({
        midweek: {
          enabled: true,
          sections: {
            treasures: { enabled: false },
            ministery: { enabled: true, roles: ["publisher", "publisher"] }
          }
        },
        weekend: { enabled: false }
      }),
      {
        midweek: {
          enabled: true,
          sections: {
            ministery: { enabled: true, roles: ["publisher"] }
          }
        },
        weekend: { enabled: false }
      }
    );
  });
});

describe("matchesParticipationSlot", () => {
  const ministryPublisher = {
    meetingType: "midweek" as const,
    sectionKey: "ministery" as const,
    roleKey: "publisher" as const
  };

  it("treats null as unrestricted", () => {
    assert.equal(matchesParticipationSlot(null, ministryPublisher), true);
  });

  it("rejects disabled midweek", () => {
    assert.equal(
      matchesParticipationSlot({ midweek: { enabled: false } }, ministryPublisher),
      false
    );
  });

  it("accepts enabled midweek without section allow-list", () => {
    assert.equal(
      matchesParticipationSlot({ midweek: { enabled: true } }, ministryPublisher),
      true
    );
  });

  it("requires ministery when section allow-list is present", () => {
    assert.equal(
      matchesParticipationSlot(
        {
          midweek: {
            enabled: true,
            sections: { treasures: { enabled: true } }
          }
        },
        ministryPublisher
      ),
      false
    );
  });

  it("checks role allow-list inside ministery", () => {
    assert.equal(
      matchesParticipationSlot(
        {
          midweek: {
            enabled: true,
            sections: { ministery: { enabled: true, roles: ["assistant"] } }
          }
        },
        ministryPublisher
      ),
      false
    );
    assert.equal(
      matchesParticipationSlot(
        {
          midweek: {
            enabled: true,
            sections: { ministery: { enabled: true, roles: ["publisher"] } }
          }
        },
        ministryPublisher
      ),
      true
    );
  });
});
