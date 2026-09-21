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
          participant: { id: string; name: string; deletedAt?: string | null } | null;
        }>;
      }>;
    }>;
  };
  canWrite: boolean;
};
