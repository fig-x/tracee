import { describe, expect, it } from "vitest";
import { diffStateKeys } from "./traceEventUtils";

describe("diffStateKeys", () => {
  it("ignores placeholder-only empty transitions", () => {
    expect(
      diffStateKeys(
        {
          scratchpad: {},
          draft_items: [],
          summary: "",
        },
        {
          scratchpad: [],
          draft_items: {},
          summary: "   ",
        },
      ),
    ).toEqual([]);
  });

  it("still reports real scalar changes", () => {
    expect(
      diffStateKeys(
        {
          attempts: 0,
          is_complete: false,
        },
        {
          attempts: 1,
          is_complete: true,
        },
      ),
    ).toEqual(["attempts", "is_complete"]);
  });

  it("keeps added or removed empty placeholders as real changes", () => {
    expect(
      diffStateKeys(
        {},
        {
          scratchpad: [],
        },
      ),
    ).toEqual(["scratchpad"]);

    expect(
      diffStateKeys(
        {
          scratchpad: {},
        },
        {},
      ),
    ).toEqual(["scratchpad"]);
  });
});
