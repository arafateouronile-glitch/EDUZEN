-- Ajout de la colonne address_complement à la table students (optionnelle)
ALTER TABLE students ADD COLUMN IF NOT EXISTS address_complement text;
