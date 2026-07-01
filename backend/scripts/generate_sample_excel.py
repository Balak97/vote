"""Génère un fichier Excel d'exemple pour tester l'import des électeurs."""

from pathlib import Path

from openpyxl import Workbook

OUTPUT = Path(__file__).resolve().parent / "exemple_electeurs.xlsx"

rows = [
    ("email", "telephone", "nom", "prenom"),
    ("ivanov@mail.ru", "+79161234567", "Ivanov", "Ivan"),
    ("petrova@mail.ru", "89167654321", "Petrova", "Anna"),
    ("sidorov@mail.ru", "9165554433", "Sidorov", "Petr"),
]

wb = Workbook()
ws = wb.active
ws.title = "electeurs"
for row in rows:
    ws.append(row)
wb.save(OUTPUT)
print(f"Fichier créé : {OUTPUT}")
