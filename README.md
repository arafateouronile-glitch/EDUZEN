---
title: EDUZEN - Plateforme de Gestion Éducative
date: 2025-12-30
version: 1.0
author: EDUZEN Team
---


# 🎓 EDUZEN - Plateforme de Gestion Éducative

Plateforme complète de gestion éducative pour les établissements scolaires, centres de formation et organisations éducatives.

## ✨ Fonctionnalités Principales

### 📚 Gestion Pédagogique
- **Gestion des étudiants** : Inscription, profils, historique académique, accès personnel
- **Programmes et formations** : Création et gestion de programmes éducatifs
- **Sessions et cours** : Planification et suivi des sessions
- **Évaluations** : Création, correction et modèles d'évaluation personnalisables
- **Portfolios d'apprentissage** : Suivi des compétences et réalisations
- **Présence** : Suivi de présence par session préconfigurée
- **E-learning** : Plateforme de cours en ligne intégrée

### 💬 Communication
- **Messagerie interne** : Conversations directes et de groupe
- **Pièces jointes** : Support des fichiers (PDF, images, documents Office)
- **Notifications** : Système de notifications en temps réel
- **Espace apprenant** : Portail dédié pour les étudiants (sans authentification, via lien direct)

### 💰 Gestion Financière
- **Facturation** : Génération de factures et devis
- **Paiements** : Suivi des paiements (carte, mobile money, virement)
- **Charges de session** : Gestion des frais par session
- **Rapports financiers** : Tableaux de bord et analyses

### 📄 Documents
- **Génération de documents** : Bulletins, certificats, attestations avec en-têtes personnalisés
- **Templates personnalisables** : Création et gestion de modèles professionnels
- **Variables dynamiques** : Insertion automatique des données étudiant/session
- **Export PDF** : Génération de documents prêts à l'impression

### 🔒 Conformité et Sécurité
- **RGPD** : Gestion de la conformité RGPD
- **Qualiopi** : Suivi de la certification Qualiopi
- **Audit** : Logs et traçabilité des actions
- **2FA** : Authentification à deux facteurs
- **RLS** : Row Level Security pour isolation multi-tenant

### 🔗 Intégrations
- **CRM** : Synchronisation avec systèmes CRM
- **LMS** : Intégration avec plateformes LMS
- **Calendrier** : Synchronisation Google Calendar, Outlook
- **Comptabilité** : Intégration avec systèmes comptables
- **Vidéoconférence** : Zoom, Google Meet

---

## 🚀 Installation

### Prérequis

- **Node.js** 18+ et npm/yarn
- **Supabase** : Compte Supabase (gratuit ou payant)
- **Variables d'environnement** : Voir `.env.example`

### Étapes d'Installation

1. **Cloner le repository**
```bash
git clone https://github.com/votre-org/eduzen.git
cd eduzen
```

2. **Installer les dépendances**
```bash
npm install
# ou
yarn install
```

3. **Configurer les variables d'environnement**
```bash
cp .env.example .env.local
```

Éditer `.env.local` avec vos clés Supabase (voir `.env.example`). Variables utiles :
- **Supabase** : `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- **PDF** (optionnel) : `GOTENBERG_URL` pour utiliser Gotenberg au lieu de Puppeteer — voir [docs/GOTENBERG_PDF.md](docs/GOTENBERG_PDF.md)
- **Logs** (optionnel) : `LOG_LEVEL=error|warn|info|debug` (défaut : prod=warn, dev=debug)

4. **Appliquer les migrations Supabase**
```bash
# Via Supabase CLI
supabase db push

