# Déploiement Vercel – Auto-deploy au push sur `main`

Si l’intégration Git Vercel ne déclenche pas de déploiement automatique, le workflow **Deploy to Production** (GitHub Actions) le fait à chaque push sur `main`. Il faut au moins **une** des deux configurations ci‑dessous.

---

## Option A : Deploy Hook (recommandé, 1 secret)

Pas besoin de token Vercel ni d’org/project id. Un seul secret dans GitHub.

### 1. Créer le Deploy Hook sur Vercel

1. **Vercel** → ton projet EDUZEN → **Settings** → **Git**.
2. Descendre jusqu’à **Deploy Hooks**.
3. **Create Hook** :
   - Name : `GitHub Actions` (ou autre).
   - Branch : `main`.
4. Copier l’URL générée (ex. `https://api.vercel.com/v1/integrations/deploy/...`).

### 2. Ajouter le secret dans GitHub

1. Repo **EDUZEN** → **Settings** → **Secrets and variables** → **Actions**.
2. **New repository secret** :
   - Name : `VERCEL_DEPLOY_HOOK_URL`
   - Value : l’URL du Deploy Hook collée telle quelle.
3. Enregistrer.

### 3. Comportement

À chaque **push sur `main`** :

- Le workflow **Deploy to Production** s’exécute.
- Après les tests et le build, il envoie une requête POST à l’URL du hook.
- Vercel lance un déploiement de la branche `main`.

Tu n’as rien à faire de plus : l’auto-deploy est géré par GitHub Actions + Deploy Hook.

---

## Option B : Vercel API (token + org + project)

Pour que le workflow utilise `amondnet/vercel-action` et déploie via l’API Vercel, ajoute ces **secrets** dans le repo (Settings → Secrets and variables → Actions) :

| Secret              | Où le trouver |
|---------------------|----------------|
| `VERCEL_TOKEN`      | [vercel.com/account/tokens](https://vercel.com/account/tokens) – créer un token avec accès au projet. |
| `VERCEL_ORG_ID`     | Projet Vercel → **Settings** → **General** → **Project ID** (ou dans `.vercel/project.json` en local). |
| `VERCEL_PROJECT_ID` | Même page que ci‑dessus (souvent le même champ affiché comme Project ID). |

Si **les trois** sont renseignés et que `VERCEL_DEPLOY_HOOK_URL` **n’est pas** défini, le workflow utilisera l’action Vercel pour déployer.

---

## Vérifier que ça marche

1. **GitHub** → onglet **Actions** du repo EDUZEN.
2. Ouvrir le workflow **Deploy to Production** après un push sur `main`.
3. Vérifier qu’il passe jusqu’au step **Deploy to Vercel** ou **Trigger Vercel Deploy Hook** (selon l’option choisie), sans erreur.
4. **Vercel** → projet → **Deployments** : un nouveau déploiement doit apparaître après le run du workflow.

Si le workflow ne se déclenche pas sur push, vérifier que la branche par défaut du repo est bien `main` et que les Actions ne sont pas désactivées (Settings → Actions → General).
