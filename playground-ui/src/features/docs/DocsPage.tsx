import { useState, useEffect, useRef, useCallback } from "react";
import "./docs.css";
import intentLayerImg from "./img/intent-layer.png";
import executionLayerImg from "./img/execution-layer.png";
import cognitionLayerImg from "./img/cognition-layer.png";
import nodeImg from "./img/node.png";
import nodeDetailIntentImg from "./img/node-detail-intent.png";
import nodeDetailExecutionImg from "./img/node-detail-execution.png";
import nodeDetailCognitionImg from "./img/node-detail-cognition.png";
import executionTimelineImg from "./img/node-detail-execution-timeline.png";
import cognitionSummaryImg from "./img/cognition-layer-summary.png";
import iconLightbulb from "../../assets/icon-lightbulb.svg";
import iconInfoOctagon from "../../assets/icon-info-octagon.svg";
import pgWorkspaceImg from "./img/playground-workspace.png";
import pgOverviewPanelImg from "./img/prompt-overview-panel.png";
import pgAddComponentImg from "./img/playground-add-component.png";
import pgComponentsImg from "./img/playground-prompt-components.png";
import pgConfigImg from "./img/playground-configurations.png";
import pgStartPopImg from "./img/playground-start-with-pop.png";
import pgAnalysisOverviewImg from "./img/playground-analysis-overview.png";
import pgScatterplotImg from "./img/playground-scatterplot.png";
import pgScatterplotAnchorImg from "./img/playground-scatterplot-with-anchor.png";
import pgRunDetailImg from "./img/playground-run-detail.png";
import pgRunDiffImg from "./img/playground-run-diff.png";
import pgAnchorImg from "./img/playground-anchor.png";
import pgVersionTreeImg from "./img/playground-version-tree.png";
import loopDiagramImg from "./img/loop-diagram.png";

/* ── types ─────────────────────────────────────────── */
interface TocEntry { id: string; label: string; depth?: number }
interface PageDef { id: string; label: string; toc: TocEntry[] }

/* ── page definitions with TOC ─────────────────────── */
const pages: PageDef[] = [
  {
    id: "overview",
    label: "Overview",
    toc: [
      { id: "what-is-tracee", label: "What is Tracee" },
      { id: "why-tracee", label: "Why Tracee" },
      { id: "core-concepts", label: "Core Concepts" },
      { id: "workflow-loop", label: "Workflow" },
    ],
  },
  {
    id: "setup",
    label: "Setup Guide",
    toc: [
      { id: "prerequisites", label: "Prerequisites" },
      { id: "install", label: "Install the package" },
      { id: "start-server", label: "Start the server" },
      { id: "configure-env", label: "Configure environment" },
      { id: "instrument-app", label: "Instrument your app" },
      { id: "verify", label: "Verify the connection" },
    ],
  },
  {
    id: "graph",
    label: "Graph",
    toc: [
      { id: "graph-registration", label: "Registering a graph" },
      { id: "intent-layer", label: "Intent layer" },
      { id: "execution-layer", label: "Execution layer" },
      { id: "agent-node", label: "Agent node", depth: 1 },
      { id: "execution-detail-panel", label: "Execution detail panel", depth: 1 },
      { id: "operations-timeline", label: "Operations timeline", depth: 1 },
      { id: "cognition-layer", label: "Cognition layer" },
    ],
  },
  {
    id: "playground",
    label: "Playground",
    toc: [
      { id: "pg-creating", label: "Creating a prompt" },
      { id: "pg-workspace", label: "Workspace layout" },
      { id: "pg-components", label: "Prompt components" },
      { id: "pg-component-card", label: "Component card", depth: 1 },
      { id: "pg-resolved", label: "Resolved view", depth: 1 },
      { id: "pg-config", label: "Configuration panels" },
      { id: "pg-model", label: "Model config", depth: 1 },
      { id: "pg-variables", label: "Variables", depth: 1 },
      { id: "pg-tools", label: "Tools", depth: 1 },
      { id: "pg-schema", label: "Output schema", depth: 1 },
      { id: "pg-guided", label: "Guided start" },
      { id: "pg-running", label: "Running experiments" },
      { id: "pg-results", label: "Analyzing results" },
      { id: "pg-scatter", label: "Scatter plot", depth: 1 },
      { id: "pg-run-detail", label: "Run detail", depth: 1 },
      { id: "pg-anchor", label: "Anchor workflow", depth: 1 },
      { id: "pg-saving", label: "Saving and versioning" },
    ],
  },
  {
    id: "prompts",
    label: "Prompts",
    toc: [
      { id: "prompt-list", label: "Prompt list and search" },
      { id: "version-tree", label: "Version tree" },
      { id: "components-resolved-diff", label: "Components / Resolved / Diff" },
      { id: "load-into-playground", label: "Loading into Playground" },
    ],
  },
  {
    id: "troubleshooting",
    label: "Troubleshooting",
    toc: [
      { id: "ts-graph-empty", label: "Graph page is empty" },
      { id: "ts-no-traces", label: "No traces" },
      { id: "ts-no-diff", label: "Diff tab missing" },
      { id: "ts-missing-version", label: "Missing prompt version" },
      { id: "ts-no-cognition", label: "Cognition unavailable" },
    ],
  },
];

/* ── code snippets ─────────────────────────────────── */
const installSnippet = `uv add tracee`;
const installPipSnippet = `pip install tracee`;
const installServerSnippet = `uv add 'tracee[server]'`;
const startServerSnippet = `tracee serve`;
const startServerOptionsSnippet = `tracee serve --port 8000 --host 0.0.0.0`;
const envSnippet = `# .env (in the directory where you run tracee serve)
OPENAI_API_KEY=sk-...
CORS_ORIGINS=http://localhost:5173,http://localhost:3000`;

