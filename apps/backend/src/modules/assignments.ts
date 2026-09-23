import { Prisma } from "@prisma/client";
import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { permissionsFor, requireAdmin, requireAuth, requireWrite } from "../auth/middleware.js";
import {
  generateParticipationAccessCode,
  hashParticipationAccessCode
} from "../auth/participationAccessCode.js";
import { participationLinkFromCode } from "../lib/participationLinks.js";
import {
  findActiveDefaultPublicToken,
  publicAssignmentsLinkFromCode
} from "../lib/publicLinks.js";
import { prisma } from "../lib/prisma.js";

export const assignmentsRouter = Router();

const participantSuggestionsQuerySchema = z.object({
  role: z.enum(["publisher", "assistant"]).default("publisher"),
  offset: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(50).default(20)
});

const activityQuerySchema = z.object({
  offset: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(100).default(25)
});

type ParticipantSuggestionRole = z.infer<typeof participantSuggestionsQuerySchema>["role"];

type ParticipantSuggestionRow = {
  participantId: string;
  participantName: string;
  lastStartAt: Date | null;
  lastEndAt: Date | null;
  lastTitle: string | null;
};

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
  canWrite: boolean,
  canSharePublicLink = false
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
                    include: {
                      assignment: {
                        include: {
                          participant: true,
                          participationNotifications: {
                            orderBy: { createdAt: "desc" },
                            take: 1
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
      initialSong: meeting.initialSong,
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
          slots: part.slots.map((slot) => {
            const latestNotification = slot.assignment?.participationNotifications[0];
            const currentNotification =
              latestNotification?.tokenVersion === slot.assignment?.participationTokenVersion
                ? latestNotification
                : null;
            return {
              id: slot.id,
              position: slot.position,
              label: slot.label,
              assignmentId: slot.assignment?.id ?? null,
              responseStatus: slot.assignment?.responseStatus ?? null,
              respondedAt: slot.assignment?.respondedAt ?? null,
              participationNotificationStatus: currentNotification?.status ?? null,
              participationNotificationSentAt: currentNotification?.sentAt ?? null,
              participant: slot.assignment?.participant
                ? {
                    id: slot.assignment.participant.id,
                    name: slot.assignment.participant.name,
                    deletedAt: slot.assignment.participant.deletedAt,
                    hasWhatsapp: Boolean(slot.assignment.participant.whatsapp?.trim())
                  }
                : null
            };
          })
        }))
      }))
    },
    canWrite,
    canSharePublicLink
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

