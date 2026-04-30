import type { NormalizedToolCall } from "../types/node-data";

export interface NormalizedTokenUsage {
  input: number;
  output: number;
  total: number;
}

export interface NormalizedLLMEnd {
  outputText?: unknown;
  toolCalls: NormalizedToolCall[];
  tokenUsage?: NormalizedTokenUsage;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const numericField = (
  source: Record<string, unknown> | undefined,
  ...keys: string[]
): number | undefined => {
  if (!source) return undefined;
  for (const key of keys) {
    const v = source[key];
    if (typeof v === "number" && Number.isFinite(v)) return v;
  }
  return undefined;
};

function normalizeTokenUsage(
  payload: Record<string, unknown>,
): NormalizedTokenUsage | undefined {
  // canonical: AIMessage.usage_metadata, populated by OpenAI / Anthropic / Gemini
  // via LangChain integrations.
  const canonical = isRecord(payload.usage_metadata) ? payload.usage_metadata : undefined;
  // legacy: response.llm_output.token_usage, provider-keyed
  const legacy = isRecord(payload.token_usage) ? payload.token_usage : undefined;

  const input = numericField(canonical, "input_tokens")
    ?? numericField(legacy, "prompt_tokens", "input_tokens");
  const output = numericField(canonical, "output_tokens")
    ?? numericField(legacy, "completion_tokens", "output_tokens");
  const explicitTotal = numericField(canonical, "total_tokens")
    ?? numericField(legacy, "total_tokens");

  if (input === undefined && output === undefined && explicitTotal === undefined) {
    return undefined;
  }

  const safeInput = input ?? 0;
  const safeOutput = output ?? 0;
  const total = explicitTotal ?? safeInput + safeOutput;

  return { input: safeInput, output: safeOutput, total };
}

function normalizeToolCalls(payload: Record<string, unknown>): NormalizedToolCall[] {
  const raw = payload.tool_calls;
  if (!Array.isArray(raw)) return [];

  const out: NormalizedToolCall[] = [];
  for (const entry of raw) {
    if (!isRecord(entry)) continue;
    const name = entry.name;
    if (typeof name !== "string" || name.length === 0) continue;

    const normalized: NormalizedToolCall = {
      name,
      args: entry.args ?? entry.arguments ?? {},
    };
    if (typeof entry.id === "string") {
      normalized.id = entry.id;
    }
    out.push(normalized);
  }
  return out;
}

/**
 * Normalize an on_llm_end payload into provider-agnostic fields.
 *
 * LangChain populates AIMessage.tool_calls and AIMessage.usage_metadata with
 * the same canonical shape across OpenAI, Anthropic, and Gemini, so this
 * normalizer reads canonical fields first and falls back to legacy provider
 * keys (prompt_tokens/completion_tokens) only when the canonical fields are
 * absent.
 */
export function normalizeLLMEndPayload(
  payload: Record<string, unknown> | undefined | null,
): NormalizedLLMEnd {
  const safe = payload ?? {};
  return {
    outputText: safe.output_text ?? safe.output,
    toolCalls: normalizeToolCalls(safe),
    tokenUsage: normalizeTokenUsage(safe),
  };
}
