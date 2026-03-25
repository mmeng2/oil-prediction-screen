"""
OpenAI-compatible driver.
Supports OpenAI API format and compatible providers.
"""

import logging
from typing import Any, AsyncGenerator, Dict, List, Optional

from openai import AsyncOpenAI

from drivers.base import BaseDriver

logger = logging.getLogger(__name__)


class OpenAIDriver(BaseDriver):
    """OpenAI-compatible driver for text and image generation."""

    def __init__(self, api_key: str, base_url: Optional[str] = None, **kwargs):
        super().__init__(api_key, base_url, **kwargs)
        self.client = AsyncOpenAI(
            api_key=api_key,
            base_url=base_url.rstrip("/") if base_url else None,
        )
        logger.info(f"OpenAIDriver initialized with base_url: {base_url or 'https://api.openai.com'}")

    def _convert_message(self, msg: Dict[str, Any]) -> Dict[str, Any]:
        """Convert message format and support multimodal content."""
        content = msg.get("content")
        if isinstance(content, list):
            content = [
                item.dict() if hasattr(item, "dict") else item
                for item in content
            ]
        return {"role": msg["role"], "content": content}

    async def generate_text(
        self,
        messages: List[Dict[str, Any]],
        model: str,
        temperature: float = 0.7,
        max_tokens: int = 4096,
        **kwargs,
    ) -> str:
        """Generate text using OpenAI-compatible API."""
        try:
            converted_messages = [self._convert_message(msg) for msg in messages]

            response = await self.client.chat.completions.create(
                model=model,
                messages=converted_messages,
                temperature=temperature,
                max_tokens=max_tokens,
                stream=False,
                **kwargs,
            )

            content = response.choices[0].message.content or ""
            logger.debug(f"Generated text with {len(content)} characters")
            return content

        except Exception as e:
            logger.error(f"OpenAI text generation failed: {e}")
            raise

    async def generate_text_stream(
        self,
        messages: List[Dict[str, Any]],
        model: str,
        temperature: float = 0.7,
        max_tokens: int = 4096,
        **kwargs,
    ) -> AsyncGenerator[str, None]:
        """Generate text with streaming using OpenAI-compatible API."""
        try:
            converted_messages = [self._convert_message(msg) for msg in messages]

            stream = await self.client.chat.completions.create(
                model=model,
                messages=converted_messages,
                temperature=temperature,
                max_tokens=max_tokens,
                stream=True,
                **kwargs,
            )

            async for chunk in stream:
                if chunk.choices and chunk.choices[0].delta.content:
                    yield chunk.choices[0].delta.content

        except Exception as e:
            logger.error(f"OpenAI streaming failed: {e}")
            raise

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
        """Generate image using OpenAI-compatible API."""
        try:
            if image:
                image_upload = await self._image_str_to_upload_file(image)
                response = await self.client.images.edit(
                    model=model,
                    image=image_upload,
                    prompt=prompt,
                    size=size,
                    n=n,
                )
            else:
                response = await self.client.images.generate(
                    model=model,
                    prompt=prompt,
                    size=size,
                    quality=quality,
                    n=n,
                )

            if not response.data:
                raise RuntimeError("Image generation returned empty result")

            images = [self._extract_image_ref(item) for item in response.data]
            logger.info(f"Generated {len(images)} images")
            return images

        except Exception as e:
            logger.error(f"OpenAI image generation failed: {e}")
            raise

    def _extract_image_ref(self, item: Any) -> str:
        """Extract image URL or base64 from response item."""
        if isinstance(item, dict):
            url = item.get("url")
            if url:
                return url
            b64_json = item.get("b64_json")
            if b64_json:
                return f"data:image/png;base64,{b64_json}"
        else:
            url = getattr(item, "url", None)
            if url:
                return url
            b64_json = getattr(item, "b64_json", None)
            if b64_json:
                return f"data:image/png;base64,{b64_json}"

        raise RuntimeError("Neither url nor b64_json found in image response")

    async def _image_str_to_upload_file(self, image: str, name_prefix: str = "image") -> Any:
        """Convert base64 data URI to uploadable file object."""
        import base64
        import io

        if not image.startswith("data:"):
            raise ValueError("Only base64 data URI is supported")

        header, b64_data = image.split(",", 1)
        content_type = "image/png"
        if header.startswith("data:"):
            meta = header[5:]
            if ";" in meta:
                content_type = meta.split(";", 1)[0].strip()

        image_bytes = base64.b64decode(b64_data)
        upload = io.BytesIO(image_bytes)
        ext = {"image/png": "png", "image/jpeg": "jpg", "image/jpg": "jpg", "image/webp": "webp"}.get(
            content_type.lower(), "png"
        )
        upload.name = f"{name_prefix}.{ext}"
        return upload

    async def check_health(self) -> bool:
        """Check OpenAI driver health."""
        try:
            await self.client.models.list()
            return True
        except Exception as e:
            logger.error(f"OpenAI health check failed: {e}")
            return False
