---
title: Connecteur Fulll
status: v1 — en attente d'onboarding partenaire
---

# Connecteur Fulll (compatibilité comptable)

Pousse les **factures et avoirs de vente** EDUZEN dans le dossier Fulll d'un client via
l'API `https://api.fulll.io` (`POST /accounting/v1/sales_invoice`), pour rendre vraie la
promesse « Compatibilité comptable Fulll — export structuré de vos factures et ventes ».

## État

- ✅ Code complet, testé contre mocks / fixtures.
- ⛔ **Bloqué pour la production** tant que l'onboarding partenaire Fulll n'est pas fait :
  les noms de champs du payload, le contrat du job d'import asynchrone et la représentation
  des avoirs (`TODO(fulll-docs)`) ne sont pas vérifiés contre la doc officielle (Stoplight,
  accès partenaire requis).

## Checklist onboarding partenaire

1. Contacter Fulll pour obtenir un **compte partenaire** + une **application OAuth2**.
2. Récupérer `client_id` / `client_secret`, enregistrer l'`redirect_uri` :
   `https://<domaine>/api/accounting/callback/fulll`.
3. Demander un **compte sandbox** (Fulll peut injecter des données de test).
4. Renseigner les variables d'environnement (voir ci-dessous).
5. Confirmer les `TODO(fulll-docs)` (section dédiée) contre la doc Stoplight.
6. Dérouler la checklist E2E sandbox.

## Variables d'environnement

