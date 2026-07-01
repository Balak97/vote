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
- `walata_vote.db` (sera créée au premier démarrage)
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

## 3. Fichier `.env` sur le serveur

Copiez `.env.o2switch.example` → `.env` et modifiez :

- `VOTRE_USER` → votre login cPanel (visible en haut à droite de cPanel)
- `SECRET_KEY` → clé longue aléatoire
- `ADMIN_PASSWORD` → mot de passe admin fort

---

## 4. Setup Python App (cPanel)

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

## 5. Permissions

Le dossier doit être **inscriptible** pour SQLite et les photos :

```bash
chmod 755 /home/VOTRE_USER/api.vote.cantic-mali.com
chmod 775 /home/VOTRE_USER/api.vote.cantic-mali.com/uploads
```

(Souvent via Gestionnaire de fichiers → Permissions → 755 / 775)

---

## 6. Tests

| URL | Résultat attendu |
|-----|------------------|
| `https://api.vote.cantic-mali.com/health` | `{"status":"ok"}` |
| `https://api.vote.cantic-mali.com/api/vote/elections/active` | `[]` ou liste JSON |

---

## 7. En cas d'erreur

- Logs : `/home/VOTRE_USER/api.vote.cantic-mali.com/stderr.log`
- Vérifier que `passenger_wsgi.py` est à la racine de Application root
- Vérifier que `pip install` a bien installé `a2wsgi`
- Redémarrer l'app Python dans cPanel

---

## 8. Ensuite (frontend)

Quand l'API répond sur `/health`, builder le frontend :

```bash
cd frontend
set VITE_API_BASE=https://api.vote.cantic-mali.com/api
npm run build
```

Puis uploader `frontend/dist/` dans `/vote.cantic-mali.com/`.
