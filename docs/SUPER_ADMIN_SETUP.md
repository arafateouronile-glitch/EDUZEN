# Guide de Configuration - Super Admin Premium

## 📋 Prérequis

- Migration SQL exécutée avec succès
- Compte utilisateur existant dans `auth.users` et `public.users`
- Accès au SQL Editor de Supabase

## 🚀 Étapes de Configuration

### 1. Exécuter la Migration

Si ce n'est pas déjà fait, exécutez la migration :

```bash
# Via Supabase CLI
supabase migration up

# Ou via le SQL Editor de Supabase
# Copiez-collez le contenu de :
# supabase/migrations/20260120000001_create_super_admin_module.sql
```

### 2. Créer le Premier Super Admin

#### Option A : Via le SQL Editor (Recommandé)

1. Ouvrez le SQL Editor dans Supabase Dashboard
2. Ouvrez le fichier : `supabase/scripts/create_first_super_admin.sql`
3. Remplacez `'VOTRE_EMAIL@example.com'` par votre email
4. Exécutez le script

#### Option B : Via la Fonction SQL

```sql
-- Créer un super admin par email
SELECT create_super_admin(p_user_email := 'votre-email@example.com');

-- Ou par user_id
SELECT create_super_admin(p_user_id := 'uuid-de-votre-utilisateur');
```

#### Option C : Via l'Interface (Après première connexion)

Une fois connecté en tant que super admin, vous pouvez inviter d'autres admins via :
`/super-admin/team`

### 3. Vérifier l'Accès

1. Connectez-vous à votre application avec le compte super admin
2. Naviguez vers `/super-admin`
3. Vous devriez voir le dashboard avec les KPIs

## 🔐 Rôles Disponibles

### Super Admin
- Accès complet à toutes les fonctionnalités
- Gestion des abonnements, factures, codes promo
- Gestion du blog et de l'équipe
- Accès aux métriques et revenus

### Content Admin
- Accès uniquement au module Blog
- Peut créer, modifier et publier des articles
- Peut modérer les commentaires
- Ne peut pas gérer les abonnements ou les revenus

### Support Admin
- Accès au dashboard (vue limitée)
- Peut modérer les commentaires
- Accès limité aux autres fonctionnalités

### Finance Admin
- Accès au dashboard et aux revenus
- Gestion des abonnements et factures
- Gestion des codes promo et références
- Pas d'accès au blog

## 📊 Fonctionnalités Disponibles

### Dashboard (`/super-admin`)
- KPIs : MRR, ARR, organisations actives, nouveaux abonnés
- Graphiques de revenus (7j, 30j, 90j, 12m)
- Distribution des abonnements
- Activité récente
- Actions rapides

### Abonnements (`/super-admin/subscriptions`)
- Liste de toutes les organisations
- Filtres par statut, plan, dates
- Recherche par nom d'organisation
- Détails d'abonnement (factures, historique)
- Export CSV

### Marketing (`/super-admin/marketing/promo-codes`)
- Création de codes promo
- Types : pourcentage, montant fixe, extension d'essai
- Limites d'utilisation (globale et par utilisateur)
- Suivi des utilisations
- Codes de parrainage

### Blog (`/super-admin/blog`)
- Éditeur de texte riche
- Catégories et tags
- SEO (meta-title, meta-description, slug auto)
- Planification de publication
- États : brouillon, en révision, programmé, publié, archivé
- Statistiques (vues, likes, partages)

### Équipe (`/super-admin/team`)
- Inviter des admins
- Gérer les rôles et permissions
- Révoquer l'accès
- Historique des activités

## 🛠️ Dépannage

### Erreur : "Accès restreint"
- Vérifiez que votre compte existe dans `platform_admins`
- Vérifiez que `is_active = true`
- Vérifiez que le rôle est correct

### Erreur : "Table does not exist"
- Vérifiez que la migration a été exécutée
- Vérifiez les logs de migration dans Supabase

### Erreur : "Permission denied"
- Vérifiez les politiques RLS dans Supabase
- Vérifiez que les fonctions helper (`is_super_admin`, etc.) existent

### Le dashboard ne charge pas
- Vérifiez la console du navigateur pour les erreurs
- Vérifiez que React Query est configuré
- Vérifiez les permissions RLS sur `platform_metrics_daily`

## 📝 Notes Importantes

1. **Sécurité** : Les politiques RLS sont strictes. Seuls les super admins peuvent gérer les abonnements et revenus.

2. **Données d'exemple** : Le dashboard utilise actuellement des données d'exemple. Pour les données réelles :
   - Configurez un job cron pour remplir `platform_metrics_daily`
   - Intégrez avec votre système de paiement (Stripe, etc.)

3. **Migration conditionnelle** : La migration vérifie l'existence des tables `organizations` et `users` avant d'ajouter les contraintes FK. Si ces tables n'existent pas, la migration créera les tables sans FK, puis les ajoutera plus tard.

## 🔗 Liens Utiles

- Migration : `supabase/migrations/20260120000001_create_super_admin_module.sql`
- Script de création : `supabase/scripts/create_first_super_admin.sql`
- Types TypeScript : `types/super-admin.types.ts`
- Hook : `lib/hooks/use-platform-admin.ts`

## ✅ Checklist de Vérification

- [ ] Migration exécutée sans erreur
- [ ] Premier super admin créé
- [ ] Connexion réussie en tant que super admin
- [ ] Dashboard accessible (`/super-admin`)
- [ ] Toutes les sections navigables
- [ ] Permissions testées (essayer avec un compte non-admin)
