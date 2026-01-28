-- Migration: Politiques RLS anti-impayés
-- Date: 2026-01-23
-- Description: Bloque l'accès en écriture si l'abonnement Stripe est en défaut

-- Fonction helper pour vérifier si l'abonnement est actif
-- Supprimer d'abord si elle existe avec un type différent
DROP FUNCTION IF EXISTS public.is_subscription_active(uuid) CASCADE;
DROP FUNCTION IF EXISTS is_subscription_active(uuid) CASCADE;

CREATE OR REPLACE FUNCTION public.is_subscription_active(org_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  -- Si pas d'abonnement, autoriser (pour les organisations en période d'essai ou free)
  -- Vous pouvez modifier cette logique selon vos besoins
  RETURN EXISTS (
    SELECT 1
    FROM subscriptions
    WHERE organization_id = org_id
    AND status = 'active'
  ) OR NOT EXISTS (
    SELECT 1
    FROM subscriptions
    WHERE organization_id = org_id
  );
END;
$$;

-- Fonction helper pour obtenir l'organization_id de l'utilisateur (UUID)
-- Note: Une fonction get_user_organization_id() retournant TEXT existe déjà
-- On crée une fonction avec un nom différent pour éviter les conflits
-- ou on utilise directement la fonction existante avec un cast

-- Option 1: Créer une fonction wrapper qui retourne UUID
CREATE OR REPLACE FUNCTION public.get_user_organization_id_uuid()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  user_id uuid;
  org_id uuid;
BEGIN
  user_id := auth.uid();
  IF user_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT organization_id INTO org_id
  FROM public.users
  WHERE id = user_id;

  RETURN org_id;
END;
$$;

-- Utiliser la fonction wrapper dans les politiques
-- (On utilisera get_user_organization_id_uuid() au lieu de get_user_organization_id())

-- Politique RLS pour students (INSERT, UPDATE)
-- Bloque si l'abonnement n'est pas actif
DROP POLICY IF EXISTS "Block insert if subscription not active" ON students;
DROP POLICY IF EXISTS "Block update if subscription not active" ON students;

CREATE POLICY "Block insert if subscription not active"
  ON students
  FOR INSERT
  WITH CHECK (
    is_subscription_active(public.get_user_organization_id_uuid())
  );

CREATE POLICY "Block update if subscription not active"
  ON students
  FOR UPDATE
  USING (
    is_subscription_active(public.get_user_organization_id_uuid())
  )
  WITH CHECK (
    is_subscription_active(public.get_user_organization_id_uuid())
  );

-- Politique RLS pour sessions (INSERT, UPDATE)
DROP POLICY IF EXISTS "Block insert if subscription not active" ON sessions;
DROP POLICY IF EXISTS "Block update if subscription not active" ON sessions;

CREATE POLICY "Block insert if subscription not active"
  ON sessions
  FOR INSERT
  WITH CHECK (
    is_subscription_active(
      (SELECT organization_id FROM formations WHERE id = sessions.formation_id)
    )
  );

CREATE POLICY "Block update if subscription not active"
  ON sessions
  FOR UPDATE
  USING (
    is_subscription_active(
      (SELECT organization_id FROM formations WHERE id = sessions.formation_id)
    )
  )
  WITH CHECK (
    is_subscription_active(
      (SELECT organization_id FROM formations WHERE id = sessions.formation_id)
    )
  );

-- Politique RLS pour programs (INSERT, UPDATE)
DROP POLICY IF EXISTS "Block insert if subscription not active" ON programs;
DROP POLICY IF EXISTS "Block update if subscription not active" ON programs;

CREATE POLICY "Block insert if subscription not active"
  ON programs
  FOR INSERT
  WITH CHECK (
    is_subscription_active(public.get_user_organization_id_uuid())
  );

CREATE POLICY "Block update if subscription not active"
  ON programs
  FOR UPDATE
  USING (
    is_subscription_active(public.get_user_organization_id_uuid())
  )
  WITH CHECK (
    is_subscription_active(public.get_user_organization_id_uuid())
  );

-- Politique RLS pour formations (INSERT, UPDATE)
DROP POLICY IF EXISTS "Block insert if subscription not active" ON formations;
DROP POLICY IF EXISTS "Block update if subscription not active" ON formations;

