import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getMock: vi.fn(),
  postMock: vi.fn(),
}));

vi.mock("./client", () => ({
  default: {
    get: mocks.getMock,
    post: mocks.postMock,
  },
}));

import { fetchCognition, runCognitionAnalysis } from "./cognition";

describe("cognition api", () => {
  beforeEach(() => {
    mocks.getMock.mockReset();
    mocks.postMock.mockReset();
  });

  it("fetches cognition with the active graph id", async () => {
    const cognition = { trace_id: "trace-1", graph_id: "graph-b" };
    mocks.getMock.mockResolvedValue({ data: cognition });

    const result = await fetchCognition("trace-1", "graph-b");

    expect(mocks.getMock).toHaveBeenCalledWith("/traces/trace-1/cognition", {
      params: { graph_id: "graph-b" },
    });
    expect(result).toEqual(cognition);
  });

  it("returns null only when cognition has not been generated yet", async () => {
    mocks.getMock.mockRejectedValue({
      response: {
        status: 404,
        data: { detail: "No cognition results for this trace. Run POST /analyze first." },
      },
    });

    await expect(fetchCognition("trace-1", "graph-b")).resolves.toBeNull();
  });

  it("preserves stale cognition errors for the hook to display", async () => {
    const staleError = {
      response: {
        status: 404,
        data: { detail: "Cached cognition is stale. Run POST /analyze again." },
      },
    };
    mocks.getMock.mockRejectedValue(staleError);

    await expect(fetchCognition("trace-1", "graph-b")).rejects.toEqual(staleError);
  });

  it("runs cognition analysis with the active graph id", async () => {
    const cognition = { trace_id: "trace-1", graph_id: "graph-b" };
    mocks.postMock.mockResolvedValue({ data: cognition });

    const result = await runCognitionAnalysis("trace-1", "graph-b");

    expect(mocks.postMock).toHaveBeenCalledWith("/traces/trace-1/analyze", null, {
      params: { graph_id: "graph-b" },
    });
    expect(result).toEqual(cognition);
  });
});
