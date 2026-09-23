import { z } from "zod";

export const PARTICIPATION_ROLE_KEYS = [
  "president",
  "speaker",
  "indicator",
  "attendant",
  "designated",
  "publisher",
  "assistant",
  "conductor",
  "reader"
] as const;

export type ParticipationRoleKey = (typeof PARTICIPATION_ROLE_KEYS)[number];

export const MIDWEEK_SECTION_KEYS = [
  "midweekOpening",
  "treasures",
  "ministery",
  "christianLife",
  "midweekClosing"
] as const;

export const WEEKEND_SECTION_KEYS = ["weekendOpening", "watchtower"] as const;

export type MidweekSectionKey = (typeof MIDWEEK_SECTION_KEYS)[number];
export type WeekendSectionKey = (typeof WEEKEND_SECTION_KEYS)[number];

const roleKeySchema = z.enum(PARTICIPATION_ROLE_KEYS);

const sectionPreferenceSchema = z
  .object({
    enabled: z.boolean(),
    roles: z.array(roleKeySchema).optional()
  })
  .strict();

const midweekSectionsSchema = z
  .object({
    midweekOpening: sectionPreferenceSchema.optional(),
    treasures: sectionPreferenceSchema.optional(),
    ministery: sectionPreferenceSchema.optional(),
    christianLife: sectionPreferenceSchema.optional(),
    midweekClosing: sectionPreferenceSchema.optional()
  })
  .strict();

const weekendSectionsSchema = z
  .object({
    weekendOpening: sectionPreferenceSchema.optional(),
    watchtower: sectionPreferenceSchema.optional()
  })
  .strict();

const midweekMeetingPreferenceSchema = z
  .object({
    enabled: z.boolean(),
    sections: midweekSectionsSchema.optional()
  })
  .strict();

const weekendMeetingPreferenceSchema = z
  .object({
    enabled: z.boolean(),
    sections: weekendSectionsSchema.optional()
  })
  .strict();

export const participationPreferencesSchema = z
  .object({
    midweek: midweekMeetingPreferenceSchema.optional(),
    weekend: weekendMeetingPreferenceSchema.optional()
  })
  .strict()
  .nullable();

export type ParticipationPreferences = z.infer<typeof participationPreferencesSchema>;

function uniqueRoles(roles: ParticipationRoleKey[] | undefined): ParticipationRoleKey[] | undefined {
  if (!roles || roles.length === 0) return undefined;
  return [...new Set(roles)];
}

function normalizeSectionPreference(
  section: z.infer<typeof sectionPreferenceSchema> | undefined
): z.infer<typeof sectionPreferenceSchema> | undefined {
  if (!section || !section.enabled) return undefined;
  const roles = uniqueRoles(section.roles);
  return roles ? { enabled: true, roles } : { enabled: true };
}

function normalizeMidweekMeeting(
  meeting: z.infer<typeof midweekMeetingPreferenceSchema> | undefined
): z.infer<typeof midweekMeetingPreferenceSchema> | undefined {
  if (!meeting) return undefined;
  if (!meeting.enabled) return { enabled: false };

  const sections: NonNullable<z.infer<typeof midweekMeetingPreferenceSchema>["sections"]> = {};
  for (const key of MIDWEEK_SECTION_KEYS) {
    const normalized = normalizeSectionPreference(meeting.sections?.[key]);
    if (normalized) sections[key] = normalized;
  }

  if (Object.keys(sections).length === 0) return { enabled: true };
  return { enabled: true, sections };
}

function normalizeWeekendMeeting(
  meeting: z.infer<typeof weekendMeetingPreferenceSchema> | undefined
): z.infer<typeof weekendMeetingPreferenceSchema> | undefined {
  if (!meeting) return undefined;
  if (!meeting.enabled) return { enabled: false };

  const sections: NonNullable<z.infer<typeof weekendMeetingPreferenceSchema>["sections"]> = {};
  for (const key of WEEKEND_SECTION_KEYS) {
    const normalized = normalizeSectionPreference(meeting.sections?.[key]);
    if (normalized) sections[key] = normalized;
  }

  if (Object.keys(sections).length === 0) return { enabled: true };
  return { enabled: true, sections };
}

/** Drops disabled/empty branches. Returns null when unrestricted / empty payload. */
export function normalizeParticipationPreferences(
  value: ParticipationPreferences | null | undefined
): ParticipationPreferences {
  if (value == null) return null;

  const midweek = normalizeMidweekMeeting(value.midweek);
  const weekend = normalizeWeekendMeeting(value.weekend);

  if (!midweek && !weekend) return null;
  return {
    ...(midweek ? { midweek } : {}),
    ...(weekend ? { weekend } : {})
  };
}

/** Maps free-text slot labels to preference role keys. */
export function roleKeyFromSlotLabel(label: string): ParticipationRoleKey | null {
  const normalized = label.trim().toLocaleLowerCase("pt-BR");
  if (normalized === "presidente") return "president";
  if (normalized === "orador") return "speaker";
  if (normalized.startsWith("indicador")) return "indicator";
  if (normalized.startsWith("volante")) return "attendant";
  if (normalized === "designado") return "designated";
  if (normalized === "publicador") return "publisher";
  if (normalized === "ajudante") return "assistant";
  if (normalized === "dirigente") return "conductor";
  if (normalized === "leitor") return "reader";
  return null;
}

export type PreferenceSlotTarget = {
  meetingType: "midweek" | "weekend";
  sectionKey: MidweekSectionKey | WeekendSectionKey;
  roleKey: ParticipationRoleKey;
};

/**
 * Soft allow-list match for a meeting slot.
 * null preferences = unrestricted (matches). Configured prefs must allow the meeting/section/role.
 */
export function matchesParticipationSlot(
  preferences: ParticipationPreferences | null | undefined,
  target: PreferenceSlotTarget
): boolean {
  if (preferences == null) return true;

  const meeting =
    target.meetingType === "midweek" ? preferences.midweek : preferences.weekend;
  if (!meeting || !meeting.enabled) return false;

  const sections = meeting.sections;
  if (!sections || Object.keys(sections).length === 0) return true;

  const section = sections[target.sectionKey as keyof typeof sections] as
    | { enabled: boolean; roles?: ParticipationRoleKey[] }
    | undefined;
  if (!section || !section.enabled) return false;

  const roles = section.roles;
  if (!roles || roles.length === 0) return true;
  return roles.includes(target.roleKey);
}
