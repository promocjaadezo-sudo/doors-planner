from __future__ import annotations

from pathlib import Path
from typing import Dict, Iterable

from dotenv import dotenv_values

from .base_agent import BaseAgent, AgentError

REQUIRED_KEYS = [
    "OPENAI_API_KEY",
    "FIREBASE_PROJECT_ID",
    "FIREBASE_APP_ID",
    "FIREBASE_USER_ID",
]


class ConfigurationAgent(BaseAgent):
    name = "ConfigurationAgent"

    def run(
        self,
        env_path: str | Path | None = None,
        required_keys: Iterable[str] | None = None,
    ) -> Dict[str, str]:
        env_file = Path(env_path or Path(__file__).resolve().parent.parent / ".env")
        if not env_file.exists():
            raise AgentError(f"Config file not found: {env_file}")

        self.logger.info("Loading configuration from %s", env_file)
        config = dotenv_values(env_file)
        missing = [k for k in (list(required_keys or REQUIRED_KEYS)) if not config.get(k)]

        if missing:
            raise AgentError(f"Missing required .env keys: {', '.join(missing)}")

        masked = {k: ("***" if k.lower().endswith("key") else v) for k, v in config.items()}
        self.logger.debug("Configuration snapshot: %s", masked)

        self.logger.info("Configuration validated (%d entries)", len(config))
        return {"env_file": str(env_file), "entries": str(len(config))}
