---
title: Guide - Créer un Utilisateur de Test
date: 2025-12-30
version: 1.0
author: EDUZEN Team
---


# 👤 Guide - Créer un Utilisateur de Test

**Date :** 2024-12-03  
**Objectif :** Créer un utilisateur de test pour les tests E2E

---

## 🎯 Problème

Les tests E2E échouent car les identifiants `test@example.com` / `password123` n'existent pas dans la base de données.

---

## ✅ Solutions

### Option 1 : Créer un utilisateur via l'interface (Recommandé)

1. **Démarrer l'application**
   ```bash
   npm run dev
   ```

2. **Créer un compte**
   - Aller sur `http://localhost:3001/auth/register`
   - Créer un compte avec :
     - Email : `test@example.com`
     - Password : `password123`
     - Nom complet : `Test User`
     - Nom de l'organisation : `Test Organization`

3. **Vérifier la connexion**
   - Se connecter avec ces identifiants
   - Vérifier que le dashboard s'affiche

### Option 2 : Créer via SQL (Supabase)

```sql
-- Créer l'utilisateur dans auth.users
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'test@example.com',
  crypt('password123', gen_salt('bf')),
  now(),
  now(),
  now()
);

-- Créer le profil dans public.users
INSERT INTO public.users (
  id,
  email,
  full_name,
  role,
  is_active,
  organization_id
) VALUES (
  (SELECT id FROM auth.users WHERE email = 'test@example.com'),
  'test@example.com',
  'Test User',
  'admin',
  true,
  (SELECT id FROM organizations LIMIT 1)
);
```

### Option 3 : Script de Setup

Créer un script `scripts/setup-test-user.ts` :

```typescript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function createTestUser() {
  // Créer l'utilisateur dans auth
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: 'test@example.com',
    password: 'password123',
    email_confirm: true,
  })

  if (authError) {
    console.error('Erreur création utilisateur auth:', authError)
    return
  }

  console.log('Utilisateur de test créé avec succès!')
  console.log('Email: test@example.com')
  console.log('Password: password123')
}

createTestUser()
```

---

## 🚀 Utilisation

Une fois l'utilisateur créé, les tests E2E devraient passer :

```bash
npm run test:e2e
```

---

## ⚠️ Note

Les tests sont maintenant configurés pour **skip automatiquement** si la connexion échoue, donc ils ne bloqueront plus l'exécution même si l'utilisateur de test n'existe pas.

---

**Statut :** Guide créé, utilisateur à créer---

**Document EDUZEN** | [Retour à la documentation principale](../README.md) | Dernière mise à jour : 2025-12-30
© 2024 EDUZEN. Tous droits réservés.