# 📋 Checklist de Mise en Production - EDUZEN

## 🔴 PHASE 1 : Résolution des Blocages (URGENT)

### 1.1. Corriger les erreurs de compilation
- [ ] Corriger le fichier vide `app/api/sessions/active/route.ts`
- [ ] Corriger l'erreur Edge Runtime avec Supabase
- [ ] Vérifier tous les fichiers de routes API vides
- [ ] S'assurer que `npm run build` compile sans erreurs

**Commande de vérification :**
```bash
npm run build
```

### 1.2. Tests de base
- [ ] Vérifier que l'application démarre : `npm run dev`
- [ ] Tester la connexion Supabase
- [ ] Vérifier que les routes principales fonctionnent

---

## 🟠 PHASE 2 : Sécurité et Configuration

### 2.1. Variables d'environnement
- [ ] Créer `.env.production` avec toutes les variables nécessaires :
  ```
  NEXT_PUBLIC_SUPABASE_URL=
  NEXT_PUBLIC_SUPABASE_ANON_KEY=
  SUPABASE_SERVICE_ROLE_KEY=
  RESEND_API_KEY=
  NEXT_PUBLIC_APP_URL=
  NODE_ENV=production
  ```
- [ ] Vérifier que les clés API sont en production (pas de clés test)
- [ ] Configurer les secrets dans la plateforme de déploiement

### 2.2. Configuration Supabase Production
- [ ] Créer un projet Supabase production (ou utiliser celui existant)
- [ ] Exécuter toutes les migrations sur la base de production
- [ ] Configurer les Row Level Security (RLS) policies
- [ ] Vérifier les permissions utilisateur
- [ ] Configurer le storage pour les fichiers

**Commandes :**
```bash
# Exporter les migrations vers la production
supabase link --project-ref <project-ref>
supabase db push
```

### 2.3. Sécurité
- [ ] Activer HTTPS (automatique sur Vercel/Netlify)
- [ ] Vérifier les headers de sécurité dans `next.config.js`
- [ ] Configurer CSP (Content Security Policy) si nécessaire
- [ ] Activer rate limiting sur les API routes critiques
- [ ] Vérifier la validation des données côté serveur

---

## 🟡 PHASE 3 : Optimisation et Performance

### 3.1. Build et Bundle
- [ ] Activer SWC Minify : `swcMinify: true` dans `next.config.js`
- [ ] Analyser le bundle : `npm install @next/bundle-analyzer`
- [ ] Optimiser les imports (lazy loading)
- [ ] Vérifier la taille des chunks

**Commandes :**
```bash
ANALYZE=true npm run build
npm run build && npm run start
```

### 3.2. Images et Assets
- [ ] Vérifier que toutes les images utilisent `next/image`
- [ ] Optimiser les images statiques
- [ ] Configurer les CDN si nécessaire
- [ ] Vérifier les polices (chargement optimisé)

### 3.3. Monitoring et Analytics
- [ ] Configurer Sentry pour le monitoring d'erreurs
- [ ] Configurer Google Analytics ou Plausible
- [ ] Ajouter des logs structurés pour les actions critiques
- [ ] Configurer des alertes pour les erreurs critiques

---

## 🟢 PHASE 4 : Tests

### 4.1. Tests Automatisés
- [ ] Exécuter les tests unitaires : `npm test`
- [ ] Exécuter les tests d'intégration : `npm run test:integration`
- [ ] Exécuter les tests e2e : `npm run test:e2e`
- [ ] Vérifier la couverture de code : `npm run test:coverage`

### 4.2. Tests Manuels - Flux Critiques
- [ ] **Authentification**
  - [ ] Inscription nouveau compte
  - [ ] Connexion/déconnexion
  - [ ] Récupération mot de passe
  - [ ] 2FA (si activé)

- [ ] **Dashboard Admin**
  - [ ] Affichage des statistiques
  - [ ] Navigation entre les sections
  - [ ] Création/modification de données

- [ ] **Gestion des étudiants**
  - [ ] Création étudiant
  - [ ] Inscription à une session
  - [ ] Paiements

