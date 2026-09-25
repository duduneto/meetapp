export type Session = {
  user: { id: string; email: string; name: string; role: string; congregationId: string };
  permissions: {
    canWriteAssignments: boolean;
    canManageParticipants: boolean;
    canManageUsers: boolean;
    canManageSettings: boolean;
  };
};

export type ParticipationRoleKey =
  | "president"
  | "speaker"
  | "indicator"
  | "attendant"
  | "designated"
  | "publisher"
  | "assistant"
  | "conductor"
  | "reader";

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

export type Participant = {
  id: string;
  name: string;
  gender?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  congregationId?: string;
  congregation?: { id: string; name: string } | null;
  preferences?: ParticipationPreferences;
  deletedAt?: string | null;
};

export type PublicSpeakTheme = {
  id: string;
  number: number;
  title: string;
  fullTitle: string;
  sanitizedFullTitle: string;
  documentId?: string | null;
  path?: string | null;
  deletedAt?: string | null;
};

export type PublicSpeaker = {
  id: string;
  name: string;
  sanitizedName: string;
  congregationId: string;
  hostCongregationId: string;
  phone: string;
  whatsapp: string;
  deletedAt?: string | null;
  congregation?: { id: string; name: string; deletedAt?: string | null } | null;
};

export type CongregationListItem = {
  id: string;
  name: string;
  sanitizedName: string;
  deletedAt?: string | null;
};

export type ParticipantAssignment = {
  id: string;
  meeting: {
    type: "midweek" | "weekend";
    year: number;
    week: number;
    startAt: string;
    endAt: string;
  };
  section: {
    sectionKey: string;
    title: string;
  };
  part: {
    partKey: string;
    title: string;
  };
  slot: {
    position: number;
    label: string;
  };
};

export type ParticipantAssignmentsPage = {
  participant: Pick<Participant, "id" | "name" | "deletedAt">;
  assignments: ParticipantAssignment[];
  nextOffset: number | null;
};

export type AssignmentSuggestionRole = "publisher" | "assistant";
export type AssignmentResponseStatus = "PENDING" | "CONFIRMED" | "REJECTED";
export type ParticipationNotificationStatus = "PENDING" | "SENT" | "FAILED";

export type ParticipantSuggestion = {
  participantId: string;
  participantName: string;
  lastAssignment: {
    startAt: string;
    endAt: string;
    title: string;
  } | null;
};

export type ParticipantSuggestionsPage = {
  role: AssignmentSuggestionRole;
  suggestions: ParticipantSuggestion[];
  nextOffset: number | null;
};

export type ParticipationPayload = {
  participant: { id: string; name: string };
  meeting: {
    type: "midweek" | "weekend";
    year: number;
    week: number;
    startAt: string;
    endAt: string;
  };
  assignments: Array<{
    id: string;
    status: AssignmentResponseStatus;
    respondedAt: string | null;
    section: { key: string; title: string; order: number };
    part: { key: string; title: string; order: number };
    slot: { position: number; label: string };
    companions: Array<{
      position: number;
      label: string;
      participant: { id: string; name: string } | null;
    }>;
  }>;
  publicMeetingLink: string | null;
};

export type PublicParticipant = {
  id: string;
  name: string;
};

export type ParticipantAssignmentSummary = {
  id: string;
  status: AssignmentResponseStatus;
  meeting: {
    type: "midweek" | "weekend";
    year: number;
    month: number;
    week: number;
    startAt: string;
    endAt: string;
  };
  section: { key: string; title: string };
  part: { key: string; title: string };
  slot: { position: number; label: string };
  publicMeetingLink?: string | null;
};

export type ParticipantAssignmentHistory = {
  participant: PublicParticipant;
  period: "upcoming" | "past";
  assignments: ParticipantAssignmentSummary[];
};

export type MeetingActivity = {
  id: string;
  action: string;
  changedAt: string;
  entityType: string;
  entityId: string;
  field: string;
  previousValue: string | null;
  newValue: string | null;
  context: Record<string, unknown> | null;
  actor: { type: string; id: string | null; name: string };
};

export type MeetingActivityPage = {
  activity: MeetingActivity[];
  nextOffset: number | null;
};

export type AssignmentPayload = {
  meeting: {
    id: string;
    type: "midweek" | "weekend";
    year: number;
    week: number;
    startAt: string;
    endAt: string;
    bibleReading?: string | null;
    initialSong?: string | null;
  };
  table: {
    songs?: {
      initial: string;
      transitional: string;
      last: string;
    };
    sections: Array<{
      id: string;
      sectionKey: string;
      title: string;
      parts: Array<{
        id: string;
        partKey: string;
        title: string;
        assignable: boolean;
        slots: Array<{
          id: string;
          position: number;
          label: string;
          assignmentId: string | null;
          responseStatus: AssignmentResponseStatus | null;
          respondedAt: string | null;
          participationNotificationStatus: ParticipationNotificationStatus | null;
          participationNotificationSentAt: string | null;
          participant: {
            id: string;
            name: string;
            deletedAt?: string | null;
            hasWhatsapp: boolean;
            congregationId?: string;
            congregation?: { id: string; name: string } | null;
          } | null;
          publicSpeaker: {
            id: string;
            name: string;
            phone: string;
            congregation: { id: string; name: string } | null;
          } | null;
          publicSpeakTheme: {
            id: string;
            number: number;
            title: string;
            fullTitle: string;
          } | null;
        }>;
      }>;
    }>;
  };
  canWrite: boolean;
  canSharePublicLink?: boolean;
};

export type PublicAccessTokenStatus = "ACTIVE" | "EXPIRED" | "REVOKED";

export type PublicAccessToken = {
  id: string;
  name: string;
  expiresAt: string;
  revokedAt: string | null;
  isDefault: boolean;
  createdAt: string;
  status: PublicAccessTokenStatus;
  createdByUser: { id: string; name: string } | null;
};
