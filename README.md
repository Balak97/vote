# Walata Vote

Application de vote sécurisée : **FastAPI** (backend) + **React** (frontend).

## Fonctionnalités

- Import des électeurs depuis Excel (`email`, `telephone`, `nom`, `prenom`)
- Normalisation automatique des numéros russes (`+7XXXXXXXXXX`)
- Saisie manuelle des candidats par l'administrateur
- Authentification électeur par OTP **envoyé par email uniquement**
- Un vote par électeur et par élection (contrainte base de données)
- Résultats publiés après clôture du scrutin

## Architecture SOLID

| Principe | Application |
|----------|-------------|
| **S** — Single Responsibility | Services dédiés : import, auth, vote, élections, candidats |
| **O** — Open/Closed | `INotificationService`, `IExcelImporter` extensibles sans modifier le cœur |
| **L** — Liskov Substitution | Repositories SQLAlchemy interchangeables via interfaces |
| **I** — Interface Segregation | Interfaces fines (`IVoterRepository`, `IOtpRepository`, …) |
| **D** — Dependency Inversion | Injection via FastAPI `Depends()` |

```
backend/app/
├── domain/          # Entités + interfaces (ports)
├── services/        # Logique métier
├── infrastructure/  # DB, Excel, notifications (adaptateurs)
└── api/             # Routes HTTP + schémas Pydantic
```

## Format Excel

| email | telephone | nom | prenom |
|-------|-----------|-----|--------|
| ivanov@mail.ru | +79161234567 | Ivanov | Ivan |
| petrova@mail.ru | 8 916 765 43 21 | Petrova | Anna |

Formats téléphone acceptés : `+79161234567`, `89161234567`, `9161234567`.

## Démarrage

### Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate        # Windows
pip install -r requirements.txt
copy .env.example .env
uvicorn app.main:app --reload --port 8001
```

Ou sous Windows : `backend\start.ps1`

API : http://127.0.0.1:8001 — Docs : http://127.0.0.1:8001/docs

> **Important** : le port **8001** est utilisé par défaut car le port 8000 est souvent occupé par d'autres projets FastAPI sur la même machine.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

UI : http://localhost:5173

> **Windows + HPC Pack** : si `npm run dev` affiche « Node Commands » au lieu de démarrer Vite,
> c'est un conflit PATH avec `Microsoft HPC Pack`. Les scripts npm du projet contournent ce problème.
> Pour corriger définitivement, placez `C:\Program Files\nodejs\` **avant** le dossier HPC dans le PATH système.

### Compte admin par défaut

- Utilisateur : `admin`
- Mot de passe : `admin123`

Modifier via variables d'environnement (`ADMIN_USERNAME`, `ADMIN_PASSWORD`, `SECRET_KEY`).

## Flux utilisateur

1. **Admin** : connexion → import Excel → créer élection → saisir candidats → ouvrir le vote
2. **Électeur** : email ou téléphone → OTP reçu par **email** → choisir candidat → confirmer
3. **Admin** : clôturer l'élection → consulter les résultats

En mode développement (`OTP_DEV_MODE=true`), le code OTP apparaît dans les logs du backend (canal email).

## Sécurité (production)

- Changer `SECRET_KEY` et identifiants admin
- Implémenter `EmailNotificationService` (SMTP)
- HTTPS obligatoire
- PostgreSQL recommandé à la place de SQLite
