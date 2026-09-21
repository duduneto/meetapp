import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { createSecret, hashSecret } from "../src/lib/secrets.js";

const prisma = new PrismaClient();

async function main() {
  const anonymousToken = createSecret("public");
  const scriptApiKey = createSecret("script");
  const congregation = await prisma.congregation.upsert({
    where: { id: "seed-congregation" },
    update: {},
    create: {
      id: "seed-congregation",
      name: process.env.SEED_CONGREGATION_NAME ?? "Congregacao Inicial"
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

  await prisma.user.upsert({
    where: {
      congregationId_email: {
        congregationId: congregation.id,
        email: process.env.SEED_ADMIN_EMAIL ?? "admin@varjotapp.local"
      }
    },
    update: { active: true, role: "admin" },
    create: {
      congregationId: congregation.id,
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
