# Organisation des migrations

317 fichiers au 2026-07-12, du 2024-11-14 au 2026-07-12. Ce document sert de
carte pour naviguer dans l'historique — **aucun fichier n'a été déplacé,
renommé ni fusionné**. Une vraie consolidation (squash en quelques
migrations "baseline") a été envisagée mais mise de côté : elle demande un
dump de schéma réel (`pg_dump --schema-only`) pour remplacer l'effet cumulé
des anciennes migrations, plus une réconciliation de la table de suivi
`supabase_migrations.schema_migrations` déjà appliquée en prod — un chantier
à part, avec accès à la base, pas une opération de fichiers.

## Comment Supabase CLI applique ces fichiers

`supabase db push` / `supabase migration up` / `supabase db reset` trient
les fichiers de `supabase/migrations/` par ordre **lexicographique du nom
de fichier** et les rejouent dans cet ordre sur une base vierge. Deux
fichiers avec le même préfixe se départagent donc par ordre alphabétique du
reste du nom — pas par ordre de création réelle. C'est la source des deux
points d'attention ci-dessous.

## Répartition chronologique (préfixe AAAAMM)

| Période | Nombre de migrations |
|---|---|
| 2024-11 | 6 |
| 2024-12 | 77 |
| 2025-01 à 2025-11 | **0** — aucune migration pendant 11 mois (changements probablement faits hors migrations, ex: éditeur SQL Supabase directement — à garder en tête si le schéma prod diverge un jour des migrations trackées) |
| 2025-12 | 63 |
| 2026-01 | 75 |
| 2026-02 | 25 |
| 2026-03 | 19 |
| 2026-04 | 6 |
| 2026-05 | 4 |
| 2026-06 | 34 |
| 2026-07 | 8 |

## ⚠️ Point d'attention n°1 : le cluster RLS `users` du 2024-12-11

Six fichiers, tous datés `20241211` **sans horodatage précis** (pas de
`HHMMSS`), documentent des tentatives successives de corriger les policies
RLS de `users` :

```
20241211_fix_users_rls_final.sql
20241211_fix_users_rls_for_admins.sql
20241211_fix_users_rls_no_recursion.sql
20241211_fix_users_rls_simple.sql
20241211_fix_users_rls_simple_final.sql
20241211_fix_users_rls_working.sql
```

Leur ordre de création réel (quel correctif a été tenté après lequel) n'est
pas récupérable — ils ont été importés dans git en un seul commit
(2026-01-16), et le nom ne contient pas d'heure. **Sur une base vierge,
Supabase CLI les applique dans l'ordre alphabétique ci-dessus** (`final`
en premier, `working` en dernier), qui n'a aucune raison de correspondre à
l'ordre réel des tentatives en prod à l'époque. Résultat possible : la
policy RLS finale sur `users` d'un environnement rejoué de zéro peut
différer de celle réellement active en prod aujourd'hui.

**À faire avant tout squash ou tout `db reset` critique** : lire la policy
RLS réellement active sur `users` en prod (`pg_policies` via le dashboard
Supabase ou `\d+ users` en psql) plutôt que de faire confiance à l'ordre de
ces 6 fichiers.

## ⚠️ Point d'attention n°2 : horodatages en double

Six paires de fichiers partagent un préfixe de 14 chiffres identique (même
seconde). Comme ci-dessus, l'ordre entre les deux dépend de l'ordre
alphabétique du reste du nom, pas d'un ordre réel :

| Horodatage | Fichiers |
|---|---|
| `20241202000031` | `create_educational_resources` / `create_resource_library` |
| `20251218000002` | `sync_auth_users_to_public_users` / `sync_auth_users_to_public_users_manual` |
| `20251227000001` | `add_missing_indexes` / `add_theme_preference_to_users` |
| `20251227000004` | `create_ab_testing_system` / `create_notifications_system` |
| `20260620000007` | `program_categories` / `teacher_documents_expiry` |
| `20260620000011` | `add_attestation_defraiement_type` / `qualiopi_c1_access_delay` |

Ces paires touchent des tables/sujets différents (pas de conflit d'effet
apparent), contrairement au cluster `users` ci-dessus — risque plus faible,
mais à vérifier si l'une des deux migrations d'une paire dépend de l'autre.

## 15 fichiers hors format standard (`AAAAMMJJ_nom.sql`, sans heure)

En plus des 6 fichiers `20241211_fix_users_rls_*` déjà listés :

```
20241206_add_foreign_keys.sql
20241206_add_missing_tables.sql
20241206_complete_migration.sql
20241206_fix_relationships_and_rls.sql
20241206_learning_portfolio.sql
20241206_optimize_tables.sql
20241215_scheduled_notifications.sql
20260116_add_docx_storage_bucket.sql
20260116_add_docx_template_support.sql
```

Même remarque : l'ordre entre fichiers d'un même jour dépend de l'ordre
alphabétique, pas de l'heure réelle de création.

## 39 migrations correctives (fix/patch/hotfix dans le nom)

Marqueur d'itération, pas une liste d'anomalies à corriger — la plupart
sont des ajustements de policies RLS (13 sur `*_rls_*`), signe que RLS a
été le point le plus itéré du schéma. Utile pour savoir qu'un comportement
RLS sur une table donnée a pu changer plusieurs fois ; se référer au fichier
le plus récent pour une table donnée en cas de doute, ou vérifier l'état
réel via `pg_policies` en cas d'ambiguïté (cf. cluster `users` ci-dessus).

## Si un vrai squash est fait un jour

1. Générer un dump de schéma réel (`supabase db dump --schema-only` ou
   `pg_dump --schema-only`) depuis un environnement dont le schéma est
   confirmé à jour et conforme à la prod.
2. Remplacer les migrations antérieures à une date de coupure par ce dump
   comme migration "baseline" unique.
3. Réconcilier `supabase_migrations.schema_migrations` en prod (déjà
   marquée comme ayant appliqué les anciennes versions) pour qu'elle
   reconnaisse la nouvelle baseline sans tenter de la rejouer ni de
   rejouer les anciennes — `supabase migration repair` ou équivalent.
4. Tester la bascule sur un environnement de staging avant toute
   application prod.

Ce document n'a pas cette portée : c'est une carte de navigation, pas une
migration.
