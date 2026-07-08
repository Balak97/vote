# Déploiement frontend Walata Vote sur O2Switch

Domaine : `https://vote.cantic-mali.com`  
API : `https://api.vote.cantic-mali.com`

---

## Pourquoi un proxy `/api` ?

Le frontend appelle l'API via **`/api`** (même domaine), pas `api.vote.cantic-mali.com`.
Cela évite les blocages **Tiger Protect** sur les requêtes `POST` cross-domaine (login admin, OTP, vote).

---

## 1. Builder le frontend

**Sans** `VITE_API_BASE` (ou explicitement `/api`) :

```bash
cd frontend
npm run build
```

Le build utilise par défaut `API_BASE=/api` (chemins relatifs).

---

## 2. Uploader sur `vote.cantic-mali.com`

Contenu à la racine :

```
vote.cantic-mali.com/
├── .htaccess          ← deploy/vote.htaccess
├── api-proxy.php      ← deploy/api-proxy.php (obligatoire sur O2Switch)
├── index.html         ← frontend/dist/
└── assets/
```

> **Important O2Switch** : le proxy Apache `[P]` ne fonctionne souvent pas.
> Utilisez **`api-proxy.php`** (proxy PHP inclus dans `deploy/`).

---

## 3. Fichier `.htaccess`

Copiez sur le serveur :
- `deploy/vote.htaccess` → `.htaccess`
- `deploy/api-proxy.php` → `api-proxy.php`

Le `.htaccess` :
- route `/api` et `/uploads` via **`api-proxy.php`** vers l'API Python
- routage SPA React (`index.html`)

---

## 4. Vérifications

| URL | Attendu |
|-----|---------|
| https://vote.cantic-mali.com/ | Page d'accueil |
| https://vote.cantic-mali.com/api/vote/elections/active | `[]` (JSON) |
| https://vote.cantic-mali.com/admin | Login admin fonctionne |

Dans F12 → Réseau, les requêtes API doivent aller vers **`vote.cantic-mali.com/api/...`**, pas `api.vote.cantic-mali.com`.

---

## 5. Si le proxy ne fonctionne pas

Si `/api/...` renvoie 404 HTML au lieu de JSON :

1. Vérifier que mod_proxy est actif (support O2Switch si besoin)
2. **Ou** désactiver Tiger Protect sur `api.vote.cantic-mali.com`
3. **Ou** rebuilder avec `VITE_API_BASE=https://api.vote.cantic-mali.com/api` (moins fiable)

---

## 6. CORS (backend)

Le `.env` API doit toujours contenir :

```env
CORS_ORIGINS=["https://vote.cantic-mali.com"]
```

Même avec le proxy, gardez cette valeur pour les appels directs éventuels.
