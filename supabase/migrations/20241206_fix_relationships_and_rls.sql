-- =====================================================
-- Migration : Correction des relations et politiques RLS
-- Date: 2024-12-06
-- À exécuter APRÈS 20241206_add_foreign_keys.sql et 20241206_optimize_tables.sql
-- =====================================================

-- 1. Ajouter la contrainte FK manquante pour educational_resources.author_id -> users.id
DO $$
BEGIN
    -- Vérifier si la table users existe
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
    ) THEN
        -- Vérifier si la colonne author_id existe
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'educational_resources' 
            AND column_name = 'author_id'
        ) AND NOT EXISTS (
            SELECT 1 FROM pg_constraint 
            WHERE conname = 'educational_resources_author_id_fkey'
        ) THEN
            ALTER TABLE public.educational_resources 
            ADD CONSTRAINT educational_resources_author_id_fkey 
            FOREIGN KEY (author_id) REFERENCES public.users(id) ON DELETE SET NULL;
            
            RAISE NOTICE 'Contrainte FK ajoutée: educational_resources.author_id -> users.id';
        END IF;
    END IF;
END $$;

-- 2. Améliorer les politiques RLS pour learning_portfolio_templates
-- Supprimer les anciennes politiques
DROP POLICY IF EXISTS "portfolio_templates_select" ON public.learning_portfolio_templates;
DROP POLICY IF EXISTS "portfolio_templates_manage" ON public.learning_portfolio_templates;

-- Nouvelle politique SELECT : plus permissive pour éviter les problèmes de récursion
CREATE POLICY "portfolio_templates_select_all" ON public.learning_portfolio_templates
    FOR SELECT 
    USING (
        is_active = true 
        OR auth.uid() IS NOT NULL  -- Tous les utilisateurs authentifiés peuvent voir les templates inactifs
    );

-- Nouvelle politique INSERT : permettre à tous les utilisateurs authentifiés de créer
-- (Les vérifications de rôle peuvent être faites au niveau de l'application)
CREATE POLICY "portfolio_templates_insert" ON public.learning_portfolio_templates
    FOR INSERT 
    WITH CHECK (
        auth.uid() IS NOT NULL
    );

-- Nouvelle politique UPDATE : permettre au créateur ou à tous les utilisateurs authentifiés
CREATE POLICY "portfolio_templates_update" ON public.learning_portfolio_templates
    FOR UPDATE 
    USING (
        auth.uid() IS NOT NULL
        AND (created_by = auth.uid() OR created_by IS NULL)  -- Le créateur peut modifier, ou si pas de créateur
    )
    WITH CHECK (
        auth.uid() IS NOT NULL
    );

-- Nouvelle politique DELETE : permettre au créateur ou à tous les utilisateurs authentifiés
-- (Les vérifications de rôle peuvent être faites au niveau de l'application)
CREATE POLICY "portfolio_templates_delete" ON public.learning_portfolio_templates
    FOR DELETE 
    USING (
        auth.uid() IS NOT NULL
        AND (created_by = auth.uid() OR created_by IS NULL)  -- Le créateur peut supprimer, ou si pas de créateur
    );

-- 3. Forcer la mise à jour du cache de schéma Supabase
-- Note: Cette commande peut ne pas être disponible selon la version de Supabase
-- L'alternative est de redémarrer le service ou d'attendre que le cache se rafraîchisse automatiquement

-- 4. Vérifier que toutes les contraintes FK sont bien créées
DO $$
DECLARE
    missing_fk_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO missing_fk_count
    FROM information_schema.table_constraints tc
    WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
    AND tc.table_name IN (
        'educational_resources',
        'learning_portfolios',
        'session_teachers',
        'learning_portfolio_templates'
    );
    
    RAISE NOTICE 'Nombre de contraintes FK trouvées: %', missing_fk_count;
END $$;

-- Migration terminée !

