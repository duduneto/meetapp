import type { NextFunction, Request, Response } from "express";
import { prisma } from "../lib/prisma.js";
import { resolveAuthenticatedIdentity } from "./firebase.js";

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
  const identity = await resolveAuthenticatedIdentity(req.header("authorization"));
  if (!identity) return res.status(401).json({ message: "Token Google invalido." });

  const user = await prisma.user.findFirst({
    where: identity.development
      ? { email: identity.email, active: true, role: "admin" }
      : { firebaseUid: identity.uid, active: true, role: "admin" }
  });

  if (!user) {
    return res.status(403).json({
      message: "Esta conta Google nao esta vinculada a um administrador ativo."
    });
  }

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
