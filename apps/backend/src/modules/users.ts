import { Router } from "express";
import { z } from "zod";
import { requireAdmin, requireAuth } from "../auth/middleware.js";
import { prisma } from "../lib/prisma.js";

export const usersRouter = Router();

const userSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  firebaseUid: z.string().trim().min(1),
  role: z.literal("admin").default("admin"),
  active: z.boolean().default(true)
});

usersRouter.get("/users", requireAuth, requireAdmin, async (req, res) => {
  const users = await prisma.user.findMany({
    where: { congregationId: req.user!.congregationId },
    orderBy: { name: "asc" }
  });
  res.json({ users });
});

usersRouter.post("/users", requireAuth, requireAdmin, async (req, res) => {
  const input = userSchema.parse(req.body);
  const user = await prisma.user.create({
    data: { ...input, congregationId: req.user!.congregationId }
  });
  res.status(201).json({ user });
});

usersRouter.put("/users/:id", requireAuth, requireAdmin, async (req, res) => {
  const input = userSchema.parse(req.body);
  const user = await prisma.user.update({
    where: { id: req.params.id, congregationId: req.user!.congregationId },
    data: input
  });
  res.json({ user });
});
