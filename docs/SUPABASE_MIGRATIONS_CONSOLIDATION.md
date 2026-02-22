# Consolidation des migrations Supabase

Ce document décrit comment consolider les nombreuses migrations Supabase (squash) **sans casser** les environnements existants (production, staging).

## Pourquoi consolider ?

- **236+ migrations** : historique lourd, temps de migration long sur nouveau projet
- Réduire la surface d’erreurs (dépendances entre migrations, ordre)
- Faciliter les nouveaux clones / CI

## Principe (sans toucher à la prod actuelle)

1. **Ne pas réécrire l’historique** des migrations déjà appliquées en production.
2. **Option A – Nouveaux projets uniquement**  
   Créer une migration “bootstrap” unique (squash du schéma actuel) à utiliser **uniquement** pour les nouveaux projets ou les environnements from-scratch. L’appli actuelle continue d’appliquer les 236 migrations dans l’ordre.
3. **Option B – Réset local uniquement**  
   Sur un clone local / staging, appliquer uniquement la migration consolidée après un `supabase db reset`, puis repartir des migrations normales pour les futurs changements.

## Étapes recommandées

### 1. Dump du schéma actuel (référence)

```bash
# Avec Supabase CLI, depuis le projet lié
supabase db dump -f schema_reference.sql
```

Conserver `schema_reference.sql` comme référence du schéma “complet” actuel.

### 2. Créer une migration “bootstrap” (optionnel)

- Créer une nouvelle migration (ex. `YYYYMMDD_bootstrap_full_schema.sql`) qui contient le contenu du dump (tables, RLS, policies, functions, triggers).
- **Ne pas** remplacer ni supprimer les anciennes migrations si la prod les a déjà exécutées.

### 3. Utilisation

- **Production / staging existants** : ne pas appliquer la bootstrap ; continuer avec les migrations existantes.
- **Nouveau projet / CI from-scratch** : soit appliquer toutes les migrations dans l’ordre, soit (si vous avez un flow dédié) appliquer uniquement la bootstrap puis les migrations **post-bootstrap** (numérotées après la date de la bootstrap).

### 4. RLS et policies

Les policies RLS sont déjà dans les migrations. Lors du dump, vérifier que `schema_reference.sql` inclut bien :

- `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`
- Toutes les `CREATE POLICY`

### 5. Risques à éviter

- **Ne pas** modifier le contenu des migrations déjà appliquées en prod (checksums Supabase).
- **Ne pas** supprimer de migrations déjà exécutées.
- Tester la bootstrap sur un projet de test (nouveau `supabase init` + `supabase start` + appliquer uniquement la bootstrap) avant de s’en servir en CI.

## Résumé

| Contexte              | Action                                      |
|-----------------------|---------------------------------------------|
| Prod / staging actuel | Garder et appliquer les 236 migrations      |
| Nouveau projet        | Soit 236 migrations, soit 1 bootstrap + nouvelles |
| CI from-scratch       | Idem nouveau projet                         |

La consolidation est **optionnelle** et à utiliser pour alléger les nouveaux environnements ; elle ne remplace pas la prudence sur l’historique déjà en production.
