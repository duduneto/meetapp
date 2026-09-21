import crypto from "node:crypto";
import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireWrite } from "../auth/middleware.js";
import {
  generateParticipationAccessCode,
  hashParticipationAccessCode
} from "../auth/participationAccessCode.js";
import { participationLinkFromCode } from "../lib/participationLinks.js";
import { prisma } from "../lib/prisma.js";
import { sendWhatsAppMessages } from "../lib/whatsappGateway.js";

export const participationNotificationsRouter = Router();

export function isValidDateOnly(value: string) {
  const parsed = new Date(`${value}T12:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export const participationNotificationRequestSchema = z
  .object({
    force: z.boolean().default(false),
    meetingDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/u, "Data da reuniao invalida.")
      .refine(isValidDateOnly, "Data da reuniao invalida."),
    assignmentIds: z
      .array(z.string().min(1))
      .min(1)
      .max(100)
      .refine((values) => new Set(values).size === values.length, "Designacoes duplicadas.")
      .optional()
  })
  .strict();

type NotificationMessageInput = {
  participantName: string;
  meetingDate: Date;
  timezone: string;
  sectionTitle: string;
  partTitle: string;
  slotLabel: string;
  companions: Array<{ label: string; name: string }>;
  link: string;
};

export function normalizeWhatsappNumber(value: string) {
  const normalized = value.replace(/\D/gu, "");
  return normalized.length >= 8 && normalized.length <= 15 ? normalized : null;
}

export function createParticipationNotificationMessage(input: NotificationMessageInput) {
  const formattedDate = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: input.timezone
  }).format(input.meetingDate);
  const companionLines = input.companions
    .map((companion) => `${companion.label}: ${companion.name}`)
    .join("\n");

  return [
    `Olá, ${input.participantName}! Tudo bem?`,
    "",
    `🎉 *Você recebeu uma designação* na reunião do meio de semana de ${formattedDate}.`,
    "",
    `\`${input.sectionTitle}\``,
    `Parte: ${input.partTitle}`,
    `Função: \`${input.slotLabel}\``,
    companionLines,
    "",
    "Confirme se poderá participar pelo link:",
    input.link,
    "",
    "‼️ Caso não possa participar, selecione “Rejeitar” para nos avisar o quanto antes. ✅"
  ]
    .filter((line, index, lines) => line !== "" || lines[index - 1] !== "")
    .join("\n");
}