| Variable | Rôle |
|---|---|
| `FULLL_API_BASE_URL` | Défaut `https://api.fulll.io` |
| `FULLL_CLIENT_ID` / `FULLL_CLIENT_SECRET` | Identifiants de l'app partenaire OAuth2 |
| `FULLL_OAUTH_REDIRECT_URI` | URL de callback enregistrée chez Fulll |
| `FULLL_WEBHOOK_SECRET` | Réservé (futur webhook de statut d'import). Non utilisé en v1. |
| `TEMPLATE_ENCRYPTION_KEY` | Déjà utilisée — sert aussi à chiffrer les jetons OAuth Fulll au repos |
| `CSRF_SECRET` / `NEXTAUTH_SECRET` | Déjà utilisées — signent le paramètre `state` OAuth |

Aucune variable par organisation : les jetons + la config vivent dans
`accounting_integrations` (`provider = 'fulll'`).

## Architecture

| Fichier | Rôle |
|---|---|
| `lib/services/accounting/fulll.adapter.ts` | Implémente `AccountingAdapter` : OAuth, `getCompanyInfo`, `syncInvoice` (soumission), `getImportJob` (réconciliation), phase 2 pour paiements/dépenses |
| `lib/services/accounting/fulll.client.ts` | Client HTTP : base URL, Bearer, retry 429/5xx, refresh sur 401, `transport` injectable |
| `lib/services/accounting/fulll.payload.ts` | Mapping `InvoiceData` → payload Fulll (`sales_invoice` et `entries`). **Seul endroit à retoucher quand les champs Fulll sont confirmés.** |
| `lib/services/accounting/fulll.errors.ts` | Taxonomie d'erreurs + `mapFulllError` |
| `lib/services/accounting/sale-lines.ts` | Ventilation 411/701/445 partagée avec l'export FEC |
| `lib/services/accounting/token-crypto.ts` | Chiffrement AES au repos des jetons (`enc:v1:`) |
| `lib/utils/oauth-state.ts` | `state` OAuth signé (HMAC) |
| `app/api/accounting/authenticate/[provider]/route.ts` | Démarre OAuth → `{ auth_url }` |
| `app/api/accounting/callback/[provider]/route.ts` | Fin OAuth → échange tokens → redirection |
| `app/api/accounting/sync/route.ts` | `POST` envoi (range/single) · `GET` statut + réconciliation |
| `app/api/cron/fulll-sync/route.ts` | Synchro nocturne (orgs `auto_sync`) — `vercel.json` `0 2 * * *` |
| `app/(dashboard)/dashboard/settings/fulll/page.tsx` | Réglages : connexion, mapping, envoi manuel, historique |
| `components/accounting/fulll-invoice-action.tsx` | Bouton + badge par facture (`/dashboard/payments/[id]`) |

## Correspondance des champs — EDUZEN → Fulll `sales_invoice`

| EDUZEN | Fulll (hypothèse) | `TODO(fulll-docs)` |
|---|---|---|
| `metadata.sales_journal_code` (`VT`) | `book` | nom du champ (`book`/`journal`/`book_code`) ; code ou id |
| `invoice.issue_date` | `date` | format (`YYYY-MM-DD` supposé) |
| `invoice.due_date` | `due_date` | nom du champ |
| `invoice.invoice_number` | `reference` | nom (`reference`/`document_number`/`piece`) ; contrainte d'unicité |
| ref tiers (n° apprenant / id entité tronqué) | `customer` (objet) | `customer` vs `customer_id` ; champ code (`code`/`reference`/`external_id`) ; création : champs requis, compte collectif parent |
| `invoice.currency` (`EUR`) | `currency` | code ISO vs id Fulll |
| `invoice.items[]` | `lines[]` | schéma de ligne ; `account` (701) requis par ligne ou dérivé |
| taux TVA effectif = `round(tax_amount / amount * 100)` | `vat_breakdown` en-tête | **critique** : TVA en-tête acceptée, ou taux par ligne obligatoire ? EDUZEN ne stocke pas de taux fiable par ligne |
| `amount` / `tax_amount` / `total_amount` | `total_excl_tax` / `total_tax` / `total_incl_tax` | noms ; Fulll recalcule-t-il et rejette-t-il sur écart ? arrondis |
| `document_type === 'credit_note'` | `type: 'credit_note'` | **critique** : `type` dédié, montants négatifs, ou endpoint séparé ? |
| `invoice.id` | `external_id` | Fulll déduplique-t-il sur une référence externe ? |
| dimensions analytiques | — | hors v1 |

Contrat asynchrone (`TODO(fulll-docs)`) : réponse de `POST /sales_invoice` (`202` + `{ job_id }` supposé),
path de suivi (`/accounting/v1/jobs/{id}` supposé), forme du statut, polling vs webhook.

## Idempotence & re-synchronisation

- Registre : `accounting_entity_mappings` `(integration_id, entity_type ∈ {invoice, credit_note}, local_entity_id = invoice.id)`.
- Une ligne est écrite pour **chaque** issue : `pending` (job soumis), `synced` (import confirmé), `error`.
- `synced` + pas de `force` → **ignoré** (aucun appel API).
- `pending` / `error` → **rejoué**.
- `synced` + `force` → **bloqué** (l'API `sales_invoice` est create-only) : message « corrigez dans Fulll ou émettez un avoir ».
- Facture modifiée après `synced` (`invoice.updated_at > mapping.last_synced_at`) → badge « modifié depuis l'export », pas de re-push automatique.

## Cas d'échec

Voir le plan (`/Users/arafatetoure/.claude/plans/curious-enchanting-deer.md`, section « Cas d'échec »).
Résumé : `FulllAuthError` → `is_active=false` + « Reconnexion requise » ; `FulllCollectiveAccountError`
(`ERROR_ACCOUNT_NUMBER_NOT_GOOD_SCOPE`) → configurer une stratégie de compte auxiliaire ;
`FulllServerError` / `429` → laissé `pending`, rejoué par le cron / le `GET` de statut.

## Checklist E2E sandbox

1. App partenaire + `client_id/secret` sandbox + `redirect_uri` == `FULLL_OAUTH_REDIRECT_URI`.
2. Réglages → Fulll → « Connecter » → consentement Fulll → retour `?connected=1` ;
   `accounting_integrations` `is_active=true`, jetons stockés en `enc:v1:…`.
3. Config : journal `VT`, collectif + auxiliaire, `701000`, TVA `{ '20': '445710' }`, dossier.
4. Facture EUR 20 % → « Envoyer vers Fulll » → badge « en cours » → après réconciliation « exporté » ;
   vérifier dans Fulll : journal, `PieceRef`, HT/TVA/TTC, compte tiers.
5. Avoir → signe / représentation correcte dans Fulll.
6. Renvoyer la même facture → `skipped`, pas de doublon.
7. Provoquer l'erreur compte collectif → badge « échec » + message ; corriger la config → renvoyer → OK.
8. Facture multi-devises ; facture 0 % TVA (pas de ligne TVA).
9. Envoi par période (10+ docs dont un avoir) → `accounting_sync_logs` `success` / `partial`, compteurs corrects.
10. Révoquer le jeton dans Fulll → synchro suivante → état « Déconnecté », pas de crash.
11. `GET /api/cron/fulll-sync` avec `Authorization: Bearer <CRON_SECRET>` → récupère les `pending` + nouveaux docs.

## Hors périmètre v1

Achats / dépenses ; push des paiements (journal `BQ`) ; mode `entries` avec UI (câblé, expérimental) ;
multi-dossier par org ; dimensions analytiques ; auto-création du plan de comptes ; webhook entrant
Fulll → EDUZEN ; mise à jour / annulation d'un document déjà `synced`.
