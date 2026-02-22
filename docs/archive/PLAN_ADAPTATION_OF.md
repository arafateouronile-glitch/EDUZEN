---
title: Plan dAdaptation pour Organismes de Formation
date: 2025-12-30
version: 1.0
author: EDUZEN Team
---


# Plan d'Adaptation pour Organismes de Formation

## 🎯 Objectif
Adapter EDUZEN pour cibler les organismes de formation en France et Europe francophone, tout en conservant la compatibilité avec les établissements scolaires.

---

## 📋 Phase 1 : Système de Vocabulaire Adaptatif (Priorité 1)

### Créer un système de terminologie dynamique

**Fichier à créer : `lib/utils/vocabulary.ts`**

```typescript
export type OrganizationType = 'training_organization' | 'school' | 'both'

export interface Vocabulary {
  student: string
  students: string
  student_singular: string
  student_plural: string
  course: string
  courses: string
  report_card: string
  report_cards: string
  academic_year: string
  enrollment: string
  enrollments: string
  // ... etc
}

export const vocabularies: Record<OrganizationType, Vocabulary> = {
  training_organization: {
    student: 'Stagiaire',
    students: 'Stagiaires',
    student_singular: 'le stagiaire',
    student_plural: 'les stagiaires',
    course: 'Formation',
    courses: 'Formations',
    report_card: 'Attestation de formation',
    report_cards: 'Attestations de formation',
    academic_year: 'Session de formation',
    enrollment: 'Inscription',
    enrollments: 'Inscriptions',
  },
  school: {
    student: 'Élève',
    students: 'Élèves',
    student_singular: "l'élève",
    student_plural: 'les élèves',
    course: 'Cours',
    courses: 'Cours',
    report_card: 'Bulletin',
    report_cards: 'Bulletins',
    academic_year: 'Année scolaire',
    enrollment: 'Inscription',
    enrollments: 'Inscriptions',
  },
  both: {
    // Vocabulaire générique
    student: 'Apprenant',
    students: 'Apprenants',
    // ...
  }
}
```

### Ajouter un champ `organization_type` à la table `organizations`

**Migration SQL :**
```sql
ALTER TABLE organizations 
ADD COLUMN organization_type VARCHAR(50) DEFAULT 'school' 
CHECK (organization_type IN ('training_organization', 'school', 'both'));

-- Mettre à jour les organisations existantes
UPDATE organizations SET organization_type = 'school' WHERE organization_type IS NULL;
```

---

## 📋 Phase 2 : Paiements Européens (Priorité 1)

### Retirer Mobile Money
- ❌ Supprimer les adapters Mobile Money (MTN, Orange, Airtel, Wave)
- ❌ Supprimer les pages de configuration Mobile Money
- ❌ Supprimer les migrations SQL liées

### Ajouter Paiements Européens
- ✅ **Stripe** (cartes bancaires)
- ✅ **PayPal** (optionnel)
- ✅ **SEPA** (virements bancaires)
- ✅ **Prélèvements SEPA**

**Fichiers à créer :**
- `lib/services/payment/stripe.adapter.ts`
- `lib/services/payment/sepa.adapter.ts`
- `app/api/payments/stripe/route.ts`
- `app/api/payments/sepa/route.ts`

### Changer devise par défaut
- ✅ EUR au lieu de XOF
- ✅ Support CHF (Suisse) et GBP (optionnel)

---

## 📋 Phase 3 : Module Qualiopi (Priorité 2)

### Créer le module Qualiopi complet

**Tables SQL à créer :**
- `qualiopi_indicators` (indicateurs Qualiopi)
- `qualiopi_evidence` (preuves de conformité)
- `qualiopi_reports` (rapports Qualiopi)
- `qualiopi_audits` (audits Qualiopi)

**Fichiers à créer :**
- `lib/services/qualiopi.service.ts`
- `app/(dashboard)/dashboard/qualiopi/page.tsx`
- `app/(dashboard)/dashboard/qualiopi/indicators/page.tsx`
- `app/(dashboard)/dashboard/qualiopi/reports/page.tsx`

