import asyncio
import logging
import smtplib
from email.message import EmailMessage

from app.config import settings
from app.domain.interfaces import INotificationService

logger = logging.getLogger(__name__)


class SmtpNotificationService(INotificationService):
    async def send_otp_email(self, email: str, code: str) -> None:
        await asyncio.to_thread(self._send_sync, email, code)

    def _send_sync(self, email: str, code: str) -> None:
        sender = settings.default_from_email or settings.email_host_user
        if not sender or not settings.email_host:
            raise RuntimeError("Configuration email incomplète")

        msg = EmailMessage()
        msg["Subject"] = f"{settings.app_name} — Code de vérification"
        msg["From"] = sender
        msg["To"] = email
        msg.set_content(
            f"Votre code de vérification {settings.app_name} est : {code}\n\n"
            f"Ce code expire dans {settings.otp_expire_minutes} minutes.\n\n"
            "Si vous n'avez pas demandé ce code, ignorez ce message."
        )

        try:
            if settings.email_use_ssl:
                with smtplib.SMTP_SSL(settings.email_host, settings.email_port, timeout=30) as smtp:
                    smtp.login(settings.email_host_user, settings.email_host_password)
                    smtp.send_message(msg)
            else:
                with smtplib.SMTP(settings.email_host, settings.email_port, timeout=30) as smtp:
                    if settings.email_use_tls:
                        smtp.starttls()
                    smtp.login(settings.email_host_user, settings.email_host_password)
                    smtp.send_message(msg)
        except smtplib.SMTPException as exc:
            logger.exception("Échec envoi email OTP à %s", email)
            raise RuntimeError("Impossible d'envoyer le code par email") from exc
