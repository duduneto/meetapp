import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";

export const participantAssignmentHistoryQuerySchema = z.object({
  period: z.enum(["upcoming", "past"]).default("upcoming"),
  limit: z.coerce.number().int().min(1).max(100).default(50)
});

export const publicParticipantSearchQuerySchema = z.object({
  search: z.string().trim().max(100).default(""),
  limit: z.coerce.number().int().min(1).max(50).default(20)
});

const participantAssignmentHistorySelect =
  Prisma.validator<Prisma.AssignmentSelect>()({
    id: true,
    responseStatus: true,
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
                    id: true,
                    type: true,
                    meetingWeek: {
                      select: {
                        year: true,
                        month: true,
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
  });

export type ParticipantAssignmentPeriod = z.infer<
  typeof participantAssignmentHistoryQuerySchema
>["period"];

export async function findParticipantAssignmentHistory(input: {
  participantId: string;
  congregationId: string;
  period: ParticipantAssignmentPeriod;
  limit: number;
  excludeMeetingId?: string;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const assignments = await prisma.assignment.findMany({
    where: {
      participantId: input.participantId,
      participant: { deletedAt: null },
      meetingPartSlot: {
        meetingPart: {
          meetingSection: {
            meeting: {
              ...(input.excludeMeetingId
                ? { id: { not: input.excludeMeetingId } }
                : {}),
              meetingWeek: {
                congregationId: input.congregationId,
                endAt:
                  input.period === "past"
                    ? { lt: now }
                    : { gte: now }
              }
            }
          }
        }
      }
    },
    orderBy: [
      {
        meetingPartSlot: {
          meetingPart: {
            meetingSection: {
              meeting: {
                meetingWeek: {
                  startAt: input.period === "past" ? "desc" : "asc"
                }
              }
            }
          }
        }
      },
      { id: input.period === "past" ? "desc" : "asc" }
    ],
    take: input.limit,
    select: participantAssignmentHistorySelect
  });

  return assignments.map((assignment) => {
    const slot = assignment.meetingPartSlot;
    const part = slot.meetingPart;
    const section = part.meetingSection;
    const meeting = section.meeting;
    const week = meeting.meetingWeek;
    return {
      id: assignment.id,
      status: assignment.responseStatus,
      meetingId: meeting.id,
      meeting: {
        type: meeting.type === "weekend" ? ("weekend" as const) : ("midweek" as const),
        year: week.year,
        month: week.month,
        week: week.yearWeek,
        startAt: week.startAt,
        endAt: week.endAt
      },
      section: { key: section.sectionKey, title: section.title },
      part: { key: part.partKey, title: part.title },
      slot: { position: slot.position, label: slot.label }
    };
  });
}
