from io import BytesIO

from openpyxl import Workbook
from openpyxl.styles import Font

from app.domain.entities import Feedback
from app.utils.timezone import format_moscow_datetime


def export_feedbacks_to_excel(feedbacks: list[Feedback]) -> bytes:
    wb = Workbook()
    ws = wb.active
    ws.title = "plaintes"

    headers = ("Date (Moscou)", "Email", "Téléphone", "Message")
    ws.append(headers)
    for cell in ws[1]:
        cell.font = Font(bold=True)

    for item in feedbacks:
        ws.append([
            format_moscow_datetime(item.created_at),
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
