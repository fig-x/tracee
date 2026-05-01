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

    expect(markup).toContain("No graph registered yet");
    expect(markup).toContain("pip install git+https://github.com/fig-x/tracee.git");
    expect(markup).toContain("tracee.init(");
    expect(markup).toContain("with tracee.trace():");
    expect(markup).toContain("Read the full setup guide");
  });
});
