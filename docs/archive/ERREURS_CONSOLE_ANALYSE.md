# Analyse des Erreurs Console - 23 Janvier 2026

## 🔍 Erreurs Identifiées

### 1. ❌ Erreur SIRENE API (500)
**Erreur**: `GET http://localhost:3001/api/sirene/search?siret=81508143500035 500 (Internal Server Error)`

**Cause Possible**:
- Clé API SIRENE manquante ou invalide dans les variables d'environnement
- Erreur de formatage des données de l'API INSEE
- Problème de parsing de la réponse JSON

**Solution**:
1. Vérifier que `SIRENE_API_KEY` est configurée dans `.env`:
   ```bash
   SIRENE_API_KEY=votre_cle_api_insee
   ```

2. Vérifier que la clé API est valide sur https://api.insee.fr/

3. Améliorer la gestion d'erreur dans `app/api/sirene/search/route.ts` pour logger plus de détails

**Fichier concerné**: `app/api/sirene/search/route.ts`

---

### 2. ❌ Erreur Storage "Bucket not found" (400)
**Erreur**: `StorageApiError: Bucket not found` lors de l'upload de logo

**Cause**: Le bucket Supabase Storage `organizations` n'existe pas

**Solution**:
1. Créer le bucket dans Supabase Dashboard:
   - Aller dans **Storage** > **Buckets**
   - Cliquer sur **New bucket**
   - Nom: `organizations`
   - Public: `false` (privé)
   - File size limit: `5 MB` (ou selon vos besoins)
   - Allowed MIME types: `image/*`

2. Configurer les politiques RLS pour le bucket:
   ```sql
   -- Permettre aux utilisateurs authentifiés d'uploader dans leur organisation
   CREATE POLICY "Users can upload to their organization folder"
   ON storage.objects FOR INSERT
   TO authenticated
   WITH CHECK (
     bucket_id = 'organizations' AND
     (storage.foldername(name))[1] = auth.jwt() ->> 'organization_id'
   );

   -- Permettre aux utilisateurs authentifiés de lire les fichiers de leur organisation
   CREATE POLICY "Users can read their organization files"
   ON storage.objects FOR SELECT
   TO authenticated
   USING (
     bucket_id = 'organizations' AND
     (storage.foldername(name))[1] = auth.jwt() ->> 'organization_id'
   );
   ```

**Fichier concerné**: `app/(dashboard)/dashboard/onboarding/components/organization-setup-wizard.tsx` (ligne 142)

---

### 3. ❌ Erreur RPC `get_unread_notifications_count` (400)
**Erreur**: `POST https://ocdlaouymksskmmhmzdr.supabase.co/rest/v1/rpc/get_unread_notifications_count 400 (Bad Request)`

**Cause Possible**:
- La fonction RPC n'existe pas ou a été modifiée
- Problème avec les paramètres passés
- Problème de permissions RLS

**Solution**:
1. Vérifier que la fonction existe dans Supabase:
   ```sql
   SELECT proname, proargtypes 
   FROM pg_proc 
   WHERE proname = 'get_unread_notifications_count';
   ```

2. Vérifier la signature de la fonction dans les migrations:
   - `supabase/migrations/20251227000006_fix_get_unread_notifications_count.sql`
   - La fonction ne devrait pas prendre de paramètres (utilise `auth.uid()`)

3. Vérifier que la fonction est appelée correctement dans le code:
   ```typescript
   // Correct (sans paramètres)
   const { data, error } = await supabase.rpc('get_unread_notifications_count')
   
   // Incorrect (avec paramètres)
   const { data, error } = await supabase.rpc('get_unread_notifications_count', { user_id: ... })
   ```

**Fichiers concernés**:
- `supabase/migrations/20251227000006_fix_get_unread_notifications_count.sql`
- Code qui appelle cette fonction (à rechercher dans le codebase)

---

## 🛠️ Actions Correctives Recommandées

### Priorité 1: Créer le bucket Storage
**Impact**: Bloque l'upload de logos d'organisations

**Étapes**:
1. Se connecter à Supabase Dashboard
2. Aller dans **Storage** > **Buckets**
3. Créer le bucket `organizations`
4. Configurer les politiques RLS

### Priorité 2: Vérifier la clé API SIRENE
**Impact**: Bloque la recherche d'entreprises par SIRET/SIREN

**Étapes**:
1. Vérifier `.env` pour `SIRENE_API_KEY`
2. Si manquante, obtenir une clé sur https://api.insee.fr/
3. Ajouter la clé dans `.env` et redémarrer le serveur

### Priorité 3: Vérifier la fonction RPC
**Impact**: Bloque l'affichage du nombre de notifications non lues

**Étapes**:
1. Vérifier que la fonction existe dans Supabase
2. Vérifier comment elle est appelée dans le code
3. Corriger l'appel si nécessaire

---

## 📝 Notes

- Ces erreurs ne sont **pas critiques** pour le fonctionnement général de l'application
- Elles affectent des fonctionnalités spécifiques (recherche SIRENE, upload logo, notifications)
- L'application devrait continuer à fonctionner malgré ces erreurs

---

## 🔗 Liens Utiles

- [Documentation Supabase Storage](https://supabase.com/docs/guides/storage)
- [API SIRENE INSEE](https://api.insee.fr/)
- [Documentation Supabase RPC](https://supabase.com/docs/guides/database/functions)

---

---

## ✅ Corrections Appliquées

### 1. ✅ Erreur RPC `get_unread_notifications_count` (400) - CORRIGÉ
**Correction**: Suppression de l'objet vide `{}` dans l'appel RPC
- **Fichier modifié**: `lib/services/notification.service.ts`
- **Changement**: `supabase.rpc('get_unread_notifications_count', {})` → `supabase.rpc('get_unread_notifications_count')`
- **Note**: Si l'erreur persiste, vérifier que la migration `20251227000006_fix_get_unread_notifications_count.sql` a été appliquée dans Supabase

### 2. ✅ Erreur qualiopi_indicators 403 (Forbidden) - MIGRATION CRÉÉE
**Correction**: Migration créée pour ajouter les politiques RLS manquantes
- **Fichier créé**: `supabase/migrations/20260123000004_fix_qualiopi_indicators_rls.sql`
- **Actions requises**: Appliquer la migration dans Supabase Dashboard ou via `supabase migration up`
- **Politiques ajoutées**:
  - INSERT : Utilisateurs authentifiés peuvent insérer pour leur organisation
  - UPDATE : Utilisateurs authentifiés peuvent mettre à jour pour leur organisation
  - DELETE : Seuls les admins peuvent supprimer

---

**Date**: 23 Janvier 2026  
**Statut**: Erreurs identifiées, solutions proposées et corrections appliquées
