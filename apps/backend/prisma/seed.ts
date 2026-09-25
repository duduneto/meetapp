import "dotenv/config";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";
import { createSecret, hashSecret } from "../src/lib/secrets.js";
import { sanitizeSearchText } from "../src/lib/textSanitize.js";

const prisma = new PrismaClient();
const __dirname = dirname(fileURLToPath(import.meta.url));

type ThemeSeed = {
  number: number;
  title: string;
  documentId?: string;
  path?: string;
};

async function seedPublicSpeakThemes() {
  const raw = readFileSync(join(__dirname, "data/discursos_publicos.json"), "utf8");
  const themes = JSON.parse(raw) as ThemeSeed[];

  for (const theme of themes) {
    const fullTitle = `${theme.number} - ${theme.title}`;
    await prisma.publicSpeakTheme.upsert({
      where: { number: theme.number },
      update: {
        title: theme.title,
        fullTitle,
        sanitizedFullTitle: sanitizeSearchText(fullTitle),
        documentId: theme.documentId ?? null,
        path: theme.path ?? null,
        deletedAt: null
      },
      create: {
        number: theme.number,
        title: theme.title,
        fullTitle,
        sanitizedFullTitle: sanitizeSearchText(fullTitle),
        documentId: theme.documentId ?? null,
        path: theme.path ?? null
      }
    });
  }

  console.log(`Temas de discurso publico: ${themes.length} upserted.`);
}

async function main() {
  const anonymousToken = createSecret("public");
  const scriptApiKey = createSecret("script");
  const congregationName = process.env.SEED_CONGREGATION_NAME ?? "Congregacao Inicial";
  const congregation = await prisma.congregation.upsert({
    where: { id: "seed-congregation" },
    update: {
      name: congregationName,
      sanitizedName: sanitizeSearchText(congregationName)
    },
    create: {
      id: "seed-congregation",
      name: congregationName,
      sanitizedName: sanitizeSearchText(congregationName)
    }
  });

  await prisma.congregationSettings.upsert({
    where: { congregationId: congregation.id },
    update: {
      anonymousReadTokenHash: await hashSecret(anonymousToken),
      anonymousReadTokenCreatedAt: new Date(),
      scriptApiKeyHash: await hashSecret(scriptApiKey),
      scriptApiKeyCreatedAt: new Date()
    },
    create: {
      congregationId: congregation.id,
      timezone: "America/Fortaleza",
      midweekDefaultWeekday: 3,
      weekendDefaultWeekday: 6,
      anonymousReadTokenHash: await hashSecret(anonymousToken),
      scriptApiKeyHash: await hashSecret(scriptApiKey)
    }
  });

  const seedAdminFirebaseUid = process.env.SEED_ADMIN_FIREBASE_UID?.trim();
  await prisma.user.upsert({
    where: {
      congregationId_email: {
        congregationId: congregation.id,
        email: process.env.SEED_ADMIN_EMAIL ?? "admin@varjotapp.local"
      }
    },
    update: {
      active: true,
      role: "admin",
      ...(seedAdminFirebaseUid ? { firebaseUid: seedAdminFirebaseUid } : {})
    },
    create: {
      congregationId: congregation.id,
      firebaseUid: seedAdminFirebaseUid || null,
      email: process.env.SEED_ADMIN_EMAIL ?? "admin@varjotapp.local",
      name: process.env.SEED_ADMIN_NAME ?? "Administrador",
      role: "admin",
      active: true
    }
  });

  for (const name of ["Ana Silva", "Bruno Costa", "Carlos Lima", "Daniela Rocha"]) {
    await prisma.participant.upsert({
      where: { id: `seed-${name.toLowerCase().replaceAll(" ", "-")}` },
      update: {},
      create: {
        id: `seed-${name.toLowerCase().replaceAll(" ", "-")}`,
        congregationId: congregation.id,
        name
      }
    });
  }

  await seedPublicSpeakThemes();

  console.log("Seed concluido.");
  console.log(`Token publico inicial: ${anonymousToken}`);
  console.log(`API key tecnica inicial: ${scriptApiKey}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
