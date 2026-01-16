---
title: Variables denvironnement - Configuration Email
date: 2025-12-30
version: 1.0
author: EDUZEN Team
---


# Variables d'environnement - Configuration Email

## Configuration Resend

Pour activer l'envoi d'emails avec Resend, ajoutez cette variable dans votre fichier `.env.local` :

```bash
# Resend API Key (pour l'envoi d'emails)
# Obtenez votre clé sur https://resend.com
RESEND_API_KEY=re_votre_cle_api_ici
```

## Mode de fonctionnement

### Sans clé API (Mode Test)
- Les emails sont **simulés** (aucun email réel n'est envoyé)
- Les logs sont affichés dans la console serveur
- Parfait pour le développement et les tests

### Avec clé API (Mode Production)
- Les emails sont **réellement envoyés** via Resend
- Fonctionne en production
- Nécessite un compte Resend avec domaine vérifié pour la production

## Test

1. Allez sur `/dashboard/settings/email-test`
2. Entrez votre email
3. Cliquez sur "Envoyer l'email de test"
4. Vérifiez votre boîte de réception (ou les logs serveur en mode test)---

**Document EDUZEN** | [Retour à la documentation principale](../README.md) | Dernière mise à jour : 2025-12-30
© 2024 EDUZEN. Tous droits réservés.