**Fonctionnalités :**
- Indicateurs Qualiopi automatiques
- Rapports de conformité
- Gestion des preuves
- Tableau de bord Qualiopi

---

## 📋 Phase 4 : Module CPF (Priorité 2)

### Intégration Compte Personnel de Formation

**Tables SQL à créer :**
- `cpf_financings` (financements CPF)
- `cpf_attestations` (attestations CPF)
- `cpf_rights` (droits CPF)

**Fichiers à créer :**
- `lib/services/cpf.service.ts`
- `app/(dashboard)/dashboard/cpf/page.tsx`
- `app/api/cpf/check-rights/route.ts`
- `app/api/cpf/generate-attestation/route.ts`

**Fonctionnalités :**
- Vérification des droits CPF
- Génération d'attestations CPF
- Suivi des financements CPF
- Intégration avec Mon Compte Formation (API)

---

## 📋 Phase 5 : Module OPCO (Priorité 2)

### Gestion des Opérateurs de Compétences

**Tables SQL à créer :**
- `opco_configurations` (configurations OPCO)
- `opco_financings` (financements OPCO)
- `opco_declarations` (déclarations OPCO)

**Fichiers à créer :**
- `lib/services/opco.service.ts`
- `app/(dashboard)/dashboard/opco/page.tsx`
- `app/api/opco/declare/route.ts`

**Fonctionnalités :**
- Gestion des financements OPCO
- Déclarations automatiques
- Suivi des subventions

---

## 📋 Phase 6 : Conformité RGPD Renforcée (Priorité 1)

### Module RGPD Complet

**Tables SQL à créer :**
- `gdpr_consents` (consentements)
- `gdpr_data_requests` (demandes de données)
- `gdpr_processing_register` (registre des traitements)

**Fichiers à créer :**
- `lib/services/gdpr.service.ts`
- `app/(dashboard)/dashboard/gdpr/page.tsx`
- `app/api/gdpr/export-data/route.ts`
- `app/api/gdpr/delete-data/route.ts`

**Fonctionnalités :**
- Gestion des consentements
- Droit à l'oubli
- Portabilité des données
- Registre des traitements
- DPO (Délégué à la Protection des Données)

---

## 📋 Phase 7 : Intégration Datadock (Priorité 3)

### Export Datadock

**Fichiers à créer :**
- `lib/services/datadock.service.ts`
- `app/api/datadock/export/route.ts`
- `app/(dashboard)/dashboard/datadock/page.tsx`

**Fonctionnalités :**
- Export des données au format Datadock
- Synchronisation automatique
- Validation des données

---

## 📋 Phase 8 : Gestion des Certifications (Priorité 3)

### Référentiels de Compétences

**Tables SQL à créer :**
- `competency_frameworks` (référentiels)
- `competencies` (compétences)
- `competency_blocks` (blocs de compétences)
- `certifications` (certifications)

**Fichiers à créer :**
- `lib/services/certification.service.ts`
- `app/(dashboard)/dashboard/certifications/page.tsx`

**Fonctionnalités :**
- Gestion des référentiels
- Validation des compétences
- Génération de certificats

---

## 🗂️ Structure des Fichiers à Créer/Modifier

### Nouveaux Fichiers
```
lib/
  services/
    payment/
      stripe.adapter.ts
      sepa.adapter.ts
    qualiopi.service.ts
    cpf.service.ts
    opco.service.ts
    gdpr.service.ts
    datadock.service.ts
    certification.service.ts
  utils/
    vocabulary.ts

app/
  (dashboard)/
    dashboard/
      qualiopi/
        page.tsx
        indicators/
          page.tsx
        reports/
          page.tsx
      cpf/
        page.tsx
      opco/
        page.tsx
      gdpr/
        page.tsx
      datadock/
        page.tsx
      certifications/
        page.tsx

supabase/
  migrations/
    20241203000001_add_organization_type.sql
    20241203000002_create_qualiopi_module.sql
    20241203000003_create_cpf_module.sql
    20241203000004_create_opco_module.sql
    20241203000005_create_gdpr_module.sql
    20241203000006_create_datadock_module.sql
    20241203000007_create_certifications_module.sql
```

