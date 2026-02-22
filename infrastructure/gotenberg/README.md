# Gotenberg – Infrastructure EDUZEN

Image Docker Gotenberg 8.x pour la génération PDF (contrats Qualiopi, émargements, BPF).

## Build

```bash
# Depuis la racine du projet
docker build -t eduzen-gotenberg -f infrastructure/gotenberg/Dockerfile infrastructure/gotenberg
```

## Run

```bash
docker run -p 3000:3000 eduzen-gotenberg
```

Ou avec Docker Compose :

```bash
docker compose -f infrastructure/gotenberg/docker-compose.yml up -d
```

## Polices personnalisées

1. Déposez vos fichiers `.ttf` (charte graphique) dans `infrastructure/gotenberg/fonts/`.
2. Rebuild l’image : les polices sont copiées dans `/usr/share/fonts/eduzen` et le cache `fc-cache` est mis à jour.
3. Dans vos templates HTML, référencez-les via `font-family` (nom de la police tel que déclaré dans le .ttf).

Exemple CSS dans le template :

```css
@font-face {
  font-family: 'Eduzen Sans';
  src: url('/fonts/EduzenSans-Regular.ttf') format('truetype');
}
body { font-family: 'Eduzen Sans', Arial, sans-serif; }
```

En Gotenberg, si les polices sont dans l’image, le chemin dans le HTML doit correspondre à la structure des fichiers envoyés (ex. inclure `fonts/` dans le FormData si nécessaire). Pour une seule page HTML autonome, les polices sont déjà dans le conteneur ; pour des fichiers séparés, joignez-les dans la même requête multipart.

## Déploiement Railway

1. Créer un nouveau service « Dockerfile ».
2. Root directory : `infrastructure/gotenberg` (ou racine du repo avec Dockerfile path `infrastructure/gotenberg/Dockerfile`).
3. Variables d’environnement : optionnellement `GOTENBERG_API_KEY` si vous protégez l’API côté reverse proxy.
4. Exposer le port 3000 et noter l’URL publique (ex. `https://votre-app.railway.app`).
5. Dans l’app Next.js (Vercel) : `GOTENBERG_URL=https://votre-app.railway.app` et, si vous avez mis une clé, `GOTENBERG_API_KEY=...`.
