# EDUZEN - Guide Complet du Projet

**Version:** 1.0  
**Date:** Janvier 2026  
**Type:** Plateforme SaaS de Gestion d'Organismes de Formation

---

## Table des Matières

1. [Présentation Générale](#1-présentation-générale)
2. [Stack Technique](#2-stack-technique)
3. [Architecture du Projet](#3-architecture-du-projet)
4. [Système de Design & Charte Graphique](#4-système-de-design--charte-graphique)
5. [Fonctionnalités Principales](#5-fonctionnalités-principales)
6. [Structure des Pages](#6-structure-des-pages)
7. [Modèle de Données](#7-modèle-de-données)
8. [Services Métier](#8-services-métier)
9. [Sécurité & Conformité](#9-sécurité--conformité)
10. [Internationalisation](#10-internationalisation)
11. [Composants UI](#11-composants-ui)
12. [Animations & Interactions](#12-animations--interactions)
13. [Bonnes Pratiques](#13-bonnes-pratiques)

---

## 1. Présentation Générale

### 1.1 Description

**EDUZEN** est une plateforme complète de gestion pour les **organismes de formation professionnelle**. Elle permet de gérer l'intégralité du cycle de vie d'une formation : de l'inscription des apprenants à la certification, en passant par la facturation, le suivi pédagogique et la conformité réglementaire (Qualiopi, CPF, RGPD).

### 1.2 Public Cible

- **Organismes de formation** professionnelle
- **Centres de formation** d'apprentis (CFA)
- **Écoles** et établissements d'enseignement supérieur
- **Entreprises** avec services de formation interne

### 1.3 Proposition de Valeur

| Aspect | Description |
|--------|-------------|
| **Simplification** | Interface intuitive pour gérer toutes les opérations |
| **Conformité** | Outils intégrés pour Qualiopi, CPF, RGPD |
| **Automatisation** | Génération automatique de documents, rappels de paiement |
| **Multi-tenant** | Architecture sécurisée avec isolation des données |

---

## 2. Stack Technique

### 2.1 Frontend

| Technologie | Version | Usage |
|-------------|---------|-------|
| **Next.js** | 14.x | Framework React avec App Router |
| **React** | 18.x | Bibliothèque UI |
| **TypeScript** | 5.x | Typage statique |
| **Tailwind CSS** | 3.x | Framework CSS utilitaire |
| **shadcn/ui** | Latest | Composants UI de base |
| **Framer Motion** | Latest | Animations fluides |
| **TanStack Query** | 5.x | Gestion de l'état serveur |
| **React Hook Form** | Latest | Formulaires performants |
| **Zod** | Latest | Validation de schémas |

### 2.2 Backend

| Technologie | Usage |
|-------------|-------|
| **Supabase** | Backend-as-a-Service |
| **PostgreSQL** | Base de données relationnelle |
| **Supabase Auth** | Authentification (email, 2FA, SSO) |
| **Supabase Storage** | Stockage de fichiers |
| **Supabase Realtime** | WebSockets pour le temps réel |
| **Row Level Security** | Sécurité au niveau des lignes |

### 2.3 Outils de Développement

| Outil | Usage |
|-------|-------|
| **Vitest** | Tests unitaires |
| **Playwright** | Tests E2E |
| **ESLint** | Linting JavaScript/TypeScript |
| **Prettier** | Formatage du code |
| **Sentry** | Monitoring des erreurs |

---

## 3. Architecture du Projet

### 3.1 Structure des Dossiers

```
EDUZEN/
├── app/                          # Pages Next.js (App Router)
│   ├── (dashboard)/             # Routes protégées - Dashboard admin
│   │   └── dashboard/
│   │       ├── students/        # Gestion des apprenants
│   │       ├── sessions/        # Gestion des sessions
│   │       ├── formations/      # Gestion des formations
│   │       ├── programs/        # Gestion des programmes
│   │       ├── payments/        # Facturation et paiements
│   │       ├── attendance/      # Émargement et présence
│   │       ├── evaluations/     # Évaluations et notes
│   │       ├── documents/       # Génération de documents
│   │       ├── messages/        # Messagerie interne
│   │       ├── elearning/       # Plateforme e-learning
│   │       ├── settings/        # Paramètres
│   │       ├── qualiopi/        # Suivi Qualiopi
│   │       ├── cpf/             # Gestion CPF
│   │       ├── gdpr/            # Conformité RGPD
│   │       └── ...
│   ├── (learner)/               # Espace apprenant (accès sans auth)
│   ├── (parent)/                # Portail parents
│   ├── api/                     # API Routes
│   └── auth/                    # Pages d'authentification
│
├── components/                   # Composants React réutilisables
│   ├── ui/                      # Composants UI de base (shadcn)
│   ├── dashboard/               # Composants spécifiques dashboard
│   ├── landing/                 # Composants page d'accueil
│   ├── document-editor/         # Éditeur de documents
│   ├── messaging/               # Composants messagerie
│   ├── signatures/              # Signature électronique
│   └── charts/                  # Graphiques premium
│
├── lib/                         # Utilitaires et services
│   ├── services/                # ~100 services métier
│   ├── hooks/                   # Hooks React personnalisés
│   ├── contexts/                # Contextes React
│   ├── utils/                   # Utilitaires généraux
│   ├── validations/             # Schémas Zod
│   └── errors/                  # Gestion d'erreurs
│
├── supabase/                    # Configuration Supabase
│   └── migrations/              # ~200 migrations SQL
│
├── messages/                    # Traductions i18n
│   ├── fr.json
│   └── en.json
│
├── tests/                       # Tests
│   ├── critical/                # Tests critiques
│   ├── services/                # Tests de services
│   └── integration/             # Tests d'intégration
│
└── e2e/                         # Tests End-to-End Playwright
```

### 3.2 Espaces Utilisateur

| Espace | Route | Authentification | Description |
|--------|-------|-----------------|-------------|
| **Dashboard Admin** | `/dashboard/*` | Requise | Interface principale d'administration |
| **Espace Apprenant** | `/learner/*` | Via lien unique | Portail pour les apprenants |
| **Portail Parent** | `/parent/*` | Optionnelle | Suivi pour les parents |
| **Landing Page** | `/` | Non | Page d'accueil publique |

---

## 4. Système de Design & Charte Graphique

### 4.1 Palette de Couleurs Principale

Le système de couleurs d'EDUZEN suit une approche **bicolore professionnelle** avec une dominance de bleu profond et des accents cyan.

#### Couleurs Primaires

| Nom | Code Hex | Usage | Dominance |
|-----|----------|-------|-----------|
| **Deep Blue** | `#274472` | Couleur principale, CTAs, en-têtes | 60% |
| **Sky Cyan** | `#34B9EE` | Accents, éléments secondaires | 25-30% |

#### Variantes du Bleu Principal (`brand-blue`)

```css
--brand-blue: #274472;        /* Principal */
--brand-blue-dark: #1d3556;   /* Hover */
--brand-blue-darker: #15263f; /* Active */
--brand-blue-light: #3b5c8a;  /* Plus clair */
--brand-blue-pale: #d1d9e2;   /* Fonds */
--brand-blue-ghost: #e8ecf0;  /* Très léger */
```

#### Variantes du Cyan (`brand-cyan`)

```css
--brand-cyan: #34B9EE;         /* Principal */
--brand-cyan-dark: #2A95BF;    /* Hover */
--brand-cyan-light: #5CCBF3;   /* Plus clair */
--brand-cyan-pale: #BFEAFB;    /* Fonds */
--brand-cyan-ghost: #E5F6FD;   /* Très léger */
```

#### Couleurs Sémantiques

| Type | Couleur | Code | Usage |
|------|---------|------|-------|
| **Success** | Bleu | `#335ACF` | Statuts positifs, validations |
| **Danger** | Rouge | `#EF4444` | Erreurs, suppressions |
| **Warning** | Cyan | `#34B9EE` | Avertissements |

> **Règle importante :** Le vert et le jaune ne sont PAS utilisés dans l'application. Les statuts positifs utilisent le bleu.

#### Couleurs de Texte

| Type | Couleur | Usage |
|------|---------|-------|
| **Primary** | `#000000` | Texte principal |
| **Secondary** | `#1A1A1A` | Texte secondaire |
| **Tertiary** | `#4D4D4D` | Texte tertiaire |
| **Disabled** | `#999999` | Texte désactivé |
| **On Blue/Cyan** | `#FFFFFF` | Texte sur fond coloré |

#### Couleurs de Fond

```css
--bg-white: #FFFFFF;
--bg-gray-50: #F9FAFB;
--bg-gray-100: #F3F4F6;
--bg-gray-200: #E5E7EB;
```

### 4.2 Gradients

```css
/* Gradient principal (Bleu → Cyan) */
background: linear-gradient(135deg, #274472 0%, #34B9EE 100%);

/* Gradient vertical */
background: linear-gradient(180deg, #274472 0%, #34B9EE 100%);

/* Gradient subtil (pour fonds) */
background: linear-gradient(135deg, rgba(39,68,114,0.1) 0%, rgba(52,185,238,0.1) 100%);
```

### 4.3 Typographie

#### Polices

| Police | Variable | Usage |
|--------|----------|-------|
| **Inter** | `--font-sans` | Corps de texte |
| **Space Grotesk** | `--font-display` | Titres et headings |

#### Échelle Typographique

```css
/* Tailles avec letter-spacing optimisé */
text-xs: 0.75rem    /* 12px */
text-sm: 0.875rem   /* 14px */
text-base: 1rem     /* 16px */
text-lg: 1.125rem   /* 18px */
text-xl: 1.25rem    /* 20px */
text-2xl: 1.5rem    /* 24px */
text-3xl: 1.875rem  /* 30px */
text-4xl: 2.25rem   /* 36px */
text-5xl: 3rem      /* 48px */
```

#### Letter Spacing Premium

```css
--tracking-tightest: -0.08em;  /* Titres très serrés */
--tracking-tight: -0.025em;    /* Titres */
--tracking-normal: -0.011em;   /* Corps de texte */
--tracking-luxe: -0.06em;      /* Effet premium */
```

### 4.4 Ombres

```css
/* Ombres premium */
--shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
--shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);
--shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1);
--shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1);
--shadow-premium: 0 20px 60px -15px rgba(99, 102, 241, 0.5);
--shadow-glow: 0 0 40px rgba(99, 102, 241, 0.4);
```

### 4.5 Rayons de Bordure

```css
--radius: 0.75rem;              /* 12px - Standard */
--radius-sm: calc(0.75rem - 4px); /* 8px - Petit */
--radius-lg: calc(0.75rem + 4px); /* 16px - Grand */
```

### 4.6 Mode Sombre

Le projet supporte un mode sombre avec les ajustements suivants :

```css
.dark {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  --text-primary: #FFFFFF;
  --bg-white: #1F2937;
  --color-primary: #3B82F6;
}
```

---

## 5. Fonctionnalités Principales

### 5.1 Gestion Pédagogique

#### Apprenants (Students)
- Création et gestion de profils complets
- Photo de profil
- Historique académique
- Statuts : Actif, Inactif, Diplômé, Suspendu
- Import/Export en masse

#### Programmes
- Création de parcours de formation
- Association de formations
- Gestion des objectifs pédagogiques

#### Formations
- Définition du contenu pédagogique
- Durée et prérequis
- Association à des certifications RNCP/RS

#### Sessions
- Planification avec dates de début/fin
- Gestion des intervenants
- Suivi du statut (À venir, En cours, Terminée)
- Workflow de configuration en étapes

#### E-Learning
- Création de cours en ligne
- Leçons avec contenu multimédia
- Quiz et évaluations
- Suivi de progression

### 5.2 Suivi et Émargement

#### Présence (Attendance)
- Émargement électronique
- Émargement par QR Code
- Géolocalisation optionnelle
- Signatures numériques
- Export des feuilles d'émargement

#### Évaluations
- Templates d'évaluation personnalisables
- Notes et commentaires
- Bulletins de notes automatisés
- Portfolios d'apprentissage (livrets de suivi)

### 5.3 Gestion Financière

#### Facturation
- Création de factures et devis
- Gestion des statuts (Brouillon, Envoyée, Payée, En retard)
- Numérotation automatique
- Export comptable (FEC)

#### Paiements
- Suivi des encaissements
- Rappels de paiement automatiques
- Intégration Stripe
- Support Mobile Money (Afrique)
- Intégration SEPA

#### Rapports Financiers
- Tableau de bord des revenus
- Évolution mensuelle
- Répartition par statut de facture
- Bilan Pédagogique et Financier (BPF)

### 5.4 Documents

#### Génération de Documents
- Conventions de formation
- Convocations
- Attestations
- Certificats
- Bulletins de notes

#### Templates Personnalisables
- Éditeur WYSIWYG intégré (TipTap)
- En-têtes et pieds de page personnalisés
- Variables dynamiques ({{student.name}}, etc.)
- Gestion des versions
- Marketplace de templates

#### Signature Électronique
- Intégration DocuSign
- Intégration HelloSign
- Signature via canvas intégré

### 5.5 Communication

#### Messagerie Interne
- Conversations directes
- Groupes de discussion
- Pièces jointes (PDF, images, documents)
- Temps réel via WebSockets

#### Notifications
- Centre de notifications
- Emails automatiques
- Templates d'emails personnalisables
- Planification d'envois

### 5.6 Conformité

#### Qualiopi
- Tableau de bord de conformité
- Checklist des indicateurs
- Stockage des preuves
- Alertes de non-conformité

#### CPF
- Synchronisation catalogue
- Gestion des dossiers CPF
- Configuration des certifications

#### RGPD
- Gestion du consentement
- Export des données personnelles
- Suppression sur demande
- Registre des traitements

#### OPCO
- Gestion des financements
- Suivi des demandes de prise en charge

### 5.7 Intégrations

| Type | Intégrations |
|------|-------------|
| **Calendrier** | Google Calendar, Outlook |
| **Comptabilité** | QuickBooks, Xero, Sage |
| **CRM** | HubSpot, Salesforce, Pipedrive |
| **Vidéoconférence** | Zoom, Google Meet |
| **LMS** | Moodle, Canvas |
| **SSO** | Google, Microsoft, GitHub |

---

## 6. Structure des Pages

### 6.1 Dashboard Principal

Le dashboard s'adapte au rôle de l'utilisateur :

#### Dashboard Admin
- Statistiques clés (apprenants, revenus, présence)
- Graphique d'évolution des revenus (6 mois)
- Répartition des factures (pie chart)
- Actions rapides
- Heatmap d'activité
- Top programmes
- Inscriptions récentes

#### Dashboard Enseignant (Teacher)
- Sessions assignées
- Apprenants actuels
- Émargements du jour
- Actions rapides (Émargement, Mes apprenants, Évaluations)

### 6.2 Navigation Sidebar

La sidebar est organisée en sections :

1. **Principal** : Dashboard, Calendrier, Messages
2. **Pédagogie** : Apprenants, Programmes, Sessions, E-learning, Suivi
3. **Gestion** : Finances, Documents, Sites
4. **Conformité** : Qualiopi, CPF, OPCO, RGPD
5. **Aide** : Tutoriels, Documentation, Support

### 6.3 Pages de Détail (Sessions)

Structure d'une page de session détaillée :

```
Session Detail
├── Sidebar de navigation par section
├── Onglets de configuration
│   ├── Initialisation (nom, dates, formation)
│   ├── Dates & Prix
│   ├── Apprenants (inscriptions)
│   ├── Intervenants
│   └── Programme
├── Onglets de gestion
│   ├── Conventions
│   ├── Convocations
│   ├── Évaluations
│   ├── Finances
│   └── Automatisation
└── Timeline de progression
```

---

## 7. Modèle de Données

### 7.1 Entités Principales

```
organizations
├── id (uuid)
├── name
├── slug
├── logo_url
├── settings (jsonb)
└── created_at

users
├── id (uuid)
├── organization_id → organizations
├── email
├── full_name
├── role (super_admin, admin, secretary, accountant, teacher)
├── is_active
└── created_at

students
├── id (uuid)
├── organization_id → organizations
├── first_name
├── last_name
├── email
├── phone
├── photo_url
├── status (active, inactive, graduated, suspended)
└── created_at

programs
├── id (uuid)
├── organization_id → organizations
├── name
├── code
├── description
├── is_active
└── created_at

formations
├── id (uuid)
├── organization_id → organizations
├── program_id → programs
├── name
├── code
├── duration_hours
├── is_active
└── created_at

sessions
├── id (uuid)
├── formation_id → formations
├── name
├── start_date
├── end_date
├── status (draft, planned, ongoing, completed, cancelled)
├── max_students
└── created_at

enrollments
├── id (uuid)
├── session_id → sessions
├── student_id → students
├── status (pending, confirmed, cancelled)
├── enrolled_at
└── created_at

attendance
├── id (uuid)
├── session_id → sessions
├── student_id → students
├── date
├── status (present, absent, late, excused)
├── signature
└── created_at

invoices
├── id (uuid)
├── organization_id → organizations
├── student_id → students
├── number
├── document_type (invoice, quote)
├── status (draft, sent, paid, partial, overdue, cancelled)
├── total_amount
├── due_date
└── created_at

payments
├── id (uuid)
├── organization_id → organizations
├── invoice_id → invoices
├── amount
├── currency
├── status (pending, completed, failed)
├── payment_method
├── paid_at
└── created_at
```

### 7.2 Sécurité RLS (Row Level Security)

Toutes les tables sont protégées par des politiques RLS basées sur `organization_id` :

```sql
-- Exemple de politique RLS
CREATE POLICY "Users can only see their organization's students"
  ON students
  FOR SELECT
  USING (organization_id = auth.jwt() ->> 'organization_id');
```

---

## 8. Services Métier

### 8.1 Liste des Services (~100+)

Le projet contient plus de 100 services métier organisés par domaine :

| Catégorie | Services |
|-----------|----------|
| **Étudiants** | `student.service.ts` |
| **Sessions** | `session.service.ts`, `session-slot.service.ts`, `session-charges.service.ts` |
| **Évaluations** | `evaluation.service.ts`, `evaluation-template.service.ts`, `learning-portfolio.service.ts` |
| **Paiements** | `payment.service.ts`, `invoice.service.ts`, `payment-reminder.service.ts` |
| **Documents** | `document.service.ts`, `document-template.service.ts`, `docx-generator.service.ts` |
| **Messagerie** | `messaging.service.ts`, `notification.service.ts`, `email.service.ts` |
| **Présence** | `attendance.service.ts`, `electronic-attendance.service.ts` |
| **Conformité** | `qualiopi.service.ts`, `cpf.service.ts`, `compliance.service.ts` |
| **Intégrations** | `calendar.service.ts`, `accounting.service.ts`, `crm.service.ts` |
| **Auth** | `2fa.service.ts`, `sso.service.ts` |

### 8.2 Pattern de Service Standard

```typescript
// Exemple de structure de service
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/types/database'

type Student = Database['public']['Tables']['students']['Row']

export const studentService = {
  async getAll(organizationId: string): Promise<Student[]> {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data || []
  },

  async getById(id: string): Promise<Student | null> {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error) throw error
    return data
  },

  async create(student: Omit<Student, 'id' | 'created_at'>): Promise<Student> {
    // ...
  },

  async update(id: string, updates: Partial<Student>): Promise<Student> {
    // ...
  },

  async delete(id: string): Promise<void> {
    // ...
  }
}
```

---

## 9. Sécurité & Conformité

### 9.1 Authentification

- **Email/Password** via Supabase Auth
- **2FA/TOTP** avec codes de secours
- **SSO** : Google, Microsoft, GitHub
- **Sessions** avec refresh tokens

### 9.2 Autorisations

Rôles disponibles :
- `super_admin` : Accès total à la plateforme
- `admin` : Gestion complète de l'organisation
- `secretary` : Gestion administrative (pas de finances avancées)
- `accountant` : Accès aux finances
- `teacher` : Accès limité aux sessions assignées

### 9.3 Sécurité des Données

- **Row Level Security (RLS)** : Isolation des données par organisation
- **HTTPS** obligatoire
- **CSP Headers** : Protection contre XSS
- **Rate Limiting** : Protection contre les abus

### 9.4 Conformité RGPD

- Consentement explicite
- Droit d'accès et d'export
- Droit à l'effacement
- Registre des traitements
- Chiffrement des données sensibles

---

## 10. Internationalisation

### 10.1 Langues Supportées

| Langue | Code | Fichier |
|--------|------|---------|
| Français | `fr` | `messages/fr.json` |
| Anglais | `en` | `messages/en.json` |

### 10.2 Structure des Traductions

```json
{
  "common": {
    "welcome": "Bienvenue",
    "dashboard": "Tableau de bord",
    "save": "Enregistrer",
    "cancel": "Annuler"
  },
  "navigation": {
    "pedagogy": "Pédagogie",
    "finance": "Finance"
  },
  "students": {
    "title": "Étudiants",
    "newStudent": "Nouvel étudiant"
  }
}
```

### 10.3 Vocabulaire Adaptatif

Le système supporte un vocabulaire adapté au type d'établissement :

| Type | Apprenants | Évaluations | Présence |
|------|------------|-------------|----------|
| **school** | Étudiants | Évaluations | Présence |
| **training** | Apprenants | Évaluations | Émargement |
| **enterprise** | Collaborateurs | Bilans | Participation |

---

## 11. Composants UI

### 11.1 Composants de Base (shadcn/ui)

```
components/ui/
├── button.tsx
├── input.tsx
├── select.tsx
├── dialog.tsx
├── card.tsx
├── table.tsx
├── tabs.tsx
├── badge.tsx
├── avatar.tsx
├── form.tsx
└── ...
```

### 11.2 Composants Premium

```
components/
├── ui/
│   ├── glass-card.tsx          # Cards avec effet glassmorphism
│   ├── bento-grid.tsx          # Layout Bento style Apple
│   ├── 3d-card.tsx             # Cards avec effet 3D
│   └── micro-interactions.tsx  # Micro-animations
├── charts/
│   ├── premium-line-chart.tsx  # Graphiques linéaires
│   ├── premium-bar-chart.tsx   # Graphiques en barres
│   └── premium-pie-chart.tsx   # Graphiques circulaires
└── dashboard/
    ├── stats-ring-chart.tsx    # Anneaux de progression
    └── activity-heatmap.tsx    # Heatmap d'activité
```

### 11.3 GlassCard Component

```tsx
<GlassCard
  variant="premium"
  hoverable
  glow
  glowColor="rgba(39, 68, 114, 0.4)"
  className="p-6"
>
  {children}
</GlassCard>
```

Variantes :
- `default` : Card standard
- `premium` : Effet glassmorphism prononcé
- `subtle` : Effet léger

---

## 12. Animations & Interactions

### 12.1 Animations Globales

Définies dans `tailwind.config.js` :

| Animation | Durée | Usage |
|-----------|-------|-------|
| `fade-in` | 0.5s | Apparition des éléments |
| `slide-up` | 0.8s | Entrée par le bas |
| `scale-in` | 0.2s | Zoom in |
| `shimmer` | 2s | Effet de chargement |
| `float` | 6s | Éléments flottants |
| `gradient-shift` | 3s | Animation de gradient |

### 12.2 Transitions Premium

```css
/* Courbe d'animation Apple-style */
transition-timing-function: cubic-bezier(0.16, 1, 0.3, 1);
```

### 12.3 Effets Hover

```css
/* Lift effect */
.hover-lift:hover {
  transform: translateY(-4px);
}

/* Glow effect */
.hover-glow:hover {
  box-shadow: 0 10px 40px -10px rgba(37, 99, 235, 0.3);
}
```

### 12.4 Glassmorphism

```css
.glass-morphism {
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(40px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.18);
  box-shadow: 
    0 8px 32px rgba(31, 38, 135, 0.15),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
}
```

---

## 13. Bonnes Pratiques

### 13.1 Code

- **TypeScript strict** : Toujours typer les retours de fonction
- **Services** : Un service par entité métier
- **Hooks** : Utiliser TanStack Query pour les données serveur
- **Composants** : Privilégier les composants fonctionnels

### 13.2 Commits

```bash
# Format
<type>: <description>

# Types
feat: Nouvelle fonctionnalité
fix: Correction de bug
refactor: Refactoring
docs: Documentation
style: Formatage
test: Tests
```

### 13.3 Tests

- Tests unitaires pour les services critiques
- Tests E2E pour les parcours utilisateur
- Coverage minimum : 70%

### 13.4 Performance

- Lazy loading des composants lourds
- Optimisation des images (Next Image)
- Mise en cache avec TanStack Query
- Bundle splitting automatique avec Next.js

---

## Annexes

### A. Variables d'Environnement

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Optionnel
SENTRY_DSN=
STRIPE_SECRET_KEY=
```

### B. Commandes Utiles

```bash
# Développement
npm run dev

# Build
npm run build

# Tests
npm run test
npm run test:e2e

# Lint
npm run lint

# Migrations Supabase
supabase db push
```

### C. Ressources

- **Documentation Next.js** : https://nextjs.org/docs
- **Documentation Supabase** : https://supabase.com/docs
- **shadcn/ui** : https://ui.shadcn.com
- **Tailwind CSS** : https://tailwindcss.com/docs

---

**Document rédigé pour EDUZEN**  
**Dernière mise à jour : Janvier 2026**