async function sendParticipantSuggestions(
  req: Request,
  res: Response,
  fixedRole?: ParticipantSuggestionRole
) {
  const query = participantSuggestionsQuerySchema.parse(req.query);
  const role = fixedRole ?? query.role;
  const { offset, limit } = query;
  const year = Number(req.params.year);
  const week = Number(req.params.week);
  const congregationId = req.user!.congregationId;
  const slotLabel = role === "publisher" ? "publicador" : "ajudante";

  const targetWeek = await prisma.meetingWeek.findFirst({
    where: {
      congregationId,
      year,
      yearWeek: week,
      meetings: { some: { type: "midweek" } }
    },
    select: { startAt: true }
  });

  if (!targetWeek) {
    return res.status(404).json({ message: "Reuniao de meio de semana nao encontrada." });
  }

  const rows = await prisma.$queryRaw<ParticipantSuggestionRow[]>(Prisma.sql`
    SELECT
      participant."id" AS "participantId",
      participant."name" AS "participantName",
      last_assignment."startAt" AS "lastStartAt",
      last_assignment."endAt" AS "lastEndAt",
      last_assignment."title" AS "lastTitle"
    FROM "Participant" AS participant
    LEFT JOIN LATERAL (
      SELECT
        meeting_week."startAt" AS "startAt",
        meeting_week."endAt" AS "endAt",
        meeting_part."title" AS "title"
      FROM "Assignment" AS assignment
      INNER JOIN "MeetingPartSlot" AS meeting_part_slot
        ON meeting_part_slot."id" = assignment."meetingPartSlotId"
      INNER JOIN "MeetingPart" AS meeting_part
        ON meeting_part."id" = meeting_part_slot."meetingPartId"
      INNER JOIN "MeetingSection" AS meeting_section
        ON meeting_section."id" = meeting_part."meetingSectionId"
      INNER JOIN "Meeting" AS meeting
        ON meeting."id" = meeting_section."meetingId"
      INNER JOIN "MeetingWeek" AS meeting_week
        ON meeting_week."id" = meeting."meetingWeekId"
      WHERE assignment."participantId" = participant."id"
        AND meeting."type" = 'midweek'
        AND meeting_section."sectionKey" = 'ministery'
        AND LOWER(meeting_part_slot."label") = ${slotLabel}
        AND meeting_week."congregationId" = ${congregationId}
        AND meeting_week."startAt" < ${targetWeek.startAt}
      ORDER BY meeting_week."startAt" DESC, assignment."createdAt" DESC
      LIMIT 1
    ) AS last_assignment ON TRUE
    WHERE participant."congregationId" = ${congregationId}
      AND participant."deletedAt" IS NULL
      AND (
        participant."preferences" IS NULL
        OR (
          COALESCE((participant."preferences" #>> '{midweek,enabled}')::boolean, false) = true
          AND (
            participant."preferences" #> '{midweek,sections}' IS NULL
            OR participant."preferences" #> '{midweek,sections}' = '{}'::jsonb
            OR (
              COALESCE(
                (participant."preferences" #>> '{midweek,sections,ministery,enabled}')::boolean,
                false
              ) = true
              AND (
                participant."preferences" #> '{midweek,sections,ministery,roles}' IS NULL
                OR jsonb_typeof(participant."preferences" #> '{midweek,sections,ministery,roles}') <> 'array'
                OR jsonb_array_length(participant."preferences" #> '{midweek,sections,ministery,roles}') = 0
                OR participant."preferences" #> '{midweek,sections,ministery,roles}' @> ${JSON.stringify([role])}::jsonb
              )
            )
          )
        )
      )
    ORDER BY
      last_assignment."startAt" ASC NULLS FIRST,
      participant."name" ASC,
      participant."id" ASC
    LIMIT ${limit + 1}
    OFFSET ${offset}
  `);

  const hasMore = rows.length > limit;
  const suggestions = rows.slice(0, limit).map((row) => ({
    participantId: row.participantId,
    participantName: row.participantName,
    lastAssignment:
      row.lastStartAt && row.lastEndAt && row.lastTitle
        ? {
            startAt: row.lastStartAt,
            endAt: row.lastEndAt,
            title: row.lastTitle
          }
        : null
  }));

  res.json({
    role,
    suggestions,
    nextOffset: hasMore ? offset + suggestions.length : null
  });
}

assignmentsRouter.get(
  "/assignments/:year/:week/midweek/participant-suggestions",
  requireAuth,
  (req, res) => sendParticipantSuggestions(req, res)
);

assignmentsRouter.get(
  "/assignments/:year/:week/midweek/publisher-suggestions",
  requireAuth,
  (req, res) => sendParticipantSuggestions(req, res, "publisher")
);

