# Guide : Comment Lancer les Tests Lighthouse

## 🎯 Objectif

Mesurer les performances de l'application après les optimisations de la Phase 9 et vérifier que le score Performance > 90/100.

---

## 📋 Prérequis

### 1. Serveur de développement en cours d'exécution

```bash
# Dans un terminal, démarrer le serveur
npm run dev
```

Le serveur doit être accessible sur `http://localhost:3001`

### 2. Installation de Lighthouse CLI (Optionnel)

**⚠️ Note importante** : `@lhci/cli` installe `lhci` (Lighthouse CI), pas `lighthouse` directement.

**Option A : Installation globale de lighthouse (recommandé)**
```bash
npm install -g lighthouse
```

**Option B : Utilisation via npx (pas d'installation nécessaire - RECOMMANDÉ)**
Le script utilise automatiquement `npx lighthouse` si Lighthouse n'est pas installé globalement. C'est la méthode la plus simple !

**Option C : Installation de Lighthouse CI (pour CI/CD)**
```bash
npm install -g @lhci/cli  # Installe 'lhci', pas 'lighthouse'
```

---

## 🚀 Méthodes pour Lancer les Tests Lighthouse

### Méthode 1 : Script Automatisé Phase 9 (Recommandé)

**Script spécialement créé pour la Phase 9** - Audit uniquement Performance

```bash
# Depuis la racine du projet
./scripts/lighthouse-audit-phase9.sh
```

**Ce que fait le script** :
- ✅ Vérifie que le serveur est en cours d'exécution
- ✅ Audit uniquement Performance (plus rapide)
- ✅ Génère les rapports HTML et JSON
- ✅ Affiche les métriques à comparer

**Rapports générés** :
- `./lighthouse-reports/dashboard-phase9.html` (rapport visuel)
- `./lighthouse-reports/dashboard-phase9.json` (données brutes)

---

### Méthode 2 : Script Général (Complet)

**Script général** - Audit toutes les catégories (Performance, SEO, Accessibilité, Bonnes pratiques)

```bash
# Audit de la page d'accueil
./scripts/lighthouse-audit.sh

# Audit d'une page spécifique
./scripts/lighthouse-audit.sh http://localhost:3001/dashboard
```

**Ce que fait le script** :
- ✅ Audit complet (Performance, SEO, Accessibilité, Bonnes pratiques)
- ✅ Affiche les scores dans le terminal
- ✅ Génère les rapports avec timestamp
- ✅ Propose d'ouvrir automatiquement le rapport HTML

**Rapports générés** :
- `./lighthouse-reports/lighthouse-report-YYYYMMDD-HHMMSS.report.html`
- `./lighthouse-reports/lighthouse-report-YYYYMMDD-HHMMSS.report.json`

---

### Méthode 3 : Chrome DevTools (Sans installation)

**La méthode la plus simple** - Pas besoin d'installer quoi que ce soit

1. Ouvrir Chrome et aller sur `http://localhost:3001/dashboard`
2. Ouvrir les DevTools (F12 ou Cmd+Option+I sur Mac)
3. Aller à l'onglet **"Lighthouse"**
4. Sélectionner **"Performance"** (ou toutes les catégories)
5. Cliquer sur **"Generate report"**
6. Attendre la fin de l'audit (30-60 secondes)
7. Consulter les résultats directement dans Chrome

**Avantages** :
- ✅ Pas d'installation nécessaire
- ✅ Interface visuelle intuitive
- ✅ Comparaison avec les audits précédents possible
- ✅ Export possible en JSON/HTML

---

### Méthode 4 : Lighthouse CLI Manuel

**Pour plus de contrôle** - Commandes manuelles

```bash
# Audit Performance uniquement
lighthouse http://localhost:3001/dashboard \
  --output=html,json \
  --output-path=./lighthouse-reports/dashboard \
  --only-categories=performance \
  --chrome-flags="--headless"

# Audit complet (toutes les catégories)
lighthouse http://localhost:3001/dashboard \
  --output=html,json \
  --output-path=./lighthouse-reports/dashboard-full \
  --chrome-flags="--headless"

# Audit avec mode mobile
lighthouse http://localhost:3001/dashboard \
  --output=html \
  --output-path=./lighthouse-reports/dashboard-mobile \
  --only-categories=performance \
  --emulated-form-factor=mobile \
  --chrome-flags="--headless"
```

---

## 📊 Métriques à Comparer

### Avant les Optimisations (Phase 9)
- **LCP** : 37.7s
- **TBT** : 5.97s
- **Performance Score** : 40/100

### Objectifs Après Optimisations
- **LCP** : < 2.5s (objectif) | 2-4s (estimé)
- **TBT** : < 200ms (objectif) | 1-2s (estimé)
- **CLS** : < 0.1
- **FID** : < 100ms
- **Performance Score** : > 90/100 (objectif) | 85-90/100 (estimé)

---

## 🔍 Interprétation des Résultats

### Core Web Vitals

**LCP (Largest Contentful Paint)**
- ✅ Excellent : < 2.5s
- 🟡 À améliorer : 2.5s - 4s
- ❌ Mauvais : > 4s

**TBT (Total Blocking Time)**
- ✅ Excellent : < 200ms
- 🟡 À améliorer : 200ms - 600ms
- ❌ Mauvais : > 600ms

**CLS (Cumulative Layout Shift)**
- ✅ Excellent : < 0.1
- 🟡 À améliorer : 0.1 - 0.25
- ❌ Mauvais : > 0.25

**FID (First Input Delay)**
- ✅ Excellent : < 100ms
- 🟡 À améliorer : 100ms - 300ms
- ❌ Mauvais : > 300ms

### Performance Score
- ✅ Excellent : 90-100
- 🟡 Bon : 50-89
- ❌ À améliorer : 0-49

---

## 🛠️ Dépannage

### Erreur : "Le serveur n'est pas en cours d'exécution"
```bash
# Démarrer le serveur dans un autre terminal
npm run dev
```

### Erreur : "Lighthouse CLI n'est pas installé"
```bash
# Option 1 : Utiliser npx (RECOMMANDÉ - pas d'installation)
npx --yes lighthouse http://localhost:3001/dashboard --output=html

# Option 2 : Installation globale de lighthouse
npm install -g lighthouse

# Note : @lhci/cli installe 'lhci', pas 'lighthouse'
```

### Erreur : "Port 3001 déjà utilisé"
```bash
# Vérifier quel processus utilise le port
lsof -i :3001

# Arrêter le processus ou utiliser un autre port
npm run dev -- -p 3002
```

### Les résultats sont différents à chaque audit
C'est normal ! Lighthouse peut varier légèrement. Faites plusieurs audits et prenez la moyenne.

---

## 📝 Exemple de Commande Complète

```bash
# 1. Démarrer le serveur (terminal 1)
npm run dev

# 2. Attendre que le serveur soit prêt (quelques secondes)

# 3. Lancer l'audit (terminal 2)
./scripts/lighthouse-audit-phase9.sh

# 4. Ouvrir le rapport HTML
open ./lighthouse-reports/dashboard-phase9.html
```

---

## 🎯 Checklist Avant l'Audit

- [ ] Serveur de développement démarré (`npm run dev`)
- [ ] Serveur accessible sur `http://localhost:3001`
- [ ] Page `/dashboard` accessible et fonctionnelle
- [ ] Lighthouse CLI installé (ou utiliser npx/Chrome DevTools)
- [ ] Aucune extension de navigateur qui pourrait affecter les résultats

---

## 📈 Comparaison Avant/Après

Pour comparer les résultats :

1. **Avant** : Notez les métriques initiales (LCP: 37.7s, TBT: 5.97s, Score: 40/100)
2. **Après** : Exécutez l'audit et comparez avec les objectifs
3. **Documentation** : Enregistrez les résultats dans un fichier pour référence future

**Exemple de comparaison** :
```
Avant  →  Après  →  Objectif
LCP: 37.7s → 2.5s → < 2.5s ✅
TBT: 5.97s → 1.5s → < 200ms 🟡
Score: 40 → 88 → > 90 🟡
```

---

## 💡 Conseils

1. **Faire plusieurs audits** : Les résultats peuvent varier, faites 2-3 audits et prenez la moyenne
2. **Mode incognito** : Utilisez Chrome en mode incognito pour éviter les extensions
3. **Réseau throttling** : Lighthouse simule automatiquement un réseau lent (Fast 3G)
4. **Cache désactivé** : Lighthouse désactive automatiquement le cache pour des résultats cohérents
5. **Mobile vs Desktop** : Testez les deux modes pour une vue complète

---

## 🔗 Ressources

- [Documentation Lighthouse](https://developer.chrome.com/docs/lighthouse/)
- [Core Web Vitals](https://web.dev/vitals/)
- [Rapport Phase 9](./PHASE9_COMPLETION_REPORT.md)

---

**Date**: 23 Janvier 2026  
**Version**: 1.0
