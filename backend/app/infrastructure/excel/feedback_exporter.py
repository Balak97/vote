from datetime import datetime
from io import BytesIO

from openpyxl import Workbook
from openpyxl.styles import Font

from app.domain.entities import Feedback


def export_feedbacks_to_excel(feedbacks: list[Feedback]) -> bytes:
    wb = Workbook()
    ws = wb.active
    ws.title = "plaintes"

    headers = ("Date", "Email", "Téléphone", "Message")
    ws.append(headers)
    for cell in ws[1]:
        cell.font = Font(bold=True)

    for item in feedbacks:
        created = item.created_at or datetime.utcnow()
        ws.append([
            created.strftime("%Y-%m-%d %H:%M"),
            item.email,
            item.phone,
            item.message,
        ])

    ws.column_dimensions["A"].width = 18
    ws.column_dimensions["B"].width = 28
    ws.column_dimensions["C"].width = 16
    ws.column_dimensions["D"].width = 60

    buffer = BytesIO()
    wb.save(buffer)
    return buffer.getvalue()
