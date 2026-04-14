"""Tests for trace route graph resolution."""

import asyncio

import pytest
from fastapi import HTTPException

from backbone.models.cognition import NodeCognition, TraceCognition
from backbone.models.graph_topology import GraphEdge, GraphNode, GraphTopology
from server.trace_db import TraceRow


def make_graph(graph_id: str) -> GraphTopology:
    return GraphTopology(
        graph_id=graph_id,
        name=graph_id,
        nodes=[
            GraphNode(node_id="planner", label="planner"),
            GraphNode(node_id="end", label="end", node_type="end"),
        ],
        edges=[GraphEdge(source="planner", target="end")],
        created_at="2026-04-13T00:00:00Z",
        updated_at="2026-04-13T00:00:00Z",
    )


class TestAnalyzeTraceEndpoint:
    def test_analyze_uses_trace_graph_id_when_multiple_graphs_exist(self, monkeypatch):
        from server import trace_routes
        import server.agent_db as agent_db
        import server.cognition_db as cognition_db
        import server.cognition_service as cognition_service
        import server.graph_db as graph_db
        import server.prompt_db as prompt_db

        primary_graph = make_graph("graph-a")
        secondary_graph = make_graph("graph-b")
        captured: dict[str, object] = {}

        monkeypatch.setattr(
            trace_routes,
            "get_trace",
            lambda trace_id: TraceRow(
                trace_id=trace_id,
                event_count=1,
                graph_id="graph-b",
                created_at="2026-04-13T00:00:00Z",
                updated_at="2026-04-13T00:00:00Z",
            ),
        )
        monkeypatch.setattr(trace_routes, "load_events", lambda trace_id: [{"event_id": "1"}])
        monkeypatch.setattr(graph_db, "get_graph", lambda graph_id: {
            "graph-a": primary_graph,
            "graph-b": secondary_graph,
        }.get(graph_id))
        monkeypatch.setattr(graph_db, "list_graphs", lambda: [primary_graph, secondary_graph])
        monkeypatch.setattr(agent_db, "get_agent", lambda agent_id: None)
        monkeypatch.setattr(prompt_db, "get_latest_version", lambda prompt_id: None)
        monkeypatch.setattr(cognition_db, "upsert_cognition", lambda cognition: None)
        monkeypatch.setattr(cognition_db, "insert_cognition_logs", lambda logs: 0)

        async def fake_run_cognition_analysis(trace_id, events, graph, agent_prompts):
            captured["trace_id"] = trace_id
            captured["graph_id"] = graph.graph_id
            captured["agent_prompts"] = agent_prompts
            return (
                TraceCognition(
                    trace_id=trace_id,
                    graph_id=graph.graph_id,
                    node_cognitions={
                        "planner": NodeCognition(
                            agent_id="planner",
                            description="{agent:planner} wrote {state:plan}",
                        )
                    },
                    narrative="{agent:planner} wrote {state:plan}",
                    created_at="2026-04-13T00:00:00Z",
                ),
                [],
            )

        monkeypatch.setattr(cognition_service, "run_cognition_analysis", fake_run_cognition_analysis)

        result = asyncio.run(trace_routes.analyze_trace_endpoint("trace-1"))

        assert captured["trace_id"] == "trace-1"
        assert captured["graph_id"] == "graph-b"
        assert captured["agent_prompts"] == {}
        assert result["graph_id"] == "graph-b"

    def test_analyze_rejects_mismatched_graph_id(self, monkeypatch):
        from server import trace_routes

        monkeypatch.setattr(
            trace_routes,
            "get_trace",
            lambda trace_id: TraceRow(
                trace_id=trace_id,
                event_count=1,
                graph_id="graph-b",
                created_at="2026-04-13T00:00:00Z",
                updated_at="2026-04-13T00:00:00Z",
            ),
        )
        monkeypatch.setattr(trace_routes, "load_events", lambda trace_id: [{"event_id": "1"}])

        with pytest.raises(HTTPException, match="trace and graph_id do not match"):
            asyncio.run(trace_routes.analyze_trace_endpoint("trace-1", graph_id="graph-a"))


class TestGetTraceCognition:
    def test_get_trace_cognition_discards_stale_cached_graph(self, monkeypatch):
        from server import trace_routes
        import server.cognition_db as cognition_db

        deleted: list[str] = []

        monkeypatch.setattr(
            trace_routes,
            "get_trace",
            lambda trace_id: TraceRow(
                trace_id=trace_id,
                event_count=1,
                graph_id="graph-b",
                created_at="2026-04-13T00:00:00Z",
                updated_at="2026-04-13T00:00:00Z",
            ),
        )
        monkeypatch.setattr(
            cognition_db,
            "get_cognition",
            lambda trace_id: TraceCognition(
                trace_id=trace_id,
                graph_id="graph-a",
                node_cognitions={
                    "planner": NodeCognition(
                        agent_id="planner",
                        description="{agent:planner} wrote {state:plan}",
                    )
                },
                narrative="{agent:planner} wrote {state:plan}",
                created_at="2026-04-13T00:00:00Z",
            ),
        )
        monkeypatch.setattr(cognition_db, "delete_cognition", lambda trace_id: deleted.append(trace_id))

        with pytest.raises(HTTPException, match="Cached cognition is stale"):
            trace_routes.get_trace_cognition("trace-1")

        assert deleted == ["trace-1"]
