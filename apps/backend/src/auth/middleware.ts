import type { NextFunction, Request, Response } from "express";
import { prisma } from "../lib/prisma.js";
import { resolveAuthenticatedEmail } from "./firebase.js";

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  congregationId: string;
};

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function permissionsFor(role: string) {
  const canWrite = role === "admin" || role === "editor";
  const isAdmin = role === "admin";
  return {
    canWriteAssignments: canWrite,
    canManageParticipants: canWrite,
    canManageUsers: isAdmin,
    canManageSettings: isAdmin
  };
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const email = await resolveAuthenticatedEmail(req.header("authorization"));
  if (!email) return res.status(401).json({ message: "Token invalido." });

  const user = await prisma.user.findFirst({
    where: { email, active: true }
  });

  if (!user) return res.status(403).json({ message: "Usuario sem acesso ativo." });

  req.user = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    congregationId: user.congregationId
  };
  next();
}

export function requireWrite(req: Request, res: Response, next: NextFunction) {
  if (!req.user || !permissionsFor(req.user.role).canWriteAssignments) {
    return res.status(403).json({ message: "Permissao insuficiente." });
  }
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ message: "Permissao de admin requerida." });
  }
  next();
}