### Fichiers à Modifier
- Tous les composants utilisant "élève" → utiliser `vocabulary.student`
- Tous les composants utilisant "cours" → utiliser `vocabulary.course`
- Configuration des paiements → retirer Mobile Money, ajouter Stripe/SEPA
- Devise par défaut → EUR

---

## ⏱️ Planning Estimé

### Phase 1 : Vocabulaire Adaptatif
- **Durée** : 1 semaine
- **Effort** : Moyen
- **Priorité** : 1

### Phase 2 : Paiements Européens
- **Durée** : 2 semaines
- **Effort** : Élevé
- **Priorité** : 1

### Phase 3 : Module Qualiopi
- **Durée** : 3 semaines
- **Effort** : Élevé
- **Priorité** : 2

### Phase 4 : Module CPF
- **Durée** : 2 semaines
- **Effort** : Moyen
- **Priorité** : 2

### Phase 5 : Module OPCO
- **Durée** : 2 semaines
- **Effort** : Moyen
- **Priorité** : 2

### Phase 6 : RGPD Renforcé
- **Durée** : 2 semaines
- **Effort** : Moyen
- **Priorité** : 1

### Phase 7 : Datadock
- **Durée** : 1 semaine
- **Effort** : Faible
- **Priorité** : 3

### Phase 8 : Certifications
- **Durée** : 2 semaines
- **Effort** : Moyen
- **Priorité** : 3

**Total estimé : 15 semaines (3-4 mois)**

---

## 🎯 Priorités d'Implémentation

### Sprint 1 (2 semaines)
1. ✅ Système de vocabulaire adaptatif
2. ✅ Paiements Stripe
3. ✅ RGPD renforcé

### Sprint 2 (2 semaines)
4. ✅ Module Qualiopi (base)
5. ✅ Module CPF (base)

### Sprint 3 (2 semaines)
6. ✅ Module OPCO
7. ✅ Paiements SEPA

### Sprint 4 (2 semaines)
8. ✅ Qualiopi (avancé)
9. ✅ Datadock

### Sprint 5 (2 semaines)
10. ✅ Certifications
11. ✅ Tests et optimisations

---

## 📝 Notes Importantes

- **Double marché** : L'application doit fonctionner pour OF ET écoles
- **Vocabulaire adaptatif** : Essentiel pour la flexibilité
- **Conformité stricte** : Qualiopi, RGPD, ISO 27001
- **Hébergement Europe** : Obligatoire pour RGPD
- **Support français** : Essentiel pour la confiance



## 🎯 Objectif
Adapter EDUZEN pour cibler les organismes de formation en France et Europe francophone, tout en conservant la compatibilité avec les établissements scolaires.

---

## 📋 Phase 1 : Système de Vocabulaire Adaptatif (Priorité 1)

### Créer un système de terminologie dynamique

**Fichier à créer : `lib/utils/vocabulary.ts`**

```typescript
export type OrganizationType = 'training_organization' | 'school' | 'both'

export interface Vocabulary {
  student: string
  students: string
  student_singular: string
  student_plural: string
  course: string
  courses: string
  report_card: string
  report_cards: string
  academic_year: string
  enrollment: string
  enrollments: string
  // ... etc
}

export const vocabularies: Record<OrganizationType, Vocabulary> = {
  training_organization: {
    student: 'Stagiaire',
    students: 'Stagiaires',
    student_singular: 'le stagiaire',
    student_plural: 'les stagiaires',
    course: 'Formation',
    courses: 'Formations',
    report_card: 'Attestation de formation',
    report_cards: 'Attestations de formation',
    academic_year: 'Session de formation',
    enrollment: 'Inscription',
    enrollments: 'Inscriptions',
  },
  school: {
    student: 'Élève',
    students: 'Élèves',
    student_singular: "l'élève",
    student_plural: 'les élèves',
    course: 'Cours',
    courses: 'Cours',
    report_card: 'Bulletin',
    report_cards: 'Bulletins',
    academic_year: 'Année scolaire',
    enrollment: 'Inscription',
    enrollments: 'Inscriptions',
  },
  both: {
    // Vocabulaire générique
    student: 'Apprenant',
    students: 'Apprenants',
    // ...
  }
}
```

