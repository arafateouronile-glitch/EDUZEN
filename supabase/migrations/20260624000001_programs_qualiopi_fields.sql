-- Ajout des champs obligatoires Qualiopi manquants sur la table programs
-- Indicateur 3 RNQ : prérequis
ALTER TABLE programs ADD COLUMN IF NOT EXISTS prerequisites text;
-- Indicateur 5 RNQ : méthodes pédagogiques distinctes du contenu
ALTER TABLE programs ADD COLUMN IF NOT EXISTS pedagogical_methods text;
-- Indicateur 1 RNQ : délai d'accès moyen (en jours ouvrés)
ALTER TABLE programs ADD COLUMN IF NOT EXISTS access_delay_days integer;
-- Indicateur 7 RNQ : accessibilité handicap (coordonnées référent + modalités)
ALTER TABLE programs ADD COLUMN IF NOT EXISTS accessibility_info text;
