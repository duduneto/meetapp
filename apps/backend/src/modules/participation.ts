import { Prisma } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import {
  hashParticipationAccessCode,
  isParticipationAccessCode,
  participationLinkIssuedAfter
} from "../auth/participationAccessCode.js";
import {
  participationTokenFromAuthorization,
  signParticipationToken,
  type ParticipationTokenClaims,
  verifyParticipationToken
} from "../auth/participationJwt.js";
import { prisma } from "../lib/prisma.js";
import {
  buildPublicMeetingLink,
  findActiveDefaultPublicToken,
  publicAssignmentsLinkFromCode
} from "../lib/publicLinks.js";
import {
  findParticipantAssignmentHistory,
  participantAssignmentHistoryQuerySchema
} from "./participantAssignmentHistory.js";

export const participationRouter = Router();

const participationResponseSchema = z
  .object({
    assignmentId: z.string().min(1),
    status: z.enum(["CONFIRMED", "REJECTED"])
  })
  .strict();

const participationSessionSchema = z
  .object({
    code: z.string().trim().refine(isParticipationAccessCode, {
      message: "Codigo de participacao invalido."
    })
  })
  .strict();

const participationAssignmentInclude = Prisma.validator<Prisma.AssignmentInclude>()({
  participant: { select: { id: true, name: true, deletedAt: true } },
  meetingPartSlot: {
    include: {
      meetingPart: {
        include: {
          slots: {
            orderBy: { position: "asc" },
            include: {
              assignment: {
                include: {
                  participant: { select: { id: true, name: true, deletedAt: true } }
                }
              }
            }
          },
          meetingSection: {
            include: { meeting: { include: { meetingWeek: true } } }
          }
        }
      }
    }
  }
});

type ParticipationAssignment = Prisma.AssignmentGetPayload<{
  include: typeof participationAssignmentInclude;
}>;

function meetingIdFromAssignment(assignment: ParticipationAssignment) {
  return assignment.meetingPartSlot.meetingPart.meetingSection.meeting.id;
}

function assignmentPayload(assignment: ParticipationAssignment) {
  const slot = assignment.meetingPartSlot;
  const part = slot.meetingPart;
  const section = part.meetingSection;
  const companions = part.slots
    .filter((partSlot) => partSlot.id !== slot.id)
    .map((partSlot) => ({
      position: partSlot.position,
      label: partSlot.label,
      participant: partSlot.assignment?.participant
        ? {
            id: partSlot.assignment.participant.id,
            name: partSlot.assignment.participant.name
          }
        : null
    }));

  return {
    id: assignment.id,
    status: assignment.responseStatus,
    respondedAt: assignment.respondedAt,
    section: {
      key: section.sectionKey,
      title: section.title,
      order: section.order
    },
    part: {
      key: part.partKey,
      title: part.title,
      order: part.order
    },
    slot: { position: slot.position, label: slot.label },
    companions
  };
}

async function participationPayload(anchor: ParticipationAssignment) {
  const anchorMeeting = anchor.meetingPartSlot.meetingPart.meetingSection.meeting;
  const week = anchorMeeting.meetingWeek;
  const meetingType = anchorMeeting.type === "weekend" ? "weekend" : "midweek";
  const assignments = await prisma.assignment.findMany({
    where: {
      participantId: anchor.participantId,
      participant: { deletedAt: null },
      meetingPartSlot: {
        meetingPart: {
          meetingSection: { meetingId: anchorMeeting.id }
        }
      }
    },
    include: participationAssignmentInclude
  });
  assignments.sort((left, right) => {
    const leftPart = left.meetingPartSlot.meetingPart;
    const rightPart = right.meetingPartSlot.meetingPart;
    return (
      leftPart.meetingSection.order - rightPart.meetingSection.order ||
      leftPart.order - rightPart.order ||
      left.meetingPartSlot.position - right.meetingPartSlot.position
    );
  });

  const publicMeetingLink = await buildPublicMeetingLink({
    congregationId: week.congregationId,
    year: week.year,
    month: week.month,
    week: week.yearWeek,
    type: meetingType
  });

  return {
    participant: {
      id: anchor.participant.id,
      name: anchor.participant.name
    },
    meeting: {
      type: meetingType,
      year: week.year,
      week: week.yearWeek,
      startAt: week.startAt,
      endAt: week.endAt
    },
    assignments: assignments.map(assignmentPayload),
    publicMeetingLink
  };
}

function claimsFromAuthorization(authorization?: string) {
  const token = participationTokenFromAuthorization(authorization);
  return token ? verifyParticipationToken(token) : null;
}

function anchorWhere(claims: ParticipationTokenClaims) {
  return {
    id: claims.assignmentId,
    participantId: claims.participantId,
    participationTokenVersion: claims.version,
    participationTokenIssuedAt: { gt: participationLinkIssuedAfter() },
    participant: { deletedAt: null }
  };
}

