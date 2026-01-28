# Déploiement Vercel - Instructions

Date: 27 janvier 2026

## ✅ Push Git Effectué

**Commit:** `420e89206`
**Branche:** `main`
**Message:** "fix: Correction des erreurs TypeScript et problèmes de build"

**Fichiers modifiés:** 630 fichiers
- Corrections TypeScript complètes
- Corrections des services (createClient côté serveur)
- Corrections Stripe (initialisation conditionnelle)
- Ajout type 'attestation' dans les configurations

## 🚀 Déploiement Vercel

### Option 1: Déploiement Automatique (Recommandé)

Vercel devrait **automatiquement** déclencher un build après le push sur `main`.

**Vérification:**
1. Allez sur https://vercel.com/dashboard
2. Sélectionnez votre projet EDUZEN
3. Vérifiez l'onglet "Deployments"
4. Un nouveau déploiement devrait apparaître automatiquement

### Option 2: Déploiement Manuel via CLI

Si Vercel CLI est installé :

```bash
# Installer Vercel CLI (si pas déjà installé)
npm i -g vercel

# Se connecter à Vercel
vercel login

# Déclencher un déploiement
vercel --prod
```

### Option 3: Déclencher via Dashboard Vercel

1. Allez sur https://vercel.com/dashboard
2. Sélectionnez votre projet
3. Cliquez sur "Deployments"
4. Cliquez sur "Redeploy" sur le dernier déploiement
5. Ou créez un nouveau déploiement depuis la branche `main`

## 📊 Statut du Build Local

- ✅ **Compilation:** Réussie (35.8s)
- ✅ **TypeScript:** 0 erreur
- ✅ **Build Next.js:** Fonctionnel

## 🔍 Vérifications Post-Déploiement

Après le déploiement sur Vercel, vérifier :

1. **Build réussi:**
   - Vérifier les logs de build sur Vercel
   - S'assurer qu'il n'y a pas d'erreurs

2. **Fonctionnalités:**
   - Tester les routes API corrigées
   - Vérifier les composants utilisant DocumentService
   - Tester les webhooks Stripe

3. **Variables d'environnement:**
   - Vérifier que `STRIPE_SECRET_KEY` est configuré
   - Vérifier que `SUPABASE_SERVICE_ROLE_KEY` est configuré
   - Vérifier toutes les variables nécessaires

## 📝 Notes

- Le build local compile avec succès
- Toutes les erreurs TypeScript critiques sont corrigées
- Les services utilisent maintenant correctement les clients Supabase (client/serveur)
- Stripe est initialisé de manière conditionnelle pour éviter les erreurs de build

## 🎯 Prochaines Étapes

1. Attendre le déploiement automatique Vercel
2. Vérifier les logs de build
3. Tester l'application déployée
4. Vérifier que toutes les fonctionnalités fonctionnent correctement
