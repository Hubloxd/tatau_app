import logging
import os

from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from openai import OpenAI, OpenAIError

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["tattoo-generator"])

_client: OpenAI | None = None


def _get_client() -> OpenAI:
    global _client
    if _client is None:
        api_key = os.environ.get("OPENAI_API_KEY", "")
        if not api_key or api_key == "WKLEJ_TUTAJ_KLUCZ":
            raise HTTPException(status_code=503, detail="Brak klucza OPENAI_API_KEY.")
        _client = OpenAI(api_key=api_key)
    return _client


def _build_prompt(body_part: str, style: str, description: str) -> str:
    parts = [
        f"Professional tattoo flash design for {body_part}.",
        f"Style: {style}.",
    ]
    if description.strip():
        parts.append(f"Theme: {description.strip()}.")
    parts.append(
        "Black ink on white background, clean sharp lines, "
        "high contrast, suitable for tattooing, no text, no watermark."
    )
    return " ".join(parts)


@router.get("/generate-tattoo")
def generate_tattoo(body_part: str, style: str, description: str = ""):
    if not body_part.strip() or not style.strip():
        raise HTTPException(status_code=400, detail="Brakuje body_part lub style.")

    prompt = _build_prompt(body_part, style, description)

    try:
        response = _get_client().images.generate(
            model="dall-e-3",
            prompt=prompt,
            size="1024x1024",
            quality="standard",
            n=1,
        )
        image_url = response.data[0].url
    except OpenAIError as e:
        logger.error("Błąd OpenAI API: %s", e)
        raise HTTPException(status_code=502, detail=f"Błąd OpenAI: {e}")

    return JSONResponse({"image_url": image_url})
