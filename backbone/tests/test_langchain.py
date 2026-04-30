"""Tests for LangChain callback handler."""

from uuid import uuid4

import pytest

from backbone.adapters.langchain_callback import RawCallbackHandler
from backbone.adapters.sinks import ListSink
from backbone.utils.identifiers import generate_execution_id, generate_trace_id


class TestRawCallbackHandler:
    """Test RawCallbackHandler raw event capture."""

    def setup_method(self):
        """Set up test fixtures."""
        self.execution_id = generate_execution_id()
        self.trace_id = generate_trace_id()
        self.sink = ListSink()
        self.handler = RawCallbackHandler(
            execution_id=self.execution_id,
            trace_id=self.trace_id,
            event_sink=self.sink,
        )

    def test_on_llm_start_emits_raw_event(self):
        """on_llm_start should emit raw on_llm_start event."""
        run_id = uuid4()
        self.handler.on_llm_start(
            serialized={"kwargs": {"model_name": "gpt-4"}},
            prompts=["Hello, world!"],
            run_id=run_id,
        )

        assert len(self.sink.events) == 1
        event = self.sink.events[0]
        assert event.event_type == "on_llm_start"
        assert event.payload["model_name"] == "gpt-4"
        assert "prompts" in event.payload

    def test_on_llm_end_emits_raw_event(self):
        """on_llm_end should emit raw on_llm_end event."""
        from langchain_core.outputs import LLMResult, Generation

        run_id = uuid4()

        # simulate start first
        self.handler.on_llm_start(
            serialized={},
            prompts=["test"],
            run_id=run_id,
        )

        # now end
        result = LLMResult(generations=[[Generation(text="Hello!")]])
        self.handler.on_llm_end(response=result, run_id=run_id)

        assert len(self.sink.events) == 2
        end_event = self.sink.events[1]
        assert end_event.event_type == "on_llm_end"
        assert "output_text" in end_event.payload

    def test_on_tool_start_emits_raw_event(self):
        """on_tool_start should emit raw on_tool_start event."""
        run_id = uuid4()
        self.handler.on_tool_start(
            serialized={"name": "search_tool"},
            input_str="query string",
            run_id=run_id,
        )

        assert len(self.sink.events) == 1
        event = self.sink.events[0]
        assert event.event_type == "on_tool_start"
        assert event.payload["tool_name"] == "search_tool"

    def test_on_tool_end_emits_raw_event(self):
        """on_tool_end should emit raw on_tool_end event."""
        run_id = uuid4()

        # start first
        self.handler.on_tool_start(
            serialized={"name": "search"},
            input_str="test",
            run_id=run_id,
        )

        # end
        self.handler.on_tool_end(output="search result", run_id=run_id)

        assert len(self.sink.events) == 2
        end_event = self.sink.events[1]
        assert end_event.event_type == "on_tool_end"
        assert "output" in end_event.payload

    def test_on_chain_start_emits_raw_event(self):
        """on_chain_start should emit raw on_chain_start event."""
        run_id = uuid4()

        self.handler.on_chain_start(
            serialized={"name": "test_chain"},
            inputs={"query": "test"},
            run_id=run_id,
        )

        assert len(self.sink.events) == 1
        event = self.sink.events[0]
        assert event.event_type == "on_chain_start"
        assert event.payload["chain_name"] == "test_chain"

    def test_on_chain_end_emits_raw_event(self):
        """on_chain_end should emit raw on_chain_end event."""
        run_id = uuid4()

        self.handler.on_chain_start(
            serialized={"name": "chain"},
            inputs={},
            run_id=run_id,
        )
        self.handler.on_chain_end(outputs={"result": "done"}, run_id=run_id)

        assert len(self.sink.events) == 2
        end_event = self.sink.events[1]
        assert end_event.event_type == "on_chain_end"
        assert "outputs" in end_event.payload

    def test_on_chain_error_emits_raw_event(self):
        """on_chain_error should emit raw on_chain_error event."""
        run_id = uuid4()

        class TestError(Exception):
            pass

        self.handler.on_chain_error(
            error=TestError("something went wrong"),
            run_id=run_id,
        )

        assert len(self.sink.events) == 1
        event = self.sink.events[0]
        assert event.event_type == "on_chain_error"
        assert event.payload["error_type"] == "TestError"
        assert "something went wrong" in event.payload["error_message"]

    def test_stores_langchain_run_id_in_refs(self):
        """LangChain run_id should be stored in refs['langchain']['run_id']."""
        run_id = uuid4()
        parent_run_id = uuid4()

        self.handler.on_chain_start(
            serialized={"name": "test_chain"},
            inputs={"query": "test"},
            run_id=run_id,
            parent_run_id=parent_run_id,
        )

        event = self.sink.events[0]
        assert event.refs["langchain"]["run_id"] == str(run_id)
        assert event.refs["langchain"]["parent_run_id"] == str(parent_run_id)

    def test_stores_langgraph_context_in_refs(self):
        """LangGraph metadata should be stored in refs['langgraph']."""
        run_id = uuid4()

        self.handler.on_chain_start(
            serialized={"name": "chain"},
            inputs={},
            run_id=run_id,
            metadata={
                "agent_id": "planner",
                "langgraph_node": "plan_node",
                "langgraph_state_keys": ["messages", "plan"],
            },
        )

        event = self.sink.events[0]
        assert event.refs["langgraph"]["node"] == "plan_node"
        assert event.refs["langgraph"]["state_keys"] == ["messages", "plan"]

    def test_stores_agent_hint_in_refs(self):
        """Agent ID from metadata should be stored in refs['hint']."""
        run_id = uuid4()

        self.handler.on_chain_start(
            serialized={"name": "chain"},
            inputs={},
            run_id=run_id,
            metadata={"agent_id": "planner"},
        )

        event = self.sink.events[0]
        assert event.refs["hint"]["agent_id"] == "planner"

    def test_agent_id_is_none_for_raw_events(self):
        """agent_id should be None for raw events (analysis layer determines it)."""
        run_id = uuid4()

        self.handler.on_chain_start(
            serialized={"name": "chain"},
            inputs={},
            run_id=run_id,
            metadata={"agent_id": "planner"},
        )

        event = self.sink.events[0]
        # agent_id is None, but hint is stored in refs
        assert event.agent_id is None
        assert event.refs["hint"]["agent_id"] == "planner"

    def test_all_events_share_execution_and_trace_id(self):
        """All emitted events should share the same execution_id and trace_id."""
        run_id = uuid4()

        self.handler.on_chain_start(serialized={}, inputs={}, run_id=run_id)
        self.handler.on_llm_start(serialized={}, prompts=["test"], run_id=uuid4(), parent_run_id=run_id)
        self.handler.on_chain_end(outputs={}, run_id=run_id)

        for event in self.sink.events:
            assert event.execution_id == self.execution_id
            assert event.trace_id == self.trace_id

    def test_events_have_incremental_sequence(self):
        """Events should have incremental sequence numbers."""
        run_id = uuid4()

        self.handler.on_chain_start(serialized={}, inputs={}, run_id=run_id)
        self.handler.on_llm_start(serialized={}, prompts=["test"], run_id=uuid4(), parent_run_id=run_id)
        self.handler.on_chain_end(outputs={}, run_id=run_id)

        sequences = [e.sequence for e in self.sink.events]
        assert sequences == [0, 1, 2]

    def test_span_id_correlates_start_and_end(self):
        """Start and end events for same run should share span_id."""
        run_id = uuid4()

        self.handler.on_tool_start(
            serialized={"name": "search"},
            input_str="test",
            run_id=run_id,
        )
        self.handler.on_tool_end(output="result", run_id=run_id)

        start_event = self.sink.events[0]
        end_event = self.sink.events[1]
        assert start_event.span_id == end_event.span_id