assignmentsRouter.get(
  "/assignments/:year/:week/:type/activity",
  requireAuth,
  async (req, res) => {
    const { offset, limit } = activityQuerySchema.parse(req.query);
    const meeting = await prisma.meeting.findFirst({
      where: {
        type: req.params.type,
        meetingWeek: {
          congregationId: req.user!.congregationId,
          year: Number(req.params.year),
          yearWeek: Number(req.params.week)
        }
      },
      select: { id: true }
    });

    if (!meeting) return res.status(404).json({ message: "Reuniao nao encontrada." });

    const activity = await prisma.auditLog.findMany({
      where: { congregationId: req.user!.congregationId, meetingId: meeting.id },
      orderBy: [{ changedAt: "desc" }, { id: "desc" }],
      skip: offset,
      take: limit + 1,
      include: {
        changedByUser: { select: { id: true, name: true } },
        changedByParticipant: { select: { id: true, name: true } }
      }
    });

    const participantIds = activity.flatMap((item) =>
      item.entityType === "Assignment"
        ? [item.previousValue, item.newValue].filter((value): value is string => Boolean(value))
        : []
    );
    const participants = participantIds.length
      ? await prisma.participant.findMany({
          where: {
            congregationId: req.user!.congregationId,
            id: { in: participantIds }
          },
          select: { id: true, name: true }
        })
      : [];
    const participantNames = new Map(
      participants.map((participant) => [participant.id, participant.name])
    );

    const hasMore = activity.length > limit;
    const page = activity.slice(0, limit).map((item) => {
      const storedContext =
        item.context && typeof item.context === "object" && !Array.isArray(item.context)
          ? item.context
          : {};
      const hasResolvedParticipant =
        (item.previousValue !== null && participantNames.has(item.previousValue)) ||
        (item.newValue !== null && participantNames.has(item.newValue));
      const isParticipantChange =
        item.entityType === "Assignment" &&
        (item.action.startsWith("ASSIGNMENT_") ||
          (item.action === "UPDATED" && hasResolvedParticipant));
      const context = isParticipantChange
        ? {
            ...storedContext,
            previousParticipantName: item.previousValue
              ? participantNames.get(item.previousValue) ?? "Participante removido"
              : "Sem designação",
            newParticipantName: item.newValue
              ? participantNames.get(item.newValue) ?? "Participante removido"
              : "Sem designação"
          }
        : item.context;

      return {
        id: item.id,
        action: item.action,
        changedAt: item.changedAt,
        entityType: item.entityType,
        entityId: item.entityId,
        field: item.field,
        previousValue: item.previousValue,
        newValue: item.newValue,
        context,
        actor: item.changedByParticipant
          ? { type: "PARTICIPANT", id: item.changedByParticipant.id, name: item.changedByParticipant.name }
          : item.changedByUser
            ? { type: "USER", id: item.changedByUser.id, name: item.changedByUser.name }
            : { type: item.actorType, id: null, name: "Sistema" }
      };
    });

    res.json({
      activity: page,
      nextOffset: hasMore ? offset + page.length : null
    });
  }
);

assignmentsRouter.post(
  "/assignments/:assignmentId/participation-link",
  requireAuth,
  requireWrite,
  async (req, res) => {
    const accessCode = generateParticipationAccessCode();
    const result = await prisma.$transaction(async (tx) => {
      const assignment = await tx.assignment.findFirst({
        where: {
          id: req.params.assignmentId,
          participant: {
            congregationId: req.user!.congregationId,
            deletedAt: null
          },
          meetingPartSlot: {
            meetingPart: {
              meetingSection: {
                meeting: {
                  meetingWeek: { congregationId: req.user!.congregationId }
                }
              }
            }
          }
        },
        include: {
          participant: { select: { id: true, name: true } },
          meetingPartSlot: {
            include: {
              meetingPart: {
                include: {
                  meetingSection: {
                    include: { meeting: { include: { meetingWeek: true } } }
                  }
                }
              }
            }
          }
        }
      });

      if (!assignment) return null;

      const updated = await tx.assignment.update({
        where: { id: assignment.id },
        data: {
          participationTokenVersion: { increment: 1 },
          participationTokenIssuedAt: new Date(),
          participationAccessCodeHash: hashParticipationAccessCode(accessCode)
        }
      });
      const part = assignment.meetingPartSlot.meetingPart;
      const section = part.meetingSection;
      const meeting = section.meeting;
      await tx.auditLog.create({
        data: {
          congregationId: req.user!.congregationId,
          meetingId: meeting.id,
          changedByUserId: req.user!.id,
          actorType: "USER",
          action: "PARTICIPATION_LINK_GENERATED",
          entityType: "Assignment",
          entityId: assignment.id,
          field: "participationTokenVersion",
          previousValue: String(assignment.participationTokenVersion),
          newValue: String(updated.participationTokenVersion),
          context: {
            participantName: assignment.participant.name,
            sectionTitle: section.title,
            partTitle: part.title,
            slotLabel: assignment.meetingPartSlot.label
          }
        }
      });

      return { code: accessCode };
    });

    if (!result) {
      return res.status(409).json({ message: "A designacao nao esta mais disponivel." });
    }

    res.json({
      code: result.code,
      link: participationLinkFromCode(result.code)
    });
  }
);

