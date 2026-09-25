import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireWrite } from "../auth/middleware.js";
import { prisma } from "../lib/prisma.js";
import { sanitizeSearchText } from "../lib/textSanitize.js";

export const congregationsRouter = Router();

const listQuerySchema = z.object({
  q: z.string().optional().default(""),
  offset: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  deleted: z.enum(["true", "false"]).optional()
});

const congregationBodySchema = z.object({
  name: z.string().trim().min(1)
});

function buildCongregationFields(input: z.infer<typeof congregationBodySchema>) {
  const name = input.name.replace(/\s+/gu, " ").trim();
  return {
    name,
    sanitizedName: sanitizeSearchText(name)
  };
}

congregationsRouter.get("/congregations", requireAuth, async (req, res) => {
  const { q, offset, limit, deleted } = listQuerySchema.parse(req.query);
  const includeDeleted = deleted === "true";
  const trimmed = q.trim();
  const sanitized = trimmed ? sanitizeSearchText(trimmed) : "";

  const rows = await prisma.congregation.findMany({
    where: {
      deletedAt: includeDeleted ? { not: null } : null,
      ...(sanitized ? { sanitizedName: { contains: sanitized } } : {})
    },
    orderBy: { name: "asc" },
    skip: offset,
    take: limit + 1,
    select: {
      id: true,
      name: true,
      sanitizedName: true,
      userId: true,
      deletedAt: true,
      createdAt: true,
      updatedAt: true
    }
  });

  const page = rows.slice(0, limit);
  res.json({
    congregations: page,
    nextOffset: rows.length > limit ? offset + page.length : null
  });
});

congregationsRouter.post("/congregations", requireAuth, requireWrite, async (req, res) => {
  const input = congregationBodySchema.parse(req.body);
  const fields = buildCongregationFields(input);
  const congregation = await prisma.congregation.create({
    data: {
      ...fields,
      userId: req.user!.id
    },
    select: {
      id: true,
      name: true,
      sanitizedName: true,
      userId: true,
      deletedAt: true,
      createdAt: true,
      updatedAt: true
    }
  });
  res.status(201).json({ congregation });
});

congregationsRouter.put("/congregations/:id", requireAuth, requireWrite, async (req, res) => {
  const input = congregationBodySchema.parse(req.body);
  const fields = buildCongregationFields(input);
  const existing = await prisma.congregation.findFirst({
    where: { id: req.params.id, deletedAt: null }
  });
  if (!existing) return res.status(404).json({ message: "Congregacao nao encontrada." });

  const congregation = await prisma.congregation.update({
    where: { id: existing.id },
    data: fields,
    select: {
      id: true,
      name: true,
      sanitizedName: true,
      userId: true,
      deletedAt: true,
      createdAt: true,
      updatedAt: true
    }
  });
  res.json({ congregation });
});

congregationsRouter.delete("/congregations/:id", requireAuth, requireWrite, async (req, res) => {
  const existing = await prisma.congregation.findFirst({
    where: { id: req.params.id, deletedAt: null },
    include: {
      _count: { select: { users: true, meetingWeeks: true } }
    }
  });
  if (!existing) return res.status(404).json({ message: "Congregacao nao encontrada." });

  if (existing._count.users > 0 || existing._count.meetingWeeks > 0) {
    return res.status(400).json({
      message: "Nao e possivel excluir uma congregacao que possui usuarios ou reunioes."
    });
  }

  const congregation = await prisma.congregation.update({
    where: { id: existing.id },
    data: { deletedAt: new Date() },
    select: {
      id: true,
      name: true,
      sanitizedName: true,
      userId: true,
      deletedAt: true,
      createdAt: true,
      updatedAt: true
    }
  });
  res.json({ congregation });
});

congregationsRouter.post("/congregations/:id/restore", requireAuth, requireWrite, async (req, res) => {
  const existing = await prisma.congregation.findFirst({
    where: { id: req.params.id, deletedAt: { not: null } }
  });
  if (!existing) return res.status(404).json({ message: "Congregacao nao encontrada." });

  const congregation = await prisma.congregation.update({
    where: { id: existing.id },
    data: { deletedAt: null },
    select: {
      id: true,
      name: true,
      sanitizedName: true,
      userId: true,
      deletedAt: true,
      createdAt: true,
      updatedAt: true
    }
  });
  res.json({ congregation });
});
