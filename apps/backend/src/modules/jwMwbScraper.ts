import * as cheerio from "cheerio";

const MAX_HTML_BYTES = 5 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 15_000;
export const MAX_MIDWEEK_ISSUE_WEEKS = 12;

const months: Record<string, number> = {
  janeiro: 0,
  fevereiro: 1,
  março: 2,
  abril: 3,
  maio: 4,
  junho: 5,
  julho: 6,
  agosto: 7,
  setembro: 8,
  outubro: 9,
  novembro: 10,
  dezembro: 11
};

type ProgramGroup = {
  title: string;
  sections: Array<{ title: string; assigned_to: unknown[] }>;
};

export type ScrapedMidweekMeeting = {
  year: number;
  ref: string;
  month: number;
  startAt: string;
  meeting_week_ref: number;
  endAt: string;
  yearWeek: number;
  bibleReading: string;
  songs: { initial: string; transitional: string; last: string };
  treasures: ProgramGroup;
  ministery: ProgramGroup;
  christianLife: ProgramGroup;
};

export type MidweekSourceItem = {
  url: string;
  meeting?: ScrapedMidweekMeeting;
};

function cleanText(value?: string | null) {
  return (value ?? "")
    .replace(/&nbsp;|&#8211;|&#45;/g, " ")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseDateParts(value: string) {
  const match = cleanText(value)
    .toLocaleLowerCase("pt-BR")
    .match(/^(\d{1,2})(?:\s*\.?\s*[ºª°])?(?:\s+de\s+([a-záàâãéêíóôõúç]+))?(?:\s+de\s+(\d{4}))?$/iu);
  if (!match) return null;
  const day = Number(match[1]);
  const month = match[2] ? months[match[2]] : undefined;
  const year = match[3] ? Number(match[3]) : undefined;
  if (day < 1 || day > 31 || (match[2] && month === undefined)) return null;
  return { day, month, year };
}

function dateAtCongregationMidnight(year: number, month: number, day: number) {
  const date = new Date(Date.UTC(year, month, day, 3));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return date;
}

function parseWeekRange(value: string, fallbackYear: number) {
  const parts = cleanText(value).split(/\s*[-–—]\s*/u);
  if (parts.length < 2) return null;

  const startParts = parseDateParts(parts[0]);
  const endParts = parseDateParts(parts.slice(1).join("-"));
  if (!startParts || !endParts || endParts.month === undefined) return null;

  const endYear = endParts.year ?? fallbackYear;
  const startMonth = startParts.month ?? endParts.month;
  const startYear =
    startParts.year ?? (startMonth > endParts.month ? endYear - 1 : endYear);
  const startAt = dateAtCongregationMidnight(startYear, startMonth, startParts.day);
  const endAt = dateAtCongregationMidnight(endYear, endParts.month, endParts.day);
  if (!startAt || !endAt || startAt.getTime() > endAt.getTime()) return null;
  return { startAt, endAt };
}

function getIsoWeek(date: Date) {
  const target = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  return Math.ceil(((target.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
}

export function parseJwPageUrl(value: string) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("Informe uma URL valida do jw.org.");
  }

  const hostname = url.hostname.toLocaleLowerCase("en-US");
  const allowedHost = hostname === "jw.org" || hostname.endsWith(".jw.org");
  if (
    url.protocol !== "https:" ||
    !allowedHost ||
    url.username ||
    url.password ||
    (url.port && url.port !== "443")
  ) {
    throw new Error("Somente URLs HTTPS do dominio jw.org sao permitidas.");
  }
  return url;
}

async function readHtml(response: Response) {
  const declaredLength = Number(response.headers.get("content-length") ?? 0);
  if (declaredLength > MAX_HTML_BYTES) throw new Error("A pagina do JW.org excede o limite de 5 MB.");
  if (!response.body) return response.text();

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let total = 0;
  let html = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_HTML_BYTES) {
      await reader.cancel();
      throw new Error("A pagina do JW.org excede o limite de 5 MB.");
    }
    html += decoder.decode(value, { stream: true });
  }
  return html + decoder.decode();
}

async function fetchJwHtml(value: string) {
  const url = parseJwPageUrl(value);
  let response: Response;
  try {
    response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; Varjotapp/1.0)",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "pt-BR,pt;q=0.9"
      },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS)
    });
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      throw new Error("O JW.org demorou mais de 15 segundos para responder.");
    }
    throw new Error("Nao foi possivel baixar a pagina do JW.org.");
  }

  parseJwPageUrl(response.url);
  if (!response.ok) throw new Error(`Falha ao baixar a pagina do JW.org: HTTP ${response.status}.`);
  const contentType = response.headers.get("content-type")?.toLocaleLowerCase("en-US") ?? "";
  if (!contentType.includes("text/html") && !contentType.includes("application/xhtml+xml")) {
    throw new Error("A URL informada nao retornou uma pagina HTML.");
  }

  return { html: await readHtml(response), url: response.url };
}

