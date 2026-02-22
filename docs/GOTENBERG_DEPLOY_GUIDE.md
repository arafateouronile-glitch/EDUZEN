# Guide de déploiement Gotenberg pour EDUZEN

Ce guide détaille les trois actions : **polices perso**, **déploiement Railway**, et **sécurisation (API Key)**.

---

## 1. Polices personnalisées

### 1.1 Où trouver / créer les polices

- Utilisez les fichiers **.ttf** de votre charte graphique (ex. fournis par le graphiste).
- Sinon, polices libres : [Google Fonts](https://fonts.google.com/) (télécharger en .ttf) ou [Font Squirrel](https://www.fontsquirrel.com/).

### 1.2 Déposer les .ttf dans le projet

1. Ouvrez le dossier **`infrastructure/gotenberg/fonts/`** à la racine du projet EDUZEN.
2. Copiez-y vos fichiers **.ttf** (ex. `EduzenSans-Regular.ttf`, `EduzenSerif.ttf`).
3. Vous pouvez supprimer le fichier **`.gitkeep`** si le dossier contient au moins un .ttf (ou le laisser).

Exemple de structure :

```
infrastructure/gotenberg/fonts/
  EduzenSans-Regular.ttf
  EduzenSans-Bold.ttf
```

### 1.3 Rebuild l’image Docker

Depuis la **racine du projet** :

```bash
cd /chemin/vers/EDUZEN
docker build -t eduzen-gotenberg -f infrastructure/gotenberg/Dockerfile infrastructure/gotenberg
```

Pour tester en local :

```bash
docker run -p 3000:3000 eduzen-gotenberg
```

Les polices seront disponibles dans le conteneur sous `/usr/share/fonts/eduzen/`. Dans vos templates HTML, utilisez le **nom de police** tel que défini dans le .ttf (souvent le nom du fichier sans extension, ou le nom interne de la police).

---

## 2. Déployer Gotenberg sur Railway

### 2.1 Créer un projet Railway

1. Allez sur [railway.app](https://railway.app) et connectez-vous.
2. **New Project** → **Deploy from GitHub repo** (ou **Empty Project** si vous déploierez à la main).
3. Si vous avez choisi GitHub : sélectionnez le dépôt **EDUZEN**.

### 2.2 Ajouter le service Gotenberg

1. Dans le projet, cliquez **+ New** → **GitHub Repo** (ou **Dockerfile** selon l’interface).
2. Choisissez le même dépôt EDUZEN.
3. **Settings** du service :
   - **Root Directory** : `infrastructure/gotenberg`
   - **Dockerfile Path** : laisser vide ou `Dockerfile` (Railway le trouve dans le root du service = `infrastructure/gotenberg`).
4. **Variables** : pour l’instant aucune variable obligatoire pour Gotenberg seul.
5. **Settings** → **Networking** :
   - **Generate Domain** : activer pour obtenir une URL publique (ex. `xxx.railway.app`).
6. **Deploy** : Railway build l’image et expose le port **3000**. Notez l’URL générée (ex. `https://eduzen-gotenberg-xxx.up.railway.app`).

Si votre Dockerfile n’est pas à la racine du repo :

- **Root Directory** : laisser vide (racine du repo).
- **Variables** : ajouter `RAILWAY_DOCKERFILE_PATH=infrastructure/gotenberg/Dockerfile`.
- Le **build context** sera la racine ; le Dockerfile fait `COPY fonts/` donc il doit être exécuté avec le context `infrastructure/gotenberg`. Dans ce cas, il vaut mieux **Root Directory** = `infrastructure/gotenberg` pour que `COPY fonts/` reste valide.

### 2.3 Configurer Vercel (app Next.js)

1. Projet **EDUZEN** sur [vercel.com](https://vercel.com) → **Settings** → **Environment Variables**.
2. Ajoutez :
   - **Name** : `GOTENBERG_URL`
   - **Value** : l’URL Railway du service Gotenberg (ex. `https://eduzen-gotenberg-xxx.up.railway.app`), **sans** slash final.
   - **Environments** : Production (et Preview si vous voulez tester en preview).
3. Sauvegardez et **redéployez** l’application pour que la variable soit prise en compte.

À ce stade, la génération PDF utilisera Gotenberg en production. L’instance est encore **ouverte** (toute personne avec l’URL peut l’utiliser). L’étape 3 permet de la sécuriser.

---

## 3. Sécuriser Gotenberg (API Key)

Gotenberg ne gère pas lui-même l’authentification. On ajoute un **proxy** qui vérifie le header **X-API-Key** avant de transmettre les requêtes à Gotenberg.

### 3.1 Déployer le proxy sur Railway

1. Dans le **même projet** Railway (ou un nouveau), **+ New** → **GitHub Repo** (ou **Dockerfile**).
2. Choisissez le dépôt **EDUZEN**.
3. **Settings** du nouveau service :
   - **Root Directory** : `infrastructure/gotenberg-proxy`
   - Ou si pas de Root Directory : **Variables** → `RAILWAY_DOCKERFILE_PATH=infrastructure/gotenberg-proxy/Dockerfile` (et adapter le build context si Railway build depuis la racine ; sinon mettre Root Directory = `infrastructure/gotenberg-proxy`).
4. **Variables** du proxy :
   - `GOTENBERG_SERVICE_URL` = URL **interne** de Gotenberg. Sur Railway, entre deux services du même projet, c’est souvent :  
     `http://<nom-du-service-gotenberg>:3000`  
     Exemple : si le service Gotenberg s’appelle `gotenberg`, mettre `http://gotenberg:3000`.  
     Sinon utiliser l’URL **publique** de Gotenberg (ex. `https://eduzen-gotenberg-xxx.up.railway.app`) si le proxy et Gotenberg ne sont pas dans le même réseau privé.
   - `GOTENBERG_API_KEY` = une clé secrète de votre choix (ex. générée avec `openssl rand -hex 32`).
5. **Networking** : **Generate Domain** pour ce service proxy. Notez l’URL (ex. `https://eduzen-gotenberg-proxy-xxx.up.railway.app`).

### 3.2 Mettre à jour Vercel

1. **Settings** → **Environment Variables** du projet EDUZEN sur Vercel.
2. Modifiez **GOTENBERG_URL** : mettez l’URL du **proxy** (et non plus celle de Gotenberg directement), ex. `https://eduzen-gotenberg-proxy-xxx.up.railway.app`.
3. Ajoutez une variable :
   - **Name** : `GOTENBERG_API_KEY`
   - **Value** : la **même** clé que celle définie dans le proxy (`GOTENBERG_API_KEY` sur Railway).
   - **Environments** : Production (et Preview si besoin).
4. Redéployez l’app sur Vercel.

L’app Next.js envoie désormais toutes les requêtes vers le proxy, avec le header **X-API-Key**. Le proxy refuse les requêtes sans clé ou avec une mauvaise clé (401), et transmet les requêtes valides à Gotenberg.

### 3.3 Résumé des variables

| Où | Variable | Valeur |
|----|----------|--------|
| **Railway – service Gotenberg** | (aucune obligatoire) | — |
| **Railway – service Proxy** | `GOTENBERG_SERVICE_URL` | `http://gotenberg:3000` (ou URL publique Gotenberg) |
| **Railway – service Proxy** | `GOTENBERG_API_KEY` | Une clé secrète (ex. `openssl rand -hex 32`) |
| **Vercel** | `GOTENBERG_URL` | URL **publique du proxy** (ex. `https://eduzen-gotenberg-proxy-xxx.up.railway.app`) |
| **Vercel** | `GOTENBERG_API_KEY` | **Même** clé que sur le proxy |

---

## Vérification

1. **Sans clé** : `curl -X POST https://votre-proxy.up.railway.app/forms/chromium/convert/html -F "files=@index.html"` → **401 Unauthorized**.
2. **Avec clé** : même requête avec `-H "X-API-Key: VOTRE_CLE"` → **200** et PDF en réponse (si le HTML est valide).
3. Dans l’app EDUZEN sur Vercel, générer un document PDF (ex. un devis) : cela doit passer par Gotenberg et fonctionner normalement.

---

## En cas de problème

- **502 Bad Gateway** : le proxy n’atteint pas Gotenberg. Vérifier `GOTENBERG_SERVICE_URL` (nom du service Railway ou URL publique).
- **401** depuis l’app : vérifier que `GOTENBERG_API_KEY` est identique sur Vercel et sur le proxy Railway.
- **Timeout** : augmenter le timeout côté Next.js si besoin (déjà 90 s dans le service TypeScript) ; vérifier que Railway ne coupe pas les requêtes longues.
