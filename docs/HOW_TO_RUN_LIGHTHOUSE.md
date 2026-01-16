# 🚀 Comment exécuter l'audit Lighthouse

## Prérequis

### 1. Installer Lighthouse (si pas déjà fait)

**Option A : Via npm global**
```bash
npm install -g lighthouse
```

**Option B : Via npx (pas besoin d'installer)**
```bash
# Le script utilisera npx automatiquement si lighthouse n'est pas installé globalement
```

### 2. Vérifier que le serveur est démarré

Pour tester sur localhost, vous devez avoir le serveur de développement actif :

```bash
npm run dev
```

Le serveur doit être accessible sur `http://localhost:3001` (ou le port configuré).

## 🎯 Méthode 1 : Utiliser le script (Recommandé)

### Commande de base

```bash
./scripts/lighthouse-audit.sh
```

Cette commande va :
- ✅ Tester `http://localhost:3001` par défaut
- ✅ Générer un rapport HTML et JSON
- ✅ Afficher les scores dans le terminal
- ✅ Ouvrir automatiquement le rapport HTML

### Avec une URL spécifique

```bash
# Tester une URL locale différente
./scripts/lighthouse-audit.sh http://localhost:3000

# Tester une URL de production (si disponible)
./scripts/lighthouse-audit.sh https://your-domain.com
```

### Si le script n'est pas exécutable

```bash
# Rendre le script exécutable
chmod +x scripts/lighthouse-audit.sh

# Puis exécuter
./scripts/lighthouse-audit.sh
```

## 📊 Exemple de sortie

Après exécution, vous verrez :

```
🔍 Audit Lighthouse de http://localhost:3001

📊 Exécution de l'audit...

✅ Audit terminé !

📊 Scores :
  Performance:     85/100
  SEO:             92/100
  Accessibilité:   88/100
  Bonnes pratiques: 90/100

📁 Rapports générés dans :
  HTML: ./lighthouse-reports/lighthouse-report-20250103-113000.report.html
  JSON: ./lighthouse-reports/lighthouse-report-20250103-113000.report.json

💡 Ouvrir le rapport HTML :
  open ./lighthouse-reports/lighthouse-report-20250103-113000.report.html
```

## 🔍 Méthode 2 : Utiliser Lighthouse directement (Manuel)

### Via npx (sans installation)

```bash
# Audit complet
npx lighthouse http://localhost:3001 --view

# Audit avec options spécifiques
npx lighthouse http://localhost:3001 \
  --only-categories=performance,seo,accessibility \
  --output html \
  --output-path ./lighthouse-report.html \
  --view
```

### Via CLI installée

```bash
# Si vous avez installé lighthouse globalement
lighthouse http://localhost:3001 --view
```

## 🌐 Méthode 3 : Via Chrome DevTools (Interface graphique)

### Étapes

1. **Démarrer le serveur :**
   ```bash
   npm run dev
   ```

2. **Ouvrir Chrome :**
   - Aller sur `http://localhost:3001`

3. **Ouvrir DevTools :**
   - `Cmd + Option + I` (Mac) ou `F12` (Windows/Linux)
   - Ou clic droit → Inspecter

4. **Onglet Lighthouse :**
   - Cliquer sur l'onglet "Lighthouse"
   - Sélectionner les catégories souhants :
     - ✅ Performance
     - ✅ SEO
     - ✅ Accessibilité
     - ✅ Bonnes pratiques
   - Choisir le mode :
     - **Navigation** : Audit complet de la page
     - **Timespan** : Audit d'une période
     - **Snapshot** : État actuel

5. **Exécuter :**
   - Cliquer sur "Analyser la page"
   - Attendre 30-60 secondes

6. **Consulter les résultats :**
   - Scores affichés
   - Recommandations détaillées
   - Possibilité d'exporter le rapport

## 🌍 Méthode 4 : PageSpeed Insights (Production)

Pour tester votre site en production :

1. Aller sur https://pagespeed.web.dev/
2. Entrer votre URL de production
3. Cliquer sur "Analyser"
4. Obtenir un rapport détaillé avec :
   - Scores Lighthouse
   - Métriques Core Web Vitals
   - Recommandations spécifiques

## 📋 Options du script

Le script `lighthouse-audit.sh` supporte :

```bash
# URL par défaut (localhost:3001)
./scripts/lighthouse-audit.sh

# URL personnalisée
./scripts/lighthouse-audit.sh https://your-domain.com

# URL locale différente
./scripts/lighthouse-audit.sh http://localhost:3000
```

## 📁 Localisation des rapports

Les rapports sont générés dans :
```
./lighthouse-reports/
  ├── lighthouse-report-YYYYMMDD-HHMMSS.report.html
  └── lighthouse-report-YYYYMMDD-HHMMSS.report.json
```

**Ouvrir le rapport HTML :**
```bash
# Mac
open ./lighthouse-reports/lighthouse-report-*.html

# Linux
xdg-open ./lighthouse-reports/lighthouse-report-*.html

# Windows
start ./lighthouse-reports/lighthouse-report-*.html
```

Ou simplement double-cliquer sur le fichier HTML dans votre explorateur de fichiers.

## 🔧 Personnalisation du script

Si vous voulez modifier le script, éditez `scripts/lighthouse-audit.sh` :

```bash
# Changer les catégories testées
--only-categories=performance,seo  # Au lieu de performance,seo,accessibility,best-practices

# Changer le dossier de sortie
OUTPUT_DIR="./my-reports"

# Désactiver l'ouverture automatique
# (retirer la ligne avec `open` à la fin)
```

## ⚠️ Dépannage

### Erreur : "lighthouse: command not found"

**Solution :**
```bash
# Installer Lighthouse globalement
npm install -g lighthouse

# OU utiliser npx (modifier le script pour utiliser npx lighthouse)
```

### Erreur : "Connection refused"

**Solution :**
- Vérifier que le serveur dev est démarré : `npm run dev`
- Vérifier le port (3001 par défaut)
- Vérifier l'URL dans la commande

### Erreur : "Permission denied"

**Solution :**
```bash
chmod +x scripts/lighthouse-audit.sh
```

### Le script ne génère pas de scores

**Solution :**
- Vérifier que Lighthouse est installé : `which lighthouse`
- Vérifier les logs dans le terminal
- Vérifier que l'URL est accessible

## 📊 Interprétation des résultats

### Scores

| Score | Signification | Action |
|-------|---------------|--------|
| **90-100** | Excellent ✅ | Aucune action requise |
| **75-89** | Bon ⚠️ | Optimisations mineures recommandées |
| **50-74** | À améliorer 🟡 | Optimisations importantes nécessaires |
| **0-49** | Faible 🔴 | Corrections majeures requises |

### Métriques Core Web Vitals

- **LCP (Largest Contentful Paint)** : < 2.5s ✅
- **FID (First Input Delay)** : < 100ms ✅
- **CLS (Cumulative Layout Shift)** : < 0.1 ✅

### SEO

Vérifier :
- ✅ Métadonnées présentes
- ✅ robots.txt accessible
- ✅ sitemap.xml accessible
- ✅ Images avec alt
- ✅ Structure HTML sémantique

### Accessibilité

Vérifier :
- ✅ Contraste de couleurs suffisant
- ✅ Navigation clavier fonctionnelle
- ✅ Attributs ARIA présents
- ✅ Labels sur formulaires

## 🎯 Workflow recommandé

1. **Tester en local :**
   ```bash
   npm run dev
   ./scripts/lighthouse-audit.sh
   ```

2. **Corriger les problèmes identifiés**

3. **Tester à nouveau :**
   ```bash
   ./scripts/lighthouse-audit.sh
   ```

4. **Déployer en production**

5. **Tester en production :**
   ```bash
   ./scripts/lighthouse-audit.sh https://your-domain.com
   # OU utiliser PageSpeed Insights
   ```

## 📚 Ressources

- [Documentation Lighthouse](https://developers.google.com/web/tools/lighthouse)
- [Guide complet : `docs/GUIDE_AUDIT_LIGHTHOUSE.md`](./GUIDE_AUDIT_LIGHTHOUSE.md)
- [PageSpeed Insights](https://pagespeed.web.dev/)


