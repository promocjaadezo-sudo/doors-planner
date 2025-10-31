from __future__ import annotations

import logging
import sys
from pathlib import Path
from typing import Optional

LOG_DIR = Path(__file__).resolve().parent / "logs"
LOG_DIR.mkdir(parents=True, exist_ok=True)


def setup_logger(name: str, level: str = "INFO", log_file: Optional[Path] = None) -> logging.Logger:
    """Return a logger configured for console and optional file output."""
    logger = logging.getLogger(name)
    if logger.handlers:
        return logger

    logger.setLevel(getattr(logging, level.upper(), logging.INFO))

    formatter = logging.Formatter("%(asctime)s | %(levelname)s | %(name)s | %(message)s", "%Y-%m-%d %H:%M:%S")

    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(formatter)
    logger.addHandler(console_handler)

    if log_file is None:
        log_file = LOG_DIR / f"{name.lower()}.log"

    file_handler = logging.FileHandler(log_file, encoding="utf-8")
    file_handler.setFormatter(formatter)
    file_handler.setLevel(logging.DEBUG)
    logger.addHandler(file_handler)

    return logger


def log_banner(logger: logging.Logger, title: str) -> None:
    border = "=" * (len(title) + 8)
    logger.info(border)
    logger.info("=== %s ===", title)
    logger.info(border)
