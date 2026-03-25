import logging
import os
import traceback
from contextlib import asynccontextmanager
from datetime import datetime

from core.config import settings
from core.exceptions import BusinessException
from fastapi import FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

# Import routers
from api.v1 import (
    aihub_router,
    auth_router,
    health_router,
    settings_router,
    user_router,
)

# Import services for initialization
from services.database import close_database, initialize_database
from services.mock_data import initialize_mock_data
from services.auth import initialize_admin_user


def setup_logging():
    """Configure the logging system."""
    if os.environ.get("IS_LAMBDA") == "true":
        return

    log_dir = "logs"
    if not os.path.exists(log_dir):
        os.makedirs(log_dir)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    log_file = f"{log_dir}/app_{timestamp}.log"

    log_format = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"

    logging.basicConfig(
        level=logging.DEBUG,
        format=log_format,
        handlers=[
            logging.FileHandler(log_file, encoding="utf-8"),
            logging.StreamHandler(),
        ],
    )

    logging.getLogger("uvicorn").setLevel(logging.DEBUG)
    logging.getLogger("fastapi").setLevel(logging.DEBUG)

    logger = logging.getLogger(__name__)
    logger.info("=== Logging system initialized ===")
    logger.info(f"Log file: {log_file}")
    logger.info("Log level: INFO")
    logger.info(f"Timestamp: {timestamp}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""
    logger = logging.getLogger(__name__)
    logger.info("=== Application startup initiated ===")

    await initialize_database()
    await initialize_mock_data()
    await initialize_admin_user()

    logger.info("=== Application startup completed successfully ===")
    yield

    await close_database()
    logger.info("=== Application shutdown completed ===")


app = FastAPI(
    title="Oil Prediction Screen API",
    description="Backend API for oil price prediction and analysis",
    version="1.0.0",
    lifespan=lifespan,
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r".*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Include routers with v1 prefix
app.include_router(health_router, prefix="/api/v1")
app.include_router(auth_router, prefix="/api/v1")
app.include_router(user_router, prefix="/api/v1")
app.include_router(aihub_router, prefix="/api/v1")
app.include_router(settings_router, prefix="/api/v1/admin")


@app.exception_handler(BusinessException)
async def business_exception_handler(request: Request, exc: BusinessException):
    """Handle business exceptions."""
    logger = logging.getLogger(__name__)
    logger.warning(f"Business error: {exc.message}")

    return JSONResponse(
        status_code=500,
        content={
            "code": exc.code,
            "message": exc.message,
            "data": exc.data,
        },
    )


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Handle HTTP exceptions."""
    logger = logging.getLogger(__name__)
    logger.debug(f"HTTP error: {exc.status_code} - {exc.detail}")

    return JSONResponse(
        status_code=exc.status_code,
        content={
            "code": exc.status_code,
            "message": exc.detail,
            "data": None,
        },
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Handle all other exceptions."""
    logger = logging.getLogger(__name__)
    error_message = str(exc)
    error_type = type(exc).__name__

    logger.error(f"Exception: {error_type}: {error_message}\n{traceback.format_exc()}")

    is_dev = os.getenv("ENVIRONMENT", "prod").lower() == "dev"

    if is_dev:
        error_detail = f"{error_type}: {error_message}\n{traceback.format_exc()}"
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"code": 500, "message": error_detail, "data": None},
        )
    else:
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"code": 500, "message": "Internal Server Error", "data": None},
        )


@app.get("/")
def root():
    """Root endpoint."""
    return {"message": "Oil Prediction Screen API is running", "version": settings.version}


@app.get("/health")
def health_check():
    """Basic health check."""
    return {"status": "healthy"}


def run_in_debug_mode(app: FastAPI):
    """Run the FastAPI app in debug mode."""
    import asyncio
    from pathlib import Path

    import uvicorn
    from dotenv import load_dotenv

    env_path = Path(__file__).parent.parent / ".env"
    if env_path.exists():
        load_dotenv(env_path, override=True)
        logger = logging.getLogger(__name__)
        logger.info(f"Loaded environment variables from {env_path}")

    config = uvicorn.Config(
        app,
        host="0.0.0.0",
        port=int(settings.port),
        log_level="info",
    )
    server = uvicorn.Server(config)
    asyncio.run(server.serve())


if __name__ == "__main__":
    import sys

    import uvicorn

    is_debugging = "pydevd" in sys.modules or (hasattr(sys, "gettrace") and sys.gettrace() is not None)

    if is_debugging:
        run_in_debug_mode(app)
    else:
        uvicorn.run(
            app,
            host="0.0.0.0",
            port=int(settings.port),
            reload_excludes=["**/*.py"],
        )