class TestLLMEndProviderNormalization:
    """on_llm_end should capture provider-agnostic fields from AIMessage.

    LangChain normalizes tool_calls and usage_metadata across OpenAI, Anthropic,
    and Gemini onto AIMessage, so the callback only needs to read those canonical
    fields rather than parse raw provider payloads.
    """

    def setup_method(self):
        self.execution_id = generate_execution_id()
        self.trace_id = generate_trace_id()
        self.sink = ListSink()
        self.handler = RawCallbackHandler(
            execution_id=self.execution_id,
            trace_id=self.trace_id,
            event_sink=self.sink,
        )

    def _emit_end_with_message(self, message):
        """Helper: emit on_llm_end with a ChatGeneration carrying the given message."""
        from langchain_core.outputs import ChatGeneration, LLMResult

        run_id = uuid4()
        result = LLMResult(generations=[[ChatGeneration(message=message)]])
        self.handler.on_llm_end(response=result, run_id=run_id)
        return self.sink.events[-1]

    def test_captures_tool_calls_from_aimessage(self):
        """Canonical tool_calls on AIMessage are mirrored into payload."""
        from langchain_core.messages import AIMessage

        message = AIMessage(
            content="",
            tool_calls=[
                {
                    "id": "call_abc",
                    "name": "get_weather",
                    "args": {"city": "SF"},
                }
            ],
        )

        event = self._emit_end_with_message(message)

        captured = event.payload.get("tool_calls")
        assert isinstance(captured, list) and len(captured) == 1
        assert captured[0]["id"] == "call_abc"
        assert captured[0]["name"] == "get_weather"
        assert captured[0]["args"] == {"city": "SF"}

    def test_tool_calls_absent_when_message_has_none(self):
        """When the model didn't call a tool, payload tool_calls is empty list."""
        from langchain_core.messages import AIMessage

        event = self._emit_end_with_message(AIMessage(content="hello"))

        assert event.payload.get("tool_calls") == []

    def test_captures_usage_metadata_canonical_keys(self):
        """LangChain-canonical usage_metadata is captured verbatim.

        OpenAI, Anthropic, and Gemini all populate this on AIMessage with the
        same keys: input_tokens, output_tokens, total_tokens.
        """
        from langchain_core.messages import AIMessage

        message = AIMessage(
            content="hi",
            usage_metadata={
                "input_tokens": 12,
                "output_tokens": 4,
                "total_tokens": 16,
            },
        )

        event = self._emit_end_with_message(message)

        assert event.payload.get("usage_metadata") == {
            "input_tokens": 12,
            "output_tokens": 4,
            "total_tokens": 16,
        }

    def test_legacy_token_usage_still_captured(self):
        """Existing token_usage from llm_output is preserved for backward compat."""
        from langchain_core.messages import AIMessage
        from langchain_core.outputs import ChatGeneration, LLMResult

        run_id = uuid4()
        result = LLMResult(
            generations=[[ChatGeneration(message=AIMessage(content="hi"))]],
            llm_output={"token_usage": {"prompt_tokens": 5, "completion_tokens": 2}},
        )
        self.handler.on_llm_end(response=result, run_id=run_id)

        event = self.sink.events[-1]
        assert event.payload["token_usage"] == {"prompt_tokens": 5, "completion_tokens": 2}

    def test_anthropic_shaped_message_normalizes_correctly(self):
        """Anthropic responses arrive with same canonical AIMessage fields."""
        from langchain_core.messages import AIMessage

        message = AIMessage(
            content="Let me check.",
            tool_calls=[
                {"id": "toolu_01ABC", "name": "search", "args": {"q": "weather"}}
            ],
            usage_metadata={"input_tokens": 25, "output_tokens": 11, "total_tokens": 36},
        )

        event = self._emit_end_with_message(message)

        assert event.payload["tool_calls"][0]["id"] == "toolu_01ABC"
        assert event.payload["usage_metadata"]["input_tokens"] == 25

    def test_gemini_shaped_message_normalizes_correctly(self):
        """Gemini responses populate the same canonical AIMessage fields."""
        from langchain_core.messages import AIMessage

        message = AIMessage(
            content="",
            tool_calls=[
                {"id": "func_call_1", "name": "get_time", "args": {}}
            ],
            usage_metadata={"input_tokens": 20, "output_tokens": 7, "total_tokens": 27},
        )

        event = self._emit_end_with_message(message)

        assert event.payload["tool_calls"][0]["name"] == "get_time"
        assert event.payload["usage_metadata"]["total_tokens"] == 27

    def test_non_chat_generation_does_not_crash(self):
        """Plain Generation (no message) should still emit event without tool_calls."""
        from langchain_core.outputs import Generation, LLMResult

        run_id = uuid4()
        result = LLMResult(generations=[[Generation(text="plain completion")]])
        self.handler.on_llm_end(response=result, run_id=run_id)

        event = self.sink.events[-1]
        assert event.payload["output_text"] == "plain completion"
        assert event.payload.get("tool_calls") == []
        assert event.payload.get("usage_metadata") is None
