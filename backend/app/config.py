from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    app_name: str = "Walata Vote"
    secret_key: str = "change-me-in-production-use-openssl-rand-hex-32"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    otp_expire_minutes: int = 5
    database_url: str = "sqlite+aiosqlite:///./walata_vote.db"
    admin_username: str = "admin"
    admin_password: str = "admin123"
    cors_origins: list[str] = ["http://localhost:5173", "http://localhost:3000"]
    otp_dev_mode: bool = True
    upload_dir: str = "uploads"
    max_upload_size_mb: int = 5


settings = Settings()
