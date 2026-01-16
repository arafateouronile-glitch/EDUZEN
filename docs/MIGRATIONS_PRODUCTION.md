# 🚀 Guide d'exécution des migrations Supabase en production

## Prérequis

1. **Supabase CLI installé**
   ```bash
   npm install -g supabase
   # ou
   brew install supabase/tap/supabase
   ```

2. **Projet Supabase production créé**
   - Connectez-vous à https://supabase.com
   - Créez ou utilisez un projet existant

3. **Variables d'environnement configurées**
   - `DATABASE_URL` ou `SUPABASE_DB_PASSWORD`
   - `NEXT_PUBLIC_SUPABASE_URL` (pour obtenir le project-ref)

## Méthode 1 : Via Supabase CLI (Recommandé)

### Étape 1 : Se connecter à Supabase CLI

```bash
supabase login
```

### Étape 2 : Lier le projet local au projet production

```bash
# Remplacez <project-ref> par votre project-ref Supabase
# Vous pouvez le trouver dans l'URL de votre projet : https://supabase.com/dashboard/project/<project-ref>
supabase link --project-ref <project-ref>
```

Vous serez invité à saisir :
- La clé API de votre projet (trouvable dans Settings > API > project API keys)

### Étape 3 : Pousser les migrations vers la production

```bash
# Vérifier l'état des migrations
supabase migration list

# Pousser toutes les migrations vers la production
supabase db push

# Ou pousser une migration spécifique
supabase migration up <migration-name>
```

### Étape 4 : Vérifier les migrations appliquées

```bash
# Lister les migrations appliquées en production
supabase migration list --db-url "postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"
```

## Méthode 2 : Via Dashboard Supabase

### Option A : SQL Editor

1. Connectez-vous au dashboard Supabase
2. Allez dans **SQL Editor**
3. Pour chaque fichier de migration dans `supabase/migrations/` :
   - Ouvrez le fichier `.sql`
   - Copiez le contenu
   - Collez dans l'éditeur SQL
   - Exécutez la requête

⚠️ **Attention** : Assurez-vous d'exécuter les migrations dans l'ordre chronologique (par nom de fichier).

### Option B : Migration via psql

```bash
# Se connecter à la base de données production
psql "postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"

# Exécuter une migration
\i supabase/migrations/20241114000001_add_program_fields.sql

# Ou exécuter toutes les migrations via script
for file in supabase/migrations/*.sql; do
  psql "postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres" -f "$file"
done
```

## Méthode 3 : Script automatisé

Créez un script `scripts/migrate-production.sh` :

```bash
#!/bin/bash

# Configuration
PROJECT_REF="your-project-ref"
DB_PASSWORD="your-database-password"
MIGRATIONS_DIR="supabase/migrations"

# Couleur pour les messages
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "🚀 Début des migrations en production..."

# Vérifier que Supabase CLI est installé
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}❌ Supabase CLI n'est pas installé${NC}"
    exit 1
fi

# Se connecter (si pas déjà connecté)
if ! supabase projects list &> /dev/null; then
    echo "🔐 Connexion à Supabase..."
    supabase login
fi

# Lier le projet
echo "🔗 Liaison du projet..."
supabase link --project-ref $PROJECT_REF

# Pousser les migrations
echo "📦 Poussage des migrations..."
if supabase db push; then
    echo -e "${GREEN}✅ Migrations appliquées avec succès${NC}"
else
    echo -e "${RED}❌ Erreur lors de l'application des migrations${NC}"
    exit 1
fi

echo "✅ Migration terminée !"
```

Rendez-le exécutable :
```bash
chmod +x scripts/migrate-production.sh
./scripts/migrate-production.sh
```

## Vérifications post-migration

### 1. Vérifier les tables créées

```sql
-- Dans SQL Editor de Supabase
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;
```

### 2. Vérifier les RLS policies

```sql
SELECT tablename, policyname, cmd, roles
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

### 3. Vérifier les fonctions RPC

```sql
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_type = 'FUNCTION'
ORDER BY routine_name;
```

### 4. Vérifier les buckets Storage

Dans le dashboard Supabase :
- Allez dans **Storage**
- Vérifiez que tous les buckets nécessaires sont créés :
  - `documents`
  - `messages`
  - `course-thumbnails`
  - `elearning-media`
  - `accessibility-documents`
  - etc.

## Ordre d'exécution recommandé

Les migrations sont généralement nommées avec des timestamps pour garantir l'ordre. Exécutez-les dans l'ordre :

1. ✅ Migrations de structure de base (tables, colonnes)
2. ✅ Migrations de relations (foreign keys)
3. ✅ Migrations de RLS policies
4. ✅ Migrations de fonctions RPC
5. ✅ Migrations de données initiales
6. ✅ Migrations de Storage buckets

## Rollback en cas d'erreur

Si une migration échoue :

1. **Identifier la migration problématique**
   ```bash
   supabase migration list
   ```

2. **Option 1 : Correction manuelle**
   - Corrigez le fichier SQL de migration
   - Réexécutez uniquement cette migration

3. **Option 2 : Rollback via SQL**
   - Dans SQL Editor, exécutez les commandes inverses de la migration
   - Réexécutez la migration corrigée

⚠️ **Important** : Testez toujours les migrations sur un environnement de staging avant la production !

## Commandes utiles

```bash
# Voir l'état des migrations
supabase migration list

# Créer une nouvelle migration
supabase migration new <migration-name>

# Vérifier les différences entre local et production
supabase db diff

# Reset complet (⚠️ DANGEREUX - uniquement en développement)
supabase db reset
```

## Support

En cas de problème :
1. Vérifiez les logs dans le dashboard Supabase > Logs
2. Consultez la documentation Supabase : https://supabase.com/docs/guides/cli
3. Vérifiez que toutes les dépendances (tables, fonctions) existent avant d'exécuter une migration


