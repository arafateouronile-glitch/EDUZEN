d # 🔐 Vérification 2FA/SSO - Phase 3.2

**Date** : 13 Janvier 2026  
**Statut** : En cours

---

## 📊 Résumé Exécutif

### ✅ Implémentations Disponibles

#### 2FA (Two-Factor Authentication)
- **Service** : `lib/services/2fa.service.ts`
- **Méthodes** : TOTP (Google Authenticator, Authy), Backup Codes
- **Intégration** : `app/auth/login/page.tsx`
- **API** : `/api/2fa/verify` (à vérifier)

#### SSO (Single Sign-On)
- **Service** : `lib/services/sso.service.ts` ✅
- **Adapters** :
  - `lib/services/sso/google-oauth.adapter.ts` ✅
  - `lib/services/sso/microsoft-oauth.adapter.ts` ✅
  - `lib/services/sso/github-oauth.adapter.ts` ✅
- **SAML** : `@node-saml/passport-saml` (package installé) ✅
- **⚠️ Routes API** : `/api/sso/authorize/[provider]` retourne 501 (non implémenté)

---

## 1. 🔐 2FA (Two-Factor Authentication)

### Implémentation Actuelle

#### Service 2FA (`lib/services/2fa.service.ts`)
- ✅ `generateSecret()` - Génère secret TOTP + QR code
- ✅ `verifyCode()` - Vérifie code TOTP ou backup code
- ✅ `verifyActivationCode()` - Vérifie lors de l'activation
- ✅ `enable2FA()` / `disable2FA()` - Activation/désactivation
- ✅ `getConfig()` - Récupère configuration
- ✅ `regenerateBackupCodes()` - Régénère codes de secours
- ✅ `create2FASession()` / `verify2FASession()` - Sessions temporaires
- ✅ `recordAttempt()` - Enregistre tentatives (sécurité)

#### Intégration Login (`app/auth/login/page.tsx`)
- ✅ Détection 2FA activée
- ✅ Étape de vérification 2FA
- ✅ Appel API `/api/2fa/verify`

### Tests Requis

#### 1. Génération Secret TOTP
```typescript
// Test manuel requis
1. Aller sur /dashboard/settings (section Sécurité)
2. Cliquer sur "Activer 2FA"
3. Scanner le QR code avec Google Authenticator
4. Vérifier que le QR code s'affiche correctement
5. Vérifier que les codes de récupération sont générés
```

#### 2. Vérification Code TOTP
```typescript
// Test manuel requis
1. Se connecter avec un compte ayant 2FA activé
2. Entrer email/password
3. Entrer le code TOTP depuis Google Authenticator
4. Vérifier que la connexion réussit
```

#### 3. Codes de Récupération
```typescript
// Test manuel requis
1. Utiliser un code de récupération au lieu du TOTP
2. Vérifier que le code fonctionne
3. Vérifier que le code est supprimé après utilisation
```

#### 4. Désactivation 2FA
```typescript
// Test manuel requis
1. Aller sur /dashboard/settings
2. Désactiver 2FA
3. Vérifier que la connexion fonctionne sans 2FA
```

### Checklist 2FA

- [ ] **Génération secret** : QR code s'affiche correctement
- [ ] **Activation** : Code TOTP valide lors de l'activation
- [ ] **Connexion avec 2FA** : Code TOTP accepté
- [ ] **Codes de récupération** : Fonctionnent et sont supprimés après utilisation
- [ ] **Désactivation** : 2FA peut être désactivée
- [ ] **Régénération codes** : Nouveaux codes de récupération générés
- [ ] **Tentatives échouées** : Enregistrées dans `user_2fa_attempts`
- [ ] **Sessions temporaires** : Créées après vérification réussie

---

## 2. 🌐 SSO (Single Sign-On)

### Implémentation Actuelle

#### Service SSO (`lib/services/sso.service.ts`)
- ✅ Service centralisé pour SSO
- ✅ Adapters pour différents providers

#### Adapters Disponibles
- ✅ **Google OAuth** : `lib/services/sso/google-oauth.adapter.ts`
- ✅ **Microsoft OAuth** : `lib/services/sso/microsoft-oauth.adapter.ts`
- ✅ **GitHub OAuth** : `lib/services/sso/github-oauth.adapter.ts`
- ✅ **SAML** : `@node-saml/passport-saml` (package installé)

