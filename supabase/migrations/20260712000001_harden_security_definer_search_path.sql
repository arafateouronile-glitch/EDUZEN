-- =====================================================
-- EDUZEN - Durcissement des fonctions SECURITY DEFINER
-- =====================================================
-- Description: Une revue technique a identifié que sur les fonctions
-- SECURITY DEFINER du schéma public, une majorité ne fixe pas explicitement
-- `search_path`. Une fonction SECURITY DEFINER s'exécute avec les
-- privilèges de son propriétaire (souvent un rôle élevé) ; sans
-- `SET search_path` figé, elle résout les objets non qualifiés (tables,
-- fonctions...) via le search_path de l'appelant, ce qui permet en théorie
-- à un rôle capable de créer des objets (ex: dans un schéma qu'il contrôle,
-- ou si un schéma malveillant est ajouté au search_path de la session) de
-- faire exécuter du code arbitraire à la fonction SECURITY DEFINER
-- (search_path hijacking, cf. CVE-2018-1058 / recommandation officielle
-- PostgreSQL et Supabase).
--
-- Plutôt que de corriger fichier par fichier (182 occurrences de
-- SECURITY DEFINER réparties sur 73 migrations, certaines fonctions ayant
-- été recréées plusieurs fois via CREATE OR REPLACE), cette migration
-- interroge directement l'état réel du catalogue système (pg_proc) et
-- corrige toutes les fonctions SECURITY DEFINER du schéma public qui n'ont
-- actuellement aucun `search_path` dans leur configuration. C'est donc
-- idempotent : rejouable sans effet si toutes les fonctions sont déjà
-- corrigées, et ça ne dépend pas de l'historique des migrations.
--
-- Aucun changement de comportement fonctionnel attendu : ces fonctions
-- qualifient déjà leurs objets soit implicitement via `public` (schéma par
-- défaut), donc figer search_path=public reproduit le comportement observé
-- en pratique, sans le laisser dépendre du contexte de l'appelant.
-- Date: 2026-07-12
-- =====================================================

DO $$
DECLARE
  r RECORD;
  fixed_count integer := 0;
BEGIN
  FOR r IN
    SELECT
      p.oid,
      n.nspname AS schema_name,
      p.proname AS function_name,
      pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef = true -- SECURITY DEFINER
      AND NOT EXISTS (
        SELECT 1 FROM unnest(COALESCE(p.proconfig, ARRAY[]::text[])) cfg
        WHERE cfg LIKE 'search_path=%'
      )
  LOOP
    EXECUTE format(
      'ALTER FUNCTION %I.%I(%s) SET search_path = public',
      r.schema_name, r.function_name, r.args
    );
    fixed_count := fixed_count + 1;
  END LOOP;

  RAISE NOTICE 'Fonctions SECURITY DEFINER corrigées (search_path=public ajouté) : %', fixed_count;
END $$;
