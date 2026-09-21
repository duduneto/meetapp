import { Router } from "express";
import { z } from "zod";
import { requireAdmin, requireAuth, requireWrite } from "../auth/middleware.js";
import { prisma } from "../lib/prisma.js";

export const participantsRouter = Router();

const participantSchema = z.object({
  name: z.string().min(1),
  gender: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  whatsapp: z.string().nullable().optional()
});

const bulkParticipantSchema = z
  .object({
    name: z.string().trim().min(1),
    phone: z.string().trim().min(1)
  })
  .strict()
  .transform(({ name, phone }) => ({
    name: name.replace(/\s+/g, " "),
    gender: null,
    phone,
    whatsapp: phone
  }));

export const bulkParticipantsSchema = z.array(bulkParticipantSchema).min(1).max(500);

const participantAssignmentsQuerySchema = z.object({
  offset: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(100).default(25)
});

participantsRouter.get("/participants", requireAuth, async (req, res) => {
  const includeDeleted = req.query.deleted === "true";
  const participants = await prisma.participant.findMany({
    where: {
      congregationId: req.user!.congregationId,
      deletedAt: includeDeleted ? { not: null } : null
    },
    orderBy: { name: "asc" }
  });
  res.json({ participants });
});

participantsRouter.get("/participants/:id/assignments", requireAuth, async (req, res) => {
  const { offset, limit } = participantAssignmentsQuerySchema.parse(req.query);
  const participant = await prisma.participant.findFirst({
    where: { id: req.params.id, congregationId: req.user!.congregationId },
    select: { id: true, name: true, deletedAt: true }
  });
  if (!participant) return res.status(404).json({ message: "Participante nao encontrado." });

  const assignments = await prisma.assignment.findMany({
    where: {
      participantId: participant.id,
      meetingPartSlot: {
        meetingPart: {
          meetingSection: {
            meeting: { meetingWeek: { congregationId: req.user!.congregationId } }
          }
        }
      }
    },
    orderBy: [
      {
        meetingPartSlot: {
          meetingPart: {
            meetingSection: {
              meeting: { meetingWeek: { startAt: "desc" } }
            }
          }
        }
      },
      { id: "desc" }
    ],
    skip: offset,
    take: limit + 1,
    select: {
      id: true,
      meetingPartSlot: {
        select: {
          position: true,
          label: true,
          meetingPart: {
            select: {
              partKey: true,
              title: true,
              meetingSection: {
                select: {
                  sectionKey: true,
                  title: true,
                  meeting: {
                    select: {
                      type: true,
                      meetingWeek: {
                        select: {
                          year: true,
                          yearWeek: true,
                          startAt: true,
                          endAt: true
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  });

  const hasMore = assignments.length > limit;
  const page = assignments.slice(0, limit).map((assignment) => {
    const slot = assignment.meetingPartSlot;
    const part = slot.meetingPart;
    const section = part.meetingSection;
    const meeting = section.meeting;
    return {
      id: assignment.id,
      meeting: {
        type: meeting.type,
        year: meeting.meetingWeek.year,
        week: meeting.meetingWeek.yearWeek,
        startAt: meeting.meetingWeek.startAt,
        endAt: meeting.meetingWeek.endAt
      },
      section: { sectionKey: section.sectionKey, title: section.title },
      part: { partKey: part.partKey, title: part.title },
      slot: { position: slot.position, label: slot.label }
    };
  });

  res.json({
    participant,
    assignments: page,
    nextOffset: hasMore ? offset + page.length : null
  });
});

participantsRouter.post(
  "/participants/bulk",
  requireAuth,
  requireAdmin,
  async (req, res) => {
    const input = bulkParticipantsSchema.parse(req.body);
    const participants = await prisma.$transaction(
      input.map((participant) =>
        prisma.participant.create({
          data: {
            ...participant,
            congregationId: req.user!.congregationId
          }
        })
      )
    );

    res.status(201).json({
      createdCount: participants.length,
      participants
    });
  }
);

participantsRouter.post("/participants", requireAuth, requireWrite, async (req, res) => {
  const input = participantSchema.parse(req.body);
  const participant = await prisma.participant.create({
    data: { ...input, congregationId: req.user!.congregationId }
  });
  res.status(201).json({ participant });
});

participantsRouter.put("/participants/:id", requireAuth, requireWrite, async (req, res) => {
  const input = participantSchema.parse(req.body);
  const participant = await prisma.participant.update({
    where: { id: req.params.id, congregationId: req.user!.congregationId },
    data: input
  });
  res.json({ participant });
});

participantsRouter.delete("/participants/:id", requireAuth, requireWrite, async (req, res) => {
  const participant = await prisma.participant.update({
    where: { id: req.params.id, congregationId: req.user!.congregationId },
    data: { deletedAt: new Date() }
  });
  res.json({ participant });
});

participantsRouter.post("/participants/:id/restore", requireAuth, requireWrite, async (req, res) => {
  const participant = await prisma.participant.update({
    where: { id: req.params.id, congregationId: req.user!.congregationId },
    data: { deletedAt: null }
  });
  res.json({ participant });
});
