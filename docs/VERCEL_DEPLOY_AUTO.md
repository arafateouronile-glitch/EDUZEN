# Déploiement automatique Vercel au push (reconnecter Git)

## Problème

Le dépôt **arafateouronile-glitch/EDUZEN** a été **déconnecté** du projet Vercel **eduzen**. Tant qu’il est déconnecté, les push sur `main` ne déclenchent aucun déploiement.

## Solution : reconnecter le dépôt GitHub

### 1. Dans Vercel

1. Va sur [vercel.com](https://vercel.com) → ton équipe **arafateouronile-glitchs-projects** → projet **eduzen**.
2. Onglet **Settings** (Paramètres).
3. Dans le menu de gauche : **Git**.
4. Section **Connected Git Repository** :
   - Si tu vois « No repository connected » ou un bouton **Connect Git Repository** → clique dessus.
   - Choisis **GitHub**.
   - Autorise Vercel si demandé, puis sélectionne :
     - **Compte / org** : `arafateouronile-glitch`
     - **Repository** : **EDUZEN**
   - Valide (Connect / Save).

5. Vérifie que :
   - **Production Branch** = `main`
   - La connexion affiche bien `arafateouronile-glitch/EDUZEN`.

### 2. Vérifier les permissions GitHub (si le repo n’apparaît pas)

1. GitHub → **Settings** (ton profil) → **Applications** → **Installed GitHub Apps**.
2. Ouvre **Vercel**.
3. **Configure** → vérifie que l’accès au repo **EDUZEN** (ou à toute l’organisation / compte) est autorisé. Donne accès à **EDUZEN** si besoin, puis **Save**.

### 3. Tester

1. Fais un petit changement (ex. une ligne dans `README.md`), puis :
   ```bash
   git add .
   git commit -m "chore: test deploy auto Vercel"
   git push origin main
   ```
2. Vercel → projet **eduzen** → onglet **Deployments** : un nouveau déploiement doit apparaître en quelques secondes (déclenché par **github/arafateouronile-glitch**).

---

## Reconnecté mais toujours pas de déploiement au push

Si le repo est bien reconnecté depuis hier et que les push ne déclenchent toujours rien, vérifier dans l’ordre :

### A. Webhook GitHub → Vercel

1. **GitHub** → repo **EDUZEN** → **Settings** → **Webhooks**.
2. Tu dois voir un webhook dont l’URL contient **vercel.com** (créé par l’app Vercel). Clique dessus.
3. Descends à **Recent Deliveries**. Fais un **push sur main** (petit commit), puis rafraîchis la page.
4. Regarde la dernière livraison (événement `push` ou `repository_dispatch`) :
   - **Réponse 200** → GitHub envoie bien à Vercel ; le blocage est côté Vercel (voir B).
   - **Réponse 4xx/5xx** ou **Failed** → le webhook est rejeté ; essaie **Redeliver** une fois, puis si ça reste en erreur : déconnecte puis reconnecte le repo dans Vercel (Settings → Git).

### B. Réglages Vercel (projet eduzen)

1. **Vercel** → projet **eduzen** → **Settings** → **Git**.
2. Vérifier :
   - **Production Branch** = `main` (pas `master`).
   - Le repo affiché est bien **arafateouronile-glitch/EDUZEN**.
3. **Settings** → **General** : vérifier qu’il n’y a pas de **Ignored Build Step** qui ignorerait tous les builds (ou l’adapter si tu en utilises un).

### C. Forcer la recréation du lien

1. **Vercel** → **eduzen** → **Settings** → **Git**.
2. **Disconnect** le dépôt, enregistre.
3. **Connect Git Repository** → GitHub → **arafateouronile-glitch/EDUZEN**.
4. Refais un **push sur main** et regarde **Deployments** + **Webhooks** (Recent Deliveries) comme en A.

### D. Double déploiement : Git + GitHub Actions (optionnel)

Si malgré tout le webhook Git ne déclenche pas de déploiement, tu peux laisser le workflow **Deploy to Production** appeler le **Deploy Hook** à chaque push : le job « Déclencher Vercel » enverra une requête à Vercel à chaque push sur `main`. Il faut que le secret **VERCEL_DEPLOY_HOOK_URL** soit défini dans le repo (voir `docs/DEPLOIEMENT_VERCEL.md`).

---

**Résumé** : après un push, vérifier **Webhooks → Recent Deliveries** (réponse **200**) et **Vercel → Git** (branche **main**). Si le webhook est 200 mais aucun déploiement, déconnecter puis reconnecter le repo dans Vercel.
