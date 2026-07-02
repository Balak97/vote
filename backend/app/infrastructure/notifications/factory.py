from app.config import settings
from app.domain.interfaces import INotificationService
from app.infrastructure.notifications.dev_service import DevNotificationService
from app.infrastructure.notifications.smtp_service import SmtpNotificationService


def get_notification_service() -> INotificationService:
    if settings.otp_dev_mode:
        return DevNotificationService()
    if (
        settings.email_host
        and settings.email_host_user
        and settings.email_host_password is not None
    ):
        return SmtpNotificationService()
    return DevNotificationService()
