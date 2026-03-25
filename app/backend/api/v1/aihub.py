"""
AI Hub API v1 routes.
"""

import json
import logging

from api.deps import get_current_user
from core.exceptions import AIServiceError, ConfigurationError
from fastapi import APIRouter, Depends, HTTPException, status
from schemas.aihub import GenImgRequest, GenImgResponse, GenTxtRequest
from schemas.common import APIResponse
from services.aihub import AIHubService
from sse_starlette.sse import EventSourceResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/aihub", tags=["AI Hub"])


def extract_error_message(error: Exception) -> str:
    """Extract readable error message from exception."""
    error_str = str(error)
    if hasattr(error, "message"):
        return error.message
    return error_str[:500]


@router.post("/gentxt", response_model=APIResponse[GenTxtResponse])
async def generate_text(
    request: GenTxtRequest,
    current_user=Depends(get_current_user),
):
    """
    Generate text with AI model.

    Supports streaming and non-streaming modes.
    """
    try:
        service = AIHubService()

        if request.stream:
            async def event_generator():
                try:
                    async for content in service.gentxt_stream(request):
                        yield json.dumps({"content": content})
                except Exception as e:
                    logger.error(f"Stream error: {e}")
                    yield json.dumps({"content": f"[ERROR] {extract_error_message(e)}"})
                finally:
                    yield "[DONE]"

            return EventSourceResponse(event_generator(), media_type="text/event-stream")
        else:
            response = await service.gentxt(request)
            return APIResponse.success(data=response, message="Text generated successfully")

    except ConfigurationError as e:
        logger.error(f"AI configuration error: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=extract_error_message(e),
        )
    except AIServiceError as e:
        logger.error(f"AI service error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=extract_error_message(e),
        )
    except Exception as e:
        logger.error(f"Text generation failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=extract_error_message(e),
        )


@router.post("/genimg", response_model=APIResponse[GenImgResponse])
async def generate_image(
    request: GenImgRequest,
    current_user=Depends(get_current_user),
):
    """
    Generate image with AI model.

    Supports text-to-image and image-to-image.
    """
    try:
        service = AIHubService()
        response = await service.genimg(request)
        return APIResponse.success(data=response, message="Image generated successfully")

    except ValueError as e:
        logger.warning(f"Invalid image input: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except ConfigurationError as e:
        logger.error(f"AI configuration error: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=extract_error_message(e),
        )
    except AIServiceError as e:
        logger.error(f"AI service error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=extract_error_message(e),
        )
    except Exception as e:
        logger.error(f"Image generation failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=extract_error_message(e),
        )


@router.get("/health")
async def health_check():
    """Check AI service health."""
    try:
        service = AIHubService()
        is_healthy = await service.check_health()
        return APIResponse.success(
            data={"healthy": is_healthy, "provider": service.driver.__class__.__name__}
        )
    except Exception as e:
        logger.error(f"AI health check failed: {e}")
        return APIResponse.error(code=1, message=f"Health check failed: {str(e)}")
