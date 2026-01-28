# Système d'Onboarding Automatique - Documentation

## Vue d'ensemble

Ce document décrit l'implémentation du système d'onboarding automatisé pour EDUZEN, permettant de mettre en service un nouvel organisme de formation en quelques étapes simples.

## Architecture

### 1. Service d'Initialisation (`organization-setup.service.ts`)

Le service `OrganizationSetupService` automatise la création d'un environnement de démonstration "prêt à l'emploi" :

- **Templates de documents par défaut** : Crée automatiquement des templates pour :
  - Conventions de formation
  - Convocations
  - Attestations

- **Checklist Qualiopi** : Initialise les indicateurs Qualiopi selon les domaines d'action sélectionnés

- **Session de démonstration** : Crée une session "Bac à sable" pour tester les fonctionnalités

- **Paramètres d'organisation** : Configure la couleur primaire et le logo

### 2. Service d'Importation (`import.service.ts`)

Le service `ImportService` permet l'importation intelligente de stagiaires avec :

- **Détection automatique du mapping** : Utilise un algorithme de similarité pour mapper automatiquement les colonnes CSV/Excel aux champs de la base de données

- **Validation en temps réel** : Utilise Zod pour valider chaque ligne avant l'import

- **Gestion des erreurs** : N'arrête pas l'import en cas d'erreur sur une ligne, affiche un rapport détaillé

- **Export des erreurs** : Permet de télécharger un CSV avec les lignes en erreur pour correction

### 3. API SIRENE (`/api/sirene/search`)

Endpoint pour récupérer automatiquement les informations d'entreprise via l'API SIRENE de l'INSEE :

- Recherche par SIRET (14 chiffres)
- Recherche par SIREN (9 chiffres)
- Recherche par nom d'entreprise

**Configuration requise** : Variable d'environnement `SIRENE_API_KEY` ou `NEXT_PUBLIC_SIRENE_API_KEY`

### 4. Wizard de Configuration (`organization-setup-wizard.tsx`)

Composant React en 4 étapes :

#### Étape 1 : Identité de l'OF
- Recherche automatique via SIRENE (SIRET)
- Saisie manuelle si nécessaire
- Récupération automatique : nom, adresse, code postal, ville

#### Étape 2 : Configuration Qualiopi
- Sélection des domaines d'action :
  - Actions de formation
  - VAE
  - Apprentissage
  - Bilan de compétences
  - Actions de formation par apprentissage

#### Étape 3 : Charte Graphique
- Upload du logo
- Choix de la couleur primaire (défaut : #274472 - Bleu EDUZEN)

#### Étape 4 : Signature Électronique
- Activation du canvas de signature pour les documents

### 5. Assistant d'Importation (`import-assistant.tsx`)

Composant pour l'importation de stagiaires :

1. **Upload** : Sélection du fichier CSV/Excel
2. **Mapping** : Vérification et ajustement du mapping automatique
3. **Validation** : Import avec validation en temps réel
4. **Résultat** : Affichage du rapport d'import avec erreurs et avertissements

### 6. Documentation Contextuelle

#### Checklist d'Onboarding (`onboarding-checklist.tsx`)

Widget flottant en bas à droite du dashboard affichant :
- [x] Créer mon premier programme
- [ ] Inscrire mon premier stagiaire (Gagnez 10 jours d'essai gratuit)
- [ ] Générer ma première convention
- [ ] Configurer Qualiopi
- [ ] Configurer les paiements

Barre de progression et récompenses pour encourager la complétion.

#### Aide Contextuelle (`contextual-help.tsx`)

Composant réutilisable pour ajouter des tooltips d'aide :
```tsx
<ContextualHelp 
  content="Le Bilan Pédagogique et Financier (BPF) est un document obligatoire..."
  title="Qu'est-ce qu'un BPF ?"
/>
```

## Intégration dans le Flux

### Redirection Automatique

Le layout du dashboard (`app/(dashboard)/layout.tsx`) vérifie automatiquement si l'onboarding est terminé :

- Si non terminé → Redirection vers `/dashboard/onboarding`
- Si terminé → Accès normal au dashboard

### Page d'Onboarding

Route : `/dashboard/onboarding`

Affiche le wizard complet sans sidebar ni header pour une expérience immersive.

## Utilisation

### Pour un nouvel organisme

1. **Inscription** : L'utilisateur crée son compte
2. **Redirection automatique** : Vers le wizard d'onboarding
3. **Configuration en 4 étapes** : 
   - Identité (avec recherche SIRENE)
   - Qualiopi
   - Charte graphique
   - Signature
4. **Initialisation automatique** : 
   - Templates créés
   - Checklist Qualiopi initialisée
   - Session de démonstration créée
5. **Accès au dashboard** : Avec checklist d'onboarding visible

### Pour importer des stagiaires

1. Aller dans `/dashboard/students`
2. Cliquer sur "Importer"
3. Sélectionner le fichier CSV/Excel
4. Vérifier le mapping automatique
5. Valider l'import
6. Consulter le rapport d'erreurs si nécessaire

## Configuration

### Variables d'Environnement

```env
# API SIRENE (optionnel, pour la recherche automatique)
SIRENE_API_KEY=votre_cle_api_insee
# ou
NEXT_PUBLIC_SIRENE_API_KEY=votre_cle_api_insee
```

Pour obtenir une clé API SIRENE :
1. Créer un compte sur https://api.insee.fr/
2. Générer une clé API
3. L'ajouter aux variables d'environnement

## Structure des Fichiers

```
lib/services/
├── organization-setup.service.ts    # Service d'initialisation
└── import.service.ts                 # Service d'importation

app/api/
└── sirene/
    └── search/
        └── route.ts                  # API route SIRENE

components/onboarding/
├── organization-setup-wizard.tsx     # Wizard de configuration
├── import-assistant.tsx              # Assistant d'importation
├── onboarding-checklist.tsx          # Checklist de démarrage
└── contextual-help.tsx               # Aide contextuelle

app/(dashboard)/dashboard/
└── onboarding/
    └── page.tsx                      # Page d'onboarding
```

## Prochaines Étapes (Améliorations Possibles)

1. **Templates personnalisables** : Permettre à l'utilisateur de choisir parmi des templates prédéfinis
2. **Import de sessions** : Étendre l'importation aux sessions et formations
3. **Tutoriels vidéo** : Intégrer des vidéos de démonstration dans le wizard
4. **Gamification** : Ajouter des badges et récompenses pour la complétion des étapes
5. **Support multi-langues** : Traduire le wizard en anglais
6. **Analytics** : Suivre le taux de complétion de l'onboarding

## Notes Techniques

- Le service d'initialisation est idempotent : peut être appelé plusieurs fois sans créer de doublons
- L'importation utilise un algorithme de Levenshtein pour la détection de similarité
- La validation Zod garantit la cohérence des données avant insertion
- Les erreurs d'import sont loggées mais n'arrêtent pas le processus global

## Support

Pour toute question ou problème, consulter :
- La documentation du projet : `docs/GUIDE_PROJET_EDUZEN.md`
- Les logs dans la console du navigateur (mode développement)
- Les logs serveur pour les erreurs API
