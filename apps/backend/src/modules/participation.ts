import { Prisma } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import {
  hashParticipationAccessCode,
  isParticipationAccessCode
} from "../auth/participationAccessCode.js";
import {
  participationTokenFromAuthorization,
  signParticipationToken,
  verifyParticipationToken
} from "../auth/participationJwt.js";
import { prisma } from "../lib/prisma.js";
import { buildPublicMeetingLink } from "../lib/publicLinks.js";

export const participationRouter = Router();

const participationResponseSchema = z.object({
  status: z.enum(["CONFIRMED", "REJECTED"])
});

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

async function participationPayload(assignment: ParticipationAssignment) {
  const slot = assignment.meetingPartSlot;
  const part = slot.meetingPart;
  const section = part.meetingSection;
  const meeting = section.meeting;
  const week = meeting.meetingWeek;
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
  const meetingType = meeting.type === "weekend" ? "weekend" : "midweek";
  const publicMeetingLink = await buildPublicMeetingLink({
    congregationId: week.congregationId,
    year: week.year,
    month: week.month,
    week: week.yearWeek,
    type: meetingType
  });

  return {
    assignment: {
      id: assignment.id,
      status: assignment.responseStatus,
      respondedAt: assignment.respondedAt,
      participant: {
        id: assignment.participant.id,
        name: assignment.participant.name
      },
      meeting: {
        type: meetingType,
        year: week.year,
        week: week.yearWeek,
        startAt: week.startAt,
        endAt: week.endAt
      },
      section: { key: section.sectionKey, title: section.title },
      part: { key: part.partKey, title: part.title },
      slot: { position: slot.position, label: slot.label },
      companions
    },
    publicMeetingLink
  };
}

function claimsFromAuthorization(authorization?: string) {
  const token = participationTokenFromAuthorization(authorization);
  return token ? verifyParticipationToken(token) : null;
}

participationRouter.post("/participation/session", async (req, res) => {
  const { code } = participationSessionSchema.parse(req.body);
  const assignment = await prisma.assignment.findFirst({
    where: {
      participationAccessCodeHash: hashParticipationAccessCode(code),
      participant: { deletedAt: null }
    },
    select: {
      id: true,
      participantId: true,
      participationTokenVersion: true
    }
  });

  if (!assignment) {
    return res.status(401).json({ message: "Link de participacao invalido ou revogado." });
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

  const assignment = await prisma.assignment.findFirst({
    where: {
      id: claims.assignmentId,
      participantId: claims.participantId,
      participationTokenVersion: claims.version,
      participant: { deletedAt: null }
    },
    include: participationAssignmentInclude
  });

  if (!assignment) {
    return res.status(409).json({ message: "A designacao nao esta mais disponivel." });
  }

  res.json(await participationPayload(assignment));
});

participationRouter.post("/participation/response", async (req, res) => {
  const claims = claimsFromAuthorization(req.header("authorization"));
  if (!claims) return res.status(401).json({ message: "Token de participacao invalido." });
  const input = participationResponseSchema.parse(req.body);

  const result = await prisma.$transaction(async (tx) => {
    const current = await tx.assignment.findFirst({
      where: {
        id: claims.assignmentId,
        participantId: claims.participantId,
        participationTokenVersion: claims.version,
        participant: { deletedAt: null }
      },
      include: participationAssignmentInclude
    });

    if (!current) return null;
    if (current.responseStatus === input.status) return current;

    const updatedCount = await tx.assignment.updateMany({
      where: {
        id: current.id,
        participantId: claims.participantId,
        participationTokenVersion: claims.version,
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

    return tx.assignment.findUniqueOrThrow({
      where: { id: current.id },
      include: participationAssignmentInclude
    });
  });

  if (!result) {
    return res.status(409).json({ message: "A designacao foi alterada ou removida." });
  }

  res.json(await participationPayload(result));
});
