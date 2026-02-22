# Proxy Gotenberg – sécurisation par API Key

Service minimal qui vérifie le header `X-API-Key` puis transmet la requête à Gotenberg. À déployer sur Railway devant le service Gotenberg.

## Variables d'environnement

| Variable | Obligatoire | Description |
|----------|-------------|-------------|
| `GOTENBERG_SERVICE_URL` | Oui | URL de Gotenberg (ex. `http://gotenberg:3000` en réseau Railway, ou URL publique) |
| `GOTENBERG_API_KEY` | Oui | Clé partagée ; l'app Next.js envoie la même clé dans le header `X-API-Key` |

## Build et run locaux

```bash
# Depuis la racine du projet
docker build -t eduzen-gotenberg-proxy -f infrastructure/gotenberg-proxy/Dockerfile infrastructure/gotenberg-proxy
docker run -p 3000:3000 -e GOTENBERG_API_KEY=secret -e GOTENBERG_SERVICE_URL=http://host.docker.internal:3000 eduzen-gotenberg-proxy
```

Voir **docs/GOTENBERG_DEPLOY_GUIDE.md** pour le déploiement Railway et la config Vercel.
