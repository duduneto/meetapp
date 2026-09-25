import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireWrite } from "../auth/middleware.js";
import { prisma } from "../lib/prisma.js";
import { isDigitsOnlyQuery, normalizeLeadingZeros, sanitizeSearchText } from "../lib/textSanitize.js";

export const publicSpeakThemesRouter = Router();

const listQuerySchema = z.object({
  q: z.string().optional().default(""),
  offset: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  deleted: z.enum(["true", "false"]).optional()
});

const themeBodySchema = z.object({
  number: z.coerce.number().int().positive(),
  title: z.string().trim().min(1),
  documentId: z.string().trim().nullable().optional(),
  path: z.string().trim().nullable().optional()
});

function buildThemeFields(input: z.infer<typeof themeBodySchema>) {
  const title = input.title.replace(/\s+/gu, " ").trim();
  const fullTitle = `${input.number} - ${title}`;
  return {
    number: input.number,
    title,
    fullTitle,
    sanitizedFullTitle: sanitizeSearchText(fullTitle),
    documentId: input.documentId ?? null,
    path: input.path ?? null
  };
}

publicSpeakThemesRouter.get("/public-speak-themes", requireAuth, async (req, res) => {
  const { q, offset, limit, deleted } = listQuerySchema.parse(req.query);
  const includeDeleted = deleted === "true";
  const trimmed = q.trim();

  const where = {
    deletedAt: includeDeleted ? { not: null } : null,
    ...(trimmed
      ? isDigitsOnlyQuery(trimmed)
        ? { number: Number(normalizeLeadingZeros(trimmed)) }
        : { sanitizedFullTitle: { contains: sanitizeSearchText(trimmed) } }
      : {})
  };

  const rows = await prisma.publicSpeakTheme.findMany({
    where,
    orderBy: [{ number: "asc" }],
    skip: offset,
    take: limit + 1
  });

  const page = rows.slice(0, limit);
  res.json({
    themes: page,
    nextOffset: rows.length > limit ? offset + page.length : null
  });
});

publicSpeakThemesRouter.post("/public-speak-themes", requireAuth, requireWrite, async (req, res) => {
  const input = themeBodySchema.parse(req.body);
  const fields = buildThemeFields(input);
  const theme = await prisma.publicSpeakTheme.create({
    data: {
      ...fields,
      userId: req.user!.id
    }
  });
  res.status(201).json({ theme });
});

publicSpeakThemesRouter.put("/public-speak-themes/:id", requireAuth, requireWrite, async (req, res) => {
  const input = themeBodySchema.parse(req.body);
  const fields = buildThemeFields(input);
  const existing = await prisma.publicSpeakTheme.findFirst({
    where: { id: req.params.id, deletedAt: null }
  });
  if (!existing) return res.status(404).json({ message: "Tema nao encontrado." });

  const theme = await prisma.publicSpeakTheme.update({
    where: { id: existing.id },
    data: fields
  });
  res.json({ theme });
});

publicSpeakThemesRouter.delete("/public-speak-themes/:id", requireAuth, requireWrite, async (req, res) => {
  const existing = await prisma.publicSpeakTheme.findFirst({
    where: { id: req.params.id, deletedAt: null }
  });
  if (!existing) return res.status(404).json({ message: "Tema nao encontrado." });

  const theme = await prisma.publicSpeakTheme.update({
    where: { id: existing.id },
    data: { deletedAt: new Date() }
  });
  res.json({ theme });
});

publicSpeakThemesRouter.post("/public-speak-themes/:id/restore", requireAuth, requireWrite, async (req, res) => {
  const existing = await prisma.publicSpeakTheme.findFirst({
    where: { id: req.params.id, deletedAt: { not: null } }
  });
  if (!existing) return res.status(404).json({ message: "Tema nao encontrado." });

  const theme = await prisma.publicSpeakTheme.update({
    where: { id: existing.id },
    data: { deletedAt: null }
  });
  res.json({ theme });
});