### Ajouter un champ `organization_type` à la table `organizations`

**Migration SQL :**
```sql
ALTER TABLE organizations 
ADD COLUMN organization_type VARCHAR(50) DEFAULT 'school' 
CHECK (organization_type IN ('training_organization', 'school', 'both'));

-- Mettre à jour les organisations existantes
UPDATE organizations SET organization_type = 'school' WHERE organization_type IS NULL;
```

---

## 📋 Phase 2 : Paiements Européens (Priorité 1)

### Retirer Mobile Money
- ❌ Supprimer les adapters Mobile Money (MTN, Orange, Airtel, Wave)
- ❌ Supprimer les pages de configuration Mobile Money
- ❌ Supprimer les migrations SQL liées

### Ajouter Paiements Européens
- ✅ **Stripe** (cartes bancaires)
- ✅ **PayPal** (optionnel)
- ✅ **SEPA** (virements bancaires)
- ✅ **Prélèvements SEPA**

**Fichiers à créer :**
- `lib/services/payment/stripe.adapter.ts`
- `lib/services/payment/sepa.adapter.ts`
- `app/api/payments/stripe/route.ts`
- `app/api/payments/sepa/route.ts`

### Changer devise par défaut
- ✅ EUR au lieu de XOF
- ✅ Support CHF (Suisse) et GBP (optionnel)

---

## 📋 Phase 3 : Module Qualiopi (Priorité 2)

### Créer le module Qualiopi complet

**Tables SQL à créer :**
- `qualiopi_indicators` (indicateurs Qualiopi)
- `qualiopi_evidence` (preuves de conformité)
- `qualiopi_reports` (rapports Qualiopi)
- `qualiopi_audits` (audits Qualiopi)

**Fichiers à créer :**
- `lib/services/qualiopi.service.ts`
- `app/(dashboard)/dashboard/qualiopi/page.tsx`
- `app/(dashboard)/dashboard/qualiopi/indicators/page.tsx`
- `app/(dashboard)/dashboard/qualiopi/reports/page.tsx`

**Fonctionnalités :**
- Indicateurs Qualiopi automatiques
- Rapports de conformité
- Gestion des preuves
- Tableau de bord Qualiopi

---

## 📋 Phase 4 : Module CPF (Priorité 2)

### Intégration Compte Personnel de Formation

**Tables SQL à créer :**
- `cpf_financings` (financements CPF)
- `cpf_attestations` (attestations CPF)
- `cpf_rights` (droits CPF)

**Fichiers à créer :**
- `lib/services/cpf.service.ts`
- `app/(dashboard)/dashboard/cpf/page.tsx`
- `app/api/cpf/check-rights/route.ts`
- `app/api/cpf/generate-attestation/route.ts`

**Fonctionnalités :**
- Vérification des droits CPF
- Génération d'attestations CPF
- Suivi des financements CPF
- Intégration avec Mon Compte Formation (API)

---

## 📋 Phase 5 : Module OPCO (Priorité 2)

### Gestion des Opérateurs de Compétences

**Tables SQL à créer :**
- `opco_configurations` (configurations OPCO)
- `opco_financings` (financements OPCO)
- `opco_declarations` (déclarations OPCO)

**Fichiers à créer :**
- `lib/services/opco.service.ts`
- `app/(dashboard)/dashboard/opco/page.tsx`
- `app/api/opco/declare/route.ts`

