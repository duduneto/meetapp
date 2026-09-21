import { Router } from "express";
import { requireAuth } from "../auth/middleware.js";
import { prisma } from "../lib/prisma.js";

export const reportsRouter = Router();

reportsRouter.get("/reports/participant-usage", requireAuth, async (req, res) => {
  const from = req.query.from ? new Date(String(req.query.from)) : undefined;
  const to = req.query.to ? new Date(String(req.query.to)) : undefined;
  const participants = await prisma.participant.findMany({
    where: { congregationId: req.user!.congregationId },
    orderBy: { name: "asc" },
    include: {
      assignments: {
        where: {
          meetingPartSlot: {
            meetingPart: {
              meetingSection: {
                meeting: {
                  meetingWeek: {
                    startAt: { gte: from, lte: to }
                  }
                }
              }
            }
          }
        },
        include: {
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
      }
    }
  });

  res.json({
    rows: participants.map((participant) => {
      const sorted = [...participant.assignments].sort((a, b) => {
        const aDate = a.meetingPartSlot.meetingPart.meetingSection.meeting.meetingWeek.startAt.getTime();
        const bDate = b.meetingPartSlot.meetingPart.meetingSection.meeting.meetingWeek.startAt.getTime();
        return bDate - aDate;
      });
      return {
        participantId: participant.id,
        name: participant.name,
        totalAssignments: participant.assignments.length,
        lastAssignmentAt: sorted[0]?.meetingPartSlot.meetingPart.meetingSection.meeting.meetingWeek.startAt ?? null,
        lastAssignmentTitle: sorted[0]?.meetingPartSlot.meetingPart.title ?? null
      };
    })
  });
});
