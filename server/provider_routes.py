"""Provider discovery endpoints (status + model listing).

These exist so the UI can:
  - show a banner when OPENAI_API_KEY is missing (without making the user
    discover this only after their first run failed),
  - populate the model dropdown with whatever the user actually has access to,
    instead of a hardcoded list that goes stale every few months.
"""

import logging
import os

from fastapi import APIRouter

router = APIRouter()
logger = logging.getLogger(__name__)

# Filter list shown to users — kept conservative because the OpenAI account may
# return embedding/audio/image-only models that aren't usable for chat.
_CHAT_PREFIXES = ("gpt-", "o1", "o3", "o4", "chatgpt-")
_CHAT_EXCLUDES = ("audio", "realtime", "tts", "whisper", "embedding", "image", "moderation", "search")

# Sensible fallback when the OpenAI API can't be queried (no key, offline, etc).
# Keep this in sync with what's broadly available so the playground still works
# in degraded mode.
_FALLBACK_MODELS = ["gpt-4o", "gpt-4o-mini", "gpt-4.1", "gpt-4.1-mini"]


def _is_chat_model(model_id: str) -> bool:
    if not any(model_id.startswith(prefix) for prefix in _CHAT_PREFIXES):
        return False
    return not any(token in model_id for token in _CHAT_EXCLUDES)


@router.get("/providers/openai/status")
def openai_status() -> dict:
    """Whether the server has an OPENAI_API_KEY configured."""
    return {"configured": bool(os.getenv("OPENAI_API_KEY"))}


@router.get("/providers/openai/models")
async def list_openai_models() -> dict:
    """Return chat-capable OpenAI models the current key has access to.

    Falls back to a static list when the API can't be reached so the playground
    is never blocked on a model dropdown.
    """
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        return {"models": _FALLBACK_MODELS, "source": "fallback", "reason": "no_api_key"}

    try:
        import openai

        client = openai.AsyncOpenAI(api_key=api_key)
        response = await client.models.list()
        ids = sorted({model.id for model in response.data if _is_chat_model(model.id)})
        if not ids:
            return {"models": _FALLBACK_MODELS, "source": "fallback", "reason": "empty_list"}
        return {"models": ids, "source": "openai"}
    except Exception as exc:
        logger.warning("openai models.list failed: %s", exc)
        return {"models": _FALLBACK_MODELS, "source": "fallback", "reason": "api_error"}
