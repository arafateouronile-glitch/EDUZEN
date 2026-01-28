# Configuration centralisée de l'application

Ce dossier contient la configuration centralisée de l'application EDUZEN pour éviter les valeurs hardcodées.

## Fichier principal : `app-config.ts`

Ce fichier centralise toutes les valeurs de configuration qui étaient auparavant hardcodées dans le code.

### Utilisation

```typescript
import { BRAND_COLORS, APP_DEFAULTS, APP_URLS, EMAIL_CONFIG, SECURITY_CONFIG } from '@/lib/config/app-config'

// Utiliser les couleurs de marque
const primaryColor = BRAND_COLORS.primary // '#274472'

// Utiliser les URLs
const baseUrl = APP_URLS.getBaseUrl() // Récupère l'URL depuis les variables d'environnement

// Utiliser l'email par défaut
const fromEmail = EMAIL_CONFIG.getFromEmail()

// Utiliser la clé de chiffrement (avec vérification en production)
const encryptionKey = SECURITY_CONFIG.getEncryptionKey()
```

## Variables d'environnement requises

### Production (obligatoires)
- `TEMPLATE_ENCRYPTION_KEY` : Clé de chiffrement pour les templates (générer une clé sécurisée)
- `RESEND_FROM_EMAIL` : Email d'expéditeur pour les emails (ex: `EDUZEN <noreply@eduzen.fr>`)
- `NEXT_PUBLIC_APP_URL` : URL de base de l'application (ex: `https://eduzen.fr`)

### Optionnelles
- `SUPABASE_PROJECT_ID` : Project ID Supabase (par défaut: `ocdlaouymksskmmhmzdr`)
- `NEXT_PUBLIC_SITE_URL` : URL alternative (fallback si `NEXT_PUBLIC_APP_URL` n'est pas défini)

## Migration depuis les valeurs hardcodées

### Couleurs
**Avant :**
```typescript
const color = '#34B9EE'
```

**Après :**
```typescript
import { BRAND_COLORS } from '@/lib/config/app-config'
const color = BRAND_COLORS.secondary
```

### URLs
**Avant :**
```typescript
const url = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'
```

**Après :**
```typescript
import { APP_URLS } from '@/lib/config/app-config'
const url = APP_URLS.getBaseUrl()
```

### Email
**Avant :**
```typescript
const from = process.env.RESEND_FROM_EMAIL ?? 'EDUZEN <onboarding@resend.dev>'
```

**Après :**
```typescript
import { EMAIL_CONFIG } from '@/lib/config/app-config'
const from = EMAIL_CONFIG.getFromEmail()
```

### Clé de chiffrement
**Avant :**
```typescript
const key = process.env.TEMPLATE_ENCRYPTION_KEY || 'default-key-change-in-production'
```

**Après :**
```typescript
import { SECURITY_CONFIG } from '@/lib/config/app-config'
const key = SECURITY_CONFIG.getEncryptionKey() // Lance une erreur en production si non configurée
```

## Notes importantes

⚠️ **Sécurité** : La clé de chiffrement `TEMPLATE_ENCRYPTION_KEY` doit absolument être configurée en production. Le système lancera une erreur si elle n'est pas configurée.

📝 **Couleurs** : Les couleurs sont centralisées mais peuvent être personnalisées par organisation via les paramètres de l'organisation (à implémenter).

🌍 **URLs** : Les URLs utilisent automatiquement les variables d'environnement avec des fallbacks appropriés pour le développement.
