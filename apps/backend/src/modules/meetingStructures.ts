import type { PrismaClient } from "@prisma/client";

type StructurePart = {
  partKey: string;
  title: string;
  assignable?: boolean;
  slots?: string[];
};

type StructureSection = {
  sectionKey: string;
  title: string;
  parts: StructurePart[];
};

type ImportedPart = {
  partKey?: string;
  key?: string;
  title?: string;
  assignable?: boolean;
  slots?: unknown[];
};

type ImportedSection = {
  sectionKey?: string;
  key?: string;
  title?: string;
  parts?: ImportedPart[];
};

type LegacyProgramSection = {
  title?: string;
};

type LegacyProgramGroup = {
  title?: string;
  sections?: LegacyProgramSection[];
};

export type MidweekImportPayload = {
  sections?: ImportedSection[];
  treasures?: LegacyProgramGroup;
  ministery?: LegacyProgramGroup;
  christianLife?: LegacyProgramGroup;
  treasuresTalkTitle?: string;
};

export const weekendStructure: StructureSection[] = [
  {
    sectionKey: "weekendOpening",
    title: "Abertura",
    parts: [
      { partKey: "president", title: "Presidente", slots: ["Presidente"] },
      { partKey: "initial_prayer", title: "Oracao inicial", slots: ["Orador"] }
    ]
  },
  {
    sectionKey: "publicTalk",
    title: "Discurso publico",
    parts: [{ partKey: "public_talk", title: "Orador visitante", slots: ["Orador"] }]
  },
  {
    sectionKey: "watchtower",
    title: "Estudo de A Sentinela",
    parts: [
      { partKey: "watchtower_conductor", title: "Dirigente", slots: ["Dirigente"] },
      { partKey: "watchtower_reader", title: "Leitor", slots: ["Leitor"] },
      { partKey: "final_prayer", title: "Oracao final", slots: ["Orador"] }
    ]
  }
];

function importedParts(
  sectionKey: "treasures" | "ministery" | "christianLife",
  group: LegacyProgramGroup,
  slotsForPart: (index: number, total: number) => string[]
): StructurePart[] {
  const sections = Array.isArray(group.sections) ? group.sections : [];
  return sections.map((part, index) => ({
    partKey: `${sectionKey}.${index}`,
    title: String(part.title ?? "Parte"),
    slots: slotsForPart(index, sections.length)
  }));
}

function legacyMidweekStructure(payload: MidweekImportPayload): StructureSection[] | null {
  const groups = [payload.treasures, payload.ministery, payload.christianLife];
  if (!groups.some((group) => Array.isArray(group?.sections))) return null;

  const treasures = payload.treasures ?? {};
  const ministery = payload.ministery ?? {};
  const christianLife = payload.christianLife ?? {};

  return [
    {
      sectionKey: "midweekOpening",
      title: "Abertura",
      parts: [
        { partKey: "president", title: "Presidente", slots: ["Presidente"] },
        { partKey: "initial_prayer", title: "Oracao inicial", slots: ["Orador"] },
        { partKey: "indicators", title: "Indicadores", slots: ["Indicador 1", "Indicador 2"] },
        { partKey: "volants", title: "Volantes", slots: ["Volante 1", "Volante 2"] }
      ]
    },
    {
      sectionKey: "treasures",
      title: String(treasures.title ?? "Tesouros da Palavra de Deus"),
      parts: importedParts("treasures", treasures, (index) => index === 2 ? ["Leitor"] : ["Designado"])
    },
    {
      sectionKey: "ministery",
      title: String(ministery.title ?? "Faca Seu Melhor no Ministerio"),
      parts: importedParts("ministery", ministery, () => ["Publicador", "Ajudante"])
    },
    {
      sectionKey: "christianLife",
      title: String(christianLife.title ?? "Nossa Vida Crista"),
      parts: importedParts(
        "christianLife",
        christianLife,
        (index, total) => index === total - 1 ? ["Dirigente", "Leitor"] : ["Designado"]
      )
    },
    {
      sectionKey: "midweekClosing",
      title: "Encerramento",
      parts: [{ partKey: "final_prayer", title: "Oracao final", slots: ["Orador"] }]
    }
  ];
}

