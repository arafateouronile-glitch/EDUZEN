-- Migration pour créer le système de gestion des entreprises/organismes externes
-- et leur rattachement aux apprenants

-- 1. Table pour les entités externes (entreprises, organismes, etc.)
CREATE TABLE IF NOT EXISTS public.external_entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  -- Informations de base
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('company', 'organization', 'institution', 'partner', 'other')),
  code VARCHAR(100), -- Code unique optionnel
  
  -- Informations de contact
  email VARCHAR(255),
  phone VARCHAR(50),
  address TEXT,
  city VARCHAR(100),
  postal_code VARCHAR(20),
  country VARCHAR(100) DEFAULT 'France',
  
  -- Informations légales
  siret VARCHAR(14), -- Numéro SIRET (14 chiffres)
  siren VARCHAR(9), -- Numéro SIREN (9 chiffres)
  vat_number VARCHAR(50), -- Numéro TVA intracommunautaire
  legal_form VARCHAR(100), -- Forme juridique (SARL, SA, etc.)
  
  -- Informations complémentaires
  website VARCHAR(255),
  description TEXT,
  activity_sector VARCHAR(255), -- Secteur d'activité
  employee_count VARCHAR(50), -- Nombre d'employés (ex: "1-10", "11-50", etc.)
  
  -- Métadonnées
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Statut
  is_active BOOLEAN DEFAULT true,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  
  -- Contraintes
  CONSTRAINT external_entities_org_name_unique UNIQUE (organization_id, name)
);

-- 2. Table de liaison entre apprenants et entités externes
CREATE TABLE IF NOT EXISTS public.student_entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  entity_id UUID NOT NULL REFERENCES public.external_entities(id) ON DELETE CASCADE,
  
  -- Type de rattachement
  relationship_type VARCHAR(50) NOT NULL DEFAULT 'apprenticeship' 
    CHECK (relationship_type IN ('apprenticeship', 'internship', 'employment', 'partnership', 'sponsorship', 'other')),
  
  -- Dates
  start_date DATE,
  end_date DATE,
  is_current BOOLEAN DEFAULT true, -- Rattachement actif
  
  -- Informations complémentaires
  position VARCHAR(255), -- Poste/fonction de l'apprenant
  department VARCHAR(255), -- Département/service
  tutor_name VARCHAR(255), -- Nom du tuteur en entreprise
  tutor_email VARCHAR(255), -- Email du tuteur
  tutor_phone VARCHAR(50), -- Téléphone du tuteur
  
  -- Notes et métadonnées
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  
  -- Contrainte : un apprenant ne peut avoir qu'un seul rattachement actif du même type à la fois
  CONSTRAINT student_entities_unique_active UNIQUE (student_id, entity_id, relationship_type, is_current) 
    DEFERRABLE INITIALLY DEFERRED
);

-- 3. Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_external_entities_organization ON public.external_entities(organization_id);
CREATE INDEX IF NOT EXISTS idx_external_entities_type ON public.external_entities(type);
CREATE INDEX IF NOT EXISTS idx_external_entities_active ON public.external_entities(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_external_entities_siret ON public.external_entities(siret) WHERE siret IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_student_entities_student ON public.student_entities(student_id);
CREATE INDEX IF NOT EXISTS idx_student_entities_entity ON public.student_entities(entity_id);
CREATE INDEX IF NOT EXISTS idx_student_entities_current ON public.student_entities(is_current) WHERE is_current = true;
CREATE INDEX IF NOT EXISTS idx_student_entities_type ON public.student_entities(relationship_type);

-- 4. Trigger pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_external_entities_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_external_entities_timestamp
  BEFORE UPDATE ON public.external_entities
  FOR EACH ROW
  EXECUTE FUNCTION update_external_entities_updated_at();

CREATE OR REPLACE FUNCTION update_student_entities_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_student_entities_timestamp
  BEFORE UPDATE ON public.student_entities
  FOR EACH ROW
  EXECUTE FUNCTION update_student_entities_updated_at();

-- 5. Fonction pour désactiver automatiquement les anciens rattachements
CREATE OR REPLACE FUNCTION deactivate_old_student_entities()
RETURNS TRIGGER AS $$
BEGIN
  -- Si on active un nouveau rattachement, désactiver les autres du même type
  IF NEW.is_current = true AND NEW.relationship_type IS NOT NULL THEN
    UPDATE public.student_entities
    SET is_current = false
    WHERE student_id = NEW.student_id
      AND relationship_type = NEW.relationship_type
      AND id != NEW.id
      AND is_current = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER deactivate_old_entities
  BEFORE INSERT OR UPDATE ON public.student_entities
  FOR EACH ROW
  WHEN (NEW.is_current = true)
  EXECUTE FUNCTION deactivate_old_student_entities();

-- 6. RLS Policies pour external_entities
ALTER TABLE public.external_entities ENABLE ROW LEVEL SECURITY;

-- Les utilisateurs peuvent voir les entités de leur organisation
DROP POLICY IF EXISTS "Users can view entities in their organization" ON public.external_entities;
CREATE POLICY "Users can view entities in their organization"
  ON public.external_entities
  FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
  );

-- Les admins peuvent gérer les entités de leur organisation
DROP POLICY IF EXISTS "Admins can manage entities in their organization" ON public.external_entities;
CREATE POLICY "Admins can manage entities in their organization"
  ON public.external_entities
  FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin', 'director')
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin', 'director')
    )
  );

-- 7. RLS Policies pour student_entities
ALTER TABLE public.student_entities ENABLE ROW LEVEL SECURITY;

-- Les utilisateurs peuvent voir les rattachements des apprenants de leur organisation
DROP POLICY IF EXISTS "Users can view student entities in their organization" ON public.student_entities;
CREATE POLICY "Users can view student entities in their organization"
  ON public.student_entities
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.students s
      INNER JOIN public.users u ON u.organization_id = s.organization_id
      WHERE s.id = student_entities.student_id
      AND u.id = auth.uid()
    )
  );

-- Les admins peuvent gérer les rattachements des apprenants de leur organisation
DROP POLICY IF EXISTS "Admins can manage student entities in their organization" ON public.student_entities;
CREATE POLICY "Admins can manage student entities in their organization"
  ON public.student_entities
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.students s
      INNER JOIN public.users u ON u.organization_id = s.organization_id
      WHERE s.id = student_entities.student_id
      AND u.id = auth.uid()
      AND u.role IN ('admin', 'super_admin', 'director')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.students s
      INNER JOIN public.users u ON u.organization_id = s.organization_id
      WHERE s.id = student_entities.student_id
      AND u.id = auth.uid()
      AND u.role IN ('admin', 'super_admin', 'director')
    )
  );

-- 8. Commentaires
COMMENT ON TABLE public.external_entities IS 'Entreprises, organismes et autres entités externes pouvant être rattachées aux apprenants';
COMMENT ON TABLE public.student_entities IS 'Rattachement des apprenants aux entités externes (entreprises, organismes, etc.)';
COMMENT ON COLUMN public.external_entities.type IS 'Type d''entité : company (entreprise), organization (organisme), institution (établissement), partner (partenaire), other (autre)';
COMMENT ON COLUMN public.student_entities.relationship_type IS 'Type de rattachement : apprenticeship (alternance), internship (stage), employment (emploi), partnership (partenariat), sponsorship (parrainage), other (autre)';
