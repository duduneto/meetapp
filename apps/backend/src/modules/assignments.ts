import { Router } from "express";
import { z } from "zod";
import { permissionsFor, requireAuth, requireWrite } from "../auth/middleware.js";
import { prisma } from "../lib/prisma.js";

export const assignmentsRouter = Router();

function songsFromRawPayload(rawSourcePayload: unknown) {
  if (!rawSourcePayload || typeof rawSourcePayload !== "object" || Array.isArray(rawSourcePayload)) return undefined;
  const songs = (rawSourcePayload as Record<string, unknown>).songs;
  if (!songs || typeof songs !== "object" || Array.isArray(songs)) return undefined;
  const values = songs as Record<string, unknown>;
  if (typeof values.initial !== "string" || typeof values.transitional !== "string" || typeof values.last !== "string") {
    return undefined;
  }
  return { initial: values.initial, transitional: values.transitional, last: values.last };
}

export async function buildAssignmentPayload(
  congregationId: string,
  year: number,
  week: number,
  type: string,
  canWrite: boolean
) {
  const meetingWeek = await prisma.meetingWeek.findFirst({
    where: { congregationId, year, yearWeek: week },
    include: {
      meetings: {
        where: { type },
        include: {
          sections: {
            orderBy: { order: "asc" },
            include: {
              parts: {
                orderBy: { order: "asc" },
                include: {
                  slots: {
                    orderBy: { position: "asc" },
                    include: { assignment: { include: { participant: true } } }
                  }
                }
              }
            }
          }
        }
      }
    }
  });

  const meeting = meetingWeek?.meetings[0];
  if (!meetingWeek || !meeting) return null;
  const songs = type === "midweek" ? songsFromRawPayload(meetingWeek.rawSourcePayload) : undefined;

  return {
    meeting: {
      id: meeting.id,
      type: meeting.type,
      year: meetingWeek.year,
      week: meetingWeek.yearWeek,
      startAt: meetingWeek.startAt,
      endAt: meetingWeek.endAt,
      bibleReading: meetingWeek.bibleReading,
      publicTalkTheme: meeting.publicTalkTheme,
      publicSpeakerName: meeting.publicSpeakerName,
      publicSpeakerCongregation: meeting.publicSpeakerCongregation
    },
    table: {
      ...(songs ? { songs } : {}),
      sections: meeting.sections.map((section) => ({
        id: section.id,
        sectionKey: section.sectionKey,
        title: section.title,
        parts: section.parts.map((part) => ({
          id: part.id,
          partKey: part.partKey,
          title: part.title,
          assignable: part.assignable,
          slots: part.slots.map((slot) => ({
            id: slot.id,
            position: slot.position,
            label: slot.label,
            participant: slot.assignment?.participant
              ? {
                  id: slot.assignment.participant.id,
                  name: slot.assignment.participant.name,
                  deletedAt: slot.assignment.participant.deletedAt
                }
              : null
          }))
        }))
      }))
    },
    canWrite
  };
}

assignmentsRouter.get("/assignment-months", requireAuth, async (req, res) => {
  const weeks = await prisma.meetingWeek.findMany({
    where: { congregationId: req.user!.congregationId },
    orderBy: { startAt: "asc" },
    select: { year: true, month: true, startAt: true, _count: { select: { meetings: true } } }
  });
  const map = new Map<string, { year: number; month: number; weekCount: number; startAt: Date }>();
  for (const week of weeks) {
    const key = `${week.year}-${week.month}`;
    const current = map.get(key);
    map.set(key, {
      year: week.year,
      month: week.month,
      weekCount: (current?.weekCount ?? 0) + 1,
      startAt: current?.startAt ?? week.startAt
    });
  }
  res.json({ months: [...map.values()] });
});

assignmentsRouter.get("/assignment-months/:year/:month/weeks", requireAuth, async (req, res) => {
  const year = Number(req.params.year);
  const month = Number(req.params.month);
  const weeks = await prisma.meetingWeek.findMany({
    where: { congregationId: req.user!.congregationId, year, month },
    orderBy: { startAt: "asc" },
    include: { meetings: { select: { type: true } } }
  });
  res.json({
    weeks: weeks.map((week) => ({
      year: week.year,
      yearWeek: week.yearWeek,
      startAt: week.startAt,
      endAt: week.endAt,
      hasMidweek: week.meetings.some((meeting) => meeting.type === "midweek"),
      hasWeekend: week.meetings.some((meeting) => meeting.type === "weekend")
    }))
  });
});