CREATE POLICY "Block insert if subscription not active"
  ON formations
  FOR INSERT
  WITH CHECK (
    is_subscription_active(public.get_user_organization_id_uuid())
  );

CREATE POLICY "Block update if subscription not active"
  ON formations
  FOR UPDATE
  USING (
    is_subscription_active(public.get_user_organization_id_uuid())
  )
  WITH CHECK (
    is_subscription_active(public.get_user_organization_id_uuid())
  );

-- Politique RLS pour documents (INSERT, UPDATE)
DROP POLICY IF EXISTS "Block insert if subscription not active" ON documents;
DROP POLICY IF EXISTS "Block update if subscription not active" ON documents;

CREATE POLICY "Block insert if subscription not active"
  ON documents
  FOR INSERT
  WITH CHECK (
    is_subscription_active(public.get_user_organization_id_uuid())
  );

CREATE POLICY "Block update if subscription not active"
  ON documents
  FOR UPDATE
  USING (
    is_subscription_active(public.get_user_organization_id_uuid())
  )
  WITH CHECK (
    is_subscription_active(public.get_user_organization_id_uuid())
  );

-- Politique RLS pour invoices (INSERT, UPDATE)
DROP POLICY IF EXISTS "Block insert if subscription not active" ON invoices;
DROP POLICY IF EXISTS "Block update if subscription not active" ON invoices;

CREATE POLICY "Block insert if subscription not active"
  ON invoices
  FOR INSERT
  WITH CHECK (
    is_subscription_active(public.get_user_organization_id_uuid())
  );

CREATE POLICY "Block update if subscription not active"
  ON invoices
  FOR UPDATE
  USING (
    is_subscription_active(public.get_user_organization_id_uuid())
  )
  WITH CHECK (
    is_subscription_active(public.get_user_organization_id_uuid())
  );

-- Politique RLS pour enrollments (INSERT, UPDATE)
DROP POLICY IF EXISTS "Block insert if subscription not active" ON enrollments;
DROP POLICY IF EXISTS "Block update if subscription not active" ON enrollments;

CREATE POLICY "Block insert if subscription not active"
  ON enrollments
  FOR INSERT
  WITH CHECK (
    is_subscription_active(
      (SELECT f.organization_id 
       FROM sessions s
       JOIN formations f ON s.formation_id = f.id
       WHERE s.id = enrollments.session_id)
    )
  );

CREATE POLICY "Block update if subscription not active"
  ON enrollments
  FOR UPDATE
  USING (
    is_subscription_active(
      (SELECT f.organization_id 
       FROM sessions s
       JOIN formations f ON s.formation_id = f.id
       WHERE s.id = enrollments.session_id)
    )
  )
  WITH CHECK (
    is_subscription_active(
      (SELECT f.organization_id 
       FROM sessions s
       JOIN formations f ON s.formation_id = f.id
       WHERE s.id = enrollments.session_id)
    )
  );

-- Note: Pour les tables avec des relations complexes, ajustez les politiques selon votre schéma
-- Cette migration couvre les principales tables critiques

-- Fonction pour logger les tentatives d'écriture bloquées (optionnel, pour debugging)
-- Supprimer d'abord si elle existe
DROP FUNCTION IF EXISTS public.log_blocked_write_attempt() CASCADE;
DROP FUNCTION IF EXISTS log_blocked_write_attempt() CASCADE;

CREATE OR REPLACE FUNCTION public.log_blocked_write_attempt()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  org_id uuid;
BEGIN
  org_id := public.get_user_organization_id_uuid();
  
  -- Logger dans une table d'audit si nécessaire
  -- INSERT INTO audit_logs (action, organization_id, reason, created_at)
  -- VALUES ('write_blocked', org_id, 'Subscription not active', now());
  
  -- Lever une exception avec un message clair
  RAISE EXCEPTION 'Votre abonnement n''est pas actif. Veuillez régulariser votre paiement pour continuer à utiliser EDUZEN.'
    USING ERRCODE = 'P0001';
END;
$$;

-- Commentaire pour documentation
COMMENT ON FUNCTION public.is_subscription_active(uuid) IS 'Vérifie si l''abonnement d''une organisation est actif. Retourne true si actif ou si pas d''abonnement (période d''essai).';
COMMENT ON FUNCTION public.get_user_organization_id_uuid() IS 'Récupère l''organization_id (UUID) de l''utilisateur actuellement authentifié. Version UUID de get_user_organization_id().';
