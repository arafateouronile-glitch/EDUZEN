---
title: Architecture RLS et Fonctions RPC
date: 2025-12-30
version: 1.0
author: EDUZEN Team
---


# 🔒 Architecture RLS et Fonctions RPC

Ce document décrit l'architecture de sécurité basée sur Row Level Security (RLS) et les fonctions RPC utilisées dans EDUZEN.

## 📋 Vue d'ensemble

EDUZEN utilise Supabase avec PostgreSQL pour le backend. La sécurité est assurée par :

1. **Row Level Security (RLS)** : Isolation des données par organisation
2. **Fonctions RPC `SECURITY DEFINER`** : Contournement contrôlé du RLS quand nécessaire
3. **Headers personnalisés** : Identification des apprenants via `x-learner-student-id`

---

## 🛡️ Policies RLS Principales

### Tables avec RLS activé

| Table | Policy Type | Description |
|-------|-------------|-------------|
| `users` | Organization-based | Accès limité aux utilisateurs de la même organisation |
| `students` | Organization-based + Learner | Accès via RLS ou header apprenant |
| `conversations` | Organization-based | Conversations isolées par organisation |
| `conversation_participants` | Participant-based | Accès uniquement aux participants |
| `messages` | Conversation-based | Messages accessibles via participation |
| `enrollments` | Organization-based | Inscriptions par organisation |

### Pattern RLS Standard

```sql
-- Lecture : même organisation
CREATE POLICY "users_select" ON public.users
  FOR SELECT USING (
    organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
  );

-- Écriture : même organisation
CREATE POLICY "users_insert" ON public.users
  FOR INSERT WITH CHECK (
    organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
  );
```

---

## 🔐 Fonctions RPC SECURITY DEFINER

Ces fonctions contournent le RLS de manière contrôlée. Elles sont utilisées quand :

1. L'apprenant n'a pas de compte utilisateur authentifié
2. Une opération nécessite un accès cross-organization
3. Une action administrative requiert des privilèges élevés

### `get_learner_student(p_student_id UUID)`

**Usage** : Récupérer les données d'un étudiant pour l'espace apprenant

```sql
CREATE OR REPLACE FUNCTION public.get_learner_student(p_student_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  student_record jsonb;
BEGIN
  SELECT to_jsonb(s.*)
  INTO student_record
  FROM public.students s
  WHERE s.id = p_student_id;
  
  RETURN student_record;
END;
$$;
```

**Permissions** : `anon`, `authenticated`

---

### `get_user_name(p_user_id UUID)`

**Usage** : Récupérer le nom d'un utilisateur (admin) depuis l'espace apprenant

```sql
CREATE OR REPLACE FUNCTION public.get_user_name(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_record jsonb;
BEGIN
  SELECT to_jsonb(u.*)
  INTO user_record
  FROM public.users u
  WHERE u.id = p_user_id;
  
  RETURN user_record;
END;
$$;
```

**Permissions** : `anon`, `authenticated`

---

### `insert_student_message(p_conversation_id, p_student_id, p_content, p_attachments)`

**Usage** : Permettre aux étudiants d'envoyer des messages sans compte utilisateur

```sql
CREATE OR REPLACE FUNCTION public.insert_student_message(
  p_conversation_id UUID,
  p_student_id UUID,
  p_content TEXT,
  p_attachments JSONB DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_message_id UUID;
  v_message jsonb;
BEGIN
  -- Vérifier que l'étudiant est participant
  IF NOT EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE conversation_id = p_conversation_id
      AND student_id = p_student_id
  ) THEN
    RAISE EXCEPTION 'L''étudiant n''est pas participant de cette conversation';
  END IF;

  -- Insérer le message
  INSERT INTO public.messages (
    conversation_id,
    sender_id,
    student_sender_id,
    content,
    attachments,
    is_deleted
  ) VALUES (
    p_conversation_id,
    NULL, -- Pas de sender_id pour les étudiants
    p_student_id,
    p_content,
    p_attachments,
    false
  )
  RETURNING id INTO v_message_id;

  -- Récupérer le message créé
  SELECT to_jsonb(m.*)
  INTO v_message
  FROM public.messages m
  WHERE m.id = v_message_id;

  -- Mettre à jour last_message_at
  UPDATE public.conversations
  SET last_message_at = NOW()
  WHERE id = p_conversation_id;

  RETURN v_message;
END;
$$;
```

