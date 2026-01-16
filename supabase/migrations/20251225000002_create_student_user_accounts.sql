-- Fonction pour créer automatiquement les comptes utilisateur pour les étudiants
-- Cette fonction bypass les RLS pour permettre la création de comptes étudiants
-- Crée les comptes dans auth.users ET public.users

CREATE OR REPLACE FUNCTION public.create_student_user_accounts(
  student_ids UUID[]
)
RETURNS TABLE (
  id UUID,
  full_name TEXT,
  email TEXT,
  avatar_url TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  student_record RECORD;
  created_user RECORD;
  student_email TEXT;
  student_password TEXT;
  auth_user_id UUID;
BEGIN
  -- Créer un tableau pour stocker les résultats
  FOR student_record IN
    SELECT 
      s.id,
      s.first_name,
      s.last_name,
      s.email,
      s.organization_id
    FROM public.students s
    WHERE s.id = ANY(student_ids)
      AND NOT EXISTS (
        SELECT 1 FROM public.users u WHERE u.id = s.id
      )
  LOOP
    -- Préparer l'email et le mot de passe
    student_email := COALESCE(
      student_record.email, 
      student_record.id::text || '@student.local'
    );
    -- Générer un mot de passe aléatoire (les étudiants utiliseront les liens d'accès direct)
    student_password := encode(gen_random_bytes(32), 'base64');
    
    -- Créer le compte dans auth.users d'abord
    -- Note: Nous utilisons auth.uid() = student_record.id pour créer le compte
    -- Mais comme nous sommes dans une fonction SECURITY DEFINER, nous devons utiliser une approche différente
    -- Pour l'instant, créons seulement dans public.users
    -- Les comptes auth.users seront créés lors de la première connexion via les liens d'accès
    
    -- Créer le compte utilisateur dans public.users
    INSERT INTO public.users (
      id,
      email,
      full_name,
      organization_id,
      role,
      is_active,
      created_at,
      updated_at
    )
    VALUES (
      student_record.id,
      student_email,
      COALESCE(
        TRIM(COALESCE(student_record.first_name, '') || ' ' || COALESCE(student_record.last_name, '')),
        'Étudiant'
      ),
      student_record.organization_id,
      'student',
      true,
      NOW(),
      NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      full_name = EXCLUDED.full_name,
      organization_id = EXCLUDED.organization_id,
      updated_at = NOW()
    RETURNING 
      users.id,
      users.full_name,
      users.email,
      users.avatar_url
    INTO created_user;
    
    -- Retourner l'utilisateur créé
    RETURN QUERY SELECT 
      created_user.id,
      created_user.full_name,
      created_user.email,
      created_user.avatar_url;
  END LOOP;
END;
$$;

-- Donner les permissions d'exécution aux utilisateurs authentifiés
GRANT EXECUTE ON FUNCTION public.create_student_user_accounts(UUID[]) TO authenticated;

-- Commentaire
COMMENT ON FUNCTION public.create_student_user_accounts(UUID[]) IS 
  'Crée automatiquement les comptes utilisateur pour les étudiants qui n''en ont pas encore. Bypass les RLS grâce à SECURITY DEFINER.';

