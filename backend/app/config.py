from typing import Self
from urllib.parse import quote_plus

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    app_name: str = "Walata Vote"
    secret_key: str = "change-me-in-production-use-openssl-rand-hex-32"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    otp_expire_minutes: int = 5
    database_url: str = "sqlite+aiosqlite:///./walata_vote.db"
    db_host: str = "localhost"
    db_port: int = 3306
    db_name: str | None = None
    db_user: str | None = None
    db_password: str | None = None
    admin_username: str = "admin"
    admin_password: str = "admin123"
    cors_origins: list[str] = ["http://localhost:5173", "http://localhost:3000"]
    otp_dev_mode: bool = True
    upload_dir: str = "uploads"
    max_upload_size_mb: int = 5
    email_host: str | None = None
    email_port: int = 587
    email_use_tls: bool = True
    email_use_ssl: bool = False
    email_host_user: str | None = None
    email_host_password: str | None = None
    default_from_email: str | None = None
    admin_notification_email: str | None = None

    @model_validator(mode="after")
    def build_database_url(self) -> Self:
        if self.db_name and self.db_user and self.db_password is not None:
            host = self.db_host.removeprefix("https://").removeprefix("http://").strip("/")
            user = quote_plus(self.db_user)
            password = quote_plus(self.db_password)
            self.database_url = (
                f"mysql+aiomysql://{user}:{password}@{host}:{self.db_port}/{self.db_name}"
            )
        return self


settings = Settings()
