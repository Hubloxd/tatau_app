"""
Ładowanie konfiguracji środowiska przed database/storage.

Najpierw (jeśli istnieje .env) wczytanie bez nadpisywania zmiennych już ustawionych w OS
(np. Docker Compose). Dopiero potem odczyt LOCAL_ONLY (może być w .env lub w środowisku).

- LOCAL_ONLY=true (domyślnie, gdy brak zmiennej): tryb lokalny jak dotąd.
- LOCAL_ONLY=false: drugie wczytanie .env z nadpisaniem, oraz GOOGLE_APPLICATION_CREDENTIALS
  na google_cloud.json w katalogu projektu (GCS i inne klienty Google).
"""

from __future__ import annotations

import logging
import os
from pathlib import Path

logger = logging.getLogger(__name__)

_ROOT = Path(__file__).resolve().parent


def _truthy_local_only(raw: str | None) -> bool:
    if raw is None:
        return True
    return raw.strip().lower() in ("1", "true", "yes", "on")


def configure() -> None:
    from dotenv import load_dotenv

    env_file = _ROOT / ".env"
    # Pierwsze wczytanie: nie nadpisuje zmiennych już ustawionych (np. przez Docker Compose).
    # Dzięki temu LOCAL_ONLY może pochodzić z pliku .env.
    if env_file.is_file():
        load_dotenv(env_file, override=False)

    local_only = _truthy_local_only(os.getenv("LOCAL_ONLY"))

    if local_only:
        return

    # Tryb zewnętrzny: .env nadpisuje istniejące zmienne (np. sekrety z pliku na serwerze).
    if env_file.is_file():
        load_dotenv(env_file, override=True)
    else:
        logger.warning(
            "LOCAL_ONLY=false: brak pliku .env w %s — ustaw zmienne środowiskowe ręcznie.",
            env_file,
        )

    gc = _ROOT / "google_cloud.json"
    if gc.is_file():
        os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = str(gc.resolve())
    else:
        logger.warning(
            "LOCAL_ONLY=false: brak %s — klienty Google (np. GCS) mogą nie działać.",
            gc,
        )


configure()