assignmentsRouter.get("/assignments/:year/:week/:type", requireAuth, async (req, res) => {
  const payload = await buildAssignmentPayload(
    req.user!.congregationId,
    Number(req.params.year),
    Number(req.params.week),
    req.params.type,
    permissionsFor(req.user!.role).canWriteAssignments
  );
  if (!payload) return res.status(404).json({ message: "Reuniao nao encontrada." });
  res.json(payload);
});

const saveAssignmentsSchema = z.object({
  assignments: z
    .array(
      z.object({
        partKey: z.string(),
        position: z.number(),
        participantId: z.string().nullable().optional()
      })
    )
    .default([]),
  weekendFields: z
    .object({
      publicTalkTheme: z.string().nullable().optional(),
      publicSpeakerName: z.string().nullable().optional(),
      publicSpeakerCongregation: z.string().nullable().optional()
    })
    .optional()
});

assignmentsRouter.put("/assignments/:year/:week/:type", requireAuth, requireWrite, async (req, res) => {
  const input = saveAssignmentsSchema.parse(req.body);
  const year = Number(req.params.year);
  const week = Number(req.params.week);
  const type = req.params.type;
  await prisma.$transaction(async (tx) => {
    const meetingWeek = await tx.meetingWeek.findFirstOrThrow({
      where: { congregationId: req.user!.congregationId, year, yearWeek: week },
      include: {
        meetings: {
          where: { type },
          include: {
            sections: { include: { parts: { include: { slots: { include: { assignment: true } } } } } }
          }
        }
      }
    });
    const meeting = meetingWeek.meetings[0];
    if (!meeting) throw new Error("Reuniao nao encontrada.");

    if (type === "weekend" && input.weekendFields) {
      for (const field of ["publicTalkTheme", "publicSpeakerName", "publicSpeakerCongregation"] as const) {
        if (field in input.weekendFields) {
          const previousValue = meeting[field] ?? null;
          const newValue = input.weekendFields[field] ?? null;
          if (previousValue !== newValue) {
            await tx.meeting.update({ where: { id: meeting.id }, data: { [field]: newValue } });
            await tx.auditLog.create({
              data: {
                congregationId: req.user!.congregationId,
                changedByUserId: req.user!.id,
                entityType: "Meeting",
                entityId: meeting.id,
                field,
                previousValue,
                newValue
              }
            });
          }
        }
      }
    }

    const slots = new Map(
      meeting.sections.flatMap((section) =>
        section.parts.flatMap((part) =>
          part.slots.map((slot) => [`${part.partKey}:${slot.position}`, { part, slot }] as const)
        )
      )
    );

    for (const change of input.assignments) {
      const found = slots.get(`${change.partKey}:${change.position}`);
      if (!found) continue;
      const currentParticipantId = found.slot.assignment?.participantId ?? null;
      const nextParticipantId = change.participantId ?? null;
      if (currentParticipantId === nextParticipantId) continue;

      if (nextParticipantId) {
        const participant = await tx.participant.findFirst({
          where: { id: nextParticipantId, congregationId: req.user!.congregationId, deletedAt: null }
        });
        if (!participant) throw new Error("Participante invalido.");
        await tx.assignment.upsert({
          where: { meetingPartSlotId: found.slot.id },
          update: { participantId: nextParticipantId },
          create: { meetingPartSlotId: found.slot.id, participantId: nextParticipantId }
        });
      } else if (found.slot.assignment) {
        await tx.assignment.delete({ where: { meetingPartSlotId: found.slot.id } });
      }

      await tx.auditLog.create({
        data: {
          congregationId: req.user!.congregationId,
          changedByUserId: req.user!.id,
          entityType: "Assignment",
          entityId: found.slot.id,
          field: `${change.partKey}.${change.position}`,
          previousValue: currentParticipantId,
          newValue: nextParticipantId
        }
      });
    }
  });

  const payload = await buildAssignmentPayload(req.user!.congregationId, year, week, type, true);
  res.json(payload);
});
