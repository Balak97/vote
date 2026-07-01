import uuid
from pathlib import Path

from fastapi import UploadFile

from app.config import settings

ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp"}
EXTENSIONS = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp"}


class PhotoStorageService:
    def __init__(self, base_dir: Path | str | None = None) -> None:
        self._base_dir = Path(base_dir or settings.upload_dir)
        self._candidates_dir = self._base_dir / "candidates"
        self._candidates_dir.mkdir(parents=True, exist_ok=True)

    async def save_candidate_photo(self, file: UploadFile) -> str:
        if file.content_type not in ALLOWED_CONTENT_TYPES:
            raise ValueError("Format accepté : JPG, PNG ou WebP")

        content = await file.read()
        if len(content) > settings.max_upload_size_mb * 1024 * 1024:
            raise ValueError(f"Photo trop volumineuse (max {settings.max_upload_size_mb} Mo)")

        ext = EXTENSIONS[file.content_type]
        filename = f"{uuid.uuid4().hex}{ext}"
        path = self._candidates_dir / filename
        path.write_bytes(content)

        return f"/uploads/candidates/{filename}"

    def delete_photo(self, photo_url: str | None) -> None:
        if not photo_url or not photo_url.startswith("/uploads/candidates/"):
            return
        filename = photo_url.rsplit("/", 1)[-1]
        path = self._candidates_dir / filename
        if path.exists():
            path.unlink()
