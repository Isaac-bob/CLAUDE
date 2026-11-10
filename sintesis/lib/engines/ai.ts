import { EngineError, EngineMissingError } from "./errors";

// Proveedor de IA. Requiere ANTHROPIC_API_KEY en el servidor; sin clave la función queda
// marcada como «requiere configuración» y nunca se simula una respuesta.
export function aiConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export async function aiComplete(opts: { system: string; user: string; maxTokens?: number }): Promise<string> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new EngineMissingError("Esta función requiere configurar ANTHROPIC_API_KEY en el servidor.");
  const model = process.env.SINTESIS_AI_MODEL ?? "claude-sonnet-5-5";
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model,
      max_tokens: opts.maxTokens ?? 2000,
      system: opts.system,
      messages: [{ role: "user", content: opts.user }],
    }),
    signal: AbortSignal.timeout(120_000),
  });
  if (!res.ok) throw new EngineError(`El servicio de IA respondió con error (${res.status}).`);
  const data = (await res.json()) as { content?: { type: string; text?: string }[] };
  const text = (data.content ?? []).filter((c) => c.type === "text").map((c) => c.text ?? "").join("\n").trim();
  if (!text) throw new EngineError("El servicio de IA no devolvió texto.");
  return text;
}