**Permissions** : `anon`, `authenticated`

---

### `sync_user_from_auth(p_user_id UUID)`

**Usage** : Synchroniser un utilisateur depuis `auth.users` vers `public.users`

```sql
CREATE OR REPLACE FUNCTION public.sync_user_from_auth(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  auth_user_record RECORD;
  synced_user jsonb;
BEGIN
  -- Récupérer l'utilisateur auth
  SELECT * INTO auth_user_record
  FROM auth.users
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- Insérer ou mettre à jour dans public.users
  INSERT INTO public.users (id, email, full_name, avatar_url, updated_at)
  VALUES (
    p_user_id,
    auth_user_record.email,
    COALESCE(auth_user_record.raw_user_meta_data->>'full_name', auth_user_record.email),
    auth_user_record.raw_user_meta_data->>'avatar_url',
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, public.users.full_name),
    updated_at = NOW()
  RETURNING to_jsonb(public.users.*) INTO synced_user;

  RETURN synced_user;
END;
$$;
```

**Permissions** : `authenticated`

---

## 📱 Accès Apprenant

L'espace apprenant utilise un système d'accès sans authentification :

### Header `x-learner-student-id`

Le client envoie l'ID de l'étudiant via un header HTTP :

```typescript
// lib/supabase/learner-client.ts
export function createLearnerClient(studentId: string) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: {
          'x-learner-student-id': studentId
        }
      }
    }
  )
}
```

### Fonction Helper `learner_student_id()`

```sql
CREATE OR REPLACE FUNCTION public.learner_student_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(
    current_setting('request.headers', true)::json->>'x-learner-student-id',
    ''
  )::uuid;
$$;
```

---

## ⚠️ Bonnes Pratiques

### 1. Éviter les récursions RLS

```sql
-- ❌ MAUVAIS : Récursion infinie
CREATE POLICY "bad_policy" ON public.users
  FOR SELECT USING (
    organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
  );

-- ✅ BON : Utiliser une fonction SECURITY DEFINER
CREATE OR REPLACE FUNCTION get_user_org_id()
RETURNS uuid
SECURITY DEFINER
AS $$
  SELECT organization_id FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql;

CREATE POLICY "good_policy" ON public.users
  FOR SELECT USING (
    organization_id = get_user_org_id()
  );
```

### 2. Limiter les permissions RPC

```sql
-- Révoquer l'accès par défaut
REVOKE ALL ON FUNCTION public.sensitive_function FROM PUBLIC;

-- Accorder uniquement aux rôles nécessaires
GRANT EXECUTE ON FUNCTION public.sensitive_function TO authenticated;
```

### 3. Valider les entrées

```sql
CREATE FUNCTION public.safe_function(p_id uuid)
RETURNS jsonb
SECURITY DEFINER
AS $$
BEGIN
  -- Validation
  IF p_id IS NULL THEN
    RAISE EXCEPTION 'p_id cannot be NULL';
  END IF;

  -- Logique
  ...
END;
$$ LANGUAGE plpgsql;
```

---

## 🔍 Debugging RLS

### Vérifier les policies d'une table

```sql
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'your_table';
```

### Tester une policy

```sql
-- En tant qu'utilisateur authentifié
SET request.jwt.claims = '{"sub": "user-uuid", "role": "authenticated"}';
SET role TO authenticated;

SELECT * FROM your_table;
```

---

## 📚 Références

- [Supabase RLS Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL CREATE POLICY](https://www.postgresql.org/docs/current/sql-createpolicy.html)
- [PostgreSQL SECURITY DEFINER](https://www.postgresql.org/docs/current/sql-createfunction.html)---

**Document EDUZEN** | [Retour à la documentation principale](../README.md) | Dernière mise à jour : 2025-12-30
© 2024 EDUZEN. Tous droits réservés.