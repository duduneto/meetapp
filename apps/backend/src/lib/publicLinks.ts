import { signPublicAccessToken } from "../auth/publicAccessJwt.js";
import { prisma } from "./prisma.js";

export function publicAssignmentsAppUrl() {
  return (
    process.env.PUBLIC_APP_URL ??
    `${process.env.FRONTEND_ORIGIN?.split(",")[0] ?? "http://localhost:5173"}/public`
  );
}

export async function findActiveDefaultPublicToken(congregationId: string, now = new Date()) {
  return prisma.publicAccessToken.findFirst({
    where: {
      congregationId,
      isDefault: true,
      revokedAt: null,
      expiresAt: { gt: now }
    }
  });
}

export async function buildPublicMeetingLink(input: {
  congregationId: string;
  year: number;
  month: number;
  week: number;
  type: "midweek" | "weekend";
  now?: Date;
}) {
  const publicToken = await findActiveDefaultPublicToken(input.congregationId, input.now);
  if (!publicToken) return null;

  const token = signPublicAccessToken({
    tokenId: publicToken.id,
    congregationId: input.congregationId,
    expiresAt: publicToken.expiresAt
  });
  const link = new URL(publicAssignmentsAppUrl());
  link.searchParams.set("token", token);
  link.searchParams.set("year", String(input.year));
  link.searchParams.set("month", String(input.month));
  link.searchParams.set("week", String(input.week));
  link.searchParams.set("type", input.type);
  return link.toString();
}