**Fonctionnalités :**
- Gestion des financements OPCO
- Déclarations automatiques
- Suivi des subventions

---

## 📋 Phase 6 : Conformité RGPD Renforcée (Priorité 1)

### Module RGPD Complet

**Tables SQL à créer :**
- `gdpr_consents` (consentements)
- `gdpr_data_requests` (demandes de données)
- `gdpr_processing_register` (registre des traitements)

**Fichiers à créer :**
- `lib/services/gdpr.service.ts`
- `app/(dashboard)/dashboard/gdpr/page.tsx`
- `app/api/gdpr/export-data/route.ts`
- `app/api/gdpr/delete-data/route.ts`

**Fonctionnalités :**
- Gestion des consentements
- Droit à l'oubli
- Portabilité des données
- Registre des traitements
- DPO (Délégué à la Protection des Données)

---

## 📋 Phase 7 : Intégration Datadock (Priorité 3)

### Export Datadock

**Fichiers à créer :**
- `lib/services/datadock.service.ts`
- `app/api/datadock/export/route.ts`
- `app/(dashboard)/dashboard/datadock/page.tsx`

**Fonctionnalités :**
- Export des données au format Datadock
- Synchronisation automatique
- Validation des données

---

## 📋 Phase 8 : Gestion des Certifications (Priorité 3)

### Référentiels de Compétences

**Tables SQL à créer :**
- `competency_frameworks` (référentiels)
- `competencies` (compétences)
- `competency_blocks` (blocs de compétences)
- `certifications` (certifications)

**Fichiers à créer :**
- `lib/services/certification.service.ts`
- `app/(dashboard)/dashboard/certifications/page.tsx`

**Fonctionnalités :**
- Gestion des référentiels
- Validation des compétences
- Génération de certificats

---

## 🗂️ Structure des Fichiers à Créer/Modifier

### Nouveaux Fichiers
```
lib/
  services/
    payment/
      stripe.adapter.ts
      sepa.adapter.ts
    qualiopi.service.ts
    cpf.service.ts
    opco.service.ts
    gdpr.service.ts
    datadock.service.ts
    certification.service.ts
  utils/
    vocabulary.ts

app/
  (dashboard)/
    dashboard/
      qualiopi/
        page.tsx
        indicators/
          page.tsx
        reports/
          page.tsx
      cpf/
        page.tsx
      opco/
        page.tsx
      gdpr/
        page.tsx
      datadock/
        page.tsx
      certifications/
        page.tsx

supabase/
  migrations/
    20241203000001_add_organization_type.sql
    20241203000002_create_qualiopi_module.sql
    20241203000003_create_cpf_module.sql
    20241203000004_create_opco_module.sql
    20241203000005_create_gdpr_module.sql
    20241203000006_create_datadock_module.sql
    20241203000007_create_certifications_module.sql
```

### Fichiers à Modifier
- Tous les composants utilisant "élève" → utiliser `vocabulary.student`
- Tous les composants utilisant "cours" → utiliser `vocabulary.course`
- Configuration des paiements → retirer Mobile Money, ajouter Stripe/SEPA
- Devise par défaut → EUR

---

## ⏱️ Planning Estimé

### Phase 1 : Vocabulaire Adaptatif
- **Durée** : 1 semaine
- **Effort** : Moyen
- **Priorité** : 1

### Phase 2 : Paiements Européens
- **Durée** : 2 semaines
- **Effort** : Élevé
- **Priorité** : 1

### Phase 3 : Module Qualiopi
- **Durée** : 3 semaines
- **Effort** : Élevé
- **Priorité** : 2

### Phase 4 : Module CPF
- **Durée** : 2 semaines
- **Effort** : Moyen
- **Priorité** : 2

### Phase 5 : Module OPCO
- **Durée** : 2 semaines
- **Effort** : Moyen
- **Priorité** : 2

### Phase 6 : RGPD Renforcé
- **Durée** : 2 semaines
- **Effort** : Moyen
- **Priorité** : 1

