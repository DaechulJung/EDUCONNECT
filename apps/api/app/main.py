import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.ai.port import azure_config_error
from app.api import auth, catalog, chat, family, health, meta, planner, testing
from app.core import errors
from app.core import logging as masking
from app.core.config import Settings, settings
from app.core.db import engine
from app.core.redis import redis

logger = logging.getLogger("app.startup")


def log_llm_config(config: Settings) -> None:
    """One line about the LLM setup, never with values (AC-10.5)."""
    problem = azure_config_error(config)
    if config.llm_provider in ("auto", "azure") and problem not in (None, "missing"):
        logger.warning("Azure OpenAI 설정 오류: %s", problem)


def create_app(config: Settings = settings) -> FastAPI:
    """Every router is registered here and nowhere else (AD-3)."""

    @asynccontextmanager
    async def lifespan(_: FastAPI):
        masking.install(config)
        log_llm_config(config)
        yield
        await redis.aclose()
        await engine.dispose()

    # Operation ids are the route function names, so the generated web client has health().
    app = FastAPI(
        title="EDUCONNECT API",
        lifespan=lifespan,
        generate_unique_id_function=lambda route: route.name,
    )
    errors.install(app)
    for module in (health, auth, catalog, family, chat, planner, meta):
        app.include_router(module.router, prefix="/api")
    if config.enable_test_routes:
        app.include_router(testing.router, prefix="/api")
    return app


app = create_app()
