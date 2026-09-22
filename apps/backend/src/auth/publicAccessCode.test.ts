import assert from "node:assert/strict";
import test from "node:test";
import { generatePublicAccessCode, isPublicAccessCode } from "./publicAccessCode.js";

test("creates a short URL-safe public access code", () => {
  const code = generatePublicAccessCode();

  assert.equal(code.length, 22);
  assert.equal(isPublicAccessCode(code), true);
  assert.equal(isPublicAccessCode(`${code}.invalid`), false);
});