const integrationSnippet = `import tracee

# compile your LangGraph workflow as usual
app = workflow.compile()

# register the graph topology with the Tracee server
tracee.init(
    app,
    graph_id="my-workflow",
    name="My Workflow",
)

# wrap any invocation in tracee.trace() to record it
with tracee.trace():
    result = app.invoke(initial_state)`;

const registrationSnippet = `import tracee

app = workflow.compile()

tracee.init(
    app,
    graph_id="your-graph-id",
    name="Your workflow name",
)

with tracee.trace():
    app.invoke(initial_state)`;

const metadataSnippet = `workflow.add_node("planner", create_planner_agent, metadata={
    "prompt_id": "planner-prompt",
    "model": "gpt-4o-mini",
    "has_tools": True,
})`;

/* ── shared components ─────────────────────────────── */
function ScreenshotPlaceholder({ title, guidance, src, maxWidth }: { title: string; guidance: string; src?: string; maxWidth?: number }) {
  return (
    <figure className="docs__screenshot" style={maxWidth ? { maxWidth } : undefined}>
      {src ? (
        <div className="docs__screenshot-frame docs__screenshot-frame--image">
          <img src={src} alt={title} className="docs__screenshot-img" loading="lazy" />
        </div>
      ) : (
        <div className="docs__screenshot-frame">
          <span className="docs__screenshot-icon">&#128247;</span>
          <p className="docs__screenshot-title">{title}</p>
        </div>
      )}
      <figcaption className="docs__screenshot-caption">{guidance}</figcaption>
    </figure>
  );
}

const pythonKeywords = new Set([
  "import", "from", "as", "def", "class", "return", "if", "elif", "else",
  "for", "while", "with", "try", "except", "finally", "raise", "yield",
  "and", "or", "not", "in", "is", "None", "True", "False", "pass", "break",
  "continue", "lambda", "del", "global", "nonlocal", "assert", "async", "await",
]);

