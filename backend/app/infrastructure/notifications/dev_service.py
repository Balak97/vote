import logging

from app.config import settings
from app.domain.interfaces import INotificationService

logger = logging.getLogger(__name__)


class DevNotificationService(INotificationService):
    """Implémentation dev : log l'OTP email (remplaçable par SMTP en prod)."""

    async def send_otp_email(self, email: str, code: str) -> None:
        if settings.otp_dev_mode:
            message = f"[DEV OTP EMAIL] Destinataire={email} Code={code}"
            logger.info(message)
            print(message, flush=True)
        else:
            raise NotImplementedError(
                "Configurez un service email en production (EmailNotificationService / SMTP)"
            )
