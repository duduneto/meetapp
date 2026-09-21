import { Router } from "express";
import { Prisma } from "@prisma/client";
import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { requireAdmin, requireAuth } from "../auth/middleware.js";
import { getIsoWeek, getWeekRange } from "../lib/dates.js";
import { prisma } from "../lib/prisma.js";
import { verifySecret } from "../lib/secrets.js";
import {
  inspectMidweekSource,
  scrapeMidweekMeeting,
  type MidweekSourceItem
} from "./jwMwbScraper.js";
import { createMeetingStructure, midweekStructureFromImport, weekendStructure } from "./meetingStructures.js";

export const scriptImportRouter = Router();

export const importSchema = z.object({
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

const scrapeRequestSchema = z.object({ url: z.string().trim().min(1) }).strict();

class DuplicateMeetingWeekError extends Error {
  constructor(readonly ref: string) {
    super("Semana ja importada.");
  }
}

type UrlImportStatus = "created" | "skipped" | "failed";

type UrlImportResult = {
  url: string;
  status: UrlImportStatus;
  reason?: string;
  id?: string;
  ref?: string;
  year?: number;
  month?: number;
  yearWeek?: number;
  startAt?: string;
  endAt?: string;
};

function errorMessage(error: unknown) {
  if (error instanceof z.ZodError) {
    return error.issues[0]?.message ?? "Os dados extraidos da semana sao invalidos.";
  }
  return error instanceof Error ? error.message : "Falha ao importar a semana.";
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T) => Promise<R>
) {
  const results = new Array<R>(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const index = nextIndex++;
      results[index] = await mapper(items[index]);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => worker())
  );
  return results;
}

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

async function authorizeImport(req: Request, res: Response, next: NextFunction) {
  try {
    const apiKey = req.header("x-api-key");
    if (apiKey) {
      const congregationId = await congregationFromApiKey(apiKey);
      if (!congregationId) return res.status(401).json({ message: "API key invalida." });
      res.locals.congregationId = congregationId;
      res.locals.importAuthType = "api-key";
      next();
      return;
    }

    await requireAuth(req, res, () => {
      requireAdmin(req, res, () => {
        res.locals.congregationId = req.user!.congregationId;
        res.locals.importAuthType = "admin";
        next();
      });
    });
  } catch (error) {
    next(error);
  }
}

async function importMidweekMeeting(
  congregationId: string,
  input: z.infer<typeof importSchema>
) {
  const startAt = input.startAt ? new Date(input.startAt) : getWeekRange(input.year ?? new Date().getUTCFullYear(), input.yearWeek ?? getIsoWeek(new Date())).startAt;
  const year = input.year ?? startAt.getUTCFullYear();
  const yearWeek = input.yearWeek ?? getIsoWeek(startAt);
  const range = input.endAt ? { startAt, endAt: new Date(input.endAt) } : getWeekRange(year, yearWeek);
  const ref = input.ref ?? `${year}-W${yearWeek}`;

  const exists = await prisma.meetingWeek.findFirst({
    where: {
      congregationId,
      OR: [{ ref }, { year, yearWeek }]
    },
    select: { ref: true }
  });
  if (exists) throw new DuplicateMeetingWeekError(exists.ref);

  try {
    return await prisma.$transaction(async (tx) => {
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
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new DuplicateMeetingWeekError(ref);
    }
    throw error;
  }
}

async function importUrlSource(
  congregationId: string,
  source: MidweekSourceItem
): Promise<UrlImportResult> {
  let input: z.infer<typeof importSchema> | undefined;
  try {
    const rawInput = source.meeting ?? await scrapeMidweekMeeting(source.url);
    input = importSchema.parse(rawInput);
    const week = await importMidweekMeeting(congregationId, input);
    return {
      url: source.url,
      status: "created",
      id: week.id,
      ref: week.ref,
      year: week.year,
      month: week.month,
      yearWeek: week.yearWeek,
      startAt: week.startAt.toISOString(),
      endAt: week.endAt.toISOString()
    };
  } catch (error) {
    if (error instanceof DuplicateMeetingWeekError) {
      return {
        url: source.url,
        status: "skipped",
        reason: error.message,
        ref: error.ref,
        year: input?.year,
        month: input?.month === undefined ? undefined : input.month + 1,
        yearWeek: input?.yearWeek,
        startAt: input?.startAt,
        endAt: input?.endAt
      };
    }
    return { url: source.url, status: "failed", reason: errorMessage(error) };
  }
}

scriptImportRouter.post("/script/import-midweek", authorizeImport, async (req, res, next) => {
  try {
    const isUrlImport =
      req.body &&
      typeof req.body === "object" &&
      !Array.isArray(req.body) &&
      Object.hasOwn(req.body, "url");
    if (isUrlImport && res.locals.importAuthType !== "admin") {
      return res.status(403).json({ message: "A importacao por URL exige acesso de administrador." });
    }
    if (!isUrlImport && res.locals.importAuthType !== "api-key") {
      return res.status(403).json({ message: "A importacao do payload legado exige uma API key." });
    }

    if (isUrlImport) {
      const sourceUrl = scrapeRequestSchema.parse(req.body).url;
      const sources = await inspectMidweekSource(sourceUrl);
      const weeks = await mapWithConcurrency(sources, 2, (source) =>
        importUrlSource(res.locals.congregationId, source)
      );
      const summary = weeks.reduce(
        (counts, week) => ({ ...counts, [week.status]: counts[week.status] + 1 }),
        { total: weeks.length, created: 0, skipped: 0, failed: 0 }
      );
      const outcome = summary.failed === 0
        ? "success"
        : summary.failed === summary.total
          ? "failure"
          : "partial";

      return res.status(200).json({ outcome, sourceUrl, summary, weeks });
    }

    const input = importSchema.parse(req.body);
    const result = await importMidweekMeeting(res.locals.congregationId, input);
    res.status(201).json({ meetingWeek: result });
  } catch (error) {
    if (error instanceof DuplicateMeetingWeekError) {
      return res.status(409).json({ message: error.message, ref: error.ref });
    }
    next(error);
  }
});

scriptImportRouter.post("/script/import-midweek/:ref/confirm-update", async (_req, res) => {
  res.status(501).json({ message: "Atualizacao idempotente manual ainda nao implementada neste release inicial." });
});
