import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireWrite } from "../auth/middleware.js";
import { deriveWhatsappFromBrPhone11, normalizeBrPhone11 } from "../lib/phoneBr.js";
import { prisma } from "../lib/prisma.js";
import { sanitizeSearchText } from "../lib/textSanitize.js";

export const publicSpeakersRouter = Router();

const listQuerySchema = z.object({
  q: z.string().optional().default(""),
  offset: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  deleted: z.enum(["true", "false"]).optional()
});

const speakerBodySchema = z.object({
  name: z.string().trim().min(1),
  congregationId: z.string().min(1),
  phone: z.string().trim().min(1)
});

function parseSpeakerFields(input: z.infer<typeof speakerBodySchema>) {
  const name = input.name.replace(/\s+/gu, " ").trim();
  const phone = normalizeBrPhone11(input.phone);
  if (!phone) {
    throw new Error("Telefone invalido. Use DDD + 9 + 8 digitos (11 digitos, sem DDI).");
  }
  return {
    name,
    sanitizedName: sanitizeSearchText(name),
    congregationId: input.congregationId,
    phone,
    whatsapp: deriveWhatsappFromBrPhone11(phone)
  };
}

const speakerInclude = {
  congregation: { select: { id: true, name: true, deletedAt: true } }
} as const;

publicSpeakersRouter.get("/public-speakers", requireAuth, async (req, res) => {
  const { q, offset, limit, deleted } = listQuerySchema.parse(req.query);
  const includeDeleted = deleted === "true";
  const trimmed = q.trim();
  const sanitized = trimmed ? sanitizeSearchText(trimmed) : "";

  const rows = await prisma.publicSpeaker.findMany({
    where: {
      hostCongregationId: req.user!.congregationId,
      deletedAt: includeDeleted ? { not: null } : null,
      ...(sanitized ? { sanitizedName: { contains: sanitized } } : {})
    },
    include: speakerInclude,
    orderBy: { name: "asc" },
    skip: offset,
    take: limit + 1
  });

  const page = rows.slice(0, limit);
  res.json({
    speakers: page,
    nextOffset: rows.length > limit ? offset + page.length : null
  });
});

publicSpeakersRouter.post("/public-speakers", requireAuth, requireWrite, async (req, res) => {
  const input = speakerBodySchema.parse(req.body);
  const fields = parseSpeakerFields(input);

  const home = await prisma.congregation.findFirst({
    where: { id: fields.congregationId, deletedAt: null }
  });
  if (!home) return res.status(400).json({ message: "Congregacao invalida." });

  const speaker = await prisma.publicSpeaker.create({
    data: {
      ...fields,
      hostCongregationId: req.user!.congregationId,
      userId: req.user!.id
    },
    include: speakerInclude
  });
  res.status(201).json({ speaker });
});

publicSpeakersRouter.put("/public-speakers/:id", requireAuth, requireWrite, async (req, res) => {
  const input = speakerBodySchema.parse(req.body);
  const fields = parseSpeakerFields(input);

  const existing = await prisma.publicSpeaker.findFirst({
    where: {
      id: req.params.id,
      hostCongregationId: req.user!.congregationId,
      deletedAt: null
    }
  });
  if (!existing) return res.status(404).json({ message: "Orador nao encontrado." });

  const home = await prisma.congregation.findFirst({
    where: { id: fields.congregationId, deletedAt: null }
  });
  if (!home) return res.status(400).json({ message: "Congregacao invalida." });

  const speaker = await prisma.publicSpeaker.update({
    where: { id: existing.id },
    data: fields,
    include: speakerInclude
  });
  res.json({ speaker });
});

publicSpeakersRouter.delete("/public-speakers/:id", requireAuth, requireWrite, async (req, res) => {
  const existing = await prisma.publicSpeaker.findFirst({
    where: {
      id: req.params.id,
      hostCongregationId: req.user!.congregationId,
      deletedAt: null
    }
  });
  if (!existing) return res.status(404).json({ message: "Orador nao encontrado." });

  const speaker = await prisma.publicSpeaker.update({
    where: { id: existing.id },
    data: { deletedAt: new Date() },
    include: speakerInclude
  });
  res.json({ speaker });
});

publicSpeakersRouter.post("/public-speakers/:id/restore", requireAuth, requireWrite, async (req, res) => {
  const existing = await prisma.publicSpeaker.findFirst({
    where: {
      id: req.params.id,
      hostCongregationId: req.user!.congregationId,
      deletedAt: { not: null }
    }
  });
  if (!existing) return res.status(404).json({ message: "Orador nao encontrado." });

  const speaker = await prisma.publicSpeaker.update({
    where: { id: existing.id },
    data: { deletedAt: null },
    include: speakerInclude
  });
  res.json({ speaker });
});
