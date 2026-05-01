import { Link } from "react-router-dom";
import "../docs/docs.css";
import iconInfoOctagon from "../../assets/icon-info-octagon.svg";
import iconLightbulb from "../../assets/icon-lightbulb.svg";

const sdkInstallSnippet = `pip install git+https://github.com/fig-x/tracee.git`;

const registrationSnippet = `import tracee

# compile your LangGraph workflow as usual
app = workflow.compile()

# register the graph topology with the Tracee server
tracee.init(
    app,
    graph_id="your-graph-id",
    name="Your workflow name",
    server_url="http://localhost:8000",
)

# wrap any invocation in tracee.trace() to record it
with tracee.trace():
    app.invoke(initial_state)`;

function CodeBlock({ code, label }: { code: string; label?: string }) {
  return (
    <div className="docs__code-wrapper">
      {label && <p className="docs__code-label">{label}</p>}
      <div className="docs__code-container">
        <pre className="docs__code"><code>{code}</code></pre>
      </div>
    </div>
  );
}

interface GraphSetupGuideProps {
  onRefresh: () => void;
}

export function GraphSetupGuide({ onRefresh }: GraphSetupGuideProps) {
  return (
    <div
      style={{
        height: "100%",
        overflowY: "auto",
        background: "#f8f9fb",
        padding: "40px 48px 80px",
      }}
    >
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <div className="docs__content" style={{ maxWidth: "none" }}>
          <header className="docs__hero">
              <p className="docs__eyebrow">graph setup</p>
              <h1 className="docs__title">No graph registered yet</h1>
              <p className="docs__lede">
                The Graph page only renders workflows that have been registered from your codebase.
                Install the Tracee SDK in your application's environment, add one setup call when you
                compile your graph, run a traced execution, then check again here.
              </p>
            </header>

            <h2 className="docs__section-title">Setup steps</h2>

            <h3 className="docs__subsection-title">1. Install the Tracee SDK in your app</h3>
            <p className="docs__prose">
              The server you are looking at right now lives in the cloned <code>tracee</code> repository.
              Your application is a different process — usually a different virtualenv — and needs the
              SDK installed there so <code>import tracee</code> resolves and you can call
              <code> tracee.init()</code> and <code>tracee.trace()</code>.
            </p>
            <p className="docs__prose">From inside your application's project (not the cloned server repo), run:</p>
            <CodeBlock code={sdkInstallSnippet} label="install the Tracee SDK in your app's environment" />
            <aside className="docs__callout docs__callout--info">
              <img src={iconInfoOctagon} alt="" className="docs__callout-icon" />
              <div className="docs__callout-body">
                <p className="docs__callout-title">Why a separate install?</p>
                <div className="docs__callout-text">
                  <p>
                    The cloned repo runs the Tracee server (UI + API at <code>http://localhost:8000</code>).
                    Installing the SDK in your app's environment is what lets your application publish its
                    graph topology and stream traces to that server.
                  </p>
                </div>
              </div>
            </aside>

            <h3 className="docs__subsection-title">2. Point your app at this server</h3>
            <p className="docs__prose">
              Use the same base URL the UI is reading from — usually <code>http://localhost:8000</code> during
              local development. Pass it as <code>server_url</code> to <code>tracee.init()</code>.
            </p>

            <h3 className="docs__subsection-title">3. Register the compiled graph once</h3>
            <p className="docs__prose">
              Call <code>tracee.init(...)</code> right after <code>workflow.compile()</code>. That publishes
              the topology to <code>/api/graphs</code> and makes the graph page discoverable.
            </p>
            <CodeBlock code={registrationSnippet} label="minimal registration example" />

            <h3 className="docs__subsection-title">4. Run executions inside <code>tracee.trace()</code></h3>
            <p className="docs__prose">
              The graph page shows structure as soon as registration succeeds. The execution layer lights up
              once traced runs are sent to the server.
            </p>
            <aside className="docs__callout docs__callout--tip">
              <img src={iconLightbulb} alt="" className="docs__callout-icon" />
              <div className="docs__callout-body">
                <p className="docs__callout-title">Add node metadata for richer agent cards</p>
                <div className="docs__callout-text">
                  <p>
                    Include <code>prompt_id</code>, <code>model</code>, and <code>has_tools</code> in your
                    <code> add_node(..., metadata=&#123;...&#125;)</code> calls so each agent card surfaces
                    useful context.
                  </p>
                </div>
              </div>
            </aside>

            <div style={{ marginTop: 32, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={onRefresh}
                style={{
                  border: "1px solid #219ebc",
                  background: "#219ebc",
                  color: "#ffffff",
                  padding: "10px 16px",
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Check again
              </button>
              <Link
                to="/docs"
                style={{ fontSize: 13, fontWeight: 600, color: "#219ebc", textDecoration: "none" }}
              >
                Read the full setup guide →
              </Link>
            </div>
        </div>
      </div>
    </div>
  );
}
