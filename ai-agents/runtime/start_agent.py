from __future__ import annotations

import subprocess
from pathlib import Path
from typing import Dict

from dotenv import load_dotenv

from .base_agent import BaseAgent, AgentError


class StartAgent(BaseAgent):
    name = "StartAgent"

    def run(
        self,
        project_root: Path | None = None,
        env_path: Path | None = None,
        mode: str = "report",
    ) -> Dict[str, str]:
        root = Path(project_root or Path(__file__).resolve().parent.parent)
        env_file = env_path or (root / ".env")
        if env_file.exists():
            load_dotenv(env_file, override=True)
            self.logger.info("Environment loaded from %s", env_file)

        if mode == "cli":
            return self._run_cli(root)
        if mode == "report":
            return self._generate_report(root)
        raise AgentError(f"Unsupported start mode: {mode}")

    def _run_cli(self, root: Path) -> Dict[str, str]:
        script = root / "agents" / "production_agent.py"
        if not script.exists():
            raise AgentError(f"CLI script not found: {script}")
        self.logger.info("Launching ProductionAgent CLI")
        subprocess.run(["python", str(script)], check=True)
        return {"mode": "cli", "script": str(script)}

    def _generate_report(self, root: Path) -> Dict[str, str]:
        self.logger.info("Generating automated production report")
        from agents.production_agent import ProductionAgent
        from config.agent_config import AgentConfig

        agent = ProductionAgent(AgentConfig)
        status = agent.analyze_production_status()
        report = agent.generate_daily_report()

        reports_dir = root / "reports"
        reports_dir.mkdir(exist_ok=True)
        report_file = reports_dir / "auto_report.txt"
        report_file.write_text(report, encoding="utf-8")

        self.logger.info("Report saved to %s", report_file)
        self.logger.info("Orders: %s | Tasks: %s", status["stats"]["total_orders"], status["stats"]["total_tasks"])
        return {"mode": "report", "report_file": str(report_file)}
