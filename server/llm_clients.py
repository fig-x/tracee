"""shared llm client helpers for playground and guided start."""

import json
import logging
import os
from typing import TypedDict

from fastapi import HTTPException

from backbone.models.playground_run import PlaygroundToolCall
from backbone.models.prompt_artifact import PromptTool

logger = logging.getLogger(__name__)

_openai_client = None


class LlmMessage(TypedDict):
    role: str
    content: str


def _extract_openai_error(exc: Exception, *, model: str, op: str) -> tuple[int, str]:
    """Pull a usable status + message out of an OpenAI SDK exception.

    Falls back gracefully when the SDK isn't loaded or the exception shape
    doesn't match what we expect. Always includes the model and op so the
    user can see which call failed.
    """
    status_code = 500
    message: str | None = None

    try:
        import openai  # local import — keeps cold-start cheap
    except Exception:
        openai = None  # type: ignore[assignment]

    if openai is not None:
        api_status = getattr(openai, "APIStatusError", None)
        api_conn = getattr(openai, "APIConnectionError", None)
        if api_status is not None and isinstance(exc, api_status):
            status_code = getattr(exc, "status_code", 500) or 500
            body = getattr(exc, "body", None)
            if isinstance(body, dict):
                err = body.get("error")
                if isinstance(err, dict) and isinstance(err.get("message"), str):
                    message = err["message"]
            if not message:
                message = getattr(exc, "message", None)
        elif api_conn is not None and isinstance(exc, api_conn):
            status_code = 502
            message = "could not reach the OpenAI API (connection error)"

    if not message:
        message = str(exc) or exc.__class__.__name__

    return status_code, f"OpenAI {op} failed (model={model}): {message}"


def get_openai_client():
    """Get or create the OpenAI client."""
    global _openai_client
    if _openai_client is None:
        import openai

        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise HTTPException(
                status_code=400,
                detail=(
                    "OPENAI_API_KEY is not set. Add it to the .env file in the "
                    "directory where you run `tracee serve`, then restart the server."
                ),
            )
        base_url = os.getenv("OPENAI_BASE_URL") or "https://us.api.openai.com/v1"
        _openai_client = openai.AsyncOpenAI(api_key=api_key, base_url=base_url)
    return _openai_client


def build_openai_response_format(schema: dict, *, strict: bool = True) -> dict:
    """Build OpenAI json_schema response format."""
    return {
        "type": "json_schema",
        "json_schema": {
            "name": schema.get("title", "output"),
            "schema": schema,
            "strict": strict,
        },
    }


def supports_openai_json_schema(model: str) -> bool:
    """Return whether the model supports json_schema response_format.

    The list grows over time — keep prefixes broad so newly released models in
    these families work without requiring a server change. The o1 family
    explicitly does not support response_format yet.
    """
    if model.startswith("o1"):
        return False
    return (
        model.startswith("gpt-4o")
        or model.startswith("gpt-4.1")
        or model.startswith("gpt-5")
        or model.startswith("o3")
        or model.startswith("o4")
        or model.startswith("chatgpt-")
    )


def build_openai_tool(tool: PromptTool) -> dict:
    """Build an OpenAI tool definition from an authored tool."""
    return {
        "type": "function",
        "function": {
            "name": tool.name,
            "description": tool.description,
            "parameters": tool.input_schema(),
        },
    }

async def call_openai_messages(
    *,
    messages: list[LlmMessage],
    model: str,
    temperature: float,
    max_tokens: int | None,
    output_schema: dict | None = None,
    prompt_tools: list[PromptTool] | None = None,
    json_schema_strict: bool = True,
) -> dict:
    """Call OpenAI chat completions and normalize the response."""
    client = get_openai_client()

    try:
        params = {
            "model": model,
            "messages": messages,
            "temperature": temperature,
        }
        if max_tokens is not None:
            params["max_tokens"] = max_tokens
        if prompt_tools:
            params["tools"] = [build_openai_tool(tool) for tool in prompt_tools]
        if output_schema:
            if not supports_openai_json_schema(model):
                raise HTTPException(
                    status_code=400,
                    detail=(
                        "Structured output requires an OpenAI model with json_schema "
                        f"support. Unsupported model: {model}"
                    ),
                )
            params["response_format"] = build_openai_response_format(output_schema, strict=json_schema_strict)
        response = await client.chat.completions.create(**params)

        message = response.choices[0].message
        content = message.content or ""
        tool_calls: list[PlaygroundToolCall] = []
        if message.tool_calls:
            for tool_call in message.tool_calls:
                arguments = tool_call.function.arguments
                parsed_arguments = json.loads(arguments) if arguments else {}
                tool_calls.append(
                    PlaygroundToolCall(
                        call_id=tool_call.id,
                        name=tool_call.function.name,
                        arguments=parsed_arguments,
                    )
                )
        if not content and tool_calls:
            content = json.dumps([call.model_dump() for call in tool_calls], indent=2)
        usage = response.usage

        return {
            "content": content,
            "tool_calls": tool_calls or None,
            "usage": {
                "prompt_tokens": usage.prompt_tokens if usage else 0,
                "completion_tokens": usage.completion_tokens if usage else 0,
                "total_tokens": usage.total_tokens if usage else 0,
            },
            "schema_enforced": bool(output_schema) and not tool_calls,
        }
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("OpenAI API call failed (model=%s)", model)
        status_code, detail = _extract_openai_error(exc, model=model, op="chat completion")
        raise HTTPException(status_code=status_code, detail=detail)


async def embed_openai_texts(
    *,
    texts: list[str],
    model: str = "text-embedding-3-small",
) -> list[list[float]]:
    """embed text values with openai."""
    if not texts:
        return []

    client = get_openai_client()

    try:
        response = await client.embeddings.create(
            model=model,
            input=texts,
        )
        embeddings = [list(item.embedding) for item in response.data]
        if len(embeddings) != len(texts):
            raise HTTPException(
                status_code=502,
                detail="Embedding provider returned an unexpected number of vectors.",
            )
        if embeddings and any(len(vector) != len(embeddings[0]) for vector in embeddings):
            raise HTTPException(
                status_code=502,
                detail="Embedding provider returned mismatched vector dimensions.",
            )
        return embeddings
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("OpenAI embeddings call failed (model=%s)", model)
        status_code, detail = _extract_openai_error(exc, model=model, op="embedding")
        raise HTTPException(status_code=status_code, detail=detail)


async def call_llm_messages(
    *,
    messages: list[LlmMessage],
    model: str,
    provider: str,
    temperature: float,
    max_tokens: int | None,
    output_schema: dict | None = None,
    prompt_tools: list[PromptTool] | None = None,
    json_schema_strict: bool = True,
) -> dict:
    """Call the provider-specific messages API."""
    provider_lower = provider.lower()
    if provider_lower == "openai":
        return await call_openai_messages(
            messages=messages,
            model=model,
            temperature=temperature,
            max_tokens=max_tokens,
            output_schema=output_schema,
            prompt_tools=prompt_tools,
            json_schema_strict=json_schema_strict,
        )
    raise HTTPException(
        status_code=400,
        detail=f"Unsupported provider: {provider}. Supported: openai",
    )
