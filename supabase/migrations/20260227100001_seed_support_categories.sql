-- Catégories de support par défaut pour chaque organisation existante

INSERT INTO public.support_categories (organization_id, name, description, order_index)
SELECT o.id, c.name, c.description, c.order_index
FROM public.organizations o
CROSS JOIN (VALUES
  ('Général', 'Demandes générales', 0),
  ('Technique', 'Problèmes techniques', 1),
  ('Facturation', 'Questions facturation', 2),
  ('Pédagogique', 'Suivi pédagogique', 3)
) AS c(name, description, order_index)
ON CONFLICT (organization_id, name) DO NOTHING;

-- Trigger : créer les mêmes catégories pour toute nouvelle organisation
CREATE OR REPLACE FUNCTION public.seed_support_categories_for_new_org()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.support_categories (organization_id, name, description, order_index)
  VALUES
    (NEW.id, 'Général', 'Demandes générales', 0),
    (NEW.id, 'Technique', 'Problèmes techniques', 1),
    (NEW.id, 'Facturation', 'Questions facturation', 2),
    (NEW.id, 'Pédagogique', 'Suivi pédagogique', 3)
  ON CONFLICT (organization_id, name) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_seed_support_categories_on_org ON public.organizations;
CREATE TRIGGER trigger_seed_support_categories_on_org
  AFTER INSERT ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.seed_support_categories_for_new_org();
