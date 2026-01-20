# Guide : Créer votre premier Super Admin

## 🔍 Diagnostic

Si vous obtenez "No rows returned" avec les scripts de vérification, cela signifie que :
- ❌ Aucun utilisateur n'existe dans `auth.users`
- ❌ Aucun super admin n'a été créé

## ✅ Solution : Créer un compte d'abord

### Étape 1 : Créer un compte utilisateur

Vous devez **d'abord vous inscrire** dans votre application EDUZEN :

1. Ouvrez votre application (en local ou en production)
2. Allez sur la page d'inscription/connexion
3. Créez un compte avec votre email : `arafateouronile@gmail.com`
4. Connectez-vous avec ce compte

### Étape 2 : Vérifier que le compte existe

Une fois inscrit, exécutez cette requête dans le SQL Editor :

```sql
SELECT id, email, created_at 
FROM auth.users 
ORDER BY created_at DESC 
LIMIT 5;
```

Vous devriez voir votre compte avec votre email.

### Étape 3 : Créer le super admin

Une fois que vous voyez votre compte dans la liste, utilisez l'une de ces méthodes :

#### Méthode A : Par email (si votre email existe maintenant)

```sql
SELECT create_super_admin(p_user_email := 'arafateouronile@gmail.com');
```

#### Méthode B : Par user_id (plus fiable)

1. Copiez votre `user_id` de la requête de l'étape 2
2. Exécutez :

```sql
SELECT create_super_admin(p_user_id := 'VOTRE_USER_ID_ICI');
```

### Étape 4 : Vérifier la création

```sql
SELECT 
  pa.id,
  u.email,
  pa.role,
  pa.is_active
FROM platform_admins pa
JOIN auth.users u ON u.id = pa.user_id
WHERE pa.role = 'super_admin';
```

## 🚀 Script tout-en-un (après inscription)

Une fois que vous êtes inscrit, exécutez ce script :

```sql
-- 1. Voir votre compte
SELECT id, email FROM auth.users WHERE email = 'arafateouronile@gmail.com';

-- 2. Créer le super admin (remplacez l'ID)
SELECT create_super_admin(p_user_id := 'ID_COPIE_CI_DESSUS');
```

## ⚠️ Important

- Vous **devez** avoir un compte dans l'application avant de créer un super admin
- Le compte doit exister dans `auth.users` (créé automatiquement lors de l'inscription)
- Si vous êtes déjà connecté, votre compte existe probablement déjà

## 🔧 Si vous êtes déjà connecté

Si vous êtes déjà connecté à l'application mais que la requête ne retourne rien, vérifiez :

1. Que vous êtes bien connecté avec le bon compte
2. Que la base de données est la bonne (local vs production)
3. Exécutez le script de diagnostic : `diagnostic_complet.sql`
