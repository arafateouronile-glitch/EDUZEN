# Intégration Vercel avec Cursor

## Options pour récupérer les erreurs de build Vercel dans Cursor

### Option 1 : Vercel CLI (Recommandé)

**Installer Vercel CLI :**
```bash
npm i -g vercel
```

**Vérifier les erreurs de build localement :**
```bash
# Tester le build localement (identique à Vercel)
vercel build

# Voir les logs de déploiement
vercel logs [deployment-url]

# Voir les logs en temps réel
vercel logs --follow
```

**Avantages :**
- ✅ Même environnement que Vercel (même erreurs)
- ✅ Erreurs directement dans le terminal de Cursor
- ✅ Plus rapide que d'attendre le build Vercel
- ✅ Possibilité de tester avant de pousser

**Limites :**
- ⚠️ Nécessite de lancer manuellement la commande
- ⚠️ Variables d'environnement doivent être configurées localement

---

### Option 2 : GitHub Actions + GitHub Tab dans Cursor

Si vous avez configuré GitHub Actions (`.github/workflows/`), vous pouvez voir les erreurs de build directement dans Cursor :

1. **Ouvrir l'onglet GitHub** dans Cursor (Extension GitHub)
2. **Voir les workflows** qui s'exécutent sur chaque push
3. **Voir les erreurs** directement dans l'interface

**Configuration GitHub Actions :**
```yaml
# .github/workflows/build.yml (déjà créé)
name: Build Check
on:
  push:
    branches: [main]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run build
```

---

### Option 3 : Extension Vercel pour VS Code/Cursor

Installer l'extension officielle Vercel :

1. **Ouvrir les Extensions** dans Cursor (Cmd+Shift+X)
2. **Rechercher** "Vercel"
3. **Installer** "Vercel" par Vercel Inc.
4. **Se connecter** avec votre compte Vercel
5. **Voir les déploiements** directement dans Cursor

**Fonctionnalités :**
- ✅ Voir les déploiements en temps réel
- ✅ Voir les logs de build
- ✅ Voir les erreurs de déploiement
- ✅ Redéployer depuis Cursor

**Limites :**
- ⚠️ Nécessite une connexion internet
- ⚠️ Ne corrige pas automatiquement les erreurs

---

### Option 4 : Webhook Vercel → GitHub Status (Avancé)

Configurer un webhook Vercel qui met à jour le statut GitHub :

1. **Dans Vercel Dashboard** : Settings → Integrations → GitHub
2. **Activer** "Deploy Status" 
3. **Voir les statuts** dans GitHub (visible dans Cursor avec extension GitHub)

---

### Option 5 : Script Automatique (Le plus automatisé)

Créer un script qui vérifie les erreurs de build et les affiche :

```bash
#!/bin/bash
# scripts/check-vercel-build.sh

# Récupérer le dernier déploiement
DEPLOYMENT=$(vercel ls --token $VERCEL_TOKEN | head -2 | tail -1 | awk '{print $1}')

# Récupérer les logs
vercel logs $DEPLOYMENT --token $VERCEL_TOKEN > vercel-build-errors.txt

# Vérifier s'il y a des erreurs
if grep -q "Error\|Failed\|Failed to compile" vercel-build-errors.txt; then
  echo "❌ Erreurs détectées dans le build Vercel"
  cat vercel-build-errors.txt
  exit 1
else
  echo "✅ Build réussi"
  exit 0
fi
```

**Utilisation :**
```bash
chmod +x scripts/check-vercel-build.sh
./scripts/check-vercel-build.sh
```

---

## Méthode Actuelle (Recommandée pour le moment)

La méthode actuelle (copier-coller les erreurs de build Vercel) fonctionne très bien car :

✅ **Simple** : Pas de configuration supplémentaire
✅ **Fiable** : Erreurs exactes de Vercel
✅ **Rapide** : Je corrige immédiatement après chaque erreur
✅ **Précis** : Erreurs TypeScript exactes du build de production

---

## Recommandation

Pour votre workflow actuel, je recommande :

1. **Continuer** avec la méthode actuelle (copier-coller les erreurs)
2. **Ajouter** `vercel build` localement avant de pousser pour détecter les erreurs plus tôt :
   ```bash
   # Tester avant de pousser
   npm run build
   # ou
   vercel build
   ```
3. **Optionnel** : Installer l'extension Vercel pour voir les déploiements dans Cursor

---

## Correction Automatique

⚠️ **Attention** : Il n'existe pas de moyen de faire corriger **automatiquement** les erreurs sans intervention. Même avec l'IA de Cursor, il faut :
- Partager les erreurs (copier-coller ou CLI)
- Valider les corrections
- Pousser les changements

C'est normal et souhaitable pour la sécurité et le contrôle qualité.
