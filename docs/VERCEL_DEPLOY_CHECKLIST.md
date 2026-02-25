# Checklist déploiement production Vercel

## 1. Variables d'environnement obligatoires (Vercel)

Dans **Vercel** → projet EDUZEN → **Settings** → **Environment Variables**, définir pour **Production** (et Preview si tu utilises les previews) :

| Variable | Obligatoire | Notes |
|----------|-------------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Oui | URL du projet Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Oui | Clé anon Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Oui (build + API) | Clé service Supabase (côté serveur) |
| `NEXT_PUBLIC_APP_URL` | Recommandé | URL de l'app (ex. https://eduzen.fr) |

Sans ces variables, le build peut échouer (ex. "supabaseUrl is required" ou "Missing Supabase environment variables").

## 2. Voir l’erreur exacte du build

1. **Vercel** → **Deployments**
2. Cliquer sur un déploiement en **Failed**
3. Ouvrir **Build Logs** (ou **View build logs**)
4. Aller à la **fin** des logs : l’erreur est en rouge ou juste au-dessus
5. Copier les 20–30 dernières lignes et les partager pour corriger le code ou la config

## 3. Déclencher un déploiement

- **Automatique** : push sur `main` → le workflow GitHub « Deploy to Production » appelle le Deploy Hook → Vercel crée un déploiement.
- **Manuel** : GitHub → **Actions** → **Deploy to Production** → **Run workflow**.

## 4. Si le build dépasse le temps ou la mémoire

- Vercel (plan gratuit) : timeouts et mémoire limités.
- Vérifier que `next.config.js` a bien `typescript: { ignoreBuildErrors: true }` et `eslint: { ignoreDuringBuilds: true }` pour accélérer le build.