### Configuration Requise

#### Variables d'Environnement
```env
# Google OAuth
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# Microsoft OAuth
MICROSOFT_CLIENT_ID=...
MICROSOFT_CLIENT_SECRET=...

# GitHub OAuth
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...

# SAML (si utilisé)
SAML_ENTRY_POINT=...
SAML_ISSUER=...
SAML_CERT=...
```

### Tests Requis

#### 1. Google OAuth
```typescript
// Test manuel requis
1. Aller sur /auth/login
2. Cliquer sur "Se connecter avec Google"
3. Redirection vers Google OAuth
4. Autoriser l'application
5. Vérifier redirection vers /dashboard
6. Vérifier que l'utilisateur est créé/synchronisé
```

#### 2. Microsoft OAuth
```typescript
// Test manuel requis
1. Aller sur /auth/login
2. Cliquer sur "Se connecter avec Microsoft"
3. Redirection vers Microsoft OAuth
4. Autoriser l'application
5. Vérifier redirection vers /dashboard
```

#### 3. GitHub OAuth
```typescript
// Test manuel requis
1. Aller sur /auth/login
2. Cliquer sur "Se connecter avec GitHub"
3. Redirection vers GitHub OAuth
4. Autoriser l'application
5. Vérifier redirection vers /dashboard
```

#### 4. SAML (si configuré)
```typescript
// Test manuel requis
1. Configurer SAML dans Supabase Auth
2. Tester connexion via SAML
3. Vérifier que l'utilisateur est créé/synchronisé
```

### Checklist SSO

- [ ] **Google OAuth** : Configuration et test fonctionnel
- [ ] **Microsoft OAuth** : Configuration et test fonctionnel
- [ ] **GitHub OAuth** : Configuration et test fonctionnel
- [ ] **SAML** : Configuration (si nécessaire) et test fonctionnel
- [ ] **Création utilisateur** : Utilisateur créé automatiquement lors de la première connexion SSO
- [ ] **Synchronisation** : Utilisateur synchronisé avec `public.users`
- [ ] **Gestion erreurs** : Erreurs OAuth gérées correctement
- [ ] **Redirections** : Redirections après connexion SSO fonctionnelles

---

## 3. 🔄 Workflow Complet

### Connexion avec 2FA
1. Utilisateur entre email/password
2. Si 2FA activée → Étape de vérification
3. Utilisateur entre code TOTP
4. Vérification via `/api/2fa/verify`
5. Création session 2FA temporaire
6. Reconnexion avec session
7. Redirection vers `/dashboard`

### Connexion avec SSO
1. Utilisateur clique sur provider (Google/Microsoft/GitHub)
2. Redirection vers provider OAuth
3. Autorisation utilisateur
4. Callback avec code/token
5. Création/synchronisation utilisateur
6. Redirection vers `/dashboard`

---

## 4. 🧪 Tests Automatisés (à créer)

### Tests Unitaires 2FA
```typescript
// tests/services/2fa.service.test.ts
- generateSecret() génère un secret valide
- verifyCode() valide un code TOTP correct
- verifyCode() rejette un code TOTP incorrect
- verifyBackupCode() valide un code de récupération
- verifyBackupCode() supprime le code après utilisation
- enable2FA() / disable2FA() fonctionnent
```

### Tests Unitaires SSO
```typescript
// tests/services/sso.service.test.ts
- Google OAuth adapter fonctionne
- Microsoft OAuth adapter fonctionne
- GitHub OAuth adapter fonctionne
- Gestion erreurs OAuth
```

### Tests E2E
```typescript
// e2e/auth-2fa.spec.ts
- Connexion avec 2FA activée
- Utilisation code de récupération
- Désactivation 2FA

// e2e/auth-sso.spec.ts
- Connexion Google OAuth
- Connexion Microsoft OAuth
- Connexion GitHub OAuth
```

---

## 5. 📋 Checklist Complète

### 2FA
- [x] Service 2FA implémenté ✅
- [x] Intégration login fonctionnelle ✅
- [x] API `/api/2fa/verify` existe ✅
- [x] API `/api/2fa/generate-secret` existe ✅
- [x] API `/api/2fa/verify-activation` existe ✅
- [x] API `/api/2fa/regenerate-backup-codes` existe ✅
- [x] API `/api/2fa/disable` existe ✅
- [x] Migration tables 2FA existe ✅
- [ ] **Tests manuels requis** : Génération QR code, vérification TOTP, codes de récupération

