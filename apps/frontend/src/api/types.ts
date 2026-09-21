export type Session = {
  user: { id: string; email: string; name: string; role: string; congregationId: string };
  permissions: {
    canWriteAssignments: boolean;
    canManageParticipants: boolean;
    canManageUsers: boolean;
    canManageSettings: boolean;
  };
};

export type Participant = {
  id: string;
  name: string;
  gender?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
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
  assignment: {
    id: string;
    status: AssignmentResponseStatus;
    respondedAt: string | null;
    participant: { id: string; name: string };
    meeting: {
      type: "midweek" | "weekend";
      year: number;
      week: number;
      startAt: string;
      endAt: string;
    };
    section: { key: string; title: string };
    part: { key: string; title: string };
    slot: { position: number; label: string };
    companions: Array<{
      position: number;
      label: string;
      participant: { id: string; name: string } | null;
    }>;
  };
  publicMeetingLink: string | null;
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
    publicTalkTheme?: string | null;
    publicSpeakerName?: string | null;
    publicSpeakerCongregation?: string | null;
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
