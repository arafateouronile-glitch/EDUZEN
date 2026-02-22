# Affiliate Engine – Module Super Admin

## Vue d’ensemble

Module d’affiliation interne pour piloter l’écosystème de partenaires sans outil tiers : affiliés, campagnes, codes promos liés, tracking des clics/conversions, MRR et paiements.

## Schéma base de données (Supabase)

- **affiliates** : Profils partenaires, statut (pending, approved, banned), taux de commission personnalisé, IBAN/détails de paiement, campagne par défaut.
- **affiliate_campaigns** : Nom, type de commission (recurring / one_time), taux %, durée cookie (défaut 60 j).
- **affiliate_referrals** : Clics, signups, conversions ; `mrr_contribution` et `commission_amount` par conversion.
- **affiliate_commissions** : **Audit par facture Stripe** — une ligne par `invoice.paid` : `stripe_invoice_id`, `order_amount`, `commission_amount`, `commission_percent`, `status` (pending | paid | cancelled). Traçabilité totale ; en cas de remboursement (`charge.refunded`) le statut passe en `cancelled`.
- **affiliate_payouts** : Période, montant, statut (pending, approved, processing, paid), référence virement.
- **promo_codes.affiliate_id** : Lien optionnel d’un code promo à un affilié pour attribution.

## Interface Super Admin

- **Dashboard** (`/super-admin/affiliation`) : Total clics, conversions, taux de conversion, MRR affiliation, Top 10 partenaires, graphique Recharts.
- **Affiliés** : DataTable avec filtres (recherche, statut), création, changement de statut, **Générer Kit Marketing** (email avec lien, code promo, bannières, VSL).
- **Campagnes** : Création de campagnes (ex. « Consultants Qualiopi – 30 % à vie »), taux et cookie en jours.
- **Codes Promo** : Générateur de codes uniques liés à un affilié (attribution même sans lien).
- **Paiements** : Liste des commissions dues, approbation, export CSV pour virement SEPA groupé.
- **Aperçu Portail** : Prévisualisation de ce que l’affilié voit (lien, code, performances).

## Portail Affilié (vue partenaire)

- Route : `/dashboard/affiliate`. Accès si l'email du compte connecté correspond à un affilié approuvé.
- Sections : Performance, Boîte à outils (lien + code promo), graphique revenus 6 mois, tableau commissions, Kit Marketing, Coordonnées bancaires, Support Corner.
- API : `GET /api/affiliate/me`. Mise à jour IBAN : `lib/actions/affiliate-portal-actions.ts`. Lien sidebar « Espace Partenaire ». Variable : `NEXT_PUBLIC_AFFILIATE_CONTACT_EMAIL`.

## Logique métier

### Attribution (cookie 60 jours)

- L’utilisateur arrive avec `?ref=ID_AFFILIE` → le composant `AffiliateRefTracker` appelle `GET /api/affiliate/track?ref=ID`.
- L’API vérifie que l’affilié existe et est `approved`, enregistre un clic dans `affiliate_referrals` (type `click`) et pose un cookie **httpOnly** `eduzen_affiliate_ref` (60 jours).

### Lien affilié

- Format : `https://eduzen.fr?ref=ID_AFFILIE` (ou `NEXT_PUBLIC_APP_URL`).

### Attribution et calcul des commissions (automatisé)

Pour attribuer une conversion à l’affilié lors d’un nouvel abonnement :

1. **Création du checkout Stripe**  
   Lors de l’appel qui crée la session Stripe (ex. `create-checkout`), lire le cookie `eduzen_affiliate_ref` côté serveur (il est envoyé avec la requête) et le mettre dans les **metadata** de la session ou du customer, par ex. `metadata.affiliate_ref = ref`.

2. **Webhook Stripe (subscription créée / payée)**  
   Dans le handler qui traite `customer.subscription.created` ou `invoice.paid`, récupérer `metadata.affiliate_ref` (ou depuis la session de checkout), puis :
   - Insérer une ligne dans `affiliate_referrals` avec `type = 'conversion'`, `affiliate_id`, `organization_id`, `subscription_id`, `mrr_contribution` (MRR du plan), `commission_amount` (selon le taux de la campagne ou de l’affilié).
   - Optionnel : mettre à jour `converted_at`.

Le **calcul de la commission** peut être une fonction côté serveur (ou Supabase) qui applique le taux de la campagne (ou `commission_rate_override` de l’affilié) sur le MRR.

### Générer Kit Marketing

- Depuis la liste des affiliés (statut **Validé**), action **Générer Kit Marketing**.
- Envoi d’un email (Resend) à l’affilié avec : lien unique, code promo, liens vers bannières et VSL (configurables via `NEXT_PUBLIC_AFFILIATE_KIT_URL` et `NEXT_PUBLIC_AFFILIATE_VSL_URL`).

## Permissions

- Permission **manage_affiliates** (super_admin et finance_admin).
- RLS : toutes les tables affiliation sont en accès complet pour les utilisateurs pour lesquels `is_super_admin(auth.uid())` est vrai.

## Export SEPA (virement groupé)

- **Dashboard** : `/super-admin/affiliation/payouts` affiche les commissions en attente agrégées par affilié (total à payer, nombre de partenaires, alertes IBAN manquants).
- **Bouton « Générer Virement SEPA XML »** : génère un fichier **pain.001.001.03** (ISO 20022) à importer dans votre interface bancaire (Qonto, Revolut, BNP, etc.).
- **Variables d’environnement** (côté serveur) pour l’émetteur du virement :
  - `SEPA_DEBTOR_IBAN` : IBAN du compte EDUZEN qui débite les virements (obligatoire).
  - `SEPA_DEBTOR_BIC` : BIC de la banque (optionnel pour virements domestiques).
  - `SEPA_DEBTOR_NAME` : Nom du débiteur (défaut : EDUZEN).

## Fichiers principaux

- Migrations : `supabase/migrations/20260220000001_affiliate_engine.sql`, `20260220000002_affiliate_commissions.sql`
- Webhook Stripe : `app/api/webhooks/stripe/route.ts` (invoice.payment_succeeded → commission, charge.refunded → cancelled)
- Types : `types/super-admin.types.ts` (Affiliate, AffiliateCampaign, AffiliateReferral, AffiliatePayout, AffiliateCommission, etc.)
- Server Actions : `lib/actions/affiliate-actions.ts`
- API : `app/api/affiliate/track/route.ts`, `app/api/super-admin/affiliation/overview/route.ts`, `app/api/super-admin/affiliation/pending-commissions/route.ts`, `app/api/super-admin/affiliation/sepa-xml/route.ts`
- Composant : `components/super-admin/affiliation/affiliate-payouts-dashboard.tsx`
- Pages : `app/(super-admin)/super-admin/affiliation/*`
- Tracking : `components/affiliate-ref-tracker.tsx` (utilisé dans `app/providers.tsx`)
