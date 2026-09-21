import assert from "node:assert/strict";
import { createServer } from "node:http";
import test from "node:test";
import { sendWhatsAppMessages } from "./whatsappGateway.js";

test("sends the authenticated batch expected by the WhatsApp gateway", async (context) => {
  const previousUrl = process.env.WHATSAPP_API_URL;
  const previousToken = process.env.WHATSAPP_API_TOKEN;
  const previousTimeout = process.env.WHATSAPP_API_TIMEOUT_MS;
  let receivedAuthorization = "";
  let receivedBody = "";

  const server = createServer((request, response) => {
    receivedAuthorization = request.headers.authorization ?? "";
    request.setEncoding("utf8");
    request.on("data", (chunk) => {
      receivedBody += chunk;
    });
    request.on("end", () => {
      response.setHeader("Content-Type", "application/json");
      response.end(
        JSON.stringify({
          ok: true,
          totals: { sent: 1, failed: 0, attempted: 1 },
          results: [{ id: "notification-1", status: "sent", providerMessageId: "wa-1" }]
        })
      );
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  context.after(() => {
    server.close();
    if (previousUrl === undefined) delete process.env.WHATSAPP_API_URL;
    else process.env.WHATSAPP_API_URL = previousUrl;
    if (previousToken === undefined) delete process.env.WHATSAPP_API_TOKEN;
    else process.env.WHATSAPP_API_TOKEN = previousToken;
    if (previousTimeout === undefined) delete process.env.WHATSAPP_API_TIMEOUT_MS;
    else process.env.WHATSAPP_API_TIMEOUT_MS = previousTimeout;
  });

  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Test server did not bind.");
  process.env.WHATSAPP_API_URL = `http://127.0.0.1:${address.port}`;
  process.env.WHATSAPP_API_TOKEN = "internal-test-token";
  process.env.WHATSAPP_API_TIMEOUT_MS = "1000";

  const result = await sendWhatsAppMessages("batch-1", [
    { id: "notification-1", to: "5585999999999", text: "Mensagem" }
  ]);

  assert.equal(receivedAuthorization, "Bearer internal-test-token");
  assert.deepEqual(JSON.parse(receivedBody), {
    batchId: "batch-1",
    messages: [{ id: "notification-1", to: "5585999999999", text: "Mensagem" }]
  });
  assert.equal(result.results[0]?.providerMessageId, "wa-1");
});