### Phase 7 : Datadock
- **Durée** : 1 semaine
- **Effort** : Faible
- **Priorité** : 3

### Phase 8 : Certifications
- **Durée** : 2 semaines
- **Effort** : Moyen
- **Priorité** : 3

**Total estimé : 15 semaines (3-4 mois)**

---

## 🎯 Priorités d'Implémentation

### Sprint 1 (2 semaines)
1. ✅ Système de vocabulaire adaptatif
2. ✅ Paiements Stripe
3. ✅ RGPD renforcé

### Sprint 2 (2 semaines)
4. ✅ Module Qualiopi (base)
5. ✅ Module CPF (base)

### Sprint 3 (2 semaines)
6. ✅ Module OPCO
7. ✅ Paiements SEPA

### Sprint 4 (2 semaines)
8. ✅ Qualiopi (avancé)
9. ✅ Datadock

### Sprint 5 (2 semaines)
10. ✅ Certifications
11. ✅ Tests et optimisations

---

## 📝 Notes Importantes

- **Double marché** : L'application doit fonctionner pour OF ET écoles
- **Vocabulaire adaptatif** : Essentiel pour la flexibilité
- **Conformité stricte** : Qualiopi, RGPD, ISO 27001
- **Hébergement Europe** : Obligatoire pour RGPD
- **Support français** : Essentiel pour la confiance



## 🎯 Objectif
Adapter EDUZEN pour cibler les organismes de formation en France et Europe francophone, tout en conservant la compatibilité avec les établissements scolaires.

---

## 📋 Phase 1 : Système de Vocabulaire Adaptatif (Priorité 1)

### Créer un système de terminologie dynamique

**Fichier à créer : `lib/utils/vocabulary.ts`**

```typescript
export type OrganizationType = 'training_organization' | 'school' | 'both'

export interface Vocabulary {
  student: string
  students: string
  student_singular: string
  student_plural: string
  course: string
  courses: string
  report_card: string
  report_cards: string
  academic_year: string
  enrollment: string
  enrollments: string
  // ... etc
}

export const vocabularies: Record<OrganizationType, Vocabulary> = {
  training_organization: {
    student: 'Stagiaire',
    students: 'Stagiaires',
    student_singular: 'le stagiaire',
    student_plural: 'les stagiaires',
    course: 'Formation',
    courses: 'Formations',
    report_card: 'Attestation de formation',
    report_cards: 'Attestations de formation',
    academic_year: 'Session de formation',
    enrollment: 'Inscription',
    enrollments: 'Inscriptions',
  },
  school: {
    student: 'Élève',
    students: 'Élèves',
    student_singular: "l'élève",
    student_plural: 'les élèves',
    course: 'Cours',
    courses: 'Cours',
    report_card: 'Bulletin',
    report_cards: 'Bulletins',
    academic_year: 'Année scolaire',
    enrollment: 'Inscription',
    enrollments: 'Inscriptions',
  },
  both: {
    // Vocabulaire générique
    student: 'Apprenant',
    students: 'Apprenants',
    // ...
  }
}
```

### Ajouter un champ `organization_type` à la table `organizations`

**Migration SQL :**
```sql
ALTER TABLE organizations 
ADD COLUMN organization_type VARCHAR(50) DEFAULT 'school' 
CHECK (organization_type IN ('training_organization', 'school', 'both'));

-- Mettre à jour les organisations existantes
UPDATE organizations SET organization_type = 'school' WHERE organization_type IS NULL;
```

---

## 📋 Phase 2 : Paiements Européens (Priorité 1)

### Retirer Mobile Money
- ❌ Supprimer les adapters Mobile Money (MTN, Orange, Airtel, Wave)
- ❌ Supprimer les pages de configuration Mobile Money
- ❌ Supprimer les migrations SQL liées

### Ajouter Paiements Européens
- ✅ **Stripe** (cartes bancaires)
- ✅ **PayPal** (optionnel)
- ✅ **SEPA** (virements bancaires)
- ✅ **Prélèvements SEPA**

