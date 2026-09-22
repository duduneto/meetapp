import assert from "node:assert/strict";
import test from "node:test";
import { publicAssignmentsLinkFromCode } from "./publicLinks.js";

test("builds a short public catalog link", (context) => {
  const previous = process.env.PUBLIC_APP_URL;
  context.after(() => {
    if (previous === undefined) delete process.env.PUBLIC_APP_URL;
    else process.env.PUBLIC_APP_URL = previous;
  });
  process.env.PUBLIC_APP_URL = "https://varjotapp.example/public";

  assert.equal(
    publicAssignmentsLinkFromCode("AbCdEfGhIjKlMnOpQrStUv").toString(),
    "https://varjotapp.example/public/AbCdEfGhIjKlMnOpQrStUv"
  );
});

test("builds a short public meeting link with its selection", (context) => {
  const previous = process.env.PUBLIC_APP_URL;
  context.after(() => {
    if (previous === undefined) delete process.env.PUBLIC_APP_URL;
    else process.env.PUBLIC_APP_URL = previous;
  });
  process.env.PUBLIC_APP_URL = "https://varjotapp.example/public/";

  assert.equal(
    publicAssignmentsLinkFromCode("AbCdEfGhIjKlMnOpQrStUv", {
      year: 2026,
      month: 9,
      week: 39,
      type: "midweek"
    }).toString(),
    "https://varjotapp.example/public/AbCdEfGhIjKlMnOpQrStUv?year=2026&month=9&week=39&type=midweek"
  );
});
