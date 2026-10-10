from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Read from environment variables or apps/api/.env (server only, AD-10).

    The defaults match `npm run infra` (db and redis from compose.yml on localhost).
    Azure OpenAI values are never logged, returned or sent to the web app.
    """

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+psycopg://app:app@localhost:15432/app"
    redis_url: str = "redis://localhost:16379/0"

    # azure: always Azure OpenAI, fake: test double (ai/fake.py), none: fallback paths only,
    # auto: azure when the Azure variables are set, otherwise none.
    llm_provider: Literal["auto", "azure", "fake", "none"] = "auto"
    enable_test_routes: bool = False  # /api/test/* exists only when 1 (AD-11)

    azure_openai_location: str = ""
    azure_openai_endpoint: str = ""
    azure_openai_base_url: str = ""
    azure_openai_api_key: str = ""
    azure_openai_deployment: str = "gpt-5.4-mini"

    seed_password: str = ""  # seed accounts only (REQ-11); never printed


settings = Settings()
