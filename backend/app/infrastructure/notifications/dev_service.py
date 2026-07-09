import logging

from app.config import settings
from app.domain.interfaces import INotificationService

logger = logging.getLogger(__name__)


class DevNotificationService(INotificationService):
    """Implémentation dev : log les emails (remplaçable par SMTP en prod)."""

    async def send_otp_email(self, email: str, code: str) -> None:
        subject = f"{settings.app_name} — Code de vérification"
        body = (
            f"Votre code de vérification {settings.app_name} est : {code}\n\n"
            f"Ce code expire dans {settings.otp_expire_minutes} minutes."
        )
        await self.send_email(email, subject, body)

    async def send_email(self, email: str, subject: str, body: str) -> None:
        if settings.otp_dev_mode:
            message = f"[DEV EMAIL] To={email} Subject={subject}\n{body}"
            logger.info(message)
            print(message, flush=True)
        else:
            raise NotImplementedError(
                "Configurez un service email en production (SMTP)"
            )
