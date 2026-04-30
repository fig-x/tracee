import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { GraphSetupGuide } from "./GraphSetupGuide";

describe("GraphSetupGuide", () => {
  it("renders the registration instructions for empty graph state", () => {
    const markup = renderToStaticMarkup(
      <MemoryRouter>
        <GraphSetupGuide onRefresh={vi.fn()} />
      </MemoryRouter>,
    );

    expect(markup).toContain("Register your workflow to unlock the graph view");
    expect(markup).toContain("tracee.init(");
    expect(markup).toContain("with tracee.trace():");
    expect(markup).toContain("optional metadata");
    expect(markup).toContain("read the setup guide");
  });
});
