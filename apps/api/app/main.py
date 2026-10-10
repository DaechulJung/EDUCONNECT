from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.api import health
from app.core.db import engine
from app.core.redis import redis


@asynccontextmanager
async def lifespan(_: FastAPI):
    yield
    await redis.aclose()
    await engine.dispose()


# Operation ids are the route function names, so the generated web client has health().
app = FastAPI(title="API", lifespan=lifespan, generate_unique_id_function=lambda route: route.name)
app.include_router(health.router, prefix="/api")
