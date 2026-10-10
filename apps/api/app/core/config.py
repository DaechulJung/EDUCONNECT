from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Read from environment variables or apps/api/.env.

    The defaults match `npm run infra` (db and redis from compose.yml on localhost).
    """

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+psycopg://app:app@localhost:15432/app"
    redis_url: str = "redis://localhost:16379/0"


settings = Settings()
