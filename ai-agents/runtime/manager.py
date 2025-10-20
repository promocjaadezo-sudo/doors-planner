from __future__ import annotations

import argparse
from pathlib import Path
from typing import Dict, List

from .base_agent import AgentError
from .config_agent import ConfigurationAgent
from .initialization_agent import InitializationAgent, DEFAULT_PACKAGES
from .logging_utils import log_banner, setup_logger
from .monitoring_agent import MonitoringAgent
from .start_agent import StartAgent
from .test_agent import TestAgent


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Run automation agents for production setup")
    parser.add_argument("--project-root", type=Path, default=Path(__file__).resolve().parent.parent,
                        help="Ścieżka do katalogu projektu (domyślnie katalog ai-agents)")
    parser.add_argument("--env", type=Path, default=None,
                        help="Ścieżka do pliku .env")
    parser.add_argument("--venv", default="venv", help="Nazwa katalogu wirtualnego środowiska")
    parser.add_argument("--skip-init", action="store_true", help="Pomiń tworzenie/aktualizację virtualenv")
    parser.add_argument("--skip-tests", action="store_true", help="Pomiń uruchamianie testów")
    parser.add_argument("--skip-monitoring", action="store_true", help="Pomiń kroki monitoringu")
    parser.add_argument("--start-mode", choices=["report", "cli"], default="report",
                        help="Tryb działania agenta startowego")
    parser.add_argument("--packages", nargs="*", default=None,
                        help="Lista pakietów do instalacji (domyślnie zestaw podstawowy)")
    parser.add_argument("--log-level", default="INFO", help="Poziom logowania dla agentów")
    return parser


def main() -> None:
    parser = build_parser()
    args = parser.parse_args()

    logger = setup_logger("AgentManager", args.log_level)
    log_banner(logger, "Agent Manager")

    project_root: Path = args.project_root.resolve()
    env_file = args.env or (project_root / ".env")
    logger.info("Projekt: %s", project_root)
    logger.info("Plik .env: %s", env_file)

    context: Dict[str, str] = {}

    try:
        if not args.skip_init:
            packages = args.packages or DEFAULT_PACKAGES
            result = InitializationAgent(log_level=args.log_level).execute(
                project_root=project_root,
                venv_name=args.venv,
                packages=packages,
            )
            context.update(result)
        else:
            logger.info("Pomięto agenta inicjalizacji")

        config_result = ConfigurationAgent(log_level=args.log_level).execute(env_path=env_file)
        context.update(config_result)

        if not args.skip_tests:
            test_result = TestAgent(log_level=args.log_level).execute(env_path=env_file)
            context.update(test_result)
        else:
            logger.info("Pomięto agenta testów")

        if not args.skip_monitoring:
            monitoring_result = MonitoringAgent(log_level=args.log_level).execute(env_path=env_file)
            context.update(monitoring_result)
        else:
            logger.info("Pomięto agenta monitoringu")

        start_result = StartAgent(log_level=args.log_level).execute(
            project_root=project_root,
            env_path=env_file,
            mode=args.start_mode,
        )
        context.update(start_result)

    except AgentError as exc:
        logger.error("Przerwano działanie managera: %s", exc)
        raise SystemExit(1) from exc

    logger.info("Proces zakończony sukcesem. Podsumowanie: %s", context)


if __name__ == "__main__":
    main()
