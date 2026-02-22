# Génération PDF avec Gotenberg (EDUZEN)

Gotenberg 8.x est utilisé pour générer les PDF des contrats de formation, émargements et BPF (conformité Qualiopi). L’app Next.js sur Vercel appelle une instance Gotenberg déployée (ex. Railway).

## Pourquoi Gotenberg ?

- **Serverless** : pas de Chromium dans l’app (Puppeteer est lourd sur Vercel).
- **Performance** : service dédié, pas de cold start navigateur.
- **Stabilité** : retry automatique (3 tentatives), timeout 90s.

## Infrastructure Docker

### Build et run

Image optimisée avec polices système (Arial, Helvetica, Liberation, etc.) et support des polices personnalisées :

```bash
# Build
docker build -t eduzen-gotenberg -f infrastructure/gotenberg/Dockerfile infrastructure/gotenberg

# Run
docker run -p 3000:3000 eduzen-gotenberg
```

Ou avec Docker Compose :

```bash
docker compose -f infrastructure/gotenberg/docker-compose.yml up -d
```

Voir **infrastructure/gotenberg/README.md** pour le déploiement Railway et les polices.

### Polices personnalisées (charte graphique)

1. Déposer vos fichiers `.ttf` dans **infrastructure/gotenberg/fonts/**.
2. Rebuild l’image : elles sont copiées dans `/usr/share/fonts/eduzen` et `fc-cache -fv` est exécuté.
3. Dans vos templates HTML, utiliser `font-family` avec le nom de la police.

Sans polices personnalisées, le Dockerfile installe déjà des polices système (Liberation, DejaVu, URW) pour un rendu cohérent.

## Configuration application (Next.js / Vercel)

### Variables d’environnement

| Variable | Obligatoire | Description |
|----------|-------------|-------------|
| `GOTENBERG_URL` | Oui (pour utiliser Gotenberg) | URL de l’instance (ex. `https://gotenberg.railway.app`) |
| `GOTENBERG_API_KEY` | Non | Clé envoyée en header `X-API-Key` pour sécuriser l’API |
| `GOTENBERG_BASIC_AUTH` | Non | Auth HTTP Basic : `user:password` (encodé automatiquement en Base64) |

**À mettre dans `.env.example`** (sans valeurs réelles) :

```env
# Gotenberg – génération PDF (contrats, émargements, BPF)
# GOTENBERG_URL=https://gotenberg.example.com
# GOTENBERG_API_KEY=your-secret-key
# GOTENBERG_BASIC_AUTH=user:password
```

### Sécurité

Pour éviter qu’une instance Gotenberg exposée soit utilisée par des tiers :

- **Option 1 – API Key** : définir `GOTENBERG_API_KEY` côté Next.js ; côté Gotenberg, protéger la route avec un reverse proxy ou un middleware qui vérifie le header `X-API-Key`.
- **Option 2 – Basic Auth** : définir `GOTENBERG_BASIC_AUTH=user:password` ; le service envoie `Authorization: Basic <base64>`. Configurer le reverse proxy (Railway, Nginx, etc.) pour exiger cette auth.

Sans clé ni Basic Auth, toute personne connaissant l’URL peut appeler Gotenberg ; en prod, il est recommandé de restreindre l’accès (réseau privé ou auth).

## Conformité légale et PDF/A

- **Métadonnées** : le service TypeScript accepte `metadata` (titre, créateur, sujet) pour renseigner le PDF. Utile pour la traçabilité Qualiopi.
- **PDF/A-1b** : Chromium (et donc Gotenberg) produit du PDF standard, pas du PDF/A-1b. Pour une conformité stricte PDF/A-1b, une étape de post-traitement (ex. Ghostscript, outil dédié) est nécessaire après la génération. L’infrastructure actuelle fournit un PDF de qualité imprimable avec métadonnées ; l’archivage PDF/A peut être ajouté plus tard si requis.

## Service TypeScript

- **Fichier principal** : `lib/services/gotenberg.service.ts`
  - `htmlToPdf(html, options)` : HTML + options (marges, format A4/Letter, header/footer HTML, CSS, métadonnées).
  - Headers/footers : `headerHtml` et `footerHtml` (HTML complets avec classes Chromium `.pageNumber`, `.totalPages`, `.date`, `.title`).
  - Retry : 3 tentatives avec délai exponentiel.
  - Timeout : 90 s.
  - Erreurs : `GotenbergError` avec status et body si disponible.

- **Compatibilité** : `lib/utils/gotenberg-pdf.ts` expose `generatePDFWithGotenberg` et `isGotenbergConfigured` et délègue au service.

- **Utilisation** : `lib/utils/document-generation/pdf-generator.tsx` appelle Gotenberg en priorité si `GOTENBERG_URL` est défini, sinon Puppeteer en secours.

## Comportement

| `GOTENBERG_URL` | Comportement |
|-----------------|--------------|
| Non défini | Génération via **Puppeteer** (Chrome local ou pool). |
| Défini | Appels à **Gotenberg** ; en cas d’échec après retries, **fallback Puppeteer** si utilisé depuis le pdf-generator. |

Endpoint utilisé : `POST /forms/chromium/convert/html` (Gotenberg 8.x), avec `multipart/form-data` (index.html, optionnellement header.html, footer.html, styles.css).
