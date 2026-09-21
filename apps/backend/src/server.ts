import "dotenv/config";
import cors from "cors";
import express from "express";
import { requireAuth, permissionsFor } from "./auth/middleware.js";
import { assignmentsRouter } from "./modules/assignments.js";
import { participantsRouter } from "./modules/participants.js";
import { publicRouter } from "./modules/publicRoutes.js";
import { reportsRouter } from "./modules/reports.js";
import { scriptImportRouter } from "./modules/scriptImport.js";
import { settingsRouter } from "./modules/settings.js";
import { usersRouter } from "./modules/users.js";

const app = express();

const allowedOrigins = [process.env.FRONTEND_ORIGIN, process.env.SCRIPT_IMPORT_ORIGINS]
  .flatMap((value) => value?.split(",") ?? [])
  .map((value) => value.trim())
  .filter(Boolean);

app.use(cors({ origin: allowedOrigins.length > 0 ? allowedOrigins : true }));
app.use(express.json({ limit: "2mb" }));

app.get("/health", (_req, res) => res.json({ ok: true }));
app.get("/me", requireAuth, (req, res) => {
  res.json({ user: req.user, permissions: permissionsFor(req.user!.role) });
});

app.use(scriptImportRouter);
app.use(publicRouter);
app.use(assignmentsRouter);
app.use(participantsRouter);
app.use(usersRouter);
app.use(settingsRouter);
app.use(reportsRouter);

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(error);
  const message = error instanceof Error ? error.message : "Erro inesperado.";
  res.status(message.includes("not found") || message.includes("nao encontrada") ? 404 : 400).json({ message });
});

const port = Number(process.env.PORT ?? 3333);
app.listen(port, () => {
  console.log(`Varjotapp API ouvindo em http://localhost:${port}`);
});
