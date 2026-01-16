---
title: Routes 2FA Créées avec Rate Limiting
date: 2025-12-30
version: 1.0
author: EDUZEN Team
---


# ✅ Routes 2FA Créées avec Rate Limiting

## 📋 Routes Créées

### 1. `POST /api/2fa/generate-secret`
**Description :** Génère un secret TOTP et un QR code pour activer la 2FA  
**Rate Limiter :** `authRateLimiter` (5 tentatives / 15 minutes)  
**Fichier :** `app/api/2fa/generate-secret/route.ts`

**Réponse :**
```json
{
  "secret": "JBSWY3DPEHPK3PXP",
  "qrCodeUrl": "data:image/png;base64,...",
  "backupCodes": ["A1B2C3D4", "E5F6G7H8", ...]
}
```

---

### 2. `POST /api/2fa/verify-activation`
**Description :** Vérifie un code TOTP lors de l'activation de la 2FA  
**Rate Limiter :** `authRateLimiter` (5 tentatives / 15 minutes)  
**Fichier :** `app/api/2fa/verify-activation/route.ts`

**Body :**
```json
{
  "code": "123456"
}
```

**Réponse :**
```json
{
  "success": true,
  "message": "2FA activée avec succès"
}
```

---

### 3. `POST /api/2fa/verify`
**Description :** Vérifie un code TOTP lors de la connexion  
**Rate Limiter :** `authRateLimiter` (5 tentatives / 15 minutes)  
**Fichier :** `app/api/2fa/verify/route.ts`

**Body :**
```json
{
  "code": "123456"
}
```

**Réponse :**
```json
{
  "success": true,
  "isBackupCode": false,
  "sessionToken": "abc123..."
}
```

---

### 4. `POST /api/2fa/disable`
**Description :** Désactive la 2FA pour un utilisateur  
**Rate Limiter :** `authRateLimiter` (5 tentatives / 15 minutes)  
**Fichier :** `app/api/2fa/disable/route.ts`

**Body :**
```json
{
  "password": "user_password"
}
```

**Réponse :**
```json
{
  "success": true,
  "message": "2FA désactivée avec succès"
}
```

---

### 5. `POST /api/2fa/regenerate-backup-codes`
**Description :** Régénère les codes de récupération pour la 2FA  
**Rate Limiter :** `authRateLimiter` (5 tentatives / 15 minutes)  
**Fichier :** `app/api/2fa/regenerate-backup-codes/route.ts`

**Réponse :**
```json
{
  "success": true,
  "backupCodes": ["A1B2C3D4", "E5F6G7H8", ...],
  "message": "Codes de récupération régénérés avec succès"
}
```

---

## 🔒 Sécurité

### Rate Limiting
- **Limite :** 5 requêtes par 15 minutes par IP
- **Type :** `authRateLimiter` (spécialisé pour l'authentification)
- **Comportement :** Ne compte pas les requêtes réussies (`skipSuccessfulRequests: true`)

### Authentification
- Toutes les routes nécessitent une session utilisateur valide
- Vérification du token JWT via `createClient()` (server-side)

### Validation
- Validation des codes TOTP (6 chiffres)
- Vérification du mot de passe avant désactivation
- Vérification que la 2FA est activée avant régénération

---

## 📊 Statistiques

- **Routes créées :** 5/5 ✅
- **Rate limiting appliqué :** 5/5 ✅
- **Types stricts :** 5/5 ✅ (`any` → `unknown`)
- **Gestion d'erreurs :** 5/5 ✅

---

## 🚀 Prochaines Étapes

1. ✅ Routes 2FA créées
2. ⏳ Tester les routes avec Postman/Thunder Client
3. ⏳ Intégrer dans l'interface utilisateur
4. ⏳ Ajouter des tests E2E

---

**Date :** 2024-12-03  
**Statut :** ✅ Complété---

**Document EDUZEN** | [Retour à la documentation principale](../README.md) | Dernière mise à jour : 2025-12-30
© 2024 EDUZEN. Tous droits réservés.