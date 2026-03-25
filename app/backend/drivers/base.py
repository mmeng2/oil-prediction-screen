"""
Base AI driver abstract class.
All AI model drivers must inherit from this class.
"""

from abc import ABC, abstractmethod
from typing import Any, AsyncGenerator, Dict, List, Optional


class BaseDriver(ABC):
    """Abstract base class for AI model drivers."""

    def __init__(self, api_key: str, base_url: Optional[str] = None, **kwargs):
        """
        Initialize the driver.

        Args:
            api_key: API key for the service
            base_url: Base URL for the API (optional)
            **kwargs: Additional provider-specific configuration
        """
        self.api_key = api_key
        self.base_url = base_url
        self.config = kwargs

    @abstractmethod
    async def generate_text(
        self,
        messages: List[Dict[str, Any]],
        model: str,
        temperature: float = 0.7,
        max_tokens: int = 4096,
        **kwargs,
    ) -> str:
        """
        Generate text response.

        Args:
            messages: List of message dicts with 'role' and 'content'
            model: Model name to use
            temperature: Sampling temperature (0-2)
            max_tokens: Maximum tokens to generate
            **kwargs: Additional provider-specific parameters

        Returns:
            Generated text content
        """
        pass

    @abstractmethod
    async def generate_text_stream(
        self,
        messages: List[Dict[str, Any]],
        model: str,
        temperature: float = 0.7,
        max_tokens: int = 4096,
        **kwargs,
    ) -> AsyncGenerator[str, None]:
        """
        Generate text response with streaming.

        Args:
            messages: List of message dicts with 'role' and 'content'
            model: Model name to use
            temperature: Sampling temperature (0-2)
            max_tokens: Maximum tokens to generate
            **kwargs: Additional provider-specific parameters

        Yields:
            Text content chunks
        """
        pass

    @abstractmethod
    async def generate_image(
        self,
        prompt: str,
        model: str,
        size: str = "1024x1024",
        quality: str = "standard",
        n: int = 1,
        image: Optional[str] = None,
        **kwargs,
    ) -> List[str]:
        """
        Generate image(s).

        Args:
            prompt: Text prompt for image generation
            model: Model name to use
            size: Image size
            quality: Image quality
            n: Number of images to generate
            image: Optional input image for editing (base64 data URI)
            **kwargs: Additional provider-specific parameters

        Returns:
            List of image URLs or base64 data URIs
        """
        pass

    @abstractmethod
    async def check_health(self) -> bool:
        """
        Check if the driver is healthy and configured.

        Returns:
            True if healthy, False otherwise
        """
        pass
