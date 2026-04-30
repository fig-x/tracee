import { describe, expect, it } from "vitest";
import { normalizeLLMEndPayload } from "./traceNormalize";

describe("normalizeLLMEndPayload", () => {
  describe("token usage", () => {
    it("prefers canonical usage_metadata when present (works for all providers)", () => {
      const result = normalizeLLMEndPayload({
        usage_metadata: { input_tokens: 25, output_tokens: 11, total_tokens: 36 },
      });
      expect(result.tokenUsage).toEqual({ input: 25, output: 11, total: 36 });
    });

    it("falls back to legacy OpenAI-shaped token_usage", () => {
      const result = normalizeLLMEndPayload({
        token_usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
      });
      expect(result.tokenUsage).toEqual({ input: 10, output: 5, total: 15 });
    });

    it("falls back to legacy Anthropic-shaped token_usage keys", () => {
      const result = normalizeLLMEndPayload({
        token_usage: { input_tokens: 8, output_tokens: 3 },
      });
      expect(result.tokenUsage).toEqual({ input: 8, output: 3, total: 11 });
    });

    it("returns undefined when no usage data is present", () => {
      const result = normalizeLLMEndPayload({});
      expect(result.tokenUsage).toBeUndefined();
    });

    it("computes total when only input/output are given", () => {
      const result = normalizeLLMEndPayload({
        usage_metadata: { input_tokens: 7, output_tokens: 3 },
      });
      expect(result.tokenUsage).toEqual({ input: 7, output: 3, total: 10 });
    });

    it("ignores non-numeric token fields", () => {
      const result = normalizeLLMEndPayload({
        token_usage: { prompt_tokens: "lots", completion_tokens: null },
      });
      expect(result.tokenUsage).toBeUndefined();
    });
  });

  describe("tool calls", () => {
    it("normalizes OpenAI-style tool_calls (id, name, args)", () => {
      const result = normalizeLLMEndPayload({
        tool_calls: [
          { id: "call_abc", name: "get_weather", args: { city: "SF" } },
        ],
      });
      expect(result.toolCalls).toEqual([
        { id: "call_abc", name: "get_weather", args: { city: "SF" } },
      ]);
    });

    it("normalizes Anthropic-style tool_calls (toolu_ ids)", () => {
      const result = normalizeLLMEndPayload({
        tool_calls: [
          { id: "toolu_01ABC", name: "search", args: { q: "weather" }, type: "tool_call" },
        ],
      });
      expect(result.toolCalls).toEqual([
        { id: "toolu_01ABC", name: "search", args: { q: "weather" } },
      ]);
    });

    it("normalizes Gemini-style tool_calls", () => {
      const result = normalizeLLMEndPayload({
        tool_calls: [
          { id: "func_call_1", name: "get_time", args: {} },
        ],
      });
      expect(result.toolCalls).toEqual([
        { id: "func_call_1", name: "get_time", args: {} },
      ]);
    });

    it("returns empty array when no tool_calls in payload", () => {
      const result = normalizeLLMEndPayload({});
      expect(result.toolCalls).toEqual([]);
    });

    it("skips entries that lack a name", () => {
      const result = normalizeLLMEndPayload({
        tool_calls: [
          { id: "x", args: {} },
          { id: "y", name: "valid", args: { ok: true } },
        ],
      });
      expect(result.toolCalls).toEqual([
        { id: "y", name: "valid", args: { ok: true } },
      ]);
    });

    it("handles missing id (some providers omit it)", () => {
      const result = normalizeLLMEndPayload({
        tool_calls: [{ name: "do_thing", args: { a: 1 } }],
      });
      expect(result.toolCalls).toEqual([{ name: "do_thing", args: { a: 1 } }]);
    });

    it("returns empty array for non-array tool_calls field", () => {
      const result = normalizeLLMEndPayload({ tool_calls: "not an array" });
      expect(result.toolCalls).toEqual([]);
    });
  });

  describe("output text", () => {
    it("reads output_text first", () => {
      const result = normalizeLLMEndPayload({
        output_text: "hi there",
        output: "stale",
      });
      expect(result.outputText).toBe("hi there");
    });

    it("falls back to output", () => {
      const result = normalizeLLMEndPayload({ output: "fallback" });
      expect(result.outputText).toBe("fallback");
    });
  });
});
