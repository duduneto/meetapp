import { generatePublicAccessCode } from "../auth/publicAccessCode.js";
import { prisma } from "./prisma.js";

export function publicAssignmentsAppUrl() {
  return (
    process.env.PUBLIC_APP_URL ??
    `${process.env.FRONTEND_ORIGIN?.split(",")[0] ?? "http://localhost:5173"}/public`
  );
}

export async function findActiveDefaultPublicToken(congregationId: string, now = new Date()) {
  const token = await prisma.publicAccessToken.findFirst({
    where: {
      congregationId,
      isDefault: true,
      revokedAt: null,
      expiresAt: { gt: now }
    }
  });
  if (!token || token.accessCode) return token;

  const accessCode = generatePublicAccessCode();
  await prisma.publicAccessToken.updateMany({
    where: { id: token.id, accessCode: null },
    data: { accessCode }
  });
  return prisma.publicAccessToken.findUniqueOrThrow({ where: { id: token.id } });
}

export function publicAssignmentsLinkFromCode(
  code: string,
  selection?: {
    year: number;
    month: number;
    week: number;
    type: "midweek" | "weekend";
  }
) {
  const link = new URL(publicAssignmentsAppUrl());
  link.pathname = `${link.pathname.replace(/\/+$/u, "")}/${code}`;
  link.search = "";
  if (selection) {
    link.searchParams.set("year", String(selection.year));
    link.searchParams.set("month", String(selection.month));
    link.searchParams.set("week", String(selection.week));
    link.searchParams.set("type", selection.type);
  }
  return link;
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
  if (!publicToken?.accessCode) return null;

  const link = publicAssignmentsLinkFromCode(publicToken.accessCode, input);
  return link.toString();
}
