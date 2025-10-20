from __future__ import annotations

import os
from pathlib import Path
from typing import Dict, List

from dotenv import load_dotenv

from .base_agent import BaseAgent, AgentError
from .logging_utils import log_banner


class MonitoringAgent(BaseAgent):
    name = "MonitoringAgent"

    def run(
        self,
        env_path: str | Path | None = None,
        log_dir: str | Path | None = None,
        check_openai: bool = True,
        check_firebase: bool = True,
    ) -> Dict[str, str]:
        env_file = Path(env_path or Path(__file__).resolve().parent.parent / ".env")
        if env_file.exists():
            load_dotenv(env_file, override=True)
            self.logger.info("Environment variables loaded from %s", env_file)
        else:
            self.logger.warning("Env file not found at %s", env_file)

        log_directory = Path(log_dir or Path(__file__).resolve().parent / "logs")
        log_directory.mkdir(parents=True, exist_ok=True)
        latest_logs = self._summarise_logs(log_directory)

        status: Dict[str, str] = {"log_dir": str(log_directory), "log_files": str(len(latest_logs))}

        if check_openai:
            status["openai"] = self._check_openai()
        if check_firebase:
            status["firebase"] = self._check_firebase()

        self.logger.info("Monitoring summary: %s", status)
        return status

    def _summarise_logs(self, log_dir: Path) -> List[Path]:
        files = sorted(log_dir.glob("*.log"), key=lambda p: p.stat().st_mtime, reverse=True)
        if not files:
            self.logger.info("No log files found in %s", log_dir)
            return []
        self.logger.info("Latest logs:")
        for log_file in files[:5]:
            self.logger.info("  %s (%.1f KB)", log_file.name, log_file.stat().st_size / 1024)
        return files

    def _check_openai(self) -> str:
        from openai import OpenAI

        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise AgentError("OPENAI_API_KEY missing for monitoring")

        self.logger.info("Verifying OpenAI connectivity")
        client = OpenAI(api_key=api_key, timeout=10)
        try:
            models = client.models.list()
            model_names = [m.id for m in models.data[:3]]  # type: ignore[attr-defined]
            self.logger.info("OpenAI reachable, sample models: %s", ", ".join(model_names))
        except Exception as exc:  # noqa: BLE001
            raise AgentError(f"OpenAI connectivity failed: {exc}") from exc
        return "ok"

    def _check_firebase(self) -> str:
        from config.agent_config import AgentConfig
        from utils.firebase_client import FirebaseClient

        self.logger.info("Verifying Firebase connectivity")
        client = FirebaseClient(
            project_id=AgentConfig.FIREBASE_PROJECT_ID,
            app_id=AgentConfig.FIREBASE_APP_ID,
            user_id=AgentConfig.FIREBASE_USER_ID,
            credentials_path=AgentConfig.FIREBASE_CREDENTIALS_PATH,
        )
        try:
            _ = client.get_orders()
        except Exception as exc:  # noqa: BLE001
            raise AgentError(f"Firebase connectivity failed: {exc}") from exc
        return "ok"
