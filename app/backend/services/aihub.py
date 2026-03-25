"""
AI Hub service with driver abstraction.
Supports multiple AI providers through driver pattern.
"""

import logging
from typing import Any, AsyncGenerator, Dict, List

from core.config import settings
from core.exceptions import AIServiceError, ConfigurationError
from drivers import get_driver
from schemas.aihub import GenImgRequest, GenImgResponse, GenTxtRequest, GenTxtResponse

logger = logging.getLogger(__name__)


class AIHubService:
    """AI Hub service with provider abstraction."""

    def __init__(self, provider: str | None = None):
        """
        Initialize AI service.

        Args:
            provider: Optional provider name override. Uses config if None.
        """
        import os
        
        # Check mock mode from environment or settings
        mock_enabled = os.environ.get("AI_MOCK_ENABLED", "").lower() == "true"
        if not mock_enabled:
            mock_enabled = getattr(settings, "ai_mock_enabled", False)
        
        if mock_enabled:
            provider = "mock"
            logger.info("AI mock mode enabled - using MockDriver")

        try:
            self.driver = get_driver(provider)
            logger.info(f"AIHubService initialized with provider: {provider or settings.ai_provider}")
        except ValueError as e:
            logger.error(f"Failed to initialize AI driver: {e}")
            raise ConfigurationError(str(e))

    def _convert_message(self, msg) -> Dict[str, Any]:
        """Convert message schema to dict for driver."""
        content = msg.content
        if isinstance(content, list):
            content = [item.model_dump() if hasattr(item, "model_dump") else item for item in content]
        return {"role": msg.role, "content": content}

    async def gentxt(self, request: GenTxtRequest) -> GenTxtResponse:
        """
        Generate text (non-streaming).

        Args:
            request: Text generation request

        Returns:
            Text generation response
        """
        try:
            messages = [self._convert_message(msg) for msg in request.messages]

            content = await self.driver.generate_text(
                messages=messages,
                model=request.model,
                temperature=request.temperature,
                max_tokens=request.max_tokens,
            )

            return GenTxtResponse(
                content=content,
                model=request.model,
                usage=None,
            )

        except Exception as e:
            logger.error(f"Text generation failed: {e}")
            raise AIServiceError(f"Text generation failed: {str(e)}")

    async def gentxt_stream(self, request: GenTxtRequest) -> AsyncGenerator[str, None]:
        """
        Generate text with streaming.

        Args:
            request: Text generation request

        Yields:
            Text content chunks
        """
        try:
            messages = [self._convert_message(msg) for msg in request.messages]

            async for chunk in self.driver.generate_text_stream(
                messages=messages,
                model=request.model,
                temperature=request.temperature,
                max_tokens=request.max_tokens,
            ):
                yield chunk

        except Exception as e:
            logger.error(f"Streaming text generation failed: {e}")
            raise AIServiceError(f"Streaming failed: {str(e)}")

    async def genimg(self, request: GenImgRequest) -> GenImgResponse:
        """
        Generate image.

        Args:
            request: Image generation request

        Returns:
            Image generation response
        """
        try:
            images = await self.driver.generate_image(
                prompt=request.prompt,
                model=request.model,
                size=request.size,
                quality=request.quality,
                n=request.n,
                image=request.image,
            )

            if not images:
                raise AIServiceError("Image generation returned empty result")

            return GenImgResponse(
                images=images,
                model=request.model,
                revised_prompt=None,
            )

        except Exception as e:
            logger.error(f"Image generation failed: {e}")
            raise AIServiceError(f"Image generation failed: {str(e)}")

    async def check_health(self) -> bool:
        """Check AI service health."""
        try:
            return await self.driver.check_health()
        except Exception as e:
            logger.error(f"AI health check failed: {e}")
            return False
