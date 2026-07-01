"""Point d'entrée WSGI pour O2Switch / cPanel (Passenger + a2wsgi)."""
import os
import sys

# Racine de l'application = dossier contenant app/
APP_ROOT = os.path.dirname(os.path.abspath(__file__))
if APP_ROOT not in sys.path:
    sys.path.insert(0, APP_ROOT)

os.chdir(APP_ROOT)

from a2wsgi import ASGIMiddleware
from app.main import app

application = ASGIMiddleware(app)