participationRouter.post("/participation/session", async (req, res) => {
  const { code } = participationSessionSchema.parse(req.body);
  const assignment = await prisma.assignment.findFirst({
    where: {
      participationAccessCodeHash: hashParticipationAccessCode(code),
      participationTokenIssuedAt: { gt: participationLinkIssuedAfter() },
      participant: { deletedAt: null }
    },
    select: {
      id: true,
      participantId: true,
      participationTokenVersion: true
    }
  });

  if (!assignment) {
    return res.status(401).json({
      message: "Link de participacao invalido, expirado ou revogado."
    });
  }

  const accessToken = signParticipationToken({
    assignmentId: assignment.id,
    participantId: assignment.participantId,
    version: assignment.participationTokenVersion
  });

  res.json({ accessToken, expiresIn: 3600 });
});

participationRouter.get("/participation", async (req, res) => {
  const claims = claimsFromAuthorization(req.header("authorization"));
  if (!claims) return res.status(401).json({ message: "Token de participacao invalido." });

  const anchor = await prisma.assignment.findFirst({
    where: anchorWhere(claims),
    include: participationAssignmentInclude
  });

  if (!anchor) {
    return res.status(409).json({ message: "A designacao nao esta mais disponivel." });
  }

  res.json(await participationPayload(anchor));
});

participationRouter.get("/participation/assignments", async (req, res) => {
  const claims = claimsFromAuthorization(req.header("authorization"));
  if (!claims) return res.status(401).json({ message: "Token de participacao invalido." });
  const query = participantAssignmentHistoryQuerySchema.parse(req.query);

  const anchor = await prisma.assignment.findFirst({
    where: anchorWhere(claims),
    include: participationAssignmentInclude
  });
  if (!anchor) {
    return res.status(409).json({ message: "A designacao nao esta mais disponivel." });
  }

  const anchorMeeting = anchor.meetingPartSlot.meetingPart.meetingSection.meeting;
  const congregationId = anchorMeeting.meetingWeek.congregationId;
  const assignments = await findParticipantAssignmentHistory({
    participantId: anchor.participantId,
    congregationId,
    period: query.period,
    limit: query.limit,
    excludeMeetingId: anchorMeeting.id
  });
  const publicToken = await findActiveDefaultPublicToken(congregationId);

  res.json({
    participant: { id: anchor.participant.id, name: anchor.participant.name },
    period: query.period,
    assignments: assignments.map(({ meetingId: _meetingId, ...assignment }) => ({
      ...assignment,
      publicMeetingLink: publicToken?.accessCode
        ? publicAssignmentsLinkFromCode(publicToken.accessCode, assignment.meeting).toString()
        : null
    }))
  });
});

participationRouter.post("/participation/response", async (req, res) => {
  const claims = claimsFromAuthorization(req.header("authorization"));
  if (!claims) return res.status(401).json({ message: "Token de participacao invalido." });
  const input = participationResponseSchema.parse(req.body);

  const anchorId = await prisma.$transaction(async (tx) => {
    const anchor = await tx.assignment.findFirst({
      where: anchorWhere(claims),
      include: participationAssignmentInclude
    });
    if (!anchor) return null;

    const meetingId = meetingIdFromAssignment(anchor);
    const current = await tx.assignment.findFirst({
      where: {
        id: input.assignmentId,
        participantId: claims.participantId,
        participant: { deletedAt: null },
        meetingPartSlot: {
          meetingPart: {
            meetingSection: { meetingId }
          }
        }
      },
      include: participationAssignmentInclude
    });
    if (!current) return null;
    if (current.responseStatus === input.status) return anchor.id;

    const updatedCount = await tx.assignment.updateMany({
      where: {
        id: current.id,
        participantId: claims.participantId,
        responseStatus: current.responseStatus,
        participant: { deletedAt: null }
      },
      data: { responseStatus: input.status, respondedAt: new Date() }
    });
    if (updatedCount.count !== 1) return null;

    const part = current.meetingPartSlot.meetingPart;
    const section = part.meetingSection;
    const meeting = section.meeting;
    await tx.auditLog.create({
      data: {
        congregationId: meeting.meetingWeek.congregationId,
        meetingId: meeting.id,
        changedByParticipantId: current.participantId,
        actorType: "PARTICIPANT",
        action:
          input.status === "CONFIRMED"
            ? "PARTICIPATION_CONFIRMED"
            : "PARTICIPATION_REJECTED",
        entityType: "Assignment",
        entityId: current.id,
        field: "responseStatus",
        previousValue: current.responseStatus,
        newValue: input.status,
        context: {
          participantName: current.participant.name,
          sectionTitle: section.title,
          partTitle: part.title,
          slotLabel: current.meetingPartSlot.label
        }
      }
    });

    return anchor.id;
  });

  if (!anchorId) {
    return res.status(409).json({ message: "A designacao foi alterada ou removida." });
  }

  const anchor = await prisma.assignment.findFirst({
    where: anchorWhere(claims),
    include: participationAssignmentInclude
  });
  if (!anchor) {
    return res.status(409).json({ message: "O link de participacao nao esta mais disponivel." });
  }

  res.json(await participationPayload(anchor));
});
