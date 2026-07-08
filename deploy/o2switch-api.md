# Déploiement API Walata Vote sur O2Switch

Domaine frontend : `https://vote.cantic-mali.com`  
Domaine API : `https://api.vote.cantic-mali.com`

---

## 1. Créer le sous-domaine API (cPanel)

1. **cPanel** → **Sous-domaines**
2. Sous-domaine : `api.vote`
3. Domaine : `cantic-mali.com`
4. Racine du document : `/api.vote.cantic-mali.com`
5. Enregistrer

---

## 2. Fichiers à envoyer sur le serveur

Uploadez **tout le dossier `backend/`** dans `/api.vote.cantic-mali.com/`, **sans** :

- `.venv/`
- `__pycache__/`
- `walata_vote.db` (SQLite locale uniquement)
- `*.pyc`

Structure attendue sur le serveur :

```
/home/VOTRE_USER/api.vote.cantic-mali.com/
├── passenger_wsgi.py      ← obligatoire
├── requirements.txt
├── .env                   ← à créer (voir .env.o2switch.example)
├── app/
│   ├── main.py
│   └── ...
└── uploads/               ← créé auto, doit être inscriptible
```

**FTP / Gestionnaire de fichiers** : glisser le contenu de `backend/` (pas le dossier parent).

---

## 3. Base MySQL (cPanel)

1. **cPanel** → **Bases de données MySQL**
2. **Créer une base** : ex. `walata` → nom complet `qomo3546_walata`
3. **Créer un utilisateur** : ex. `walata_user` → `qomo3546_walata_user` + mot de passe fort
4. **Ajouter l'utilisateur à la base** → cocher **TOUS LES PRIVILÈGES**
5. Notez : hôte **`localhost`**, noms **préfixés** par votre login cPanel

Les tables sont créées automatiquement au premier démarrage de l'API (`init_db`).

---

## 4. Fichier `.env` sur le serveur

Copiez `.env.o2switch.example` → `.env` et modifiez :

- `VOTRE_USER` → votre login cPanel (ex. `qomo3546`)
- `SECRET_KEY` → clé longue aléatoire
- `ADMIN_PASSWORD` → mot de passe admin fort
- `DATABASE_URL` → connexion MySQL, ex. :

```env
DB_HOST=localhost
DB_PORT=3306
DB_NAME=qomo3546_vote
DB_USER=qomo3546_Balako
DB_PASSWORD=votre-mot-de-passe
CORS_ORIGINS=["https://vote.cantic-mali.com"]
UPLOAD_DIR=/home/qomo3546/api.vote.cantic-mali.com/uploads
```

Les variables `DB_*` construisent automatiquement l'URL (mots de passe avec `@`, `#`, etc. acceptés tels quels).
Utilisez `localhost` pour `DB_HOST` (pas `https://127.0.0.1`).

### Email OTP

```env
OTP_DEV_MODE=false
EMAIL_HOST=mail.cantic-mali.com
EMAIL_PORT=587
EMAIL_USE_TLS=true
EMAIL_USE_SSL=false
EMAIL_HOST_USER=techconceptde@cantic-mali.com
EMAIL_HOST_PASSWORD=votre-mot-de-passe
DEFAULT_FROM_EMAIL=techconceptde@cantic-mali.com
```

Avec `OTP_DEV_MODE=false` et ces variables, le code OTP est envoyé par email (plus affiché à l'écran).

---

## 5. Setup Python App (cPanel)

1. **cPanel** → **Setup Python App** (ou **Application Python**)
2. **Create Application** :

| Champ | Valeur |
|-------|--------|
| Python version | **3.10** ou **3.11** |
| Application root | `/home/VOTRE_USER/api.vote.cantic-mali.com` |
| Application URL | `api.vote.cantic-mali.com` |
| Application startup file | `passenger_wsgi.py` |
| Application Entry point | `application` |

3. **Configuration files** → ajouter `requirements.txt` → **Run pip install**
4. Cliquer **Restart** sur l'application

---

## 6. Permissions

Le dossier doit être **inscriptible** pour les photos :

```bash
chmod 755 /home/VOTRE_USER/api.vote.cantic-mali.com
chmod 775 /home/VOTRE_USER/api.vote.cantic-mali.com/uploads
```

(Souvent via Gestionnaire de fichiers → Permissions → 755 / 775)

---

## 7. Tests

| URL | Résultat attendu |
|-----|------------------|
| `https://api.vote.cantic-mali.com/health` | `{"status":"ok"}` |
| `https://api.vote.cantic-mali.com/api/vote/elections/active` | `[]` ou liste JSON |

---

## 8. En cas d'erreur

- Logs : `/home/VOTRE_USER/api.vote.cantic-mali.com/stderr.log`
- Vérifier que `pip install` a installé `a2wsgi` et `aiomysql`
- Vérifier `DATABASE_URL` (utilisateur, mot de passe, noms préfixés cPanel)
- Tester la connexion MySQL dans cPanel → **phpMyAdmin**
- Redémarrer l'app Python dans cPanel

---

## 9. Ensuite (frontend)

Quand l'API répond sur `/health`, builder le frontend :

```bash
cd frontend
set VITE_API_BASE=https://api.vote.cantic-mali.com/api
npm run build
```

Puis uploader `frontend/dist/` dans `/vote.cantic-mali.com/`.

Voir **`deploy/o2switch-frontend.md`** pour le `.htaccess` proxy (recommandé — évite Tiger Protect).
