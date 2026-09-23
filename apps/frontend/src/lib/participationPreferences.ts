export const PARTICIPATION_ROLE_KEYS = [
  "president",
  "speaker",
  "indicator",
  "attendant",
  "designated",
  "publisher",
  "assistant",
  "conductor",
  "reader",
] as const;

export type ParticipationRoleKey = (typeof PARTICIPATION_ROLE_KEYS)[number];

export type ParticipationSectionPreference = {
  enabled: boolean;
  roles?: ParticipationRoleKey[];
};

export type ParticipationMeetingPreference = {
  enabled: boolean;
  sections?: Partial<Record<string, ParticipationSectionPreference>>;
};

export type ParticipationPreferences = {
  midweek?: ParticipationMeetingPreference;
  weekend?: ParticipationMeetingPreference;
} | null;

export const ROLE_LABELS: Record<ParticipationRoleKey, string> = {
  president: "Presidente",
  speaker: "Orador",
  indicator: "Indicador",
  attendant: "Volante",
  designated: "Designado",
  publisher: "Publicador",
  assistant: "Ajudante",
  conductor: "Dirigente",
  reader: "Leitor",
};

export type PreferenceSectionDefinition = {
  key: string;
  title: string;
  roles: ParticipationRoleKey[];
};

export const MIDWEEK_PREFERENCE_SECTIONS: PreferenceSectionDefinition[] = [
  {
    key: "midweekOpening",
    title: "Abertura",
    roles: ["president", "speaker", "indicator", "attendant"],
  },
  {
    key: "treasures",
    title: "Tesouros da Palavra de Deus",
    roles: ["designated", "reader"],
  },
  {
    key: "ministery",
    title: "Faça Seu Melhor no Ministério",
    roles: ["publisher", "assistant"],
  },
  {
    key: "christianLife",
    title: "Nossa Vida Cristã",
    roles: ["designated", "conductor", "reader"],
  },
  {
    key: "midweekClosing",
    title: "Encerramento",
    roles: ["speaker"],
  },
];

export const WEEKEND_PREFERENCE_SECTIONS: PreferenceSectionDefinition[] = [
  {
    key: "weekendOpening",
    title: "Abertura",
    roles: ["president", "speaker"],
  },
  {
    key: "watchtower",
    title: "Estudo de A Sentinela",
    roles: ["conductor", "reader", "speaker"],
  },
];

export type MeetingPreferenceFormState = {
  enabled: boolean;
  sections: Record<string, { enabled: boolean; roles: ParticipationRoleKey[] }>;
};

export type PreferencesFormState = {
  configure: boolean;
  midweek: MeetingPreferenceFormState;
  weekend: MeetingPreferenceFormState;
};

function emptySections(
  definitions: PreferenceSectionDefinition[],
): MeetingPreferenceFormState["sections"] {
  return Object.fromEntries(
    definitions.map((section) => [section.key, { enabled: false, roles: [] as ParticipationRoleKey[] }]),
  );
}

export function emptyPreferencesFormState(): PreferencesFormState {
  return {
    configure: false,
    midweek: { enabled: false, sections: emptySections(MIDWEEK_PREFERENCE_SECTIONS) },
    weekend: { enabled: false, sections: emptySections(WEEKEND_PREFERENCE_SECTIONS) },
  };
}

function meetingFromStored(
  stored: ParticipationMeetingPreference | undefined,
  definitions: PreferenceSectionDefinition[],
): MeetingPreferenceFormState {
  const sections = emptySections(definitions);
  if (!stored) return { enabled: false, sections };
  if (!stored.enabled) return { enabled: false, sections };

  const storedSections = stored.sections ?? {};
  const hasSectionAllowList = Object.keys(storedSections).length > 0;

  for (const definition of definitions) {
    const section = storedSections[definition.key];
    if (!hasSectionAllowList) {
      sections[definition.key] = { enabled: true, roles: [...definition.roles] };
      continue;
    }
    if (!section?.enabled) continue;
    sections[definition.key] = {
      enabled: true,
      roles:
        section.roles && section.roles.length > 0
          ? section.roles.filter((role): role is ParticipationRoleKey =>
              definition.roles.includes(role),
            )
          : [...definition.roles],
    };
  }

  return { enabled: true, sections };
}

export function preferencesFormFromStored(
  preferences: ParticipationPreferences | null | undefined,
): PreferencesFormState {
  if (!preferences) return emptyPreferencesFormState();
  return {
    configure: true,
    midweek: meetingFromStored(preferences.midweek, MIDWEEK_PREFERENCE_SECTIONS),
    weekend: meetingFromStored(preferences.weekend, WEEKEND_PREFERENCE_SECTIONS),
  };
}

function meetingToStored(
  meeting: MeetingPreferenceFormState,
  definitions: PreferenceSectionDefinition[],
): ParticipationMeetingPreference | undefined {
  if (!meeting.enabled) return { enabled: false };

  const sections: Record<string, ParticipationSectionPreference> = {};
  for (const definition of definitions) {
    const section = meeting.sections[definition.key];
    if (!section?.enabled) continue;
    const roles = section.roles.filter((role) => definition.roles.includes(role));
    const allRolesSelected = definition.roles.every((role) => roles.includes(role));
    sections[definition.key] =
      roles.length === 0 || allRolesSelected
        ? { enabled: true }
        : { enabled: true, roles };
  }

  if (Object.keys(sections).length === 0) return { enabled: true };
  return { enabled: true, sections };
}

export function preferencesToPayload(
  form: PreferencesFormState,
): ParticipationPreferences {
  if (!form.configure) return null;
  return {
    midweek: meetingToStored(form.midweek, MIDWEEK_PREFERENCE_SECTIONS),
    weekend: meetingToStored(form.weekend, WEEKEND_PREFERENCE_SECTIONS),
  };
}
