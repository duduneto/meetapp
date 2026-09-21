import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { verifySecret } from "../lib/secrets.js";
import { verifyPublicAccessToken } from "../auth/publicAccessJwt.js";
import { buildAssignmentPayload } from "./assignments.js";

export const publicRouter = Router();

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

publicRouter.use("/public", async (req, res, next) => {
  const congregationId = await congregationFromPublicToken(String(req.query.token ?? ""));
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
