-- Migration: Ajoute un champ "mentions libres" sur les factures/devis
-- Date: 2026-07-31
--
-- Champ dédié (distinct de invoices.notes, qui sert aussi en interne à
-- stocker automatiquement la référence du devis d'origine lors d'une
-- conversion devis→facture) : texte libre saisi par l'utilisateur à la
-- création, destiné à apparaître tel quel sur le PDF généré (via la
-- variable de template {mentions_libres}).

ALTER TABLE invoices ADD COLUMN IF NOT EXISTS mentions_libres text;

COMMENT ON COLUMN invoices.mentions_libres IS
  'Texte libre saisi à la création de la facture/du devis, affiché sur le PDF via la variable de template {mentions_libres}.';
