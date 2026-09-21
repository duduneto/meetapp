import assert from "node:assert/strict";
import test from "node:test";
import { participationLinkFromCode } from "./participationLinks.js";

test("builds a participation link from a normalized configured base URL", (context) => {
  const previous = process.env.PARTICIPATION_APP_URL;
  context.after(() => {
    if (previous === undefined) delete process.env.PARTICIPATION_APP_URL;
    else process.env.PARTICIPATION_APP_URL = previous;
  });
  process.env.PARTICIPATION_APP_URL = "https://varjotapp.example/participation/?ignored=true";

  assert.equal(
    participationLinkFromCode("abc_123-test"),
    "https://varjotapp.example/participation/abc_123-test"
  );
});
