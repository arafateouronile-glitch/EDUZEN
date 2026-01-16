# 🚀 Guide : Premier Dépôt Git

**Date** : 16 Janvier 2026  
**Objectif** : Initialiser le dépôt Git et faire le premier commit

---

## 📋 PRÉPARATION AVANT LE PREMIER COMMIT

### 1. ✅ Vérifier les Fichiers à Ignorer

Le fichier `.gitignore` a été créé pour exclure :
- ✅ Fichiers sensibles (`.env.local`, `.env.production`)
- ✅ Dependencies (`node_modules/`)
- ✅ Build files (`.next/`, `out/`)
- ✅ Fichiers temporaires et logs

### 2. ⚠️ VÉRIFIER QU'AUCUN FICHIER SENSIBLE N'EST COMMITTÉ

**Fichiers à NE JAMAIS commiter** :
- ❌ `.env.local`
- ❌ `.env.production`
- ❌ `SUPABASE_SERVICE_ROLE_KEY`
- ❌ Clés API secrètes
- ❌ Mots de passe

**Fichiers OK à commiter** :
- ✅ `.env.example` (sans valeurs réelles)
- ✅ `package.json`
- ✅ Code source
- ✅ Migrations Supabase

---

## 🚀 ÉTAPES : INITIALISER LE DÉPÔT GIT

### Étape 1 : Initialiser Git

```bash
# Initialiser le dépôt Git
git init

# Vérifier le statut
git status
```

### Étape 2 : Ajouter tous les fichiers

```bash
# Ajouter tous les fichiers (sauf ceux dans .gitignore)
git add .

# Vérifier ce qui sera committé
git status
```

### Étape 3 : Vérifier qu'aucun fichier sensible n'est inclus

```bash
# Vérifier qu'il n'y a pas de .env.local ou .env.production
git status | grep -E "\.env|SUPABASE_SERVICE_ROLE_KEY|SECRET|PASSWORD"

# Si quelque chose apparaît, NE PAS COMMITTER !
# Retirer le fichier :
# git reset HEAD <fichier>
```

### Étape 4 : Faire le premier commit

```bash
# Créer le premier commit
git commit -m "Initial commit: EDUZEN platform

- Next.js 15 application
- Supabase integration
- Complete feature set
- Documentation and guides
- CI/CD workflows"

# Vérifier le commit
git log --oneline
```

---

## 📦 CONFIGURER LE REMOTE (GitHub/GitLab)

### Option 1 : Créer un nouveau repository GitHub

1. **Aller sur [github.com](https://github.com)**
   - Se connecter avec votre compte

2. **Créer un nouveau repository**
   - Cliquer sur "New repository"
   - **Name** : `eduzen` (ou votre choix)
   - **Description** : "Solution SaaS de Gestion Scolaire pour l'Afrique"
   - **Visibility** : Private (recommandé) ou Public
   - ⚠️ **Ne pas** cocher "Initialize with README" (on a déjà un README)
   - Cliquer sur "Create repository"

3. **Ajouter le remote**

```bash
# Ajouter le remote (remplacer USERNAME et REPO_NAME)
git remote add origin https://github.com/USERNAME/REPO_NAME.git

# Ou avec SSH (si configuré)
git remote add origin git@github.com:USERNAME/REPO_NAME.git

# Vérifier le remote
git remote -v
```

### Option 2 : Utiliser un repository existant

```bash
# Ajouter le remote existant
git remote add origin <URL_DU_REPOSITORY>

# Vérifier
git remote -v
```

---

## 🔐 CONFIGURER GIT (Si pas déjà fait)

### Configurer votre identité

```bash
# Configurer votre nom et email
git config user.name "Votre Nom"
git config user.email "votre.email@example.com"

# Vérifier la configuration
git config --list
```

### Configurer globalement (pour tous les projets)

```bash
git config --global user.name "Votre Nom"
git config --global user.email "votre.email@example.com"
```

---

## 🚀 PUSHER VERS GITHUB

### Premier push

```bash
# Renommer la branche principale en 'main' (si nécessaire)
git branch -M main

# Pousser vers GitHub
git push -u origin main
```

**⚠️ Si vous avez une erreur** (remote has commits) :
```bash
# Si le repository distant a déjà des commits
git pull origin main --allow-unrelated-histories
# Résoudre les conflits si nécessaire
git push -u origin main
```

---

## ✅ VÉRIFICATION POST-PUSH

### 1. Vérifier sur GitHub

- ✅ Tous les fichiers sont présents
- ✅ Aucun fichier `.env.local` ou `.env.production`
- ✅ `.gitignore` est présent
- ✅ `README.md` est présent

### 2. Vérifier localement

```bash
# Vérifier l'état
git status

# Voir les commits
git log --oneline

# Voir les branches
git branch -a
```

---

## 🔒 SÉCURITÉ : VÉRIFICATIONS FINALES

### Checklist de Sécurité

- [ ] ✅ Aucun `.env.local` ou `.env.production` dans Git
- [ ] ✅ Aucune clé API secrète dans le code
- [ ] ✅ `.gitignore` correctement configuré
- [ ] ✅ `SUPABASE_SERVICE_ROLE_KEY` n'est pas dans le code
- [ ] ✅ Repository GitHub en **Private** (recommandé)

### Si un fichier sensible a été committé par erreur

```bash
# 1. Retirer le fichier de Git (mais le garder localement)
git rm --cached .env.local

# 2. Ajouter .env.local dans .gitignore (déjà fait)

# 3. Commit la suppression
git commit -m "Remove sensitive files from Git"

# 4. Push
git push origin main

# 5. Si déjà pushé, régénérer les secrets exposés !
# ⚠️ CRITIQUE : Régénérer toutes les clés exposées
```

---

## 📝 PROCHAINES ÉTAPES

Après le premier push :

1. **Configurer GitHub Secrets** (pour CI/CD)
   - Voir `docs/GUIDE_ACTIONS_MANUELLES_PHASE2.md` → Étape 4

2. **Configurer Vercel**
   - Connecter le repository GitHub
   - Voir `docs/GUIDE_ACTIONS_MANUELLES_PHASE2.md` → Étape 1

3. **Configurer les branches**
   ```bash
   # Créer une branche develop (optionnel)
   git checkout -b develop
   git push -u origin develop
   ```

---

## 🆘 DÉPANNAGE

### Erreur : "fatal: not a git repository"

**Solution** :
```bash
git init
```

### Erreur : "remote origin already exists"

**Solution** :
```bash
# Voir les remotes existants
git remote -v

# Supprimer et recréer
git remote remove origin
git remote add origin <NOUVELLE_URL>
```

### Erreur : "Permission denied"

**Solutions** :
- Vérifier vos identifiants GitHub
- Configurer SSH keys si vous utilisez SSH
- Utiliser HTTPS avec un Personal Access Token

---

## ✅ CHECKLIST FINALE

Avant de pousser :

- [ ] ✅ `.gitignore` créé et configuré
- [ ] ✅ Aucun fichier sensible à commiter
- [ ] ✅ Git initialisé
- [ ] ✅ Première commit créé
- [ ] ✅ Remote GitHub configuré
- [ ] ✅ Identité Git configurée
- [ ] ✅ Push réussi

---

**Dernière mise à jour** : 16 Janvier 2026
