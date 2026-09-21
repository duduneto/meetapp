import crypto from "node:crypto";
import jwt, { type JwtPayload } from "jsonwebtoken";

const ISSUER = "varjotapp";
const AUDIENCE = "public-assignments";
const PURPOSE = "public-assignments";

export type PublicAccessTokenClaims = {
  tokenId: string;
  congregationId: string;
  expiresAt: Date;
};

function publicAccessJwtSecret() {
  const secret = process.env.PUBLIC_SHARE_JWT_SECRET;
  if (secret) {
    if (secret.length < 32) {
      throw new Error("PUBLIC_SHARE_JWT_SECRET deve ter pelo menos 32 caracteres.");
    }
    return secret;
  }

  if (process.env.NODE_ENV !== "production") {
    return "varjotapp-development-public-share-secret-change-me";
  }

  throw new Error("PUBLIC_SHARE_JWT_SECRET nao configurado.");
}

export function signPublicAccessToken(claims: PublicAccessTokenClaims) {
  return jwt.sign(
    {
      congregationId: claims.congregationId,
      purpose: PURPOSE,
      exp: Math.floor(claims.expiresAt.getTime() / 1000)
    },
    publicAccessJwtSecret(),
    {
      algorithm: "HS256",
      issuer: ISSUER,
      audience: AUDIENCE,
      subject: claims.tokenId,
      jwtid: crypto.randomUUID()
    }
  );
}

export function verifyPublicAccessToken(token: string) {
  try {
    const decoded = jwt.verify(token, publicAccessJwtSecret(), {
      algorithms: ["HS256"],
      issuer: ISSUER,
      audience: AUDIENCE
    });
    if (typeof decoded === "string") return null;

    const payload = decoded as JwtPayload & {
      congregationId?: unknown;
      purpose?: unknown;
    };
    if (
      typeof payload.sub !== "string" ||
      typeof payload.congregationId !== "string" ||
      payload.purpose !== PURPOSE
    ) {
      return null;
    }

    return {
      tokenId: payload.sub,
      congregationId: payload.congregationId
    };
  } catch {
    return null;
  }
}
