import assert from "node:assert/strict";
import test from "node:test";
import {
  parseJwPageUrl,
  parseMidweekIssueLinks,
  parseMidweekMeeting
} from "./jwMwbScraper.js";

const html = `
  <div id="documentCitationInformation">Nossa Vida e Ministério Cristão — Apostila do Mês — 2026</div>
  <h1 id="p1">5–11 de outubro de 2026</h1>
  <header><a><strong>JEREMIAS 40-41</strong></a></header>
  <h3 class="dc-icon--music"><strong>Cântico 33</strong> e oração</h3>
  <h2>TESOUROS DA PALAVRA DE DEUS</h2>
  <h3>1. Tenha o ponto de vista correto</h3>
  <h3>2. Joias espirituais</h3>
  <h3>3. Leitura da Bíblia</h3>
  <h2>FAÇA SEU MELHOR NO MINISTÉRIO</h2>
  <h3>4. Iniciando conversas</h3>
  <h3 class="dc-icon--music"><strong>Cântico 17</strong></h3>
  <h2>NOSSA VIDA CRISTÃ</h2>
  <h3>5. Estudo bíblico de congregação</h3>
  <h3>Comentários finais | <span class="dc-icon--music"><strong>Cântico 38</strong></span> e oração</h3>
`;

test("parses a Portuguese midweek meeting page", () => {
  const meeting = parseMidweekMeeting(
    html,
    "https://wol.jw.org/pt/wol/d/r5/lp-t/202026256"
  );
  assert.equal(meeting.ref, "0_2026_9_41");
  assert.equal(meeting.startAt, "2026-10-05T03:00:00.000Z");
  assert.equal(meeting.endAt, "2026-10-11T03:00:00.000Z");
  assert.equal(meeting.songs.transitional, "Cântico 17");
  assert.equal(meeting.treasures.sections.length, 3);
  assert.equal(meeting.ministery.sections.length, 1);
  assert.equal(meeting.christianLife.sections.length, 1);
  assert.equal(meeting.ministery.sections[0].title, "4. Iniciando conversas");
});

test("parses an ordinal day in a week crossing into the next month", () => {
  const meeting = parseMidweekMeeting(
    html.replace("5–11 de outubro de 2026", "26 de outubro–1.º de novembro"),
    "https://www.jw.org/pt/biblioteca/jw-apostila-do-mes/setembro-outubro-2026-mwb/week/"
  );

  assert.equal(meeting.ref, "0_2026_9_44");
  assert.equal(meeting.startAt, "2026-10-26T03:00:00.000Z");
  assert.equal(meeting.endAt, "2026-11-01T03:00:00.000Z");
});

test("only accepts HTTPS URLs hosted by jw.org", () => {
  assert.equal(parseJwPageUrl("https://wol.jw.org/pt/wol").hostname, "wol.jw.org");
  assert.throws(() => parseJwPageUrl("http://wol.jw.org/pt/wol"));
  assert.throws(() => parseJwPageUrl("https://example.com/page"));
  assert.throws(() => parseJwPageUrl("https://jw.org.example.com/page"));
});

test("discovers and deduplicates weekly meeting links from an issue page", () => {
  const issueHtml = `
    <div class="synopsis publications pub-mwb">
      <a href="/pt/week-one/">image</a>
      <h2><a href="/pt/week-one/">1-7 de setembro</a></h2>
    </div>
    <div class="synopsis publications pub-mwb">
      <h2><a href="https://www.jw.org/pt/week-two/">8-14 de setembro</a></h2>
    </div>
    <div class="synopsis publications pub-mwb">
      <h2><a href="https://example.com/not-allowed">external</a></h2>
    </div>
  `;

  assert.deepEqual(
    parseMidweekIssueLinks(issueHtml, "https://www.jw.org/pt/biblioteca/apostila/"),
    ["https://www.jw.org/pt/week-one/", "https://www.jw.org/pt/week-two/"]
  );
});

test("does not mistake an individual meeting page for an issue", () => {
  assert.deepEqual(
    parseMidweekIssueLinks(html, "https://www.jw.org/pt/biblioteca/semana/"),
    []
  );
});
