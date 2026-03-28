-- Migration : Révoquer les GRANTs TO anon sur les fonctions sensibles
-- Sécurité : ces fonctions SECURITY DEFINER ne doivent pas être appelables sans authentification

-- create_user_for_organization : crée un utilisateur admin — accès anon interdit
REVOKE EXECUTE ON FUNCTION public.create_user_for_organization(UUID, TEXT, TEXT, UUID) FROM anon;

-- Fonctions BPF (données financières) — accès anon interdit
REVOKE EXECUTE ON FUNCTION public.get_bpf_stats(UUID, INTEGER) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_bpf_revenue_breakdown(UUID, INTEGER) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_bpf_student_breakdown(UUID, INTEGER) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_bpf_inconsistencies(UUID, INTEGER) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_bpf_drill_down(UUID, INTEGER, TEXT, INTEGER, INTEGER) FROM anon;

-- get_user_organization_id : désactive RLS temporairement — accès anon interdit
REVOKE EXECUTE ON FUNCTION public.get_user_organization_id() FROM anon;