**Fichiers à créer :**
- `lib/services/payment/stripe.adapter.ts`
- `lib/services/payment/sepa.adapter.ts`
- `app/api/payments/stripe/route.ts`
- `app/api/payments/sepa/route.ts`

### Changer devise par défaut
- ✅ EUR au lieu de XOF
- ✅ Support CHF (Suisse) et GBP (optionnel)

---

## 📋 Phase 3 : Module Qualiopi (Priorité 2)

### Créer le module Qualiopi complet

**Tables SQL à créer :**
- `qualiopi_indicators` (indicateurs Qualiopi)
- `qualiopi_evidence` (preuves de conformité)
- `qualiopi_reports` (rapports Qualiopi)
- `qualiopi_audits` (audits Qualiopi)

**Fichiers à créer :**
- `lib/services/qualiopi.service.ts`
- `app/(dashboard)/dashboard/qualiopi/page.tsx`
- `app/(dashboard)/dashboard/qualiopi/indicators/page.tsx`
- `app/(dashboard)/dashboard/qualiopi/reports/page.tsx`

**Fonctionnalités :**
- Indicateurs Qualiopi automatiques
- Rapports de conformité
- Gestion des preuves
- Tableau de bord Qualiopi

---

## 📋 Phase 4 : Module CPF (Priorité 2)

### Intégration Compte Personnel de Formation

**Tables SQL à créer :**
- `cpf_financings` (financements CPF)
- `cpf_attestations` (attestations CPF)
- `cpf_rights` (droits CPF)

**Fichiers à créer :**
- `lib/services/cpf.service.ts`
- `app/(dashboard)/dashboard/cpf/page.tsx`
- `app/api/cpf/check-rights/route.ts`
- `app/api/cpf/generate-attestation/route.ts`

**Fonctionnalités :**
- Vérification des droits CPF
- Génération d'attestations CPF
- Suivi des financements CPF
- Intégration avec Mon Compte Formation (API)

---

## 📋 Phase 5 : Module OPCO (Priorité 2)

### Gestion des Opérateurs de Compétences

**Tables SQL à créer :**
- `opco_configurations` (configurations OPCO)
- `opco_financings` (financements OPCO)
- `opco_declarations` (déclarations OPCO)

**Fichiers à créer :**
- `lib/services/opco.service.ts`
- `app/(dashboard)/dashboard/opco/page.tsx`
- `app/api/opco/declare/route.ts`

**Fonctionnalités :**
- Gestion des financements OPCO
- Déclarations automatiques
- Suivi des subventions

---

## 📋 Phase 6 : Conformité RGPD Renforcée (Priorité 1)

### Module RGPD Complet

**Tables SQL à créer :**
- `gdpr_consents` (consentements)
- `gdpr_data_requests` (demandes de données)
- `gdpr_processing_register` (registre des traitements)

**Fichiers à créer :**
- `lib/services/gdpr.service.ts`
- `app/(dashboard)/dashboard/gdpr/page.tsx`
- `app/api/gdpr/export-data/route.ts`
- `app/api/gdpr/delete-data/route.ts`

**Fonctionnalités :**
- Gestion des consentements
- Droit à l'oubli
- Portabilité des données
- Registre des traitements
- DPO (Délégué à la Protection des Données)

---

## 📋 Phase 7 : Intégration Datadock (Priorité 3)

### Export Datadock

**Fichiers à créer :**
- `lib/services/datadock.service.ts`
- `app/api/datadock/export/route.ts`
- `app/(dashboard)/dashboard/datadock/page.tsx`

**Fonctionnalités :**
- Export des données au format Datadock
- Synchronisation automatique
- Validation des données

---

## 📋 Phase 8 : Gestion des Certifications (Priorité 3)

### Référentiels de Compétences

**Tables SQL à créer :**
- `competency_frameworks` (référentiels)
- `competencies` (compétences)
- `competency_blocks` (blocs de compétences)
- `certifications` (certifications)