participationNotificationsRouter.post(
  "/assignments/:year/:week/midweek/sections/ministery/participation-notifications",
  requireAuth,
  requireWrite,
  async (req, res) => {
    const input = participationNotificationRequestSchema.parse(req.body ?? {});
    const congregationId = req.user!.congregationId;
    const meeting = await prisma.meeting.findFirst({
      where: {
        type: "midweek",
        meetingWeek: {
          congregationId,
          year: Number(req.params.year),
          yearWeek: Number(req.params.week)
        }
      },
      include: {
        meetingWeek: {
          include: {
            congregation: { include: { settings: true } }
          }
        },
        sections: {
          where: { sectionKey: "ministery" },
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
    });

    const section = meeting?.sections[0];
    if (!meeting || !section) {
      return res.status(404).json({ message: "Secao de ministerio nao encontrada." });
    }

    const weekStart = meeting.meetingWeek.startAt.toISOString().slice(0, 10);
    const weekEnd = meeting.meetingWeek.endAt.toISOString().slice(0, 10);
    if (input.meetingDate < weekStart || input.meetingDate > weekEnd) {
      return res.status(400).json({
        message: `A data da reuniao deve estar entre ${weekStart} e ${weekEnd}.`
      });
    }

    const batchId = crypto.randomUUID();
    const requestedAssignmentIds = input.assignmentIds
      ? new Set(input.assignmentIds)
      : null;
    const foundAssignmentIds = new Set<string>();
    const skipped: Array<{
      assignmentId: string;
      participantName: string;
      status: "skipped";
      reason: string;
    }> = [];
    const candidates: Array<{
      assignmentId: string;
      participantId: string;
      participantName: string;
      whatsapp: string;
      tokenVersion: number;
      partTitle: string;
      slotLabel: string;
      companions: Array<{ label: string; name: string }>;
    }> = [];

    for (const part of section.parts) {
      for (const slot of part.slots) {
        const assignment = slot.assignment;
        if (!assignment) continue;
        if (requestedAssignmentIds && !requestedAssignmentIds.has(assignment.id)) continue;
        foundAssignmentIds.add(assignment.id);

        if (assignment.responseStatus !== "PENDING") {
          skipped.push({
            assignmentId: assignment.id,
            participantName: assignment.participant.name,
            status: "skipped",
            reason: "participation_already_answered"
          });
          continue;
        }

        const whatsapp = assignment.participant.whatsapp
          ? normalizeWhatsappNumber(assignment.participant.whatsapp)
          : null;
        if (!whatsapp) {
          skipped.push({
            assignmentId: assignment.id,
            participantName: assignment.participant.name,
            status: "skipped",
            reason: "missing_or_invalid_whatsapp"
          });
          continue;
        }

        const latest = assignment.participationNotifications[0];
        const latestMatchesCurrentVersion =
          latest?.tokenVersion === assignment.participationTokenVersion;
        if (!input.force && latestMatchesCurrentVersion && latest?.status === "SENT") {
          skipped.push({
            assignmentId: assignment.id,
            participantName: assignment.participant.name,
            status: "skipped",
            reason: "already_sent"
          });
          continue;
        }
        if (
          !input.force &&
          latestMatchesCurrentVersion &&
          latest?.status === "PENDING" &&
          Date.now() - latest.createdAt.getTime() < 5 * 60 * 1000
        ) {
          skipped.push({
            assignmentId: assignment.id,
            participantName: assignment.participant.name,
            status: "skipped",
            reason: "send_in_progress"
          });
          continue;
        }

        candidates.push({
          assignmentId: assignment.id,
          participantId: assignment.participantId,
          participantName: assignment.participant.name,
          whatsapp,
          tokenVersion: assignment.participationTokenVersion,
          partTitle: part.title,
          slotLabel: slot.label,
          companions: part.slots
            .filter((candidateSlot) => candidateSlot.id !== slot.id)
            .flatMap((candidateSlot) =>
              candidateSlot.assignment
                ? [{ label: candidateSlot.label, name: candidateSlot.assignment.participant.name }]
                : []
            )
        });
      }
    }

    if (
      requestedAssignmentIds &&
      [...requestedAssignmentIds].some((assignmentId) => !foundAssignmentIds.has(assignmentId))
    ) {
      return res.status(409).json({
        message: "Uma das designacoes selecionadas foi alterada ou nao esta mais disponivel."
      });
    }

    const meetingDate = new Date(`${input.meetingDate}T12:00:00.000Z`);
    const timezone = meeting.meetingWeek.congregation.settings?.timezone ?? "America/Fortaleza";

    const prepared = await prisma.$transaction(async (tx) => {
      const messages: Array<{
        notificationId: string;
        assignmentId: string;
        participantName: string;
        to: string;
        text: string;
      }> = [];

      for (const candidate of candidates) {
        const code = generateParticipationAccessCode();
        const nextVersion = candidate.tokenVersion + 1;
        const updated = await tx.assignment.updateMany({
          where: {
            id: candidate.assignmentId,
            participantId: candidate.participantId,
            responseStatus: "PENDING",
            participationTokenVersion: candidate.tokenVersion
          },
          data: {
            participationTokenVersion: { increment: 1 },
            participationTokenIssuedAt: new Date(),
            participationAccessCodeHash: hashParticipationAccessCode(code)
          }
        });
        if (updated.count !== 1) {
          skipped.push({
            assignmentId: candidate.assignmentId,
            participantName: candidate.participantName,
            status: "skipped",
            reason: "assignment_changed"
          });
          continue;
        }

        const notification = await tx.participationNotification.create({
          data: {
            assignmentId: candidate.assignmentId,
            createdByUserId: req.user!.id,
            batchId,
            tokenVersion: nextVersion,
            recipientWhatsapp: candidate.whatsapp
          }
        });
        const link = participationLinkFromCode(code);
        messages.push({
          notificationId: notification.id,
          assignmentId: candidate.assignmentId,
          participantName: candidate.participantName,
          to: candidate.whatsapp,
          text: createParticipationNotificationMessage({
            participantName: candidate.participantName,
            meetingDate,
            timezone,
            sectionTitle: section.title,
            partTitle: candidate.partTitle,
            slotLabel: candidate.slotLabel,
            companions: candidate.companions,
            link
          })
        });
      }

      return messages;
    });

    let gatewayResults = new Map<
      string,
      { status: "sent" | "failed"; providerMessageId?: string; error?: string }
    >();
    if (prepared.length > 0) {
      try {
        const gateway = await sendWhatsAppMessages(
          batchId,
          prepared.map((item) => ({ id: item.notificationId, to: item.to, text: item.text }))
        );
        gatewayResults = new Map(gateway.results.map((item) => [item.id, item]));
      } catch (error) {
        const message = error instanceof Error ? error.message : "Falha ao acessar o WhatsApp.";
        console.error("whatsapp_notification_batch_failed", {
          batchId,
          messageCount: prepared.length,
          error: message,
          stack: error instanceof Error ? error.stack : undefined
        });
        gatewayResults = new Map(
          prepared.map((item) => [item.notificationId, { status: "failed" as const, error: message }])
        );
      }
    }

    const dispatched = await prisma.$transaction(async (tx) => {
      const results: Array<{
        assignmentId: string;
        participantName: string;
        status: "sent" | "failed";
        reason?: string;
      }> = [];

      for (const item of prepared) {
        const gatewayResult = gatewayResults.get(item.notificationId) ?? {
          status: "failed" as const,
          error: "Gateway nao retornou o resultado desta mensagem."
        };
        const sent = gatewayResult.status === "sent";
        const error = sent ? null : (gatewayResult.error ?? "Falha desconhecida no envio.").slice(0, 1000);
        if (error) {
          console.error("whatsapp_notification_failed", {
            batchId,
            notificationId: item.notificationId,
            assignmentId: item.assignmentId,
            error
          });
        }
        await tx.participationNotification.update({
          where: { id: item.notificationId },
          data: {
            status: sent ? "SENT" : "FAILED",
            sentAt: sent ? new Date() : null,
            providerMessageId: gatewayResult.providerMessageId ?? null,
            error
          }
        });
        await tx.auditLog.create({
          data: {
            congregationId,
            meetingId: meeting.id,
            changedByUserId: req.user!.id,
            actorType: "USER",
            action: sent
              ? "PARTICIPATION_NOTIFICATION_SENT"
              : "PARTICIPATION_NOTIFICATION_FAILED",
            entityType: "Assignment",
            entityId: item.assignmentId,
            field: "participationNotification",
            previousValue: "PENDING",
            newValue: sent ? "SENT" : "FAILED",
            context: {
              batchId,
              meetingDate: input.meetingDate,
              participantName: item.participantName,
              error
            }
          }
        });
        results.push({
          assignmentId: item.assignmentId,
          participantName: item.participantName,
          status: gatewayResult.status,
          ...(error ? { reason: error } : {})
        });
      }
      return results;
    });

    const results = [...dispatched, ...skipped];
    const sent = dispatched.filter((item) => item.status === "sent").length;
    const failed = dispatched.filter((item) => item.status === "failed").length;
    console.info("whatsapp_notification_batch_finished", {
      batchId,
      sent,
      failed,
      skipped: skipped.length,
      attempted: dispatched.length
    });
    res.json({
      ok: failed === 0,
      batchId,
      totals: {
        sent,
        failed,
        skipped: skipped.length,
        attempted: dispatched.length
      },
      results
    });
  }
);
