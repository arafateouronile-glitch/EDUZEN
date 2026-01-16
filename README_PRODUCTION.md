# 🚀 Guide de Déploiement Production

Ce guide détaille les étapes pour déployer EDUZEN en production.

---

## 📋 Prérequis

- [ ] Compte Vercel
- [ ] Projet Supabase production
- [ ] Compte Sentry
- [ ] Domaine personnalisé (optionnel)
- [ ] Accès GitHub Actions

---

## 🔧 Configuration Rapide

### 1. Vercel

```bash
# Installer Vercel CLI
npm i -g vercel

# Se connecter
vercel login

# Déployer
vercel --prod
```

### 2. Variables d'Environnement

Configurer dans Vercel Dashboard :

```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx
NEXT_PUBLIC_APP_URL=https://votre-domaine.com
SENTRY_DSN=xxx
NODE_ENV=production
```

### 3. Supabase Production

```bash
# Appliquer migrations
supabase db push --db-url $PRODUCTION_DATABASE_URL

# Vérifier RLS
npm run verify-rls-production
```

---

## 📚 Documentation Complète

Voir `PRODUCTION_LAUNCH_PLAN.md` pour le plan détaillé.

---

## ✅ Checklist Avant GO LIVE

- [ ] Tous les tests passent
- [ ] Variables d'environnement configurées
- [ ] Migrations appliquées
- [ ] RLS vérifié
- [ ] Monitoring actif
- [ ] Backups configurés
- [ ] Documentation à jour

---

## 🆘 Support

En cas de problème, consulter :
- `docs/operations/` - Guides opérationnels
- `PRODUCTION_LAUNCH_PLAN.md` - Plan complet