**Fichiers à créer :**
- `lib/services/certification.service.ts`
- `app/(dashboard)/dashboard/certifications/page.tsx`

**Fonctionnalités :**
- Gestion des référentiels
- Validation des compétences
- Génération de certificats

---

## 🗂️ Structure des Fichiers à Créer/Modifier

### Nouveaux Fichiers
```
lib/
  services/
    payment/
      stripe.adapter.ts
      sepa.adapter.ts
    qualiopi.service.ts
    cpf.service.ts
    opco.service.ts
    gdpr.service.ts
    datadock.service.ts
    certification.service.ts
  utils/
    vocabulary.ts

app/
  (dashboard)/
    dashboard/
      qualiopi/
        page.tsx
        indicators/
          page.tsx
        reports/
          page.tsx
      cpf/
        page.tsx
      opco/
        page.tsx
      gdpr/
        page.tsx
      datadock/
        page.tsx
      certifications/
        page.tsx

supabase/
  migrations/
    20241203000001_add_organization_type.sql
    20241203000002_create_qualiopi_module.sql
    20241203000003_create_cpf_module.sql
    20241203000004_create_opco_module.sql
    20241203000005_create_gdpr_module.sql
    20241203000006_create_datadock_module.sql
    20241203000007_create_certifications_module.sql
```

### Fichiers à Modifier
- Tous les composants utilisant "élève" → utiliser `vocabulary.student`
- Tous les composants utilisant "cours" → utiliser `vocabulary.course`
- Configuration des paiements → retirer Mobile Money, ajouter Stripe/SEPA
- Devise par défaut → EUR

---

## ⏱️ Planning Estimé

### Phase 1 : Vocabulaire Adaptatif
- **Durée** : 1 semaine
- **Effort** : Moyen
- **Priorité** : 1

### Phase 2 : Paiements Européens
- **Durée** : 2 semaines
- **Effort** : Élevé
- **Priorité** : 1

### Phase 3 : Module Qualiopi
- **Durée** : 3 semaines
- **Effort** : Élevé
- **Priorité** : 2

### Phase 4 : Module CPF
- **Durée** : 2 semaines
- **Effort** : Moyen
- **Priorité** : 2

### Phase 5 : Module OPCO
- **Durée** : 2 semaines
- **Effort** : Moyen
- **Priorité** : 2

### Phase 6 : RGPD Renforcé
- **Durée** : 2 semaines
- **Effort** : Moyen
- **Priorité** : 1

### Phase 7 : Datadock
- **Durée** : 1 semaine
- **Effort** : Faible
- **Priorité** : 3

### Phase 8 : Certifications
- **Durée** : 2 semaines
- **Effort** : Moyen
- **Priorité** : 3

**Total estimé : 15 semaines (3-4 mois)**

---

## 🎯 Priorités d'Implémentation

### Sprint 1 (2 semaines)
1. ✅ Système de vocabulaire adaptatif
2. ✅ Paiements Stripe
3. ✅ RGPD renforcé

### Sprint 2 (2 semaines)
4. ✅ Module Qualiopi (base)
5. ✅ Module CPF (base)

### Sprint 3 (2 semaines)
6. ✅ Module OPCO
7. ✅ Paiements SEPA

### Sprint 4 (2 semaines)
8. ✅ Qualiopi (avancé)
9. ✅ Datadock

### Sprint 5 (2 semaines)
10. ✅ Certifications
11. ✅ Tests et optimisations

---

## 📝 Notes Importantes

- **Double marché** : L'application doit fonctionner pour OF ET écoles
- **Vocabulaire adaptatif** : Essentiel pour la flexibilité
- **Conformité stricte** : Qualiopi, RGPD, ISO 27001
- **Hébergement Europe** : Obligatoire pour RGPD
- **Support français** : Essentiel pour la confiance---

**Document EDUZEN** | [Retour à la documentation principale](README.md) | Dernière mise à jour : 2025-12-30
© 2024 EDUZEN. Tous droits réservés.