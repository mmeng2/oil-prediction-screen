"""
Test script for backend refactoring verification.
Tests the new architecture components.
"""

import asyncio
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent))


async def test_drivers():
    """Test AI driver factory."""
    print("\n=== Testing AI Drivers ===")
    
    from drivers import get_driver, get_available_drivers
    from drivers.mock_driver import MockDriver
    
    # Test available drivers
    available = get_available_drivers()
    print(f"✓ Available drivers: {available}")
    assert "openai" in available
    assert "mock" in available
    
    # Test mock driver
    mock_driver = get_driver("mock")
    assert isinstance(mock_driver, MockDriver)
    print(f"✓ Mock driver created: {mock_driver.__class__.__name__}")
    
    # Test mock text generation
    text = await mock_driver.generate_text(
        messages=[{"role": "user", "content": "Hello"}],
        model="mock-model"
    )
    print(f"✓ Mock text generation: {len(text)} characters")
    assert len(text) > 0
    
    # Test mock streaming
    chunks = []
    async for chunk in mock_driver.generate_text_stream(
        messages=[{"role": "user", "content": "Hello"}],
        model="mock-model"
    ):
        chunks.append(chunk)
    print(f"✓ Mock streaming: {len(chunks)} chunks")
    assert len(chunks) > 0
    
    # Test mock image generation
    images = await mock_driver.generate_image(
        prompt="Test prompt",
        model="mock-model"
    )
    print(f"✓ Mock image generation: {len(images)} images")
    assert len(images) > 0
    
    # Test health check
    healthy = await mock_driver.check_health()
    print(f"✓ Mock health check: {healthy}")
    assert healthy is True
    
    print("✅ All driver tests passed!\n")


async def test_aihub_service():
    """Test AI Hub service with mock driver."""
    print("=== Testing AI Hub Service ===")
    
    import os
    os.environ["AI_MOCK_ENABLED"] = "true"
    
    from services.aihub import AIHubService
    from schemas.aihub import GenTxtRequest, GenImgRequest, ChatMessage
    
    # Test text generation
    service = AIHubService()
    request = GenTxtRequest(
        messages=[ChatMessage(role="user", content="Test message")],
        model="mock-model"
    )
    
    response = await service.gentxt(request)
    print(f"✓ Text generation: {len(response.content)} characters")
    assert len(response.content) > 0
    
    # Test streaming
    chunks = []
    async for chunk in service.gentxt_stream(request):
        chunks.append(chunk)
    print(f"✓ Streaming: {len(chunks)} chunks")
    assert len(chunks) > 0
    
    # Test image generation
    img_request = GenImgRequest(
        prompt="Test prompt",
        model="mock-model"
    )
    
    img_response = await service.genimg(img_request)
    print(f"✓ Image generation: {len(img_response.images)} images")
    assert len(img_response.images) > 0
    
    # Test health check
    healthy = await service.check_health()
    print(f"✓ Service health check: {healthy}")
    
    print("✅ All AI Hub service tests passed!\n")


def test_schemas():
    """Test Pydantic schemas."""
    print("=== Testing Schemas ===")
    
    from schemas.common import APIResponse, HealthResponse, PaginatedResponse
    from schemas.aihub import GenTxtRequest, GenTxtResponse, ChatMessage
    
    # Test APIResponse
    response = APIResponse.success(data={"key": "value"})
    assert response.code == 0
    assert response.message == "success"
    print(f"✓ APIResponse success: {response}")
    
    error_response = APIResponse.error(code=1, message="Error occurred")
    assert error_response.code == 1
    print(f"✓ APIResponse error: {error_response}")
    
    # Test HealthResponse
    health = HealthResponse(status="healthy")
    print(f"✓ HealthResponse: {health}")
    
    # Test PaginatedResponse
    paginated = PaginatedResponse.from_items(
        items=[1, 2, 3],
        total=10,
        page=1,
        page_size=3
    )
    assert paginated.total_pages == 4
    print(f"✓ PaginatedResponse: {paginated.total_pages} pages")
    
    # Test GenTxtRequest
    txt_request = GenTxtRequest(
        messages=[ChatMessage(role="user", content="Hello")],
        model="gpt-4"
    )
    print(f"✓ GenTxtRequest: {len(txt_request.messages)} messages")
    
    # Test GenTxtResponse
    txt_response = GenTxtResponse(
        content="Response text",
        model="gpt-4"
    )
    print(f"✓ GenTxtResponse: {txt_response.content}")
    
    print("✅ All schema tests passed!\n")


def test_exceptions():
    """Test custom exceptions."""
    print("=== Testing Exceptions ===")
    
    from core.exceptions import (
        BusinessException,
        AuthenticationError,
        AuthorizationError,
        NotFoundError,
        AIServiceError,
    )
    
    # Test BusinessException
    try:
        raise BusinessException(code=1, message="Test error")
    except BusinessException as e:
        assert e.code == 1
        assert e.message == "Test error"
        print(f"✓ BusinessException: code={e.code}, message={e.message}")
    
    # Test AuthenticationError
    try:
        raise AuthenticationError("Auth failed")
    except AuthenticationError as e:
        assert e.code == 401
        print(f"✓ AuthenticationError: {e.message}")
    
    # Test AuthorizationError
    try:
        raise AuthorizationError("Access denied")
    except AuthorizationError as e:
        assert e.code == 403
        print(f"✓ AuthorizationError: {e.message}")
    
    # Test NotFoundError
    try:
        raise NotFoundError("Resource not found")
    except NotFoundError as e:
        assert e.code == 404
        print(f"✓ NotFoundError: {e.message}")
    
    # Test AIServiceError
    try:
        raise AIServiceError("AI service unavailable")
    except AIServiceError as e:
        assert e.code == 503
        print(f"✓ AIServiceError: {e.message}")
    
    print("✅ All exception tests passed!\n")


async def main():
    """Run all tests."""
    print("\n" + "="*60)
    print("BACKEND REFACTORING VERIFICATION TESTS")
    print("="*60)
    
    try:
        test_schemas()
        test_exceptions()
        await test_drivers()
        await test_aihub_service()
        
        print("\n" + "="*60)
        print("🎉 ALL TESTS PASSED!")
        print("="*60)
        print("\nThe backend refactoring is successful:")
        print("✓ Directory structure is correct")
        print("✓ AI driver abstraction works")
        print("✓ Mock driver (stub mode) is functional")
        print("✓ Service layer integration works")
        print("✓ Schemas and exceptions are correct")
        print("\nYou can now start the server with:")
        print("  python main.py")
        print("\nOr enable mock mode with:")
        print("  AI_MOCK_ENABLED=true python main.py")
        print()
        
    except Exception as e:
        print(f"\n❌ TEST FAILED: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
