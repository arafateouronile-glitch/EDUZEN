# Application de la politique RLS pour les enseignants

## Problème
Les enseignants ne peuvent pas voir les apprenants des sessions où ils sont assignés car la politique RLS (Row Level Security) pour la table `enrollments` ne permet pas aux enseignants de voir les inscriptions.

## Solution
Une migration a été créée pour ajouter une politique RLS qui permet aux enseignants de voir les enrollments des sessions où ils sont assignés.

## Fichiers concernés
- Migration : `supabase/migrations/20260123000008_teachers_enrollments_rls.sql`
- Script manuel : `scripts/apply-teachers-enrollments-rls.sql`

## Application de la migration

### Option 1 : Via Supabase CLI (recommandé)
Si vous utilisez Supabase CLI, la migration sera appliquée automatiquement lors du prochain déploiement :
```bash
supabase db push
```

### Option 2 : Via SQL Editor de Supabase (manuelle)
1. Connectez-vous à votre projet Supabase
2. Allez dans **SQL Editor**
3. Exécutez le contenu du fichier `supabase/migrations/20260123000008_teachers_enrollments_rls.sql` ou `scripts/apply-teachers-enrollments-rls.sql`

### Option 3 : Via le script SQL
Exécutez le script `scripts/apply-teachers-enrollments-rls.sql` dans le SQL Editor de Supabase.

## Vérification

Pour vérifier que la politique a été créée, exécutez cette requête dans le SQL Editor :

```sql
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'enrollments'
  AND policyname = 'Teachers can view enrollments for their assigned sessions';
```

Vous devriez voir une ligne avec la politique créée.

## Test

Après avoir appliqué la migration :
1. Connectez-vous en tant qu'enseignant
2. Allez sur `/dashboard/my-students`
3. Vérifiez que les apprenants des sessions assignées s'affichent

## Logs de débogage

Si les apprenants ne s'affichent toujours pas, vérifiez les logs dans la console du navigateur :
- `MyStudentsPage - Sessions récupérées` : Vérifie que les sessions sont bien récupérées
- `MyStudentsPage - Récupération apprenants` : Vérifie que la récupération des enrollments est tentée
- `MyStudentsPage - Enrollments récupérés pour batch` : Vérifie que les enrollments sont récupérés
- `MyStudentsPage - Aucun apprenant trouvé` : Indique qu'aucun enrollment n'a été trouvé

Si vous voyez des erreurs 406 ou 403, cela peut indiquer que la politique RLS n'a pas été appliquée correctement.
