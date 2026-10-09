from pydantic import Field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from datetime import timedelta
from ipaddress import ip_network
from typing import List
from urllib.parse import urlparse

class Settings(BaseSettings):
    APP_NAME: str
    ENVIRONMENT: str
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str
    DATABASE_URL: str
    ALLOWED_ORIGINS: List[str]
    TRUSTED_PROXY_IPS: List[str] = Field(default_factory=list)
    APP_BASE_URL: str = ""
    STRIPE_SECRET_KEY: str = ""
    STRIPE_WEBHOOK_SECRET: str = ""
    STRIPE_SUCCESS_URL: str = ""
    STRIPE_CANCEL_URL: str = ""
    LOG_DIR: str = "logs"
    
    # SMTP
    SMTP_SERVER: str
    SMTP_PORT: int
    SMTP_USER: str
    SMTP_PASS: str
    SMTP_USE_TLS: bool = False
    EMAIL_MAX_CONCURRENCY: int = Field(default=10, gt=0, le=100)
    EMAIL_MAX_RETRIES: int = Field(default=3, ge=0, le=10)
    EMAIL_RETRY_BACKOFF_SECONDS: float = 1.0
    EMAIL_SMTP_TIMEOUT: int = 30
    EMAIL_SENDING_TIMEOUT_SECONDS: int = 900
    REDIS_URL: str
    EMAIL_QUEUE_NAME: str = "email"
    EMAIL_QUEUE_JOB_TIMEOUT: int = 3600

    #local
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8",extra="ignore",)

    @field_validator("TRUSTED_PROXY_IPS")
    @classmethod
    def validate_trusted_proxy_ips(cls, value: List[str]) -> List[str]:
        for proxy_network in value:
            ip_network(proxy_network, strict=False)
        return value

    @model_validator(mode="after")
    def set_app_base_url(self):
        if self.APP_BASE_URL.strip():
            self.APP_BASE_URL = self.APP_BASE_URL.rstrip("/")
            return self

        self.APP_BASE_URL = next(
            (
                origin.rstrip("/")
                for origin in self.ALLOWED_ORIGINS
                if urlparse(origin).port == 3000
            ),
            self.ALLOWED_ORIGINS[0].rstrip("/"),
        )
        return self

    @property
    def EMAIL_SENDING_TIMEOUT(self) -> timedelta:
        return timedelta(seconds=self.EMAIL_SENDING_TIMEOUT_SECONDS)

settings = Settings()
