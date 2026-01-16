---
title: Configuration de lenvoi demails
date: 2025-12-30
version: 1.0
author: EDUZEN Team
---


# 📧 Configuration de l'envoi d'emails

## 🎯 Fonctionnalité

L'application permet maintenant d'envoyer directement des documents (devis, factures, convocations, contrats, conventions) par email depuis une session.

## 📋 Documents supportés

- ✅ **Convocations** - Envoi individuel ou groupé
- ✅ **Contrats** - Envoi individuel
- ✅ **Conventions** - À venir
- ✅ **Factures** - À venir
- ✅ **Devis** - À venir

## 🚀 Configuration

### Option 1 : Resend (Recommandé)

Resend est un service d'email moderne et simple, parfait pour Next.js.

#### Étape 1 : Créer un compte Resend

1. Allez sur [https://resend.com](https://resend.com)
2. Créez un compte gratuit (100 emails/jour)
3. Vérifiez votre domaine ou utilisez le domaine de test

#### Étape 2 : Obtenir la clé API

1. Dans le dashboard Resend, allez dans **API Keys**
2. Créez une nouvelle clé API
3. Copiez la clé (elle commence par `re_`)

#### Étape 3 : Configurer dans l'application

1. Ajoutez la clé dans votre fichier `.env.local` :

```bash
RESEND_API_KEY=re_votre_cle_api_ici
```

2. Installez le package Resend :

```bash
npm install resend
```

#### Étape 4 : Activer l'envoi dans le code

Ouvrez `app/api/email/send/route.ts` et décommentez/modifiez la section Resend :

```typescript
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

const { data, error } = await resend.emails.send({
  from: emailData.from,
  to: emailData.to,
  subject: emailData.subject,
  html: emailData.html,
  text: emailData.text,
  attachments: emailData.attachments?.map(att => ({
    filename: att.filename,
    content: Buffer.from(att.content, 'base64'),
  })),
  cc: emailData.cc,
  bcc: emailData.bcc,
  reply_to: emailData.replyTo,
})

if (error) {
  throw error
}
```

### Option 2 : SendGrid

1. Créez un compte sur [SendGrid](https://sendgrid.com)
2. Obtenez votre clé API
3. Ajoutez `SENDGRID_API_KEY` dans `.env.local`
4. Installez `@sendgrid/mail`
5. Modifiez `app/api/email/send/route.ts` pour utiliser SendGrid

### Option 3 : Autre service

Vous pouvez utiliser n'importe quel service d'email (Mailgun, AWS SES, etc.) en modifiant `app/api/email/send/route.ts`.

## 🧪 Test de la configuration

### Page de test intégrée

Une page de test est disponible pour vérifier que l'envoi d'emails fonctionne :

1. Allez sur **Paramètres** > **Test Email** : `/dashboard/settings/email-test`
2. Entrez votre adresse email
3. Personnalisez le sujet et le contenu si nécessaire
4. Cliquez sur **"Envoyer l'email de test"**
5. Vérifiez votre boîte de réception

**Note** : En mode test (sans clé API), les emails sont simulés et loggés dans la console serveur.

## 📝 Utilisation

### Depuis une session

1. Allez sur la page d'une session : `/dashboard/sessions/[id]`
2. Cliquez sur l'onglet **"Gestion"** puis **"Convocations"**
3. Pour envoyer à un étudiant :
   - Cliquez sur l'icône **📧** à côté de l'étudiant
   - La convocation sera générée et envoyée automatiquement
4. Pour envoyer à tous les étudiants :
   - Cliquez sur **"Envoyer par email"** en haut
   - Tous les étudiants avec une adresse email recevront leur convocation

### Types de documents

- **Convocations** : Disponible dans l'onglet "Convocations"
- **Contrats** : Disponible dans l'onglet "Conventions" (bouton email à côté de chaque contrat)
- **Factures** : À venir
- **Devis** : À venir

## ⚠️ Notes importantes

1. **Domaine vérifié** : Pour la production, vous devez vérifier votre domaine dans Resend
2. **Limites** : Le plan gratuit de Resend permet 100 emails/jour
3. **Pièces jointes** : Les PDF sont automatiquement attachés aux emails
4. **Format** : Les emails sont envoyés en HTML avec une version texte de secours

## 🔍 Dépannage

### Les emails ne partent pas

1. Vérifiez que `RESEND_API_KEY` est bien défini dans `.env.local`
2. Vérifiez les logs dans la console du navigateur
3. Vérifiez les logs serveur (terminal où Next.js tourne)
4. Vérifiez que le service d'email est bien configuré dans `app/api/email/send/route.ts`

### Erreur "Non authentifié"

- Assurez-vous d'être connecté à l'application
- Vérifiez que votre session est valide

### Erreur "Organisation non trouvée"

- Vérifiez que votre compte utilisateur a bien une `organization_id`
- Vérifiez que l'organisation existe dans la base de données

## 📚 Documentation

- [Resend Documentation](https://resend.com/docs)
- [SendGrid Documentation](https://docs.sendgrid.com)---

**Document EDUZEN** | [Retour à la documentation principale](../README.md) | Dernière mise à jour : 2025-12-30
© 2024 EDUZEN. Tous droits réservés.