# Ou via le dashboard Supabase
# Aller dans SQL Editor et exécuter les fichiers dans supabase/migrations/
```

5. **Lancer le serveur de développement**
```bash
npm run dev
```

L'application sera accessible sur [http://localhost:3001](http://localhost:3001)

---

## 🏗️ Architecture

### Stack Technique

- **Frontend** : Next.js 14 (App Router), React 18, TypeScript
- **UI** : Tailwind CSS, shadcn/ui, Framer Motion
- **Backend** : Supabase (PostgreSQL, Auth, Storage, Realtime)
- **State Management** : React Query (TanStack Query)
- **Validation** : Zod, React Hook Form
- **Tests** : Vitest, Testing Library

### Structure du Projet

```
eduzen/
├── app/                    # Pages Next.js (App Router)
│   ├── (dashboard)/       # Routes protégées dashboard admin
│   ├── (learner)/         # Espace apprenant (accès sans auth)
│   ├── (parent)/          # Portail parents
│   ├── api/               # API Routes
│   └── auth/              # Pages d'authentification
├── components/            # Composants React réutilisables
│   ├── ui/               # Composants UI de base (shadcn/ui)
│   ├── dashboard/        # Composants spécifiques dashboard
│   └── messaging/        # Composants de messagerie
├── lib/                   # Utilitaires et services
│   ├── services/         # Services métier (~90+ services)
│   ├── hooks/           # Hooks React personnalisés
│   ├── contexts/        # Contextes React (auth, learner)
│   ├── errors/          # Gestion d'erreurs
│   └── utils/           # Utilitaires généraux
├── supabase/            # Configuration Supabase
│   └── migrations/     # Migrations SQL (~150 fichiers)
├── types/              # Types TypeScript
└── tests/              # Tests unitaires et d'intégration
```

### Fonctionnalités par Module

| Module | Description | Services Clés |
|--------|-------------|---------------|
| **Étudiants** | Gestion complète des profils | `student.service.ts` |
| **Sessions** | Planification et suivi | `session.service.ts` |
| **Évaluations** | Notes et modèles | `evaluation.service.ts`, `evaluation-template.service.ts` |
| **Messagerie** | Communication interne | `messaging.service.ts` |
| **Documents** | Génération et templates | `document.service.ts` |
| **Paiements** | Facturation et suivi | `payment.service.ts`, `session-charges.service.ts` |
| **Présence** | Émargement par session | `attendance.service.ts` |

---

## 🔐 Sécurité

### Authentification
- Authentification Supabase (email/password)
- 2FA (TOTP) avec codes de secours
- Sessions sécurisées avec refresh tokens
- Accès apprenant via lien unique (sans authentification)

### Row Level Security (RLS)
- Toutes les tables sont protégées par RLS
- Isolation multi-tenant garantie
- Policies basées sur `organization_id`
- Fonctions `SECURITY DEFINER` pour contourner RLS quand nécessaire

### Headers de Sécurité
- Content-Security-Policy (CSP)
- Strict-Transport-Security (HSTS)
- X-Frame-Options, X-Content-Type-Options
- Rate Limiting sur les routes API

---

## 📊 Gestion des Erreurs

L'application utilise un système centralisé de gestion d'erreurs avec le hook `useErrorHandler` :

```typescript
import { useErrorHandler } from '@/lib/hooks/use-error-handler'

const { handleError } = useErrorHandler()

try {
  await service.create(data)
} catch (error) {
  handleError(error, { operation: 'create' })
}
```

Les erreurs sont :
- **Classifiées automatiquement** (réseau, DB, validation, etc.)
- **Loggées** avec contexte
- **Affichées** à l'utilisateur avec messages traduits

---

## 🧪 Tests

### Lancer les tests
```bash
npm run test
```

### Tests critiques
```bash
npm run test -- tests/critical
```

### Coverage
```bash
npm run test:coverage
```

---

## 🚢 Déploiement

### Vercel (Recommandé)

1. **Connecter le repository** à Vercel
2. **Configurer les variables d'environnement** dans Vercel
3. **Déployer** : Le déploiement est automatique à chaque push

### Variables d'environnement requises

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

### Migrations en production

```bash
# Via Supabase CLI
supabase db push --db-url $DATABASE_URL
```

---

## 📖 Documentation

- [Guide de Standardisation des Services](./docs/GUIDE_STANDARDISATION_SERVICES.md)
- [Guide de Correction des Requêtes N+1](./docs/GUIDE_CORRECTION_N+1.md)
- [Guide de Rate Limiting](./docs/GUIDE_RATE_LIMITING_API.md)
- [Analyse Complète de l'Application](./docs/ANALYSE_COMPLETE_APPLICATION.md)

---

## 🤝 Contribution

1. Fork le projet
2. Créer une branche (`git checkout -b feature/ma-fonctionnalite`)
3. Commit les changements (`git commit -m 'Ajout de ma fonctionnalité'`)
4. Push vers la branche (`git push origin feature/ma-fonctionnalite`)
5. Ouvrir une Pull Request

### Conventions de Code

- **TypeScript strict** : Toutes les entités doivent être typées
- **Hooks React** : Utiliser `useQuery` et `useMutation` de TanStack Query
- **Services** : Un service par entité métier
- **Composants** : Privilégier les composants fonctionnels et hooks

---

## 📝 Licence

Ce projet est sous licence propriétaire. Tous droits réservés.

---

## 🆘 Support

Pour toute question ou problème :
- **Issues GitHub** : [Créer une issue](https://github.com/votre-org/eduzen/issues)
- **Email** : support@eduzen.com
- **Documentation** : [docs.eduzen.com](https://docs.eduzen.com)

---

## 🎯 Roadmap

- [ ] Application mobile (React Native)
- [ ] Intégration IA pour recommandations pédagogiques
- [ ] Analytics avancés avec machine learning
- [ ] Marketplace de templates de documents
- [ ] API publique pour intégrations tierces
- [ ] Notifications push
- [ ] Intégration avec plus de systèmes de paiement

---

**Développé avec ❤️ pour l'éducation**---

**Document EDUZEN** | [Retour à la documentation principale](README.md) | Dernière mise à jour : 2025-12-30
© 2024 EDUZEN. Tous droits réservés.