- [ ] **Documents**
  - [ ] Génération de documents
  - [ ] Export PDF
  - [ ] Templates personnalisés

### 4.3. Tests de Performance
- [ ] Lighthouse audit (Performance, SEO, Accessibilité)
- [ ] Test de charge sur les routes critiques
- [ ] Vérifier les temps de réponse API
- [ ] Test sur mobile (responsive)

**Commandes :**
```bash
# Lighthouse CI (si configuré)
npm run lighthouse

# Ou utiliser Chrome DevTools Lighthouse
```

---

## 🔵 PHASE 5 : Déploiement

### 5.1. Choisir la plateforme
**Options recommandées :**
- **Vercel** (recommandé pour Next.js) : Déploiement automatique, optimisé
- **Netlify** : Alternative populaire
- **Railway/Render** : Pour plus de contrôle
- **VPS** : Pour contrôle total (plus complexe)

### 5.2. Configuration du déploiement (Vercel exemple)

1. **Connexion**
   ```bash
   npm i -g vercel
   vercel login
   vercel link
   ```

2. **Variables d'environnement**
   - Configurer dans le dashboard Vercel
   - Ou via CLI : `vercel env add VARIABLE_NAME`

3. **Premier déploiement**
   ```bash
   vercel --prod
   ```

4. **Configuration du domaine**
   - Ajouter le domaine dans Vercel
   - Configurer les DNS
   - Activer HTTPS (automatique)

### 5.3. Configuration Post-déploiement
- [ ] Vérifier que l'URL de production fonctionne
- [ ] Configurer les webhooks (Stripe, etc.)
- [ ] Tester les emails en production
- [ ] Vérifier les redirections
- [ ] Configurer le monitoring

---

## 🟣 PHASE 6 : Post-Production

### 6.1. Documentation
- [ ] Mettre à jour le README.md
- [ ] Documenter les variables d'environnement
- [ ] Créer un guide de déploiement
- [ ] Documenter les processus de backup

### 6.2. Backup et Récupération
- [ ] Configurer les backups automatiques Supabase
- [ ] Tester la restauration de backup
- [ ] Documenter les procédures de récupération

### 6.3. Maintenance
- [ ] Configurer les mises à jour automatiques des dépendances (Dependabot)
- [ ] Planifier les mises à jour de sécurité
- [ ] Mettre en place un calendrier de maintenance

### 6.4. Support et Monitoring
- [ ] Configurer les alertes (Sentry, logs)
- [ ] Créer une page de statut (status page)
- [ ] Mettre en place un système de tickets
- [ ] Documenter les procédures de support

---

## 📊 Critères de Validation

### ✅ Prêt pour la production si :
- [x] Build réussit sans erreurs
- [x] Tous les tests passent
- [x] Variables d'environnement configurées
- [x] Sécurité vérifiée (HTTPS, headers, RLS)
- [x] Performance acceptable (Lighthouse > 80)
- [x] Monitoring configuré
- [x] Backups configurés
- [x] Tests manuels effectués

---

## 🚨 Points d'Attention

### Avant le déploiement final :
1. **Ne jamais commit les secrets** : Vérifier `.gitignore`
2. **Tester sur staging** : Déployer d'abord sur un environnement de staging
3. **Planifier une fenêtre de maintenance** : Prévenir les utilisateurs
4. **Préparer un rollback** : Avoir un plan de retour en arrière
5. **Monitorer les premières heures** : Surveiller activement après le déploiement

---

## 📝 Notes

### Fichiers à vérifier avant production :
- `.env.production` (ne pas commiter)
- `next.config.js` (swcMinify activé)
- `package.json` (scripts de production)
- `supabase/migrations/` (toutes appliquées)
- `.gitignore` (exclut les fichiers sensibles)

### Commandes utiles :
```bash
# Build de production
npm run build

# Démarrer en mode production local
npm run start

# Vérifier les types TypeScript
npm run type-check

# Linter
npm run lint

# Tests
npm test
npm run test:e2e
```

---

**Date de création :** $(date)
**Dernière mise à jour :** $(date)

