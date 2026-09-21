import { Router } from "express";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { getIsoWeek, getWeekRange } from "../lib/dates.js";
import { prisma } from "../lib/prisma.js";
import { verifySecret } from "../lib/secrets.js";
import { createMeetingStructure, midweekStructureFromImport, weekendStructure } from "./meetingStructures.js";

export const scriptImportRouter = Router();

const importSchema = z.object({
  ref: z.string().min(1).optional(),
  year: z.number().int().optional(),
  month: z.number().int().min(0).max(11).optional(),
  meeting_week_ref: z.union([z.number(), z.string()]).optional(),
  yearWeek: z.number().int().min(1).max(53).optional(),
  startAt: z.string().datetime().optional(),
  endAt: z.string().datetime().optional(),
  bibleReading: z.string().optional(),
  songs: z.object({
    initial: z.string(),
    transitional: z.string(),
    last: z.string()
  }).optional(),
  treasures: z.object({
    title: z.string(),
    sections: z.array(z.object({ title: z.string(), assigned_to: z.array(z.unknown()).optional() }).passthrough())
  }).optional(),
  ministery: z.object({
    title: z.string(),
    sections: z.array(z.object({ title: z.string(), assigned_to: z.array(z.unknown()).optional() }).passthrough())
  }).optional(),
  christianLife: z.object({
    title: z.string(),
    sections: z.array(z.object({ title: z.string(), assigned_to: z.array(z.unknown()).optional() }).passthrough())
  }).optional(),
  sections: z.array(z.object({
    sectionKey: z.string().optional(),
    key: z.string().optional(),
    title: z.string().optional(),
    parts: z.array(z.object({
      partKey: z.string().optional(),
      key: z.string().optional(),
      title: z.string().optional(),
      assignable: z.boolean().optional(),
      slots: z.array(z.unknown()).optional()
    }).passthrough()).optional()
  }).passthrough()).optional()
}).passthrough();

async function congregationFromApiKey(apiKey?: string) {
  if (!apiKey) return null;
  const settings = await prisma.congregationSettings.findMany();
  for (const setting of settings) {
    if (await verifySecret(apiKey, setting.scriptApiKeyHash)) {
      return setting.congregationId;
    }
  }
  return null;
}

scriptImportRouter.post("/script/import-midweek", async (req, res) => {
  const congregationId = await congregationFromApiKey(req.header("x-api-key"));
  if (!congregationId) return res.status(401).json({ message: "API key invalida." });
  const input = importSchema.parse(req.body);
  const startAt = input.startAt ? new Date(input.startAt) : getWeekRange(input.year ?? new Date().getUTCFullYear(), input.yearWeek ?? getIsoWeek(new Date())).startAt;
  const year = input.year ?? startAt.getUTCFullYear();
  const yearWeek = input.yearWeek ?? getIsoWeek(startAt);
  const range = input.endAt ? { startAt, endAt: new Date(input.endAt) } : getWeekRange(year, yearWeek);
  const ref = input.ref ?? `${year}-W${yearWeek}`;

  const exists = await prisma.meetingWeek.findFirst({ where: { congregationId, ref } });
  if (exists) return res.status(409).json({ message: "Semana ja importada.", ref });

  const result = await prisma.$transaction(async (tx) => {
    const week = await tx.meetingWeek.create({
      data: {
        congregationId,
        ref,
        year,
        month: range.startAt.getUTCMonth() + 1,
        yearWeek,
        startAt: range.startAt,
        endAt: range.endAt,
        bibleReading: input.bibleReading,
        rawSourcePayload: input as Prisma.InputJsonValue
      }
    });
    const midweek = await tx.meeting.create({ data: { meetingWeekId: week.id, type: "midweek", meetingDate: range.startAt } });
    const weekend = await tx.meeting.create({ data: { meetingWeekId: week.id, type: "weekend", meetingDate: range.endAt } });
    await createMeetingStructure(tx as any, midweek.id, midweekStructureFromImport(input));
    await createMeetingStructure(tx as any, weekend.id, weekendStructure);
    return week;
  });

  res.status(201).json({ meetingWeek: result });
});

scriptImportRouter.post("/script/import-midweek/:ref/confirm-update", async (_req, res) => {
  res.status(501).json({ message: "Atualizacao idempotente manual ainda nao implementada neste release inicial." });
});
