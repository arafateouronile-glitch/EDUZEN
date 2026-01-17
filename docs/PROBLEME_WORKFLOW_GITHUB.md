# 🔧 Solution : Erreur Workflow GitHub Actions

**Erreur** :
```
! [remote rejected] main -> main (refusing to allow a Personal Access Token to create or update workflow `.github/workflows/build.yml` without `workflow` scope)
```

**Problème** : Le Personal Access Token (PAT) n'a pas le scope `workflow` nécessaire pour créer/modifier des workflows GitHub Actions.

---

## ✅ SOLUTION 1 : Ajouter le scope `workflow` au PAT (RECOMMANDÉ)

### Étape 1 : Créer un nouveau Personal Access Token avec le scope `workflow`

1. **Aller sur GitHub** → [Settings → Developer settings → Personal access tokens → Tokens (classic)](https://github.com/settings/tokens)

2. **Cliquer sur "Generate new token" → "Generate new token (classic)"**

3. **Configurer le token** :
   - **Note** : `EDUZEN Development` (ou votre choix)
   - **Expiration** : 90 days (ou votre choix)
   - **Scopes** : Cocher au minimum :
     - ✅ `repo` (accès complet au repository)
     - ✅ **`workflow`** (Gérer les workflows GitHub Actions) ⚠️ **IMPORTANT**

4. **Cliquer sur "Generate token"**

5. **Copier le token** (vous ne pourrez plus le voir après !)

### Étape 2 : Mettre à jour les identifiants Git

#### Option A : Mettre à jour le token dans l'URL

```bash
# Vérifier l'URL actuelle du remote
git remote -v

# Mettre à jour avec le nouveau token
git remote set-url origin https://VOTRE_TOKEN@github.com/arafateouronile-glitch/EDUZEN.git

# Ou utiliser votre username
git remote set-url origin https://VOTRE_USERNAME:VOTRE_TOKEN@github.com/arafateouronile-glitch/EDUZEN.git
```

#### Option B : Utiliser Git Credential Helper (MEILLEUR)

```bash
# Configurer Git pour demander les identifiants
git config --global credential.helper osxkeychain

# Lors du prochain push, Git demandera votre username et token
git push -u origin main
# Username: arafateouronile-glitch
# Password: VOTRE_NOUVEAU_TOKEN (pas votre mot de passe GitHub)
```

#### Option C : Utiliser SSH (ALTERNATIVE)

```bash
# Générer une clé SSH (si pas déjà fait)
ssh-keygen -t ed25519 -C "votre.email@example.com"

# Ajouter la clé SSH à GitHub
# Copier le contenu de ~/.ssh/id_ed25519.pub
# Aller sur GitHub → Settings → SSH and GPG keys → New SSH key

# Changer le remote en SSH
git remote set-url origin git@github.com:arafateouronile-glitch/EDUZEN.git

# Tester la connexion
ssh -T git@github.com

# Pousser
git push -u origin main
```

### Étape 3 : Réessayer le push

```bash
# Pousser à nouveau
git push -u origin main
```

---

## ✅ SOLUTION 2 : Pousser sans les workflows d'abord (RAPIDE)

Si vous voulez pousser rapidement sans configurer le PAT, vous pouvez retirer temporairement les workflows :

```bash
# Retirer temporairement les workflows
git rm --cached .github/workflows/*.yml

# Commit la suppression
git commit -m "Temporarily remove workflows for initial push"

# Pousser
git push -u origin main

# Ensuite, ajouter le scope workflow au PAT et remettre les workflows
# (voir Solution 1)
```

**⚠️ Pas recommandé** : Vous devrez réajouter les workflows plus tard.

---

## ✅ SOLUTION 3 : Pousser via l'interface GitHub (TEMPORAIRE)

1. **Compresser le projet** (sans `node_modules`, `.next`, `.env.local`)
2. **Aller sur GitHub** → Repository → "Add file" → "Upload files"
3. **Déposer le fichier compressé**

**⚠️ Pas recommandé** : Pas idéal pour un workflow Git standard.

---

## 🔍 VÉRIFICATION

### Vérifier que le token a le bon scope

```bash
# Vérifier l'URL du remote
git remote -v

# Tester le push
git push -u origin main
```

Si le push réussit, vous verrez :
```
Enumerating objects: ...
Counting objects: 100% ...
Writing objects: 100% ...
To https://github.com/arafateouronile-glitch/EDUZEN.git
 * [new branch]      main -> main
Branch 'main' set up to track remote branch 'main' from 'origin'.
```

---

## 📝 SCOPE NÉCESSAIRES POUR UN PAT GITHUB

Pour un développement complet, votre PAT devrait avoir :

- ✅ **`repo`** : Accès complet aux repositories (read/write)
- ✅ **`workflow`** : Gérer les workflows GitHub Actions
- ✅ **`read:packages`** : Télécharger les packages (si utilisé)
- ✅ **`write:packages`** : Publier les packages (si utilisé)

---

## 🆘 DÉPANNAGE

### Erreur : "Authentication failed"

**Solution** :
```bash
# Vérifier les credentials
git config --global credential.helper

# Effacer les credentials en cache (macOS)
git credential-osxkeychain erase
host=github.com
protocol=https
# (Appuyer deux fois sur Entrée)

# Réessayer
git push -u origin main
```

### Erreur : "Permission denied"

**Solutions** :
- Vérifier que le token a le scope `repo`
- Vérifier que vous avez les droits sur le repository
- Vérifier que le token n'a pas expiré

### Erreur : "Repository not found"

**Solutions** :
- Vérifier l'URL du remote : `git remote -v`
- Vérifier que le repository existe sur GitHub
- Vérifier que vous avez les droits d'accès

---

## ✅ CHECKLIST

Avant de pousser :

- [ ] ✅ Personal Access Token créé avec le scope `workflow`
- [ ] ✅ Token configuré dans Git (URL ou credential helper)
- [ ] ✅ Remote configuré correctement
- [ ] ✅ Aucun fichier sensible dans le commit (`.env.local`, etc.)

---

## 🎯 PROCHAINES ÉTAPES

Après le push réussi :

1. **Vérifier sur GitHub** :
   - ✅ Tous les fichiers sont présents
   - ✅ Les workflows GitHub Actions sont visibles
   - ✅ Aucun fichier sensible n'est présent

2. **Configurer les GitHub Secrets** :
   - Voir `docs/GUIDE_ACTIONS_MANUELLES_PHASE2.md` → Étape 4

3. **Tester les workflows** :
   - Aller sur GitHub → Repository → Actions
   - Vérifier que les workflows s'exécutent correctement

---

**Dernière mise à jour** : 16 Janvier 2026
