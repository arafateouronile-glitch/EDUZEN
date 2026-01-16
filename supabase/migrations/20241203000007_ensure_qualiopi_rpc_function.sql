-- Migration pour s'assurer que la fonction RPC calculate_qualiopi_compliance_rate existe
-- Cette migration garantit que la fonction est créée même si elle n'existe pas encore

-- Fonction améliorée pour calculer le taux de conformité global
-- Utilise la moyenne pondérée des compliance_rate de chaque indicateur
CREATE OR REPLACE FUNCTION public.calculate_qualiopi_compliance_rate(org_id UUID)
RETURNS DECIMAL(5, 2) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  total_indicators INTEGER;
  avg_compliance_rate DECIMAL(5, 2);
BEGIN
  -- Compter le nombre total d'indicateurs
  SELECT COUNT(*)
  INTO total_indicators
  FROM public.qualiopi_indicators
  WHERE organization_id = org_id;

  -- Si aucun indicateur, retourner 0
  IF total_indicators = 0 THEN
    RETURN 0;
  END IF;

  -- Calculer la moyenne des compliance_rate de tous les indicateurs
  SELECT COALESCE(AVG(compliance_rate), 0)
  INTO avg_compliance_rate
  FROM public.qualiopi_indicators
  WHERE organization_id = org_id;

  -- Retourner le taux arrondi à 2 décimales
  RETURN ROUND(avg_compliance_rate, 2);
END;
$$;

-- Commentaire sur la fonction
COMMENT ON FUNCTION public.calculate_qualiopi_compliance_rate(UUID) IS 
'Calcule le taux de conformité Qualiopi global pour une organisation en faisant la moyenne des compliance_rate de tous les indicateurs';

-- Donner les permissions nécessaires
GRANT EXECUTE ON FUNCTION public.calculate_qualiopi_compliance_rate(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_qualiopi_compliance_rate(UUID) TO anon;













