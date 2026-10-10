from typing import Literal, Self

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Read from environment variables or apps/api/.env (server only, AD-10).

    Without DATABASE_URL/REDIS_URL the addresses are built from the same DB_PORT, REDIS_PORT and
    POSTGRES_* variables compose.yml publishes with, so moving the ports moves the app too.
    Azure OpenAI values are never logged, returned or sent to the web app.
    """

    # compose.yml passes unset variables as "" (`${NAME:-}`); treat them as unset (#14 follow-up)
    model_config = SettingsConfigDict(env_file=".env", extra="ignore", env_ignore_empty=True)

    db_port: int = 15432
    redis_port: int = 16379
    # EDUCONNECT's own names, so the defaults never log in to another scaffold project's app/app
    postgres_user: str = "educonnect"
    postgres_password: str = "educonnect"
    postgres_db: str = "educonnect"
    database_url: str = ""  # set explicitly (compose api, CI) to override the built address
    redis_url: str = ""

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

    @model_validator(mode="after")
    def build_local_urls(self) -> Self:
        if not self.database_url:
            self.database_url = (
                f"postgresql+psycopg://{self.postgres_user}:{self.postgres_password}"
                f"@localhost:{self.db_port}/{self.postgres_db}"
            )
        if not self.redis_url:
            self.redis_url = f"redis://localhost:{self.redis_port}/0"
        return self


settings = Settings()