export function midweekStructureFromImport(payload: MidweekImportPayload): StructureSection[] {
  const sections = Array.isArray(payload?.sections) ? payload.sections : [];
  if (sections.length > 0) {
    return sections.map((section, sectionIndex) => ({
      sectionKey: String(section.sectionKey ?? section.key ?? `section.${sectionIndex}`),
      title: String(section.title ?? "Secao"),
      parts: (Array.isArray(section.parts) ? section.parts : []).map((part, partIndex) => ({
        partKey: String(part.partKey ?? part.key ?? `${section.sectionKey ?? sectionIndex}.${partIndex}`),
        title: String(part.title ?? "Parte"),
        assignable: part.assignable ?? true,
        slots: Array.isArray(part.slots) && part.slots.length > 0 ? part.slots.map(String) : ["Designado"]
      }))
    }));
  }

  const legacyStructure = legacyMidweekStructure(payload);
  if (legacyStructure) return legacyStructure;

  return [
    {
      sectionKey: "treasures",
      title: "Tesouros da Palavra de Deus",
      parts: [
        { partKey: "treasures.0", title: payload?.treasuresTalkTitle ?? "Discurso", slots: ["Designado"] },
        { partKey: "treasures.1", title: "Joias espirituais", slots: ["Designado"] },
        { partKey: "treasures.2", title: "Leitura da Biblia", slots: ["Leitor"] }
      ]
    },
    {
      sectionKey: "ministery",
      title: "Faca Seu Melhor no Ministerio",
      parts: [
        { partKey: "ministery.0", title: "Parte 1", slots: ["Publicador", "Ajudante"] },
        { partKey: "ministery.1", title: "Parte 2", slots: ["Publicador", "Ajudante"] }
      ]
    },
    {
      sectionKey: "christianLife",
      title: "Nossa Vida Crista",
      parts: [
        { partKey: "christianLife.0", title: "Necessidades locais", slots: ["Designado"] },
        { partKey: "christianLife.1", title: "Estudo biblico de congregacao", slots: ["Dirigente", "Leitor"] }
      ]
    }
  ];
}

export async function createMeetingStructure(
  tx: PrismaClient,
  meetingId: string,
  structure: StructureSection[]
) {
  for (const [sectionIndex, section] of structure.entries()) {
    const createdSection = await tx.meetingSection.create({
      data: {
        meetingId,
        sectionKey: section.sectionKey,
        title: section.title,
        order: sectionIndex + 1
      }
    });

    for (const [partIndex, part] of section.parts.entries()) {
      const createdPart = await tx.meetingPart.create({
        data: {
          meetingSectionId: createdSection.id,
          partKey: part.partKey,
          title: part.title,
          order: partIndex + 1,
          assignable: part.assignable ?? true
        }
      });

      for (const [slotIndex, label] of (part.slots ?? ["Designado"]).slice(0, 2).entries()) {
        await tx.meetingPartSlot.create({
          data: {
            meetingPartId: createdPart.id,
            position: slotIndex + 1,
            label
          }
        });
      }
    }
  }
}

/** Backfill assignable public_talk slot for weekend meetings created before this change. */
export async function ensurePublicTalkSlot(
  tx: Pick<PrismaClient, "meetingPart" | "meetingPartSlot">,
  meetingId: string
) {
  const part = await tx.meetingPart.findFirst({
    where: {
      partKey: "public_talk",
      meetingSection: { meetingId, sectionKey: "publicTalk" }
    },
    include: { slots: { orderBy: { position: "asc" } } }
  });
  if (!part) return;

  if (!part.assignable) {
    await tx.meetingPart.update({
      where: { id: part.id },
      data: { assignable: true }
    });
  }

  if (part.slots.length === 0) {
    await tx.meetingPartSlot.create({
      data: {
        meetingPartId: part.id,
        position: 1,
        label: "Orador"
      }
    });
  }
}
