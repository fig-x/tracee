# Tracee

An observability and prompt-engineering toolkit for multi-agent systems built on LangGraph.

Existing applications usually provide poor navigation and little visibility into your system structure. Tracee introduces a new way of navigating your LangGraph execution traces by providing a **Graph** page that allows you to visualize the execution of your workflow. It also provides a **Playground** page that allows you to author and experiment with prompts, and a **Prompts** page that allows you to browse and compare your saved prompts.

<p>
  <img src="docs/img/execution-layer.png" alt="Graph — Execution layer" width="49%">
  <img src="docs/img/playground-workspace.png" alt="Playground workspace" width="49%">
</p>

## Why Tracee

Agentic workflows built on frameworks like LangGraph are powerful, but developing them is slow because iteration happens in two loops. First comes the inner loop: developers work on one agent at a time, repeatedly testing, observing outputs, and refining its prompt until that agent behaves reliably enough. Then comes the outer loop: they run the full workflow, trace how agents interact, watch for failures and edge cases, and feed what they learn back into prompt refinement. Much of the time is spent moving between these two loops under stochastic behavior, where small prompt changes can have unclear effects and one weak agent can destabilize the whole system.

The **Playground** is designed for the inner loop: the repeated process of testing one agent, observing its outputs, and refining its prompt. It lets you iterate on prompts, run them against a live model, compare outputs side by side, inspect output patterns in a scatter plot, and save versions without touching your application code.

The **Graph Viewer** is designed for the outer loop. It separates what your system *is* from what it *did* by combining three layers:

- **Intent layer** — the static topology of your compiled workflow, including paths that may not execute in a given run.
- **Execution layer** — the runtime trace of a specific invocation, overlaid on the intent graph so you can see exactly which path was taken.
- **Cognition layer** — an AI-supported analysis of a completed trace, summarizing decisions at both the node and trace level.


## Setup Guide

### Prerequisites

- Python 3.11 or later
- [uv](https://docs.astral.sh/uv/) (recommended) or pip as your package manager
- Node.js v18 or later and npm (for building the frontend)
- A LangGraph workflow you want to instrument (`langgraph` installed in your project)
- An OpenAI API key if you plan to use the Playground or Cognition analysis features

### 1. Clone the repository

```bash
git clone https://github.com/fig-x/tracee.git
cd tracee
```

### 2. Install dependencies

We recommend using [uv](https://docs.astral.sh/uv/) for fast, reliable dependency management.

```bash
uv sync --extra server
```

### 3. Configure environment

The server loads a `.env` file from the working directory on startup.

```bash
# .env (in the directory where you run tracee serve)
OPENAI_API_KEY=sk-...
```

### 4. Start the server

```bash
uv run tracee serve
```

On the first run, this automatically builds the frontend (`npm install` + `npm run build` inside `playground-ui/`). Subsequent runs skip the build since `playground-ui/dist/` already exists.

Open `http://localhost:8000` in your browser. The Graph page will be empty until you register a workflow.

> **Tip:** To force a frontend rebuild (e.g. after pulling new changes), delete `playground-ui/dist/` and re-run `tracee serve`. You can also pass `--skip-build` to skip the automatic build entirely.

### 5. Install the Tracee SDK in your app

The steps above install Tracee inside this repository so you can run the server. To instrument your own LangGraph application, you also need the `tracee` Python package available **in your app's environment** — that's what provides `tracee.init()` and `tracee.trace()` for `import tracee` to resolve.

From inside your application's project (not this repo), run:

```bash
pip install git+https://github.com/fig-x/tracee.git
```

> **Why a separate install?** The cloned repo runs the Tracee server (UI + API at `http://localhost:8000`). Your application is a different process — usually a different virtualenv — and needs the SDK installed there so it can publish its graph topology and stream traces to that server.

### 6. Instrument your LangGraph app

Import `tracee`, register the compiled graph, and wrap invocations with `tracee.trace()`.

```python
import tracee

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
    result = app.invoke(initial_state)
```

- `tracee.init()` publishes the graph topology and patches `invoke` / `ainvoke` to attach tracing callbacks.
- `tracee.trace()` records the full execution and streams events to the server.


## License

See [LICENSE](LICENSE) for details.
