import { Router } from "express";
import { z } from "zod";
import { requireAdmin, requireAuth } from "../auth/middleware.js";
import { prisma } from "../lib/prisma.js";
import { createSecret, hashSecret } from "../lib/secrets.js";

export const settingsRouter = Router();

const settingsSchema = z.object({
  name: z.string().min(1),
  timezone: z.string().min(1),
  midweekDefaultWeekday: z.number().int().min(0).max(6),
  weekendDefaultWeekday: z.number().int().min(0).max(6)
});

settingsRouter.get("/settings", requireAuth, requireAdmin, async (req, res) => {
  const congregation = await prisma.congregation.findUniqueOrThrow({
    where: { id: req.user!.congregationId },
    include: { settings: true }
  });
  res.json({ congregation });
});

settingsRouter.put("/settings", requireAuth, requireAdmin, async (req, res) => {
  const input = settingsSchema.parse(req.body);
  const congregation = await prisma.$transaction(async (tx) => {
    await tx.congregation.update({ where: { id: req.user!.congregationId }, data: { name: input.name } });
    await tx.congregationSettings.update({
      where: { congregationId: req.user!.congregationId },
      data: {
        timezone: input.timezone,
        midweekDefaultWeekday: input.midweekDefaultWeekday,
        weekendDefaultWeekday: input.weekendDefaultWeekday
      }
    });
    return tx.congregation.findUniqueOrThrow({ where: { id: req.user!.congregationId }, include: { settings: true } });
  });
  res.json({ congregation });
});

settingsRouter.post("/settings/anonymous-token/regenerate", requireAuth, requireAdmin, async (req, res) => {
  const token = createSecret("public");
  await prisma.congregationSettings.update({
    where: { congregationId: req.user!.congregationId },
    data: { anonymousReadTokenHash: await hashSecret(token), anonymousReadTokenCreatedAt: new Date() }
  });
  res.json({ token });
});

settingsRouter.post("/settings/script-api-key/regenerate", requireAuth, requireAdmin, async (req, res) => {
  const apiKey = createSecret("script");
  await prisma.congregationSettings.update({
    where: { congregationId: req.user!.congregationId },
    data: { scriptApiKeyHash: await hashSecret(apiKey), scriptApiKeyCreatedAt: new Date() }
  });
  res.json({ apiKey });
});