function highlightPython(code: string): React.ReactNode[] {
  return code.split("\n").map((line, lineIdx, lines) => {
    const parts: React.ReactNode[] = [];
    let i = 0;
    while (i < line.length) {
      if (line[i] === "#") {
        parts.push(<span key={`${lineIdx}-${i}`} className="hl-comment">{line.slice(i)}</span>);
        i = line.length;
        continue;
      }
      if (line[i] === '"' || line[i] === "'") {
        const quote = line[i];
        const triple = line.slice(i, i + 3) === quote.repeat(3);
        const end = triple ? quote.repeat(3) : quote;
        const start = i;
        i += triple ? 3 : 1;
        while (i < line.length) {
          if (line[i] === "\\" && i + 1 < line.length) { i += 2; continue; }
          if (line.slice(i, i + end.length) === end) { i += end.length; break; }
          i++;
        }
        parts.push(<span key={`${lineIdx}-${start}`} className="hl-string">{line.slice(start, i)}</span>);
        continue;
      }
      if (/[a-zA-Z_]/.test(line[i])) {
        const start = i;
        while (i < line.length && /[a-zA-Z0-9_]/.test(line[i])) i++;
        const word = line.slice(start, i);
        if (pythonKeywords.has(word)) {
          parts.push(<span key={`${lineIdx}-${start}`} className="hl-keyword">{word}</span>);
        } else {
          parts.push(word);
        }
        continue;
      }
      if (/[0-9]/.test(line[i])) {
        const start = i;
        while (i < line.length && /[0-9.]/.test(line[i])) i++;
        parts.push(<span key={`${lineIdx}-${start}`} className="hl-number">{line.slice(start, i)}</span>);
        continue;
      }
      const start = i;
      while (i < line.length && !/[a-zA-Z_0-9#"']/.test(line[i])) i++;
      parts.push(line.slice(start, i));
    }
    return <span key={lineIdx}>{parts}{lineIdx < lines.length - 1 ? "\n" : ""}</span>;
  });
}

function CodeBlock({ code, label }: { code: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="docs__code-wrapper">
      {label && <p className="docs__code-label">{label}</p>}
      <div className="docs__code-container">
        <button type="button" className="docs__code-copy" onClick={handleCopy} aria-label="Copy code">
          {copied ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
          )}
        </button>
        <pre className="docs__code"><code>{highlightPython(code)}</code></pre>
      </div>
    </div>
  );
}

const calloutIcons: Record<string, string> = { info: iconInfoOctagon, tip: iconLightbulb, warning: iconInfoOctagon };

function Callout({ type, title, children }: { type: "info" | "tip" | "warning"; title?: string; children: React.ReactNode }) {
  return (
    <aside className={`docs__callout docs__callout--${type}`}>
      <img src={calloutIcons[type]} alt="" className="docs__callout-icon" />
      <div className="docs__callout-body">
        {title && <p className="docs__callout-title">{title}</p>}
        <div className="docs__callout-text">{children}</div>
      </div>
    </aside>
  );
}

/* ── page content components ───────────────────────── */

function OverviewPage() {
  return (
    <>
      <header className="docs__hero">
        <p className="docs__eyebrow">tracee documentation</p>
        <h1 className="docs__title">Build, inspect, and iterate on agentic workflows</h1>
        <p className="docs__lede">
          Tracee is an observability and prompt-engineering toolkit for multi-agent systems built on LangGraph.
          Existing applications usually provide poor navigation and little visibility into your system structure.
          It introduces a new way of navigating your LangGraph execution traces by providing a Graph page that allows you to visualize the execution of your workflow.
          It also provides a Playground page that allows you to author and experiment with prompts, and a Prompts page that allows you to browse and compare your saved prompts.
        </p>
      </header>

      <div className="docs__overview-grid">
        <div className="docs__overview-card">
          <h3 className="docs__overview-card-title">Graph</h3>
          <p className="docs__overview-card-desc">
            Visualize agent topology, inspect execution traces frame-by-frame, and run cognition analysis on completed runs.
          </p>
        </div>
        <div className="docs__overview-card">
          <h3 className="docs__overview-card-title">Playground</h3>
          <p className="docs__overview-card-desc">
            Author prompts with structured components, run experiments against live models, and compare outputs side by side.
          </p>
        </div>
        <div className="docs__overview-card">
          <h3 className="docs__overview-card-title">Prompts</h3>
          <p className="docs__overview-card-desc">
            Browse your saved prompt library, compare versions with a visual diff, and load any version into the playground.
          </p>
        </div>
      </div>

      <h2 id="why-tracee" className="docs__section-title" style={{ marginTop: 48 }}>Why Tracee</h2>
      <h3 id="what-is-tracee" className="docs__subsection-title">The problem</h3>
      <p className="docs__prose">
        Agentic workflows built on frameworks like LangGraph are powerful, but developing them is
        slow because iteration happens in two loops. First comes the inner loop: developers work on
        one agent at a time, repeatedly testing, observing outputs, and refining its prompt until
        that agent behaves reliably enough. Then comes the outer loop: they run the full workflow,
        trace how agents interact, watch for failures and edge cases, and feed what they learn back
        into prompt refinement. Much of the time is spent moving between these two loops under
        stochastic behavior, where small prompt changes can have unclear effects and one weak agent
        can destabilize the whole system.
      </p>
      <ScreenshotPlaceholder
        title="Two loops in agentic workflow development"
        guidance="The inner loop focuses on refining one agent at a time. The outer loop tests the full workflow, traces failures and edge cases, and feeds those findings back into prompt iteration."
        src={loopDiagramImg}
        maxWidth={920}
      />


      <h3 className="docs__subsection-title">Why the Playground exists</h3>
      <p className="docs__prose">
        The Playground is designed for the inner loop: the repeated process of testing one agent,
        observing its outputs, and refining its prompt. Since prompts are the most frequently
        changed part of an agentic system, developers need a fast way to run an agent multiple
        times, compare outputs, surface outliers, and decide what to change next. The Playground
        supports that inner loop directly by letting you iterate on prompts, run them against a
        live model, compare outputs side by side, inspect output patterns in a scatter plot, and
        save versions without touching your application code.
      </p>

      <h3 className="docs__subsection-title">Why the Graph Viewer exists</h3>
      <p className="docs__prose">
        The Graph Viewer is designed to support the outer loop of agentic workflow development.
        Once developers move beyond refining a single agent, they need to run the whole system,
        trace what happened across agents, and locate where failures or edge cases emerged. The
        Graph Viewer supports that outer loop by separating what your system <em>is</em> from what
        it <em>did</em>. It combines three layers:
      </p>
      <ul className="docs__list">
        <li>
          <strong>Intent layer</strong> — the static topology of your compiled workflow, including paths
          that may not execute in a given run.
        </li>
        <li>
          <strong>Execution layer</strong> — the runtime trace of a specific invocation, overlaid on the
          intent graph so you can see exactly which path was taken.
        </li>
        <li>
          <strong>Cognition layer</strong> — an AI-supported analysis of a completed trace, summarizing
          decisions at both the node and trace level.
        </li>
      </ul>


      <h2 id="core-concepts" className="docs__section-title" style={{ marginTop: 48 }}>Core Concepts</h2>
      <p className="docs__prose">
        These are the key abstractions you will encounter throughout Tracee.
      </p>
      <dl className="docs__definition-list">
        <div className="docs__definition">
          <dt className="docs__term">Graph</dt>
          <dd className="docs__desc">A directed topology of agents and terminal states that mirrors the compiled LangGraph workflow.</dd>
        </div>
        <div className="docs__definition">
          <dt className="docs__term">Trace</dt>
          <dd className="docs__desc">A recorded execution of a graph — state transitions, LLM calls, tool invocations, and outputs from a single <code>app.invoke()</code> run.</dd>
        </div>
        <div className="docs__definition">
          <dt className="docs__term">Prompt</dt>
          <dd className="docs__desc">A structured template of components, tool definitions, variables, and an output schema. The primary unit of authoring in the Playground.</dd>
        </div>
        <div className="docs__definition">
          <dt className="docs__term">Layer</dt>
          <dd className="docs__desc">The Graph page supports three viewing layers — <strong>Intent</strong>, <strong>Execution</strong>, and <strong>Cognition</strong> — each revealing progressively deeper insight.</dd>
        </div>
      </dl>

      <h2 id="workflow-loop" className="docs__section-title" style={{ marginTop: 48 }}>Workflow</h2>
      <p className="docs__prose">
        Tracee's three pages are designed to work together as a continuous feedback loop.
      </p>
      <ol className="docs__steps">
        <li className="docs__step">
          <div className="docs__step-index">1</div>
          <div className="docs__step-copy">
            <h4 className="docs__step-title">Design in Prompts</h4>
            <p className="docs__step-body">Browse existing prompts or create a new one. Define system instructions, user message template, tools, and output schema.</p>
          </div>
        </li>
        <li className="docs__step">
          <div className="docs__step-index">2</div>
          <div className="docs__step-copy">
            <h4 className="docs__step-title">Experiment in Playground</h4>
            <p className="docs__step-body">Load the prompt, run experiments with different variables or model configs, and compare outputs against your anchor.</p>
          </div>
        </li>
        <li className="docs__step">
          <div className="docs__step-index">3</div>
          <div className="docs__step-copy">
            <h4 className="docs__step-title">Observe in Graph</h4>
            <p className="docs__step-body">Trace executions, replay state transitions, and run cognition analysis on completed runs.</p>
          </div>
        </li>
        <li className="docs__step">
          <div className="docs__step-index">4</div>
          <div className="docs__step-copy">
            <h4 className="docs__step-title">Iterate</h4>
            <p className="docs__step-body">Use insights from traces and cognition analysis to refine prompts. Save a new version, re-run, verify.</p>
          </div>
        </li>
      </ol>
    </>
  );
}

function SetupPage() {
  return (
    <>
      <h2 className="docs__section-title">Setup Guide</h2>
      <p className="docs__prose">Install Tracee, start the server, and connect your LangGraph application.</p>

      <h3 id="prerequisites" className="docs__subsection-title">Prerequisites</h3>
      <ul className="docs__list">
        <li>Python 3.11 or later</li>
        <li><a href="https://docs.astral.sh/uv/" target="_blank" rel="noopener noreferrer">uv</a> (recommended) or pip as your package manager</li>
        <li>A LangGraph workflow you want to instrument (<code>langgraph</code> installed in your project)</li>
        <li>An OpenAI API key if you plan to use the Playground or Cognition analysis features</li>
      </ul>

      <h3 id="install" className="docs__subsection-title">1. Install the package</h3>
      <p className="docs__prose">
        The core SDK is lightweight and only depends on <code>httpx</code>, <code>langchain-core</code>, and <code>pydantic</code>.
        We recommend using <a href="https://docs.astral.sh/uv/" target="_blank" rel="noopener noreferrer">uv</a> for fast, reliable dependency management.
      </p>
      <CodeBlock code={installSnippet} label="core SDK (uv)" />
      <p className="docs__prose">Or with pip:</p>
      <CodeBlock code={installPipSnippet} label="core SDK (pip)" />
      <p className="docs__prose">To also run the Tracee server and UI locally, install with the server extras:</p>
      <CodeBlock code={installServerSnippet} label="with server + UI" />

      <h3 id="start-server" className="docs__subsection-title">2. Start the server</h3>
      <p className="docs__prose">The built-in UI is served automatically — no separate frontend build step required.</p>
      <CodeBlock code={startServerSnippet} label="start the server" />
      <p className="docs__prose">Override the port and host:</p>
      <CodeBlock code={startServerOptionsSnippet} label="custom host and port" />
      <p className="docs__prose">Open <code>http://localhost:8000</code> in your browser. The Graph page will be empty until you register a workflow.</p>

      <h3 id="configure-env" className="docs__subsection-title">3. Configure environment</h3>
      <p className="docs__prose">The server loads a <code>.env</code> file from the working directory on startup.</p>
      <CodeBlock code={envSnippet} label=".env file" />
      <Callout type="info" title="Environment variables reference">
        <p>
          <code>OPENAI_API_KEY</code> — required for Playground runs and Cognition analysis.<br />
          <code>CORS_ORIGINS</code> — comma-separated allowed origins (defaults to <code>*</code>).<br />
          <code>TRACE_DB_PATH</code> — override the SQLite database location.<br />
          <code>TRACEE_COGNITION_MODEL</code> — LLM model for cognition analysis (defaults to <code>gpt-4o-mini</code>).
        </p>
      </Callout>

      <h3 id="instrument-app" className="docs__subsection-title">4. Instrument your LangGraph app</h3>
      <p className="docs__prose">Import <code>tracee</code>, register the compiled graph, and wrap invocations with <code>tracee.trace()</code>.</p>
      <CodeBlock code={integrationSnippet} label="full integration example" />
      <Callout type="tip" title="What each call does">
        <p>
          <code>tracee.init()</code> publishes the graph topology and patches <code>invoke</code> / <code>ainvoke</code> to attach tracing callbacks.<br />
          <code>tracee.trace()</code> records the full execution and streams events to the server.
        </p>
      </Callout>

      <h3 id="verify" className="docs__subsection-title">5. Verify the connection</h3>
      <p className="docs__prose">After running your instrumented app at least once:</p>
      <ol className="docs__steps">
        <li className="docs__step">
          <div className="docs__step-index">1</div>
          <div className="docs__step-copy">
            <h4 className="docs__step-title">Check the Graph page</h4>
            <p className="docs__step-body">Your workflow topology should appear with agent nodes and edges.</p>
          </div>
        </li>
        <li className="docs__step">
          <div className="docs__step-index">2</div>
          <div className="docs__step-copy">
            <h4 className="docs__step-title">Switch to Execution layer</h4>
            <p className="docs__step-body">Select your trace from the dropdown and replay the execution step by step.</p>
          </div>
        </li>
        <li className="docs__step">
          <div className="docs__step-index">3</div>
          <div className="docs__step-copy">
            <h4 className="docs__step-title">Try the Playground</h4>
            <p className="docs__step-body">Create a simple prompt to confirm the server can reach the LLM API.</p>
          </div>
        </li>
      </ol>
    </>
  );
}

function GraphPage() {
  return (
    <>
      <h2 className="docs__section-title">Graph</h2>
      <p className="docs__prose">
        The Graph page renders your workflow as an interactive node-and-edge diagram. It is organized
        around three layers — Intent, Execution, and Cognition — that progressively reveal deeper insight.
      </p>

      <h3 id="graph-registration" className="docs__subsection-title">Registering a graph</h3>
      <p className="docs__prose">Register your compiled LangGraph workflow with the Tracee server to publish its topology.</p>
      <CodeBlock code={registrationSnippet} label="graph registration" />
      <Callout type="tip" title="Enrich agent cards with metadata">
        <p>
          Include <code>prompt_id</code>, <code>model</code>, and <code>has_tools</code> in your <code>add_node</code> metadata
          to surface richer information on each agent card.
        </p>
      </Callout>
      <CodeBlock code={metadataSnippet} label="optional node metadata" />

      <h3 id="intent-layer" className="docs__subsection-title">Intent layer</h3>
      <p className="docs__prose">
        The default view. Shows the static graph topology — every agent, terminal node, and edge — without
        requiring any traced runs. Each node displays the agent name, model, linked prompt ID, and prompt
        component chips.
      </p>
      <ScreenshotPlaceholder title="Graph canvas — Intent layer" guidance="Intent layer: static topology with agents and edges. No trace required." src={intentLayerImg} />
      <p className="docs__prose">Clicking any node opens the <strong>Intent detail panel</strong> with full agent metadata, prompt association, and prompt components.</p>
      <ScreenshotPlaceholder title="Node detail panel — Intent layer" guidance="Intent detail panel: agent metadata, prompt ID, model, and prompt components." src={nodeDetailIntentImg} />

      <h3 id="execution-layer" className="docs__subsection-title">Execution layer</h3>
      <p className="docs__prose">
        Select a trace to replay a specific run. Nodes update to show runtime data — execution status, latency,
        token usage, and an operations timeline. Active nodes highlight as state flows through the graph.
      </p>
      <ScreenshotPlaceholder title="Graph canvas — Execution layer" guidance="Execution layer: trace selected, nodes showing runtime metrics and operations." src={executionLayerImg} />

      <h4 id="agent-node-anatomy" className="docs__h4-title">Agent node</h4>
      <p className="docs__prose">On the Execution layer, each agent node becomes an information-dense card:</p>
      <ScreenshotPlaceholder title="Agent node — zoomed in" guidance="A single agent node on the execution layer showing all available sections." src={nodeImg} />
      <ul className="docs__list">
        <li><strong>Header</strong> — node name and capability badges (tools, retry) from <code>add_node()</code> metadata.</li>
        <li><strong>Status &amp; metrics</strong> — execution status, latency, and token counts.</li>
        <li><strong>Operations timeline</strong> — color-coded horizontal sequence of LLM calls, tool calls, RAG retrievals, code executions, and state updates.</li>
        <li><strong>JSON validation</strong> — schema conformance indicators when an output schema is defined.</li>
      </ul>

      <h4 id="execution-detail-panel" className="docs__h4-title">Execution detail panel</h4>
      <p className="docs__prose">Clicking a node opens the full breakdown: status, latency, token counts, and an interactive operations timeline.</p>
      <ScreenshotPlaceholder title="Node detail panel — Execution layer" guidance="Execution detail panel: status, metrics, and expandable operations list." src={nodeDetailExecutionImg} />

      <h4 id="operations-timeline" className="docs__h4-title">Operations timeline</h4>
      <p className="docs__prose">
        Every operation the agent performed is plotted against time. Each segment represents an LLM call, tool call,
        RAG retrieval, or other operation. Hover over any segment to see its duration and details.
      </p>
      <ScreenshotPlaceholder title="Operations timeline — detail view" guidance="Execution detail: horizontal timeline of operations with timing and type labels." src={executionTimelineImg} />

      <h3 id="cognition-layer" className="docs__subsection-title">Cognition layer</h3>
      <p className="docs__prose">
        LLM-powered analysis on top of a completed trace. Click <strong>Analyze</strong> to generate a semantic summary
         at both the trace and node level.
      </p>
      <ScreenshotPlaceholder title="Graph canvas — Cognition layer" guidance="Cognition layer: analysis summary and per-node insights." src={cognitionLayerImg} />

      <p className="docs__prose">
        Once analysis completes, a <strong>trace summary</strong> appears below the graph. This is an
        AI-generated narrative that walks through the entire execution — which agents were invoked,
        what tools they called, what decisions they made, and how the final output was reached. Agent
        names and tool calls are highlighted as inline chips so you can quickly scan the flow.
      </p>
      <ScreenshotPlaceholder title="Cognition trace summary" guidance="Trace summary: AI-generated narrative of the full execution with agent and tool chips." src={cognitionSummaryImg} />

      <p className="docs__prose">Clicking a node opens the <strong>Cognition detail panel</strong> with a semantic summary scoped to that agent node.
      You can also click on a tool call or state update chip to see the exact I/O of that operation.
      </p>
      <ScreenshotPlaceholder title="Node detail panel — Cognition layer" guidance="Cognition detail panel: per-agent AI analysis with decision summary and suggestions." src={nodeDetailCognitionImg} />

    </>
  );
}

function PlaygroundPage() {
  return (
    <>
      <h2 className="docs__section-title">Playground</h2>
      <p className="docs__prose">
        The Playground is where you author, run, and compare prompt experiments against live models.
        It is organized around two modes — <strong>Author</strong> for building and configuring the prompt,
        and <strong>Analysis</strong> for reviewing run outputs.
      </p>

      {/* ── Creating a prompt ────────────── */}
      <h3 id="pg-creating" className="docs__subsection-title">Creating a prompt</h3>
      <p className="docs__prose">
        To start a new prompt, use the <strong>prompt selector</strong> in the top-left corner of the
        Playground. This is the primary entry point for all prompt authoring.
      </p>
      <ul className="docs__list">
        <li>
          <strong>New prompt</strong> — click the prompt selector and choose <strong>New prompt</strong> to
          open a blank workspace. From there you can add components, configure tools and variables, and
          start experimenting right away. You can also use the <strong>Guided start</strong> panel to
          bootstrap from an agent role template.
        </li>
        <li>
          <strong>Load an existing prompt</strong> — if you have previously saved prompts, they appear as a
          dropdown list in the same selector. Pick any prompt to load its latest version into the editor.
          Once loaded, the left rail shows the full version history so you can switch between past versions
          without leaving the Playground.
        </li>
      </ul>
      <Callout type="tip" title="Quick version switching">
        <p>
          After loading a prompt, use the version list in the left rail to jump to any previous version.
          This is useful for comparing changes or reverting to an earlier draft.
        </p>
      </Callout>

      {/* ── Workspace layout ─────────────── */}
      <h3 id="pg-workspace" className="docs__subsection-title">Workspace layout</h3>
      <p className="docs__prose">
        The Playground uses a three-column layout. The left rail lets you start a new prompt or load an existing
        one (with its full version history). The center workspace is where you edit prompt components or view
        results. The right rail shows a <strong>Prompt overview</strong> — a structural outline of your prompt
        with clickable rows that jump to each component, plus counts for tools, output schema fields, and variables.
      </p>
      <ScreenshotPlaceholder
        title="Playground — full workspace"
        guidance="Three-column layout: left rail with prompt selector, center editor with components, right outline panel."
        src={pgWorkspaceImg}
      />
      <ScreenshotPlaceholder
        title="Prompt overview panel (right rail)"
        guidance="Right rail: structure with component rows, tools/schema/variables counts."
        src={pgOverviewPanelImg}
        maxWidth={320}
      />

      {/* ── Prompt components ────────────── */}
      <h3 id="pg-components" className="docs__subsection-title">Prompt components</h3>
      <p className="docs__prose">
        Prompts are composed of ordered components. Each component has a <strong>role</strong> (System, Human,
        or AI) and free-form text content. You can add standard component types from a dropdown, or create
        custom sections. Components can be reordered via drag-and-drop and toggled on/off individually —
        disabled components are excluded when the prompt is resolved.
      </p>
      <ScreenshotPlaceholder
        title="Add component dropdown"
        guidance="The '+ Add component...' dropdown with available types and the '+ Custom section' button."
        src={pgAddComponentImg}
      />

      <h4 id="pg-component-card" className="docs__h4-title">Component card</h4>
      <p className="docs__prose">
        Each component renders as a card with its own controls:
      </p>
      <ul className="docs__list">
        <li><strong>Enable checkbox</strong> — toggle the component on or off without deleting it.</li>
        <li><strong>Role badge</strong> — colored tag showing System, Human, or AI. Click to change the role.</li>
        <li><strong>Name</strong> — click to rename inline.</li>
        <li><strong>Actions</strong> — copy content, collapse/expand, and remove (trash icon).</li>
        <li><strong>Text area</strong> — the prompt content. Variables appear as <code>{"{{variable_name}}"}</code> and highlight when selected from the outline.</li>
      </ul>
      <ScreenshotPlaceholder
        title="Prompt components"
        guidance="Component cards with enable checkboxes, role badges, and content areas."
        src={pgComponentsImg}
      />

      <h4 id="pg-resolved" className="docs__h4-title">Resolved view</h4>
      <p className="docs__prose">
        Switch the segment control to <strong>Resolved</strong> to see the fully interpolated prompt as it
        would be sent to the model — all enabled components combined, variables substituted, in the final
        message order. This is read-only and useful for verifying the output before running.
      </p>

      {/* ── Configuration panels ─────────── */}
      <h3 id="pg-config" className="docs__subsection-title">Configuration panels</h3>
      <p className="docs__prose">
        The toolbar above the editor has panel buttons for <strong>Model config</strong>,
        <strong> Variables</strong>, <strong>Tools</strong>, and <strong>Output schema</strong>. Each opens
        a modal popover. Badges on the buttons summarize the current state (e.g. the number of tools defined,
        or whether the schema is valid).
      </p>
      <ScreenshotPlaceholder
        title="Configuration panels"
        guidance="Toolbar panel buttons with badges and an open configuration panel."
        src={pgConfigImg}
      />

      <h4 id="pg-model" className="docs__h4-title">Model config</h4>
      <p className="docs__prose">
        Select the LLM provider and model, and adjust the temperature. The model config applies to
        all runs in the current session.
      </p>

      <h4 id="pg-variables" className="docs__h4-title">Variables</h4>
      <p className="docs__prose">
        Variables let you parameterize your prompt. Any <code>{"{{name}}"}</code> in a component's text becomes
        a variable. The Variables panel lists all detected variables with a text area for each value. Missing
        variables are flagged in the prompt overview.
      </p>

      <h4 id="pg-tools" className="docs__h4-title">Tools</h4>
      <p className="docs__prose">
        Define tool functions that the model can call during a run. Each tool has a name, description, and
        typed arguments. For string arguments, you can restrict values to an allowed set.
      </p>
      <Callout type="info" title="Tools vs Output schema">
        <p>Tools and output schema are mutually exclusive — when tools are defined, the output schema is
        disabled and vice versa.</p>
      </Callout>

      <h4 id="pg-schema" className="docs__h4-title">Output schema</h4>
      <p className="docs__prose">
        Define the JSON structure the model should produce. The schema builder is a table where you add
        named fields with types (string, number, boolean, array, object) and optional descriptions. For
        array fields, a secondary selector specifies the items type. If the schema has errors, a warning
        banner appears on the main workspace.
      </p>

      {/* ── Guided start ─────────────────── */}
      <h3 id="pg-guided" className="docs__subsection-title">Guided start</h3>
      <p className="docs__prose">
        When you open an empty Playground, a <strong>Guided start</strong> panel appears. It presents a grid
        of agent role templates — each based on patterns from your registered agents. Selecting a role
        pre-fills the prompt with appropriate components and roles.
      </p>
      <ScreenshotPlaceholder
        title="Guided start — role grid"
        guidance="Open the Guided start panel from an empty prompt. Capture the grid of role cards showing titles, summaries, and 'Based on N agents' labels."
      />
      <p className="docs__prose">
        After selecting a role, a multi-step overlay guides you through editing the generated components,
        setting variables, and choosing between tools or an output schema. The overlay highlights the
        relevant toolbar button at each step.
      </p>
      <ScreenshotPlaceholder
        title="Guided overlay — component step"
        guidance="Capture the guided overlay at step 2: the floating panel showing the list of pre-filled components with type badges and prevalence percentages, positioned under the editor."
      />

      {/* ── Running experiments ───────────── */}
      <h3 id="pg-running" className="docs__subsection-title">Running experiments</h3>
      <p className="docs__prose">
        Click <strong>Start</strong> to send the resolved prompt to the selected model. The button includes a
        dropdown chevron that opens a <strong>repetitions popover</strong> — set the number of runs (1–10)
        to execute the same prompt multiple times in a batch. This is useful for evaluating consistency
        across outputs.
      </p>
      <ScreenshotPlaceholder
        title="Start button with repetitions popover"
        guidance="Start button with the repetitions dropdown open."
        src={pgStartPopImg}
        maxWidth={320}
      />
      <p className="docs__prose">
        During execution, the button shows a spinner and the label changes to <strong>Executing...</strong>.
        When all runs complete, the Playground automatically switches to the <strong>Outputs</strong> tab in
        Analysis mode.
      </p>

      {/* ── Analyzing results ────────────── */}
      <h3 id="pg-results" className="docs__subsection-title">Analyzing results</h3>
      <p className="docs__prose">
        After a run completes, switch to the <strong>Outputs</strong> tab (the badge shows the result count).
        The analysis view has two main areas: a <strong>visualization panel</strong> on the left and a
        <strong> run list with detail panel</strong> on the right.
      </p>
      <ScreenshotPlaceholder
        title="Analysis mode — overview"
        guidance="Scatter plot on the left, run card list on the right, one run selected."
        src={pgAnalysisOverviewImg}
      />

      <h4 id="pg-scatter" className="docs__h4-title">Scatter plot</h4>
      <p className="docs__prose">
        The semantic scatter plot projects run outputs into a 2D space based on similarity. Dots cluster
        when outputs are similar and spread when they diverge. Hover a dot to see a tooltip with the run
        label, and click to select it and load its detail. The anchor (if set) appears as a larger dot.
        A legend distinguishes run groups and the anchor.
      </p>
      <ScreenshotPlaceholder
        title="Scatter plot"
        guidance="Semantic scatter plot with dots representing run outputs and a legend."
        src={pgScatterplotImg}
      />
      <p className="docs__prose">
        When an anchor is set, it appears as a larger dot in the scatter plot. The distance between each
        run dot and the anchor visualizes how much the output diverges from the expected reference.
      </p>
      <ScreenshotPlaceholder
        title="Scatter plot with anchor"
        guidance="Scatter plot showing the anchor as a larger dot, with run dots at varying distances."
        src={pgScatterplotAnchorImg}
      />

      <h4 id="pg-run-detail" className="docs__h4-title">Run detail</h4>
      <p className="docs__prose">
        Select a run from the list or click a dot in the scatter plot to open its detail panel. The detail
        view shows:
      </p>
      <ul className="docs__list">
        <li><strong>Meta cards</strong> — latency, token counts, and model name.</li>
        <li><strong>Schema validation</strong> — if an output schema is defined, warnings list any fields that failed validation.</li>
        <li><strong>Tool calls</strong> — expandable cards showing each tool call name, index, and arguments.</li>
        <li><strong>Output</strong> — toggle between <em>Tree View</em> (structured JSON tree) and <em>Raw</em> (plain text). A copy button copies the output to clipboard.</li>
        <li><strong>Output diff</strong> — if an anchor is set, a diff card shows line-by-line differences between this run and the reference, with color-coded additions and removals.</li>
      </ul>
      <ScreenshotPlaceholder
        title="Run detail"
        guidance="Run detail panel: meta cards, output tree, and tool calls."
        src={pgRunDetailImg}
      />
      <ScreenshotPlaceholder
        title="Output diff card"
        guidance="Output diff: legend and colored diff lines comparing this run vs anchor."
        src={pgRunDiffImg}
      />

      <h4 id="pg-anchor" className="docs__h4-title">Anchor workflow</h4>
      <p className="docs__prose">
        An anchor is a reference or example output that you expect the model to produce. 
        We introduced this feature for you to compare your expected output with the actual output.
        Set it before running or promote a run output as the anchor to measure
        how much each output deviates from the expected output. You can type an anchor manually in the Anchor panel, or
        <strong> promote</strong> any run output as the new anchor from its detail view.
      </p>
      <ul className="docs__list">
        <li><strong>Set anchor</strong> — open the Anchor panel from the toolbar and paste or type the expected output.</li>
        <li><strong>Promote from a run</strong> — in the run detail, click <em>Promote as anchor</em> to use that run's output.</li>
        <li><strong>Clear anchor</strong> — click <em>Remove anchor</em> in the run detail or <em>Clear anchor</em> in the panel.</li>
      </ul>
      <ScreenshotPlaceholder
        title="Anchor workflow"
        guidance="Anchor panel or promote-as-anchor interaction."
        src={pgAnchorImg}
      />

      {/* ── Saving and versioning ────────── */}
      <h3 id="pg-saving" className="docs__subsection-title">Saving and versioning</h3>
      <p className="docs__prose">
        Click <strong>Save prompt</strong> to open the save dialog. You can <strong>save a new version </strong>
         of the current prompt or <strong>save as a new prompt</strong> entirely. The dialog lets you set a prompt
        name and an optional revision note. After saving, the version appears in the left rail's version history
        and in the Prompts library.
      </p>
      <ScreenshotPlaceholder
        title="Version history in left rail"
        guidance="Left rail: prompt name and version tree with the latest version highlighted."
        src={pgVersionTreeImg}
        maxWidth={280}
      />
    </>
  );
}

function PromptsPage() {
  return (
    <>
      <h2 className="docs__section-title">Prompts</h2>
      <p className="docs__prose">
        A versioned library of every saved prompt, with three views — <strong>Components</strong>,
        <strong> Resolved</strong>, and <strong>Diff</strong> — and direct loading into the Playground.
      </p>

      <h3 id="prompt-list" className="docs__subsection-title">Prompt list and search</h3>
      <p className="docs__prose">Search and sort by name, version count, or last updated. Select a prompt to open its version tree.</p>
      <ScreenshotPlaceholder title="Prompts — Library list" guidance="Left prompt list with several entries, search bar, and one prompt selected." />

      <h3 id="version-tree" className="docs__subsection-title">Version tree</h3>
      <p className="docs__prose">Browse version history. Select a version to inspect, or toggle a second for comparison mode.</p>
      <ScreenshotPlaceholder title="Version tree with comparison toggle" guidance="A prompt with 3+ versions, one active, one selected as compare target." />

      <h3 id="components-resolved-diff" className="docs__subsection-title">Components vs Resolved vs Diff</h3>
      <p className="docs__prose">The detail workspace has a segmented control:</p>
      <ul className="docs__list">
        <li><strong>Components</strong> — read-only cards with tool and variable chips and the output schema table.</li>
        <li><strong>Resolved</strong> — the fully interpolated prompt as it would be sent to the model.</li>
        <li><strong>Diff</strong> — side-by-side diff between two versions (visible when a comparison target is selected).</li>
      </ul>
      <ScreenshotPlaceholder title="Diff view between two versions" guidance="Two versions selected, Diff tab active, side-by-side diff output." />

      <h3 id="load-into-playground" className="docs__subsection-title">Loading into Playground</h3>
      <p className="docs__prose">
        Click <strong>Load in Playground</strong> to open a version in the authoring workspace. The URL carries
        prompt and version IDs so you can share deep links.
      </p>
    </>
  );
}

function TroubleshootingPage() {
  return (
    <>
      <h2 className="docs__section-title">Troubleshooting</h2>
      <div className="docs__faq">
        <details id="ts-graph-empty" className="docs__faq-item">
          <summary className="docs__faq-question">The Graph page is empty</summary>
          <div className="docs__faq-answer">
            <p>The graph only appears after registering with <code>tracee.init()</code>. Make sure:</p>
            <ul className="docs__list">
              <li>The Tracee server is running at the configured <code>server_url</code>.</li>
              <li>You called <code>tracee.init(app, ...)</code> after <code>workflow.compile()</code>.</li>
              <li>The registration completed without errors — check your terminal.</li>
            </ul>
          </div>
        </details>
        <details id="ts-no-traces" className="docs__faq-item">
          <summary className="docs__faq-question">Execution layer shows no traces</summary>
          <div className="docs__faq-answer">
            <p>Traces appear only after a run inside <code>tracee.trace()</code>:</p>
            <CodeBlock code={`with tracee.trace():\n    app.invoke(initial_state)`} />
            <p>Then switch to the Execution layer and select the trace from the dropdown.</p>
          </div>
        </details>
        <details id="ts-no-diff" className="docs__faq-item">
          <summary className="docs__faq-question">Diff tab does not appear in Prompts</summary>
          <div className="docs__faq-answer">
            <p>Toggle the compare checkbox on a second version in the version tree. The Diff tab appears only when a comparison target is selected.</p>
          </div>
        </details>
        <details id="ts-missing-version" className="docs__faq-item">
          <summary className="docs__faq-question">A prompt version is missing from the library</summary>
          <div className="docs__faq-answer">
            <p>Versions are created on explicit save. If missing:</p>
            <ul className="docs__list">
              <li>Confirm the save completed in the Playground.</li>
              <li>Check you are viewing the correct prompt.</li>
              <li>Deleted prompts and versions are permanently removed.</li>
            </ul>
          </div>
        </details>
        <details id="ts-no-cognition" className="docs__faq-item">
          <summary className="docs__faq-question">Cognition analysis is not available</summary>
          <div className="docs__faq-answer">
            <p>Requires a completed trace on the Cognition layer. Make sure:</p>
            <ul className="docs__list">
              <li>You have switched to the <strong>Cognition</strong> layer.</li>
              <li>A trace is selected from the dropdown.</li>
              <li>The trace has finished executing.</li>
            </ul>
          </div>
        </details>
      </div>
    </>
  );
}

const pageComponents: Record<string, () => React.ReactNode> = {
  overview: OverviewPage,
  setup: SetupPage,
  graph: GraphPage,
  playground: PlaygroundPage,
  prompts: PromptsPage,
  troubleshooting: TroubleshootingPage,
};

/* ── main component ────────────────────────────────── */
export function DocsPage() {
  const [activePageId, setActivePageId] = useState("overview");
  const [activeTocId, setActiveTocId] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const activePage = pages.find((p) => p.id === activePageId)!;
  const ActiveContent = pageComponents[activePageId];

  const switchPage = useCallback((pageId: string) => {
    setActivePageId(pageId);
    setActiveTocId("");
    scrollRef.current?.scrollTo({ top: 0 });
  }, []);

  useEffect(() => {
    const root = scrollRef.current;
    if (!root || activePage.toc.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) setActiveTocId(visible[0].target.id);
      },
      { root, rootMargin: "-60px 0px -70% 0px", threshold: 0 },
    );

    activePage.toc.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [activePage]);

  return (
    <div className="docs">
      <nav className="docs__rail" aria-label="Documentation pages">
        <div className="docs__rail-inner">
          <p className="docs__rail-heading">Documentation</p>
          <ul className="docs__rail-list">
            {pages.map(({ id, label }) => (
              <li key={id}>
                <button
                  type="button"
                  className={`docs__rail-link${activePageId === id ? " is-active" : ""}`}
                  onClick={() => switchPage(id)}
                >
                  {label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </nav>

      <div className="docs__main" ref={scrollRef}>
        <div className="docs__body">
          <div className="docs__content">
            <ActiveContent />
          </div>

          {activePage.toc.length > 0 && (
            <aside className="docs__toc" aria-label="On this page">
              <p className="docs__toc-heading">On this page</p>
              <ul className="docs__toc-list">
                {activePage.toc.map(({ id, label, depth }) => (
                  <li key={id}>
                    <a
                      href={`#${id}`}
                      className={`docs__toc-link${depth ? ` docs__toc-link--nested` : ""}${activeTocId === id ? " is-active" : ""}`}
                      onClick={(e) => {
                        e.preventDefault();
                        document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
                      }}
                    >
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </aside>
          )}
        </div>
      </div>
    </div>
  );
}
