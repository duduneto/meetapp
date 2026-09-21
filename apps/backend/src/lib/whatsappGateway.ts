import { z } from "zod";

export type WhatsAppGatewayMessage = {
  id: string;
  to: string;
  text: string;
};

const gatewayResponseSchema = z.object({
  ok: z.boolean(),
  totals: z.object({
    sent: z.number().int().nonnegative(),
    failed: z.number().int().nonnegative(),
    attempted: z.number().int().nonnegative()
  }),
  results: z.array(
    z.object({
      id: z.string(),
      status: z.enum(["sent", "failed"]),
      providerMessageId: z.string().optional(),
      error: z.string().optional()
    })
  )
});

export type WhatsAppGatewayResponse = z.infer<typeof gatewayResponseSchema>;

function gatewayUrl() {
  return (process.env.WHATSAPP_API_URL ?? "http://127.0.0.1:3999").replace(/\/+$/u, "");
}

function gatewayToken() {
  const token = process.env.WHATSAPP_API_TOKEN?.trim();
  if (!token) throw new Error("WHATSAPP_API_TOKEN nao configurado.");
  return token;
}

export async function sendWhatsAppMessages(
  batchId: string,
  messages: WhatsAppGatewayMessage[]
): Promise<WhatsAppGatewayResponse> {
  const timeoutMs = Number(process.env.WHATSAPP_API_TIMEOUT_MS ?? 180_000);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${gatewayUrl()}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${gatewayToken()}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ batchId, messages }),
      signal: controller.signal
    });
    const body: unknown = await response.json().catch(() => null);

    if (!response.ok) {
      const message =
        body && typeof body === "object" && "error" in body && typeof body.error === "string"
          ? body.error
          : `Gateway do WhatsApp respondeu HTTP ${response.status}.`;
      throw new Error(message);
    }

    return gatewayResponseSchema.parse(body);
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Gateway do WhatsApp excedeu o timeout de ${timeoutMs}ms.`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
