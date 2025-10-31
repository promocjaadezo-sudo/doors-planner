from __future__ import annotations

import os
import platform
import subprocess
from pathlib import Path
from typing import Dict, Iterable, List

from .base_agent import BaseAgent

DEFAULT_PACKAGES: List[str] = [
    "numpy",
    "openai",
    "python-dotenv",
    "rich",
    "firebase-admin",
]


class InitializationAgent(BaseAgent):
    name = "InitializationAgent"

    def run(
        self,
        project_root: Path | None = None,
        venv_name: str = "venv",
        packages: Iterable[str] | None = None,
    ) -> Dict[str, str]:
        root = Path(project_root or Path(__file__).resolve().parent.parent).resolve()
        venv_dir = root / venv_name
        venv_python = self._ensure_virtualenv(venv_dir)
        self._install_packages(venv_python, packages)

        activation_hint = self._activation_hint(venv_dir)
        self.logger.info("Activate environment using: %s", activation_hint)

        return {
            "project_root": str(root),
            "venv_path": str(venv_dir),
            "venv_python": str(venv_python),
        }

    def _ensure_virtualenv(self, venv_dir: Path) -> Path:
        if venv_dir.exists():
            self.logger.info("Virtualenv already present at %s", venv_dir)
        else:
            self.logger.info("Creating virtualenv at %s", venv_dir)
            venv_dir.parent.mkdir(parents=True, exist_ok=True)
            subprocess.run(
                [self._current_python(), "-m", "venv", str(venv_dir)],
                check=True,
            )
            self.logger.info("Virtualenv created")
        return self._venv_python(venv_dir)

    def _install_packages(self, python_bin: Path, packages: Iterable[str] | None) -> None:
        package_list = list(packages or DEFAULT_PACKAGES)
        if not package_list:
            self.logger.warning("No packages specified for installation")
            return

        self.logger.info("Upgrading pip in %s", python_bin)
        subprocess.run([str(python_bin), "-m", "pip", "install", "--upgrade", "pip"], check=True)

        self.logger.info("Installing packages: %s", ", ".join(package_list))
        subprocess.run([str(python_bin), "-m", "pip", "install", *package_list], check=True)

    @staticmethod
    def _venv_python(venv_dir: Path) -> Path:
        if platform.system().lower().startswith("win"):
            return venv_dir / "Scripts" / "python.exe"
        return venv_dir / "bin" / "python"

    @staticmethod
    def _current_python() -> str:
        return os.environ.get("PYTHON_EXECUTABLE", "python")

    @staticmethod
    def _activation_hint(venv_dir: Path) -> str:
        if platform.system().lower().startswith("win"):
            return f"{venv_dir / 'Scripts' / 'Activate.ps1'}"
        return f"source {venv_dir / 'bin' / 'activate'}"
