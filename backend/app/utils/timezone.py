from datetime import datetime, timezone
from zoneinfo import ZoneInfo

MOSCOW_TZ = ZoneInfo("Europe/Moscow")


def utc_now_naive() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def to_moscow(dt: datetime | None) -> datetime | None:
    if dt is None:
        return None
    aware = dt.replace(tzinfo=timezone.utc)
    return aware.astimezone(MOSCOW_TZ)


def format_moscow_datetime(dt: datetime | None) -> str:
    moscow = to_moscow(dt)
    if moscow is None:
        return ""
    return moscow.strftime("%Y-%m-%d %H:%M")