assignmentsRouter.post("/assignments/public-link", requireAuth, requireAdmin, async (req, res) => {
  const publicToken = await findActiveDefaultPublicToken(req.user!.congregationId);
  if (!publicToken) {
    return res.status(409).json({
      message: "Defina um token publico padrao e ativo em Configuracoes antes de compartilhar."
    });
  }

  if (!publicToken.accessCode) {
    return res.status(500).json({ message: "Nao foi possivel gerar o link publico." });
  }
  const link = publicAssignmentsLinkFromCode(publicToken.accessCode);

  await prisma.auditLog.create({
    data: {
      congregationId: req.user!.congregationId,
      meetingId: null,
      changedByUserId: req.user!.id,
      actorType: "USER",
      action: "PUBLIC_ASSIGNMENTS_LINK_SHARED",
      entityType: "PublicAccessToken",
      entityId: publicToken.id,
      field: "publicLink",
      previousValue: null,
      newValue: null,
      context: {
        tokenName: publicToken.name,
        tokenExpiresAt: publicToken.expiresAt.toISOString(),
        scope: "catalog"
      }
    }
  });

  res.json({
    link: link.toString(),
    expiresAt: publicToken.expiresAt,
    publicToken: { id: publicToken.id, name: publicToken.name }
  });
});

assignmentsRouter.post(
  "/assignments/:year/:week/:type/public-link",
  requireAuth,
  requireAdmin,
  async (req, res) => {
    const route = z
      .object({
        year: z.coerce.number().int(),
        week: z.coerce.number().int(),
        type: z.enum(["midweek", "weekend"])
      })
      .parse(req.params);
    const now = new Date();

    const [meetingWeek, publicToken] = await Promise.all([
      prisma.meetingWeek.findFirst({
        where: {
          congregationId: req.user!.congregationId,
          year: route.year,
          yearWeek: route.week,
          meetings: { some: { type: route.type } }
        },
        include: { meetings: { where: { type: route.type }, select: { id: true } } }
      }),
      findActiveDefaultPublicToken(req.user!.congregationId, now)
    ]);

    if (!meetingWeek || meetingWeek.meetings.length === 0) {
      return res.status(404).json({ message: "Reuniao nao encontrada." });
    }
    if (!publicToken) {
      return res.status(409).json({
        message: "Defina um token publico padrao e ativo em Configuracoes antes de compartilhar."
      });
    }

    if (!publicToken.accessCode) {
      return res.status(500).json({ message: "Nao foi possivel gerar o link publico." });
    }
    const link = publicAssignmentsLinkFromCode(publicToken.accessCode, {
      year: meetingWeek.year,
      month: meetingWeek.month,
      week: meetingWeek.yearWeek,
      type: route.type
    });

    await prisma.auditLog.create({
      data: {
        congregationId: req.user!.congregationId,
        meetingId: meetingWeek.meetings[0].id,
        changedByUserId: req.user!.id,
        actorType: "USER",
        action: "PUBLIC_MEETING_LINK_SHARED",
        entityType: "PublicAccessToken",
        entityId: publicToken.id,
        field: "publicLink",
        previousValue: null,
        newValue: null,
        context: {
          tokenName: publicToken.name,
          tokenExpiresAt: publicToken.expiresAt.toISOString(),
          meetingType: route.type
        }
      }
    });

    res.json({
      link: link.toString(),
      expiresAt: publicToken.expiresAt,
      publicToken: { id: publicToken.id, name: publicToken.name }
    });
  }
);

