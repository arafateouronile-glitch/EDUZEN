-- Script de vérification post-migration
-- Ce script vérifie que toutes les migrations ont été appliquées correctement
-- Usage: Exécuter dans Supabase SQL Editor après avoir appliqué toutes les migrations

DO $$
DECLARE
  missing_tables TEXT[] := ARRAY[]::TEXT[];
  missing_functions TEXT[] := ARRAY[]::TEXT[];
  missing_indexes TEXT[] := ARRAY[]::TEXT[];
  missing_policies TEXT[] := ARRAY[]::TEXT[];
  table_name TEXT;
  function_name TEXT;
  index_name TEXT;
  policy_name TEXT;
BEGIN
  RAISE NOTICE '🔍 Vérification des migrations EDUZEN...';
  RAISE NOTICE '';

  -- ========== VÉRIFICATION DES TABLES ==========
  RAISE NOTICE '📋 Vérification des tables principales...';
  
  -- Liste des tables essentielles à vérifier
  FOR table_name IN 
    SELECT unnest(ARRAY[
      'users', 'organizations', 'students', 'sessions', 'formations', 'programs',
      'enrollments', 'attendance', 'grades', 'invoices', 'payments',
      'conversations', 'conversation_participants', 'messages',
      'evaluation_templates', 'evaluation_template_questions',
      'session_charges', 'session_slots', 'documents',
      'learning_portfolio_templates', 'learning_portfolios'
    ])
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = table_name
    ) THEN
      missing_tables := array_append(missing_tables, table_name);
    END IF;
  END LOOP;

  IF array_length(missing_tables, 1) > 0 THEN
    RAISE WARNING '❌ Tables manquantes: %', array_to_string(missing_tables, ', ');
  ELSE
    RAISE NOTICE '✅ Toutes les tables principales sont présentes';
  END IF;

  -- ========== VÉRIFICATION DES FONCTIONS RPC ==========
  RAISE NOTICE '';
  RAISE NOTICE '🔧 Vérification des fonctions RPC...';
  
  FOR function_name IN 
    SELECT unnest(ARRAY[
      'get_learner_student',
      'get_user_name',
      'insert_student_message',
      'learner_student_id',
      'sync_user_from_auth',
      'create_organization_for_user',
      'create_user_for_organization'
    ])
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public'
      AND p.proname = function_name
    ) THEN
      missing_functions := array_append(missing_functions, function_name);
    END IF;
  END LOOP;

  IF array_length(missing_functions, 1) > 0 THEN
    RAISE WARNING '❌ Fonctions RPC manquantes: %', array_to_string(missing_functions, ', ');
  ELSE
    RAISE NOTICE '✅ Toutes les fonctions RPC principales sont présentes';
  END IF;

  -- ========== VÉRIFICATION DES INDEX ==========
  RAISE NOTICE '';
  RAISE NOTICE '📊 Vérification des index critiques...';
  
  FOR index_name IN 
    SELECT unnest(ARRAY[
      'idx_messages_conversation_created',
      'idx_conversations_org_last_msg',
      'idx_conversation_participants_user_id',
      'idx_conversation_participants_student_id',
      'idx_enrollments_session_status',
      'idx_attendance_session_date',
      'idx_students_organization_id',
      'idx_users_organization_id'
    ])
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_indexes 
      WHERE schemaname = 'public' 
      AND indexname = index_name
    ) THEN
      missing_indexes := array_append(missing_indexes, index_name);
    END IF;
  END LOOP;

  IF array_length(missing_indexes, 1) > 0 THEN
    RAISE WARNING '⚠️ Index manquants (non critique): %', array_to_string(missing_indexes, ', ');
  ELSE
    RAISE NOTICE '✅ Tous les index critiques sont présents';
  END IF;

  -- ========== VÉRIFICATION DES POLICIES RLS ==========
  RAISE NOTICE '';
  RAISE NOTICE '🔒 Vérification des policies RLS...';
  
  -- Vérifier que RLS est activé sur les tables critiques
  FOR table_name IN 
    SELECT unnest(ARRAY[
      'users', 'students', 'conversations', 'messages', 
      'conversation_participants', 'enrollments', 'attendance'
    ])
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = table_name
    ) THEN
      IF NOT EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = table_name
        AND rowsecurity = true
      ) THEN
        RAISE WARNING '⚠️ RLS non activé sur la table: %', table_name;
      END IF;
    END IF;
  END LOOP;

  RAISE NOTICE '✅ Vérification RLS terminée';

  -- ========== VÉRIFICATION DES BUCKETS STORAGE ==========
  RAISE NOTICE '';
  RAISE NOTICE '📦 Vérification des buckets de stockage...';
  
  IF EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'documents'
  ) THEN
    RAISE NOTICE '✅ Bucket "documents" existe';
  ELSE
    RAISE WARNING '❌ Bucket "documents" manquant';
  END IF;

  IF EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'messages'
  ) THEN
    RAISE NOTICE '✅ Bucket "messages" existe';
  ELSE
    RAISE WARNING '❌ Bucket "messages" manquant';
  END IF;

  IF EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'course-thumbnails'
  ) THEN
    RAISE NOTICE '✅ Bucket "course-thumbnails" existe';
  ELSE
    RAISE NOTICE 'ℹ️ Bucket "course-thumbnails" optionnel';
  END IF;

  -- ========== RÉSUMÉ ==========
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  
  IF array_length(missing_tables, 1) > 0 OR array_length(missing_functions, 1) > 0 THEN
    RAISE WARNING '⚠️ Des éléments critiques sont manquants. Vérifiez les migrations.';
  ELSE
    RAISE NOTICE '✅ Vérification terminée avec succès !';
    RAISE NOTICE '   Tous les éléments critiques sont présents.';
  END IF;
  
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
END $$;