### SSO
- [x] Service SSO implémenté ✅
- [x] Adapters Google/Microsoft/GitHub disponibles ✅
- [x] Routes API SSO créées ✅
- [ ] **⚠️ Implémentation SSO** : Routes retournent 501 (non implémenté)
- [ ] **Configuration OAuth dans `.env`** : À configurer en production
- [ ] **Tests manuels requis** : Implémenter SSO puis tester connexion Google/Microsoft/GitHub

### Sécurité
- [ ] Codes de récupération hashés (SHA-256) ✅
- [ ] Tentatives enregistrées avec IP/User-Agent ✅
- [ ] Sessions 2FA temporaires (30 min) ✅
- [ ] Expiration tokens OAuth gérée
- [ ] Rate limiting sur `/api/2fa/verify`

---

## 6. 🚨 Points d'Attention

### 2FA
- [x] **Table `user_2fa`** : Migration existe ✅ (`supabase/migrations/20241202000022_create_2fa_system.sql`)
- [x] **Table `user_2fa_sessions`** : Migration existe ✅
- [x] **Table `user_2fa_attempts`** : Migration existe ✅
- [x] **API `/api/2fa/verify`** : Route existe ✅

### SSO
- ⚠️ **Variables d'environnement** : Configurer dans production
- ⚠️ **Callbacks OAuth** : URLs de callback configurées dans providers
- ⚠️ **Création utilisateur** : Vérifier synchronisation avec `public.users`
- ⚠️ **Gestion erreurs** : Erreurs OAuth gérées gracieusement

---

## 7. 📝 Actions Immédiates

### À Vérifier
1. **Migrations 2FA** : Vérifier que les tables existent
   ```sql
   SELECT * FROM information_schema.tables 
   WHERE table_name IN ('user_2fa', 'user_2fa_sessions', 'user_2fa_attempts');
   ```

2. **API Routes** : ✅ Toutes les routes existent
   - ✅ `/api/2fa/verify` (`app/api/2fa/verify/route.ts`)
   - ✅ `/api/2fa/generate-secret` (`app/api/2fa/generate-secret/route.ts`)
   - ✅ `/api/2fa/verify-activation` (`app/api/2fa/verify-activation/route.ts`)
   - ✅ `/api/2fa/regenerate-backup-codes` (`app/api/2fa/regenerate-backup-codes/route.ts`)
   - ✅ `/api/2fa/disable` (`app/api/2fa/disable/route.ts`)
   - ✅ `/api/sso/authorize/[provider]` (`app/api/sso/authorize/[provider]/route.ts`)
   - ✅ `/api/sso/callback/[provider]` (`app/api/sso/callback/[provider]/route.ts`)
   - ✅ `/api/sso/config` (`app/api/sso/config/route.ts`)
   - ✅ `/api/sso/test-connection` (`app/api/sso/test-connection/route.ts`)

3. **Variables d'environnement** : Vérifier configuration
   ```bash
   npm run check-secrets
   ```

### Tests Manuels Requis
1. **2FA TOTP** : Activer et tester avec Google Authenticator
2. **2FA Backup Codes** : Tester utilisation codes de récupération
3. **SSO Google** : Tester connexion Google OAuth
4. **SSO Microsoft** : Tester connexion Microsoft OAuth
5. **SSO GitHub** : Tester connexion GitHub OAuth

---

## 8. ✅ Validation Finale

### Critères de Succès
- ✅ 2FA TOTP fonctionne end-to-end
- ✅ Codes de récupération fonctionnent
- ✅ Au moins un provider SSO fonctionne (Google recommandé)
- ✅ Création utilisateur automatique fonctionne
- ✅ Gestion erreurs appropriée
- ✅ Documentation utilisateur disponible

---

## 📚 Ressources

- **Service 2FA** : `lib/services/2fa.service.ts`
- **Service SSO** : `lib/services/sso.service.ts`
- **Page Login** : `app/auth/login/page.tsx`
- **Migration 2FA** : `supabase/migrations/20241202000022_create_2fa_system.sql`
