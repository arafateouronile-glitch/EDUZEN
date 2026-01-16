-- Script manuel pour synchroniser un utilisateur spécifique
-- À exécuter dans le SQL Editor de Supabase pour créer l'enregistrement manquant
-- Remplacez 'ff6fe5a3-6f1b-41df-bd2c-17f851afb518' par l'ID de l'utilisateur à synchroniser

-- Option 1: Si vous connaissez l'email de l'utilisateur
INSERT INTO public.users (
  id,
  email,
  full_name,
  role,
  is_active,
  created_at,
  updated_at
)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'full_name', au.email),
  COALESCE((au.raw_user_meta_data->>'role')::text, 'user'),
  COALESCE((au.raw_user_meta_data->>'is_active')::boolean, true),
  au.created_at,
  NOW()
FROM auth.users au
WHERE au.id = 'ff6fe5a3-6f1b-41df-bd2c-17f851afb518'::uuid
  AND NOT EXISTS (SELECT 1 FROM public.users WHERE id = au.id)
ON CONFLICT (id) DO NOTHING;

-- Option 2: Créer directement l'enregistrement avec les informations connues
-- Remplacez les valeurs par les vraies informations de l'utilisateur
INSERT INTO public.users (
  id,
  email,
  full_name,
  role,
  is_active,
  created_at,
  updated_at
)
VALUES (
  'ff6fe5a3-6f1b-41df-bd2c-17f851afb518'::uuid,
  'votre-email@example.com',  -- Remplacez par l'email réel
  'Nom Complet',  -- Remplacez par le nom réel
  'admin',  -- Remplacez par le rôle approprié
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE
SET 
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  updated_at = NOW();





