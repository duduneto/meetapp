import assert from "node:assert/strict";
import test from "node:test";
import { deriveWhatsappFromBrPhone11, normalizeBrPhone11 } from "./phoneBr.js";
import { isDigitsOnlyQuery, normalizeLeadingZeros, sanitizeSearchText } from "./textSanitize.js";

test("sanitizeSearchText strips accents and symbols", () => {
  assert.equal(sanitizeSearchText("Você conhece bem a Deus?"), "voce conhece bem a deus");
});

test("normalizeLeadingZeros strips zeros", () => {
  assert.equal(normalizeLeadingZeros("01"), "1");
  assert.equal(normalizeLeadingZeros("005"), "5");
  assert.equal(normalizeLeadingZeros("0"), "0");
});

test("isDigitsOnlyQuery", () => {
  assert.equal(isDigitsOnlyQuery("01"), true);
  assert.equal(isDigitsOnlyQuery("Você"), false);
});

test("normalizeBrPhone11 and whatsapp derivation", () => {
  assert.equal(normalizeBrPhone11("(85) 98888-7777"), "85988887777");
  assert.equal(normalizeBrPhone11("5585988887777"), "85988887777");
  assert.equal(normalizeBrPhone11("8588887777"), null);
  assert.equal(deriveWhatsappFromBrPhone11("85988887777"), "8588887777");
});