assignmentsRouter.get("/assignments/:year/:week/:type", requireAuth, async (req, res) => {
  const payload = await buildAssignmentPayload(
    req.user!.congregationId,
    Number(req.params.year),
    Number(req.params.week),
    req.params.type,
    permissionsFor(req.user!.role).canWriteAssignments,
    permissionsFor(req.user!.role).canManageSettings
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
      initialSong: z.string().nullable().optional(),
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
            sections: {
              include: {
                parts: {
                  include: {
                    slots: {
                      include: {
                        assignment: {
                          include: { participant: { select: { name: true } } }
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
    const meeting = meetingWeek.meetings[0];
    if (!meeting) throw new Error("Reuniao nao encontrada.");

    if (type === "weekend" && input.weekendFields) {
      for (const field of [
        "initialSong",
        "publicTalkTheme",
        "publicSpeakerName",
        "publicSpeakerCongregation"
      ] as const) {
        if (field in input.weekendFields) {
          const previousValue = meeting[field] ?? null;
          const newValue = input.weekendFields[field] ?? null;
          if (previousValue !== newValue) {
            await tx.meeting.update({ where: { id: meeting.id }, data: { [field]: newValue } });
            await tx.auditLog.create({
              data: {
                congregationId: req.user!.congregationId,
                meetingId: meeting.id,
                changedByUserId: req.user!.id,
                actorType: "USER",
                action: "MEETING_FIELD_UPDATED",
                entityType: "Meeting",
                entityId: meeting.id,
                field,
                previousValue,
                newValue,
                context: { meetingType: meeting.type }
              }
            });
          }
        }
      }
    }

    const slots = new Map(
      meeting.sections.flatMap((section) =>
        section.parts.flatMap((part) =>
          part.slots.map((slot) => [`${part.partKey}:${slot.position}`, { section, part, slot }] as const)
        )
      )
    );

    for (const change of input.assignments) {
      const found = slots.get(`${change.partKey}:${change.position}`);
      if (!found) continue;
      const currentParticipantId = found.slot.assignment?.participantId ?? null;
      const currentParticipantName = found.slot.assignment?.participant.name ?? "Sem designação";
      const nextParticipantId = change.participantId ?? null;
      if (currentParticipantId === nextParticipantId) continue;

      let assignmentId = found.slot.assignment?.id ?? found.slot.id;
      let nextParticipantName = "Sem designação";
      if (nextParticipantId) {
        const participant = await tx.participant.findFirst({
          where: { id: nextParticipantId, congregationId: req.user!.congregationId, deletedAt: null }
        });
        if (!participant) throw new Error("Participante invalido.");
        nextParticipantName = participant.name;
        const assignment = await tx.assignment.upsert({
          where: { meetingPartSlotId: found.slot.id },
          update: {
            participantId: nextParticipantId,
            responseStatus: "PENDING",
            respondedAt: null,
            participationTokenVersion: { increment: 1 },
            participationTokenIssuedAt: null,
            participationAccessCodeHash: null
          },
          create: { meetingPartSlotId: found.slot.id, participantId: nextParticipantId }
        });
        assignmentId = assignment.id;
      } else if (found.slot.assignment) {
        await tx.assignment.delete({ where: { meetingPartSlotId: found.slot.id } });
      }

      await tx.auditLog.create({
        data: {
          congregationId: req.user!.congregationId,
          meetingId: meeting.id,
          changedByUserId: req.user!.id,
          actorType: "USER",
          action:
            currentParticipantId === null
              ? "ASSIGNMENT_CREATED"
              : nextParticipantId === null
                ? "ASSIGNMENT_REMOVED"
                : "ASSIGNMENT_REASSIGNED",
          entityType: "Assignment",
          entityId: assignmentId,
          field: "participantId",
          previousValue: currentParticipantId,
          newValue: nextParticipantId,
          context: {
            sectionKey: found.section.sectionKey,
            sectionTitle: found.section.title,
            partKey: found.part.partKey,
            partTitle: found.part.title,
            slotPosition: found.slot.position,
            slotLabel: found.slot.label,
            previousParticipantName: currentParticipantName,
            newParticipantName: nextParticipantName
          }
        }
      });
    }
  });

  const payload = await buildAssignmentPayload(
    req.user!.congregationId,
    year,
    week,
    type,
    true,
    req.user!.role === "admin"
  );
  res.json(payload);
});
