-- Ajoute à session_entity_reservations les mêmes champs de facturation/financement
-- que ceux disponibles pour une inscription individuelle (enrollments), plus un mode
-- de facturation spécifique aux entités (l'entreprise n'ayant pas d'apprenants nommés).

ALTER TABLE public.session_entity_reservations
  ADD COLUMN IF NOT EXISTS billing_mode TEXT
    CHECK (billing_mode IN ('per_client', 'per_group', 'per_student', 'per_hour')),
  ADD COLUMN IF NOT EXISTS enrollment_date DATE DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'confirmed')),
  ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (payment_status IN ('pending', 'partial', 'paid')),
  ADD COLUMN IF NOT EXISTS total_amount NUMERIC(10, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS paid_amount NUMERIC(10, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS funding_type_id UUID REFERENCES public.funding_types(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.session_entity_reservations.billing_mode IS
  'Mode de facturation : per_client (facture unique entreprise), per_group (tarif de groupe), per_student (prix x effectif), per_hour (tarif horaire)';
