# Corriger le 403 sur session_programs (création de session)

## Problème

Lors de la création d’une session, l’appel `POST .../session_programs` renvoie **403 (Forbidden)** et la création échoue.

## Solution : RPC `insert_session_programs`

L’app ne fait plus d’INSERT direct dans `session_programs`. Elle appelle une **fonction RPC** `insert_session_programs` qui insère avec les bons droits (SECURITY DEFINER) après vérification de l’utilisateur et de l’organisation.

**Vous devez appliquer la migration qui crée cette fonction** sur votre projet Supabase.

### Option A : Supabase Dashboard (recommandé)

1. Ouvrez [Supabase Dashboard](https://supabase.com/dashboard) → votre projet.
2. Allez dans **SQL Editor**.
3. Copiez-collez **tout le contenu** du fichier **`supabase/migrations/20260131000004_session_programs_rpc.sql`**.
4. Cliquez sur **Run**.
5. Vérifiez qu’il n’y a pas d’erreur (message de succès).

### Option B : CLI Supabase

```bash
npx supabase db push
```

(Applique toutes les migrations non encore exécutées, dont `20260131000004_session_programs_rpc.sql`.)

**Optionnel** : pour corriger aussi les politiques RLS (SELECT/UPDATE/DELETE) avec `public.users`, exécutez en plus **`supabase/migrations/20260131000003_fix_session_programs_rls.sql`** dans le SQL Editor.

## Vérifier que l’utilisateur a une organisation

Si le 403 persiste après avoir appliqué la migration, vérifiez que l’utilisateur connecté a bien un `organization_id` dans `public.users` :

Dans le SQL Editor du dashboard :

```sql
SELECT id, email, organization_id, role
FROM public.users
WHERE id = auth.uid();
```

- Si `organization_id` est **NULL**, l’utilisateur n’est pas rattaché à une organisation : corrigez les données (ou le flux d’inscription) pour remplir `organization_id`.
- Si `organization_id` est renseigné, vérifiez que la **formation** et les **programmes** utilisés pour la session appartiennent bien à cette même organisation (tables `formations`, `programs`).

## Après correction

Rechargez l’app et réessayez de créer une session. L’INSERT dans `session_programs` doit passer et la création de session doit aboutir.
