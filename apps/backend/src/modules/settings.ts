import { Router } from "express";
import { z } from "zod";
import { requireAdmin, requireAuth } from "../auth/middleware.js";
import { generatePublicAccessCode } from "../auth/publicAccessCode.js";
import { prisma } from "../lib/prisma.js";
import { createSecret, hashSecret } from "../lib/secrets.js";
import { sanitizeSearchText } from "../lib/textSanitize.js";

export const settingsRouter = Router();

const settingsSchema = z.object({
  name: z.string().min(1),
  timezone: z.string().min(1),
  midweekDefaultWeekday: z.number().int().min(0).max(6),
  weekendDefaultWeekday: z.number().int().min(0).max(6)
});

const publicTokenSchema = z.object({
  name: z.string().trim().min(1).max(80),
  expiresAt: z.string().datetime(),
  isDefault: z.boolean().default(false)
});

function publicTokenResponse(token: {
  id: string;
  name: string;
  expiresAt: Date;
  revokedAt: Date | null;
  isDefault: boolean;
  createdAt: Date;
  createdByUser: { id: string; name: string } | null;
}) {
  const status = token.revokedAt
    ? "REVOKED"
    : token.expiresAt.getTime() <= Date.now()
      ? "EXPIRED"
      : "ACTIVE";
  return {
    id: token.id,
    name: token.name,
    expiresAt: token.expiresAt,
    revokedAt: token.revokedAt,
    isDefault: token.isDefault,
    createdAt: token.createdAt,
    createdByUser: token.createdByUser,
    status
  };
}

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
    await tx.congregation.update({
      where: { id: req.user!.congregationId },
      data: { name: input.name, sanitizedName: sanitizeSearchText(input.name) }
    });
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

settingsRouter.get("/settings/public-tokens", requireAuth, requireAdmin, async (req, res) => {
  const tokens = await prisma.publicAccessToken.findMany({
    where: { congregationId: req.user!.congregationId },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    include: { createdByUser: { select: { id: true, name: true } } }
  });
  res.json({ tokens: tokens.map(publicTokenResponse) });
});

settingsRouter.post("/settings/public-tokens", requireAuth, requireAdmin, async (req, res) => {
  const input = publicTokenSchema.parse(req.body);
  const expiresAt = new Date(input.expiresAt);
  if (expiresAt.getTime() <= Date.now()) {
    return res.status(400).json({ message: "A expiracao precisa estar no futuro." });
  }

  const token = await prisma.$transaction(async (tx) => {
    const activeTokenCount = await tx.publicAccessToken.count({
      where: {
        congregationId: req.user!.congregationId,
        revokedAt: null,
        expiresAt: { gt: new Date() }
      }
    });
    const isDefault = input.isDefault || activeTokenCount === 0;
    if (isDefault) {
      await tx.publicAccessToken.updateMany({
        where: { congregationId: req.user!.congregationId, isDefault: true },
        data: { isDefault: false }
      });
    }

    const created = await tx.publicAccessToken.create({
      data: {
        congregationId: req.user!.congregationId,
        name: input.name,
        accessCode: generatePublicAccessCode(),
        expiresAt,
        isDefault,
        createdByUserId: req.user!.id
      },
      include: { createdByUser: { select: { id: true, name: true } } }
    });
    await tx.auditLog.create({
      data: {
        congregationId: req.user!.congregationId,
        changedByUserId: req.user!.id,
        actorType: "USER",
        action: "PUBLIC_TOKEN_CREATED",
        entityType: "PublicAccessToken",
        entityId: created.id,
        field: "status",
        previousValue: null,
        newValue: "ACTIVE",
        context: { name: created.name, expiresAt: created.expiresAt.toISOString(), isDefault }
      }
    });
    return created;
  });

  res.status(201).json({ token: publicTokenResponse(token) });
});

settingsRouter.post(
  "/settings/public-tokens/:tokenId/default",
  requireAuth,
  requireAdmin,
  async (req, res) => {
    const token = await prisma.$transaction(async (tx) => {
      const selected = await tx.publicAccessToken.findFirst({
        where: {
          id: req.params.tokenId,
          congregationId: req.user!.congregationId,
          revokedAt: null,
          expiresAt: { gt: new Date() }
        }
      });
      if (!selected) return null;

      await tx.publicAccessToken.updateMany({
        where: { congregationId: req.user!.congregationId, isDefault: true },
        data: { isDefault: false }
      });
      const updated = await tx.publicAccessToken.update({
        where: { id: selected.id },
        data: { isDefault: true },
        include: { createdByUser: { select: { id: true, name: true } } }
      });
      await tx.auditLog.create({
        data: {
          congregationId: req.user!.congregationId,
          changedByUserId: req.user!.id,
          actorType: "USER",
          action: "PUBLIC_TOKEN_SET_DEFAULT",
          entityType: "PublicAccessToken",
          entityId: selected.id,
          field: "isDefault",
          previousValue: String(selected.isDefault),
          newValue: "true",
          context: { name: selected.name }
        }
      });
      return updated;
    });

    if (!token) return res.status(409).json({ message: "Token expirado, revogado ou inexistente." });
    res.json({ token: publicTokenResponse(token) });
  }
);

settingsRouter.post(
  "/settings/public-tokens/:tokenId/revoke",
  requireAuth,
  requireAdmin,
  async (req, res) => {
    const token = await prisma.$transaction(async (tx) => {
      const selected = await tx.publicAccessToken.findFirst({
        where: {
          id: req.params.tokenId,
          congregationId: req.user!.congregationId,
          revokedAt: null
        }
      });
      if (!selected) return null;

      const updated = await tx.publicAccessToken.update({
        where: { id: selected.id },
        data: { revokedAt: new Date(), isDefault: false },
        include: { createdByUser: { select: { id: true, name: true } } }
      });
      await tx.auditLog.create({
        data: {
          congregationId: req.user!.congregationId,
          changedByUserId: req.user!.id,
          actorType: "USER",
          action: "PUBLIC_TOKEN_REVOKED",
          entityType: "PublicAccessToken",
          entityId: selected.id,
          field: "revokedAt",
          previousValue: null,
          newValue: updated.revokedAt?.toISOString() ?? null,
          context: { name: selected.name, wasDefault: selected.isDefault }
        }
      });
      return updated;
    });

    if (!token) return res.status(404).json({ message: "Token ativo nao encontrado." });
    res.json({ token: publicTokenResponse(token) });
  }
);

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
