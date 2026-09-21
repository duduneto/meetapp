import crypto from "node:crypto";
import jwt, { type JwtPayload } from "jsonwebtoken";

const ISSUER = "varjotapp";
const AUDIENCE = "assignment-participation";
const PURPOSE = "assignment-participation";

export type ParticipationTokenClaims = {
  assignmentId: string;
  participantId: string;
  version: number;
};

function participationJwtSecret() {
  const secret = process.env.PARTICIPATION_JWT_SECRET;
  if (secret) {
    if (secret.length < 32) {
      throw new Error("PARTICIPATION_JWT_SECRET deve ter pelo menos 32 caracteres.");
    }
    return secret;
  }

  if (process.env.NODE_ENV !== "production") {
    return "varjotapp-development-participation-secret-change-me";
  }

  throw new Error("PARTICIPATION_JWT_SECRET nao configurado.");
}

export function signParticipationToken(claims: ParticipationTokenClaims) {
  return jwt.sign(
    {
      participantId: claims.participantId,
      version: claims.version,
      purpose: PURPOSE
    },
    participationJwtSecret(),
    {
      algorithm: "HS256",
      issuer: ISSUER,
      audience: AUDIENCE,
      subject: claims.assignmentId,
      jwtid: crypto.randomUUID(),
      expiresIn: "1h"
    }
  );
}

export function verifyParticipationToken(token: string): ParticipationTokenClaims | null {
  try {
    const decoded = jwt.verify(token, participationJwtSecret(), {
      algorithms: ["HS256"],
      issuer: ISSUER,
      audience: AUDIENCE
    });

    if (typeof decoded === "string") return null;
    const payload = decoded as JwtPayload & {
      participantId?: unknown;
      version?: unknown;
      purpose?: unknown;
    };

    if (
      typeof payload.sub !== "string" ||
      typeof payload.participantId !== "string" ||
      typeof payload.version !== "number" ||
      payload.purpose !== PURPOSE
    ) {
      return null;
    }

    return {
      assignmentId: payload.sub,
      participantId: payload.participantId,
      version: payload.version
    };
  } catch {
    return null;
  }
}

export function participationTokenFromAuthorization(authorization?: string) {
  if (!authorization?.startsWith("Bearer ")) return null;
  const token = authorization.slice("Bearer ".length).trim();
  return token || null;
}
