# 🔍 Guide rapide - Audit Lighthouse

## 🚀 Exécution rapide

### Étape 1 : Démarrer le serveur (si pas déjà fait)

```bash
npm run dev
```

Le serveur doit être accessible sur `http://localhost:3001`

### Étape 2 : Exécuter le script

**Dans un nouveau terminal :**

```bash
./scripts/lighthouse-audit.sh
```

C'est tout ! Le script va :
1. ✅ Vérifier si Lighthouse est installé (et l'installer si nécessaire)
2. ✅ Exécuter l'audit sur `http://localhost:3001`
3. ✅ Générer les rapports HTML et JSON
4. ✅ Afficher les scores dans le terminal
5. ✅ Vous dire où trouver les rapports

### Étape 3 : Consulter les résultats

**Dans le terminal, vous verrez :**
```
📊 Scores :
  Performance:     85/100
  SEO:             92/100
  Accessibilité:   88/100
  Bonnes pratiques: 90/100

📁 Rapports générés dans :
  HTML: ./lighthouse-reports/lighthouse-report-20250109-114500.report.html
```

**Ouvrir le rapport HTML :**
```bash
open ./lighthouse-reports/lighthouse-report-*.html
```

Ou double-cliquer sur le fichier dans votre explorateur.

## 🌐 Tester une autre URL

```bash
# URL de production
./scripts/lighthouse-audit.sh https://your-domain.com

# Autre port local
./scripts/lighthouse-audit.sh http://localhost:3000
```

## 📊 Que faire après l'audit ?

1. **Consulter le rapport HTML** pour voir les détails
2. **Identifier les problèmes** (en rouge/jaune)
3. **Corriger les problèmes** prioritaires
4. **Réexécuter** l'audit pour vérifier les améliorations

## ⚠️ Si ça ne fonctionne pas

### Erreur "Permission denied"

```bash
chmod +x scripts/lighthouse-audit.sh
./scripts/lighthouse-audit.sh
```

### Erreur "lighthouse: command not found"

Le script devrait installer Lighthouse automatiquement, mais si ça ne fonctionne pas :

```bash
npm install -g lighthouse
./scripts/lighthouse-audit.sh
```

### Erreur "Connection refused"

Vérifier que le serveur dev est démarré :
```bash
npm run dev
```

Puis attendre que le serveur soit prêt avant d'exécuter le script.

## 📚 Plus d'informations

- Guide complet : `docs/HOW_TO_RUN_LIGHTHOUSE.md`
- Guide audit : `docs/GUIDE_AUDIT_LIGHTHOUSE.md`


