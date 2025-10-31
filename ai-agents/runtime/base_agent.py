from __future__ import annotations

import abc
import traceback
from typing import Any, Dict

from .logging_utils import setup_logger, log_banner


class AgentError(RuntimeError):
    """Raised when an agent operation fails."""


class BaseAgent(abc.ABC):
    """Common interface for runtime automation agents."""

    name: str = "BaseAgent"

    def __init__(self, *, log_level: str = "INFO") -> None:
        self.logger = setup_logger(self.name, log_level)

    def execute(self, **kwargs: Any) -> Dict[str, Any]:
        """Execute the agent with standardised logging and error handling."""
        log_banner(self.logger, f"Start {self.name}")
        try:
            result = self.run(**kwargs)
            self.logger.info("%s finished successfully", self.name)
            return result or {}
        except Exception as exc:  # noqa: BLE001
            self.logger.error("%s failed: %s", self.name, exc)
            self.logger.debug("Traceback:\n%s", traceback.format_exc())
            raise AgentError(f"{self.name} failed") from exc

    @abc.abstractmethod
    def run(self, **kwargs: Any) -> Dict[str, Any]:
        """Perform the agent action. Must be implemented by subclasses."""
