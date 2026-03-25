"""
Mock driver for testing and development.
Returns predefined responses without calling external APIs.
"""

import asyncio
import logging
from typing import Any, AsyncGenerator, Dict, List, Optional

from drivers.base import BaseDriver

logger = logging.getLogger(__name__)


class MockDriver(BaseDriver):
    """Mock driver for testing without external API calls."""

    DEFAULT_TEXT_RESPONSE = """这是一个模拟的 AI 响应。在打桩模式下，我不会调用真实的外部 AI 服务。

您可以根据需要修改这个响应内容，或者在配置中设置自定义的打桩响应。

打桩模式非常适合：
1. 前端开发测试
2. 接口联调
3. 性能测试
4. 演示环境"""

    DEFAULT_IMAGE_RESPONSE = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="

    def __init__(
        self,
        api_key: str = "mock-key",
        base_url: Optional[str] = None,
        text_response: Optional[str] = None,
        image_response: Optional[str] = None,
        **kwargs,
    ):
        super().__init__(api_key, base_url, **kwargs)
        self.text_response = text_response or self.DEFAULT_TEXT_RESPONSE
        self.image_response = image_response or self.DEFAULT_IMAGE_RESPONSE
        logger.info("MockDriver initialized - all AI calls will return mock responses")

    async def generate_text(
        self,
        messages: List[Dict[str, Any]],
        model: str,
        temperature: float = 0.7,
        max_tokens: int = 4096,
        **kwargs,
    ) -> str:
        """Return mock text response."""
        logger.debug(f"Mock text generation requested with model: {model}")
        await asyncio.sleep(0.5)
        return self.text_response

    async def generate_text_stream(
        self,
        messages: List[Dict[str, Any]],
        model: str,
        temperature: float = 0.7,
        max_tokens: int = 4096,
        **kwargs,
    ) -> AsyncGenerator[str, None]:
        """Return mock text response in chunks."""
        logger.debug(f"Mock streaming requested with model: {model}")

        chunks = self.text_response.split("\n")
        for i, chunk in enumerate(chunks):
            if i > 0:
                yield "\n"
            yield chunk
            await asyncio.sleep(0.1)

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
        """Return mock image response."""
        logger.debug(f"Mock image generation requested with prompt: {prompt[:50]}...")
        await asyncio.sleep(0.5)
        return [self.image_response] * n

    async def check_health(self) -> bool:
        """Mock driver is always healthy."""
        return True
