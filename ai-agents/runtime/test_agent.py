from __future__ import annotations

import unittest
from pathlib import Path
from typing import Dict, Iterable

from dotenv import dotenv_values

from .base_agent import BaseAgent, AgentError
from .config_agent import REQUIRED_KEYS
from .logging_utils import log_banner


class TestAgent(BaseAgent):
    name = "TestAgent"

    def run(
        self,
        env_path: str | Path | None = None,
        required_keys: Iterable[str] | None = None,
    ) -> Dict[str, str]:
        env_file = Path(env_path or Path(__file__).resolve().parent.parent / ".env")
        if not env_file.exists():
            raise AgentError(f"Env file required for tests: {env_file}")

        config = dotenv_values(env_file)
        required = list(required_keys or REQUIRED_KEYS)

        suite = unittest.TestSuite()
        suite.addTest(self._env_test_case(env_file, config, required))
        suite.addTest(self._firebase_import_test())

        runner = unittest.TextTestRunner(verbosity=2)
        log_banner(self.logger, "Running unit tests")
        result = runner.run(suite)

        if not result.wasSuccessful():
            raise AgentError("Tests failed")

        summary = {
            "tests_run": str(result.testsRun),
            "failures": str(len(result.failures)),
            "errors": str(len(result.errors)),
        }
        self.logger.info("Test summary: %s", summary)
        return summary

    def _env_test_case(
        self,
        env_file: Path,
        config: Dict[str, str],
        required: Iterable[str],
    ) -> unittest.TestSuite:
        class EnvTests(unittest.TestCase):
            def test_required_keys_present(self) -> None:  # noqa: D401
                missing = [k for k in required if not config.get(k)]
                if missing:
                    raise AssertionError(f"Missing keys in {env_file}: {', '.join(missing)}")

        return unittest.defaultTestLoader.loadTestsFromTestCase(EnvTests)

    def _firebase_import_test(self) -> unittest.TestSuite:
        class FirebaseTests(unittest.TestCase):
            def test_firebase_admin_available(self) -> None:  # noqa: D401
                try:
                    from firebase_admin import firestore  # noqa: F401
                except Exception as exc:  # noqa: BLE001
                    raise AssertionError(f"firebase-admin not available: {exc}") from exc

        return unittest.defaultTestLoader.loadTestsFromTestCase(FirebaseTests)
