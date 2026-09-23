import { Router } from "express";
import { z } from "zod";
import { isPublicAccessCode } from "../auth/publicAccessCode.js";
import { signPublicAccessToken } from "../auth/publicAccessJwt.js";
import { prisma } from "../lib/prisma.js";
import { verifySecret } from "../lib/secrets.js";
import { verifyPublicAccessToken } from "../auth/publicAccessJwt.js";
import { buildAssignmentPayload } from "./assignments.js";
import {
  findParticipantAssignmentHistory,
  participantAssignmentHistoryQuerySchema,
  publicParticipantSearchQuerySchema
} from "./participantAssignmentHistory.js";

export const publicRouter = Router();

const publicSessionSchema = z
  .object({
    code: z.string().trim().refine(isPublicAccessCode, {
      message: "Codigo de acesso publico invalido."
    })
  })
  .strict();

function bearerToken(authorization?: string) {
  if (!authorization?.startsWith("Bearer ")) return null;
  const token = authorization.slice("Bearer ".length).trim();
  return token || null;
}

async function congregationFromPublicToken(token?: string) {
  if (!token) return null;

  const claims = verifyPublicAccessToken(token);
  if (claims) {
    const storedToken = await prisma.publicAccessToken.findFirst({
      where: {
        id: claims.tokenId,
        congregationId: claims.congregationId,
        revokedAt: null,
        expiresAt: { gt: new Date() }
      },
      select: { congregationId: true }
    });
    if (storedToken) return storedToken.congregationId;
  }

  // Compatibility with links issued before managed public JWTs were introduced.
  const settings = await prisma.congregationSettings.findMany();
  for (const setting of settings) {
    if (await verifySecret(token, setting.anonymousReadTokenHash)) {
      return setting.congregationId;
    }
  }
  return null;
}

publicRouter.post("/public/session", async (req, res) => {
  const { code } = publicSessionSchema.parse(req.body);
  const publicToken = await prisma.publicAccessToken.findFirst({
    where: {
      accessCode: code,
      revokedAt: null,
      expiresAt: { gt: new Date() }
    }
  });
  if (!publicToken) {
    return res.status(401).json({ message: "Link publico invalido, expirado ou revogado." });
  }

  const accessToken = signPublicAccessToken({
    tokenId: publicToken.id,
    congregationId: publicToken.congregationId,
    expiresAt: publicToken.expiresAt
  });
  res.json({ accessToken, expiresAt: publicToken.expiresAt });
});

publicRouter.use("/public", async (req, res, next) => {
  const token = bearerToken(req.header("authorization")) ?? String(req.query.token ?? "");
  const congregationId = await congregationFromPublicToken(token);
  if (!congregationId) return res.status(401).json({ message: "Link publico invalido." });
  res.locals.congregationId = congregationId;
  next();
});

publicRouter.get("/public/assignment-months", async (_req, res) => {
  const weeks = await prisma.meetingWeek.findMany({
    where: { congregationId: res.locals.congregationId },
    orderBy: { startAt: "asc" },
    select: { year: true, month: true, startAt: true }
  });
  const map = new Map<string, { year: number; month: number; weekCount: number; startAt: Date }>();
  for (const week of weeks) {
    const key = `${week.year}-${week.month}`;
    const current = map.get(key);
    map.set(key, { year: week.year, month: week.month, weekCount: (current?.weekCount ?? 0) + 1, startAt: current?.startAt ?? week.startAt });
  }
  res.json({ months: [...map.values()] });
});

publicRouter.get("/public/assignment-months/:year/:month/weeks", async (req, res) => {
  const weeks = await prisma.meetingWeek.findMany({
    where: { congregationId: res.locals.congregationId, year: Number(req.params.year), month: Number(req.params.month) },
    orderBy: { startAt: "asc" },
    include: { meetings: { select: { type: true } } }
  });
  res.json({
    weeks: weeks.map((week) => ({
      year: week.year,
      yearWeek: week.yearWeek,
      startAt: week.startAt,
      endAt: week.endAt,
      hasMidweek: week.meetings.some((meeting) => meeting.type === "midweek"),
      hasWeekend: week.meetings.some((meeting) => meeting.type === "weekend")
    }))
  });
});

publicRouter.get("/public/assignments/:year/:week/:type", async (req, res) => {
  const payload = await buildAssignmentPayload(
    res.locals.congregationId,
    Number(req.params.year),
    Number(req.params.week),
    req.params.type,
    false
  );
  if (!payload) return res.status(404).json({ message: "Reuniao nao encontrada." });
  res.json(payload);
});

publicRouter.get("/public/participants", async (req, res) => {
  const { search, limit } = publicParticipantSearchQuerySchema.parse(req.query);
  const participants = await prisma.participant.findMany({
    where: {
      congregationId: res.locals.congregationId,
      deletedAt: null,
      ...(search ? { name: { contains: search, mode: "insensitive" } } : {}),
      assignments: { some: {} }
    },
    orderBy: [{ name: "asc" }, { id: "asc" }],
    take: limit,
    select: { id: true, name: true }
  });
  res.json({ participants });
});

publicRouter.get("/public/participants/:participantId/assignments", async (req, res) => {
  const query = participantAssignmentHistoryQuerySchema.parse(req.query);
  const participant = await prisma.participant.findFirst({
    where: {
      id: req.params.participantId,
      congregationId: res.locals.congregationId,
      deletedAt: null
    },
    select: { id: true, name: true }
  });
  if (!participant) {
    return res.status(404).json({ message: "Participante nao encontrado." });
  }

  const assignments = await findParticipantAssignmentHistory({
    participantId: participant.id,
    congregationId: res.locals.congregationId,
    period: query.period,
    limit: query.limit
  });

  res.json({
    participant,
    period: query.period,
    assignments: assignments.map(({ meetingId: _meetingId, ...assignment }) => assignment)
  });
});
