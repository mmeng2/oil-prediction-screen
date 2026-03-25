"""
Driver factory and registry.
Provides centralized driver management and selection.
"""

import logging
from typing import Dict, Type

from core.config import settings
from drivers.base import BaseDriver
from drivers.mock_driver import MockDriver
from drivers.openai_driver import OpenAIDriver

logger = logging.getLogger(__name__)

DRIVER_REGISTRY: Dict[str, Type[BaseDriver]] = {
    "openai": OpenAIDriver,
    "mock": MockDriver,
}


def register_driver(name: str, driver_class: Type[BaseDriver]):
    """
    Register a new driver class.

    Args:
        name: Driver name (used in configuration)
        driver_class: Driver class that inherits from BaseDriver
    """
    DRIVER_REGISTRY[name.lower()] = driver_class
    logger.info(f"Registered driver: {name}")


def get_driver(provider: str | None = None) -> BaseDriver:
    """
    Get a driver instance based on configuration.

    Args:
        provider: Optional provider name override. If None, uses settings.ai_provider

    Returns:
        Configured driver instance

    Raises:
        ValueError: If provider is not supported
    """
    if provider is None:
        provider = getattr(settings, "ai_provider", "openai")

    provider = provider.lower()

    if provider not in DRIVER_REGISTRY:
        available = ", ".join(DRIVER_REGISTRY.keys())
        raise ValueError(f"Unknown AI provider: {provider}. Available: {available}")

    driver_class = DRIVER_REGISTRY[provider]

    if provider == "mock":
        logger.info("Using MockDriver - AI calls will return stub responses")
        return driver_class()

    api_key = getattr(settings, "app_ai_key", None)
    base_url = getattr(settings, "app_ai_base_url", None)

    if not api_key:
        raise ValueError(f"API key not configured for provider: {provider}")

    logger.info(f"Initializing {provider} driver")
    return driver_class(api_key=api_key, base_url=base_url)


def get_available_drivers() -> list[str]:
    """Get list of available driver names."""
    return list(DRIVER_REGISTRY.keys())