export function parseMidweekIssueLinks(html: string, sourceUrl: string) {
  const baseUrl = parseJwPageUrl(sourceUrl);
  const $ = cheerio.load(html);
  const links = new Set<string>();

  $(".synopsis.pub-mwb h2 a[href]").each((_, element) => {
    const href = $(element).attr("href");
    if (!href) return;
    try {
      const url = new URL(href, baseUrl);
      parseJwPageUrl(url.toString());
      links.add(url.toString());
    } catch {
      // Ignore malformed or external links instead of importing an unsafe URL.
    }
  });

  return [...links];
}

export async function inspectMidweekSource(value: string): Promise<MidweekSourceItem[]> {
  const page = await fetchJwHtml(value);
  const issueLinks = parseMidweekIssueLinks(page.html, page.url);
  if (issueLinks.length > MAX_MIDWEEK_ISSUE_WEEKS) {
    throw new Error(
      `A apostila possui mais de ${MAX_MIDWEEK_ISSUE_WEEKS} semanas e nao pode ser importada de uma vez.`
    );
  }
  if (issueLinks.length > 0) {
    return issueLinks.map((url) => ({ url }));
  }

  return [{ url: page.url, meeting: parseMidweekMeeting(page.html, page.url) }];
}

export async function scrapeMidweekMeeting(value: string) {
  const page = await fetchJwHtml(value);

  return parseMidweekMeeting(page.html, page.url);
}

export function parseMidweekMeeting(html: string, sourceUrl: string): ScrapedMidweekMeeting {
  const url = parseJwPageUrl(sourceUrl);
  const $ = cheerio.load(html);
  const urlYear = url.toString().match(/(\d{4})-mwb/i)?.[1];
  const publicationText = cleanText([
    $(".breadcrumbItem")
      .filter((_, element) => $(element).text().includes("Apostila da"))
      .first()
      .find("a")
      .text(),
    $("#documentCitationInformation").text(),
    $(".resultDocumentPubTitle").text(),
    $("#parentTitle").attr("value")
  ].join(" "));
  const publicationYear = publicationText.match(/\b20\d{2}\b/)?.[0];
  const year = Number(urlYear ?? publicationYear);
  if (!Number.isInteger(year)) throw new Error("Nao foi possivel determinar o ano da reuniao.");

  const weekText = cleanText($("h1[id*='p']").first().text());
  const range = parseWeekRange(weekText, year);
  if (!range) throw new Error(`Nao foi possivel interpretar a semana: "${weekText}".`);

  let songs: string[] = [];
  $("h3").each((_, element) => {
    const song = $(element)
      .find("strong")
      .map((__, strong) => cleanText($(strong).text()))
      .get()
      .find((text) => /^Cântico\s+\d+/iu.test(text));
    if (song) songs.push(song);
  });
  if (songs.length < 3) {
    songs = $(".pub-sjj")
      .map((_, element) => {
        const strong = $(element).find("strong").first();
        return cleanText(strong.length ? strong.text() : $(element).text());
      })
      .get();
  }
  const bibleReading = cleanText($("header a strong").first().text());
  const meeting = {
    treasures: { title: "", sections: [] } as ProgramGroup,
    ministery: { title: "", sections: [] } as ProgramGroup,
    christianLife: { title: "", sections: [] } as ProgramGroup
  };
  type Section = keyof typeof meeting;
  let currentSection: Section | null = null;

  $("h2, h3").each((_, element) => {
    const tagName = element.tagName?.toLocaleLowerCase("en-US");
    const text = cleanText($(element).text());
    if (!text) return;
    if (tagName === "h2") {
      const heading = text.toLocaleUpperCase("pt-BR");
      if (heading.includes("TESOUROS DA PALAVRA DE DEUS")) currentSection = "treasures";
      else if (heading.includes("FAÇA SEU MELHOR NO MINISTÉRIO")) currentSection = "ministery";
      else if (heading.includes("NOSSA VIDA CRISTÃ")) currentSection = "christianLife";
      else currentSection = null;
      if (currentSection) meeting[currentSection].title = text;
      return;
    }
    if (tagName === "h3" && currentSection && /^\d+\.\s/u.test(text)) {
      meeting[currentSection].sections.push({ title: text, assigned_to: [] });
    }
  });

  if (!bibleReading || songs.length < 3) {
    throw new Error("A pagina nao contem a leitura da Biblia e os tres canticos esperados.");
  }
  for (const [key, group] of Object.entries(meeting)) {
    if (!group.title || group.sections.length === 0) {
      throw new Error(`A secao ${key} nao foi encontrada ou nao possui partes.`);
    }
  }

  const yearWeek = getIsoWeek(range.startAt);
  return {
    year: range.startAt.getUTCFullYear(),
    ref: `0_${range.startAt.getUTCFullYear()}_${range.startAt.getUTCMonth()}_${yearWeek}`,
    month: range.startAt.getUTCMonth(),
    startAt: range.startAt.toISOString(),
    meeting_week_ref: 0,
    endAt: range.endAt.toISOString(),
    yearWeek,
    bibleReading,
    songs: {
      initial: songs[0],
      transitional: songs[1],
      last: songs[2]
    },
    ...meeting
  };
}
