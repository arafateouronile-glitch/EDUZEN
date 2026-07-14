-- expected_count représente l'effectif réel (nombre d'apprenants) d'une
-- entité inscrite à une session — utile même en facturation par groupe ou
-- par client, où l'effectif nominatif/numérique reste distinct de la
-- quantité utilisée pour le calcul du devis/de la facture (ex: nombre de
-- groupes facturés, qui peut être inférieur au nombre d'apprenants réels).
-- billing_quantity porte cette quantité de facturation, indépendante de
-- l'effectif, pour les modes qui en ont besoin (per_group, per_client,
-- per_hour). En mode per_student (ou non défini), la quantité facturée
-- reste égale à expected_count et billing_quantity n'est pas utilisé.

ALTER TABLE public.session_entity_reservations
  ADD COLUMN IF NOT EXISTS billing_quantity INTEGER CHECK (billing_quantity > 0);

COMMENT ON COLUMN public.session_entity_reservations.expected_count IS
  'Effectif réel : nombre d''apprenants de cette entité (saisi nominativement via student_entities et/ou en nombre ici), indépendant du mode de facturation';
COMMENT ON COLUMN public.session_entity_reservations.billing_quantity IS
  'Quantité utilisée pour le calcul du devis/de la facture quand elle diffère de l''effectif (ex: nombre de groupes en mode per_group, de clients en mode per_client, d''heures en mode per_hour). Non utilisé en mode per_student : la quantité facturée est alors expected_count.';
