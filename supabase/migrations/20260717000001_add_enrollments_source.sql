-- Trace l'origine d'une inscription (formulaire d'inscription public, catalogue
-- public, saisie manuelle...) — nécessaire pour que le bloc "Candidats du
-- catalogue public" d'une session puisse aussi afficher les candidats venus du
-- formulaire d'inscription (/s/[slug]/[token]), qui écrit directement dans
-- enrollments/students sans jamais passer par public_enrollments.
ALTER TABLE enrollments ADD COLUMN IF NOT EXISTS source text;

COMMENT ON COLUMN enrollments.source IS 'Origine de l''inscription : enrollment_form (formulaire public /s/...), null = saisie manuelle par un membre de l''organisation';
