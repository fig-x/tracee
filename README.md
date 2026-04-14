# Tracee

An observability and prompt-engineering toolkit for multi-agent systems built on LangGraph.

Existing applications usually provide poor navigation and little visibility into your system structure. Tracee introduces a new way of navigating your LangGraph execution traces by providing a **Graph** page that allows you to visualize the execution of your workflow. It also provides a **Playground** page that allows you to author and experiment with prompts, and a **Prompts** page that allows you to browse and compare your saved prompts.

## Features

- **Graph** — Visualize agent topology, inspect execution traces frame-by-frame, and run cognition analysis on completed runs.
- **Playground** — Author prompts with structured components, run experiments against live models, and compare outputs side by side.
- **Prompts** — Browse your saved prompt library, compare versions with a visual diff, and load any version into the playground.

## Why Tracee

Agentic workflows built on frameworks like LangGraph are powerful, but developing them is slow because iteration happens in two loops. First comes the inner loop: developers work on one agent at a time, repeatedly testing, observing outputs, and refining its prompt until that agent behaves reliably enough. Then comes the outer loop: they run the full workflow, trace how agents interact, watch for failures and edge cases, and feed what they learn back into prompt refinement. Much of the time is spent moving between these two loops under stochastic behavior, where small prompt changes can have unclear effects and one weak agent can destabilize the whole system.

The **Playground** is designed for the inner loop: the repeated process of testing one agent, observing its outputs, and refining its prompt. It lets you iterate on prompts, run them against a live model, compare outputs side by side, inspect output patterns in a scatter plot, and save versions without touching your application code.

The **Graph Viewer** is designed for the outer loop. It separates what your system *is* from what it *did* by combining three layers:

- **Intent layer** — the static topology of your compiled workflow, including paths that may not execute in a given run.
- **Execution layer** — the runtime trace of a specific invocation, overlaid on the intent graph so you can see exactly which path was taken.
- **Cognition layer** — an AI-supported analysis of a completed trace, summarizing decisions at both the node and trace level.

## Core Concepts

| Concept | Description |
|---------|-------------|
| **Graph** | A directed topology of agents and terminal states that mirrors the compiled LangGraph workflow. |
| **Trace** | A recorded execution of a graph — state transitions, LLM calls, tool invocations, and outputs from a single `app.invoke()` run. |
| **Prompt** | A structured template of components, tool definitions, variables, and an output schema. The primary unit of authoring in the Playground. |
| **Layer** | The Graph page supports three viewing layers — Intent, Execution, and Cognition — each revealing progressively deeper insight. |

## Workflow

Tracee's three pages are designed to work together as a continuous feedback loop:

1. **Design in Prompts** — Browse existing prompts or create a new one. Define system instructions, user message template, tools, and output schema.
2. **Experiment in Playground** — Load the prompt, run experiments with different variables or model configs, and compare outputs against your anchor.
3. **Observe in Graph** — Trace executions, replay state transitions, and run cognition analysis on completed runs.
4. **Iterate** — Use insights from traces and cognition analysis to refine prompts. Save a new version, re-run, verify.

## Setup Guide

### Prerequisites

- Python 3.11 or later
- [uv](https://docs.astral.sh/uv/) (recommended) or pip as your package manager
- A LangGraph workflow you want to instrument (`langgraph` installed in your project)
- An OpenAI API key if you plan to use the Playground or Cognition analysis features

### 1. Install the package

The core SDK is lightweight and only depends on `httpx`, `langchain-core`, and `pydantic`. We recommend using [uv](https://docs.astral.sh/uv/) for fast, reliable dependency management.

```bash
uv add tracee
```

Or with pip:

```bash
pip install tracee
```

To also run the Tracee server and UI locally, install with the server extras:

```bash
uv add 'tracee[server]'
```

### 2. Start the server

The built-in UI is served automatically — no separate frontend build step required.

```bash
tracee serve
```

Override the port and host:

```bash
tracee serve --port 8000 --host 0.0.0.0
```

Open `http://localhost:8000` in your browser. The Graph page will be empty until you register a workflow.

### 3. Configure environment

The server loads a `.env` file from the working directory on startup.

```bash
# .env (in the directory where you run tracee serve)
OPENAI_API_KEY=sk-...
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
```

| Variable | Description |
|----------|-------------|
| `OPENAI_API_KEY` | Required for Playground runs and Cognition analysis. |
| `CORS_ORIGINS` | Comma-separated allowed origins (defaults to `*`). |
| `TRACE_DB_PATH` | Override the SQLite database location. |
| `TRACEE_COGNITION_MODEL` | LLM model for cognition analysis (defaults to `gpt-4o-mini`). |

### 4. Instrument your LangGraph app

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

### 5. Verify the connection

After running your instrumented app at least once:

1. **Check the Graph page** — Your workflow topology should appear with agent nodes and edges.
2. **Switch to Execution layer** — Select your trace from the dropdown and replay the execution step by step.
3. **Try the Playground** — Create a simple prompt to confirm the server can reach the LLM API.

## License

See [LICENSE](LICENSE) for details.
