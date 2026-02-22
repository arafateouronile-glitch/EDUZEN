# Accéder à l’espace Super Admin

L’espace **Super Admin** (administration de la plateforme EDUZEN) permet de gérer les abonnements, le blog, les codes promo, l’équipe plateforme, l’affiliation, etc.

## 1. URL d’accès

- **En local** : [http://localhost:3000/super-admin](http://localhost:3000/super-admin)
- **En production** : `https://votre-domaine.com/super-admin`

## 2. Qui peut y accéder ?

Seuls les **administrateurs plateforme** ont accès. Un administrateur plateforme est un utilisateur qui possède une entrée dans la table **`platform_admins`** avec :

- `user_id` = son identifiant utilisateur (auth)
- `role` = `super_admin` (ou un autre rôle plateforme : `content_admin`, `support_admin`, `finance_admin`)
- `is_active` = `true`

Ce n’est **pas** le rôle dans l’organisation (admin, teacher, etc.) qui donne l’accès, mais bien la table **`platform_admins`**.

## 3. Lien dans l’interface

Si votre compte est bien configuré comme admin plateforme :

- **Sidebar (desktop)** : un bouton **« Administration plateforme »** (icône bouclier) apparaît au-dessus de la section « Système » (Paramètres / Déconnexion). Cliquez dessus pour aller sur `/super-admin`.
- **Menu mobile** : le même lien **« Administration plateforme »** est affiché dans le pied du menu mobile.

Si vous ne voyez pas ce lien, votre compte n’a pas d’entrée active dans `platform_admins`.

## 4. Créer le premier Super Admin

Pour créer le premier (ou un nouveau) Super Admin, il faut ajouter une ligne dans la table **`platform_admins`** (via le SQL Editor Supabase ou une migration).

### 4.1 Récupérer l’ID utilisateur

1. Connectez-vous à l’app avec le compte qui doit devenir Super Admin.
2. Dans Supabase : **Authentication** → **Users** → repérez l’utilisateur et notez son **UUID** (`id`).
3. Ou exécutez en SQL :  
   `SELECT id, email FROM auth.users WHERE email = 'votre@email.com';`

### 4.2 Vérifier que la table existe

La table `platform_admins` doit exister (créée par une migration). Colonnes typiques : `id`, `user_id`, `role`, `is_active`, `permissions`, `created_at`, etc.

### 4.3 Insérer l’entrée

Dans **Supabase** → **SQL Editor** :

```sql
INSERT INTO platform_admins (user_id, role, is_active, permissions, created_at, updated_at)
VALUES (
  'UUID-DE-L-UTILISATEUR-ICI',  -- remplacer par l'id auth.users
  'super_admin',
  true,
  '{}'::jsonb,
  NOW(),
  NOW()
);
```

Adaptez le nom des colonnes si votre schéma diffère (ex. `permissions` peut être optionnel).

### 4.4 Vérifier le profil utilisateur (optionnel)

Certaines parties de l’app lisent aussi le rôle dans la table **profiles** (ou **users**). Pour que l’utilisateur soit cohérent partout, vous pouvez mettre à jour son rôle organisation à `super_admin` dans la table des profils, si votre schéma le prévoit. L’accès à **/super-admin** lui est donné uniquement par **`platform_admins`**.

## 5. Résumé

| Étape | Action |
|-------|--------|
| Accéder | Aller sur **/super-admin** ou cliquer sur **« Administration plateforme »** dans la sidebar (si visible). |
| Condition | Avoir une ligne dans **`platform_admins`** avec `user_id` = votre id, `role` = `super_admin`, `is_active` = true. |
| Premier Super Admin | Insérer une ligne dans **`platform_admins`** via Supabase SQL Editor (voir 4.3). |

En cas de **« Accès restreint »** ou redirection vers le dashboard, vérifiez que l’entrée dans `platform_admins` existe et que `is_active` est à `true`.
