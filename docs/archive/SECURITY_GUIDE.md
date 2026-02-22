# 🔒 Guide de Sécurité EDUZEN - Actions Critiques

## ⚠️ ACTIONS IMMÉDIATES REQUISES

### 1. Régénérer les Clés Supabase (CRITIQUE)

**Problème:** Les clés Supabase actuelles sont potentiellement exposées dans `.env.local`.

**Solution:**

1. **Connectez-vous à Supabase Dashboard:**
   - URL: https://ocdlaouymksskmmhmzdr.supabase.co
   - Allez dans `Settings` → `API`

2. **Régénérez les clés:**
   - **Service Role Key:** Cliquez sur "Reset" à côté de `service_role`
   - **Anon Key:** Cliquez sur "Reset" à côté de `anon` (public)

   ⚠️ **ATTENTION:** Régénérer les clés va invalider toutes les sessions actives!

3. **Mettez à jour `.env.local`** avec les nouvelles clés:
   ```bash
   NEXT_PUBLIC_SUPABASE_ANON_KEY=[nouvelle_clé_anon]
   SUPABASE_SERVICE_ROLE_KEY=[nouvelle_clé_service_role]
   ```

4. **Redémarrez l'application:**
   ```bash
   npm run dev
   ```

---

### 2. Initialiser Git et Sécuriser les Secrets

**Problème:** Le projet n'est pas encore dans un dépôt Git.

**Solution:**

1. **Créez un fichier `.gitignore`:**
   ```bash
   cat > /Users/arafatetoure/Documents/EDUZEN/.gitignore << 'EOF'
   # Dependencies
   node_modules/
   .pnp
   .pnp.js

   # Testing
   coverage/

   # Next.js
   .next/
   out/
   build/
   dist/

   # Production
   .vercel
   .env*.local
   .env.production

   # Debug
   npm-debug.log*
   yarn-debug.log*
   yarn-error.log*

   # Local env files
   .env
   .env.local
   .env.development.local
   .env.test.local
   .env.production.local

   # OS
   .DS_Store
   *.pem

   # Editor
   .vscode/
   .idea/
   *.swp
   *.swo
   *~

   # Supabase
   .supabase/
   EOF
   ```

2. **Initialisez Git:**
   ```bash
   cd /Users/arafatetoure/Documents/EDUZEN
   git init
   git add .
   git commit -m "Initial commit - EDUZEN platform"
   ```

3. **Créez un `.env.example`** (sans les vraies clés):
   ```bash
   cat > /Users/arafatetoure/Documents/EDUZEN/.env.example << 'EOF'
   # Supabase
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

   # App
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   NEXT_PUBLIC_APP_NAME=eduzen

   # Email Service (Resend)
   RESEND_API_KEY=re_your_api_key_here
   RESEND_FROM_EMAIL=noreply@yourdomain.com

   # Sentry (optional)
   NEXT_PUBLIC_SENTRY_DSN=https://your-dsn@sentry.io/project-id
   EOF
   ```

---

### 3. Configurer Resend pour l'Envoi d'Emails

**État actuel:** Le système utilise une simulation d'envoi d'emails.

**Solution:**

1. **Créez un compte Resend:**
   - Allez sur https://resend.com
   - Créez un compte gratuit (3000 emails/mois)

2. **Générez une clé API:**
   - Dashboard → API Keys
   - Créez une nouvelle clé avec les permissions `Sending access`
   - Copiez la clé (elle ne sera affichée qu'une fois!)

3. **Ajoutez votre domaine:**
   - Dashboard → Domains
   - Ajoutez votre domaine (ex: `votredomaine.com`)
   - Configurez les enregistrements DNS (SPF, DKIM)
   - Vérifiez le domaine

4. **Mettez à jour `.env.local`:**
   ```bash
   RESEND_API_KEY=re_votre_vraie_clé_api
   RESEND_FROM_EMAIL=noreply@votredomaine.com
   ```

5. **Installez le package Resend:**
   ```bash
   npm install resend
   ```

6. **Le code est déjà prêt** dans `/app/api/send-email/route.ts`
   - Décommentez les lignes 44-76 (implémentation Resend)
   - Supprimez les lignes 110-133 (simulation)

---

## 📊 Résumé des Vulnérabilités Identifiées

### Critique (Corrigées)
✅ **Console.log exposant des tokens** - 15 instances corrigées dans:
- `/app/api/learner/access-token/validate/route.ts`
- `/app/api/learner/access-token/route.ts`
- `/app/api/2fa/generate-secret/route.ts`

### Haute Priorité (À faire)
⚠️ **Clés Supabase à régénérer** - Instructions ci-dessus
⚠️ **Console.log exposant des PII** - 25 instances identifiées
⚠️ **Initialiser Git** - Instructions ci-dessus

### Moyenne Priorité (En cours)
🔧 **Services non standardisés** - 74 services à migrer vers ErrorHandler
✅ **document.service.ts** - Déjà standardisé
🔧 **Autres services critiques** - À faire

---

## 🚀 Prochaines Étapes

1. ✅ **Immédiat (fait):**
   - Logger amélioré avec masquage PII
   - Fichiers critiques sécurisés

2. ⚠️ **Cette semaine (à faire):**
   - Régénérer clés Supabase
   - Initialiser Git + .gitignore
   - Configurer Resend

3. 📅 **Ce mois-ci (planifié):**
   - Standardiser 74 services restants
   - Optimiser requêtes N+1
   - Augmenter couverture tests à 50%+

---

## 📞 Support

Si vous avez des questions sur la sécurité:
- Consultez la documentation Supabase: https://supabase.com/docs/guides/api
- Documentation Resend: https://resend.com/docs
- Guide ErrorHandler: `lib/errors/README.md`

---

**Dernière mise à jour:** 2026-01-03
**Audit effectué par:** Claude Sonnet 4.5
