# 📚 Guide de Gestion des Formations

Guide complet pour gérer les formations, programmes et sessions dans EDUZEN.

---

## 📋 Table des Matières

1. [Vue d'Ensemble](#vue-densemble)
2. [Créer une Formation](#créer-une-formation)
3. [Gérer les Sessions](#gérer-les-sessions)
4. [Inscrire des Étudiants](#inscrire-des-étudiants)
5. [Suivi Pédagogique](#suivi-pédagogique)
6. [Bonnes Pratiques](#bonnes-pratiques)

---

## 📊 Vue d'Ensemble

### Structure Hiérarchique

EDUZEN utilise une structure en 3 niveaux :

```
Programme (optionnel)
  └── Formation
       └── Session
```

- **Programme** : Regroupement de formations (ex: "Parcours Développeur Full-Stack")
- **Formation** : Le cours (ex: "Développement Web - React")
- **Session** : Une occurrence avec dates précises (ex: "React - Janvier 2026")

### Accès au Module

**Navigation** : Dashboard → Formations

---

## ➕ Créer une Formation

### Nouvelle Formation

1. Cliquez sur **"+ Nouvelle formation"**
2. Remplissez le formulaire :

#### Informations Générales
- **Nom de la formation** (requis)
- **Code** : Identifiant unique (ex: WEB-REACT-001)
- **Description courte** : Pitch en une phrase
- **Description complète** : Détails, objectifs, prérequis
- **Catégorie** : Développement, Design, Marketing, etc.
- **Niveau** : Débutant, Intermédiaire, Avancé

#### Informations Pédagogiques
- **Durée totale** : En heures (ex: 35h)
- **Objectifs pédagogiques** : Liste des compétences acquises
- **Prérequis** : Connaissances nécessaires
- **Programme détaillé** : Plan de cours, modules

#### Informations Administratives
- **Numéro de déclaration d'activité** (si OF)
- **Code CPF** (si éligible)
- **Certifications** : Qualiopi, etc.
- **Public visé** : Salariés, demandeurs d'emploi, étudiants

#### Tarification
- **Prix de référence** : Prix catalogue
- **Prix formation continue**
- **Prix initial** (si différent)
- **TVA applicable** : 0% (formations exonérées) ou 20%

3. **Enregistrez**

---

## 📅 Gérer les Sessions

### Créer une Session

Une session est une occurrence d'une formation avec des dates précises.

1. Depuis une formation, cliquez sur **"+ Nouvelle session"**
2. Remplissez :

#### Dates et Horaires
- **Date de début** (requis)
- **Date de fin** (requis)
- **Horaires** : Ex: 9h-12h / 14h-17h
- **Calendrier détaillé** : Dates de chaque séance

#### Capacité
- **Nombre de places** : Capacité maximale (ex: 12)
- **Places restantes** : Calculé automatiquement
- **Liste d'attente** : Activée si session complète

#### Lieu
- **Format** :
  - Présentiel
  - Distanciel
  - Hybride
- **Adresse** (si présentiel)
- **Lien visioconférence** (si distanciel)
- **Salle** : Numéro ou nom

#### Équipe Pédagogique
- **Formateur principal** (requis)
- **Formateurs secondaires** (optionnel)
- **Tuteur/Coach** (optionnel)

#### Tarification Spécifique
- **Prix de cette session** : Peut être différent du prix de référence
- **Remise** : Pourcentage ou montant fixe
- **Prix après remise** : Calculé automatiquement

3. **Statut** :
   - Brouillon : Non visible
   - Publiée : Visible et inscriptions ouvertes
   - En cours : Session démarrée
   - Terminée : Session finie
   - Annulée : Session annulée

4. **Enregistrez**

### Dupliquer une Session

Pour créer rapidement une nouvelle session similaire :
1. Session existante → **"Dupliquer"**
2. Modifiez les dates
3. Enregistrez

---

## 👥 Inscrire des Étudiants

### Inscription Manuelle

1. Ouvrez la session
2. Cliquez sur **"Inscrire des étudiants"**
3. Recherchez et sélectionnez les étudiants
4. Confirmez

**Statut d'inscription** :
- ✅ Inscrit : Place confirmée
- ⏳ En attente : Liste d'attente
- 🎓 Validé : Formation terminée et validée
- ❌ Annulé : Inscription annulée

### Inscription par l'Étudiant

Les étudiants peuvent s'inscrire eux-mêmes via le portail :
1. Portail Apprenant → Catalogue
2. Recherchent la formation
3. Cliquent sur **"S'inscrire"**
4. Vous recevez une notification
5. Vous validez l'inscription

### Gestion de la Liste d'Attente

Si la session est complète :
1. Les nouveaux inscrits vont en liste d'attente automatiquement
2. Dashboard → Formations → [Session] → Onglet **"Liste d'attente"**
3. Quand une place se libère :
   - Sélectionnez le premier de la liste
   - Cliquez sur **"Inscrire"**
   - L'étudiant est notifié automatiquement

---

## 📖 Suivi Pédagogique

### Calendrier des Séances

1. Session → Onglet **"Calendrier"**
2. Vue d'ensemble de toutes les séances
3. Pour chaque séance :
   - Date et horaires
   - Thème/contenu
   - Formateur
   - Statut (à venir, en cours, terminé)

### Émargement

Pour chaque séance :
1. Session → **"Présences"** → [Sélectionnez la séance]
2. Émargez les présents (voir [Guide Présences](./attendance.md))
3. Taux de présence calculé automatiquement

### Évaluations

1. Session → Onglet **"Évaluations"**
2. Créez une évaluation :
   - **Type** : QCM, pratique, projet, oral
   - **Date**
   - **Coefficient**
   - **Barème** : /20, /100, A-F, etc.
3. Saisissez les notes
4. Moyennes calculées automatiquement

### Ressources Pédagogiques

Partagez des ressources avec les étudiants :
1. Session → Onglet **"Ressources"**
2. Uploadez des fichiers :
   - PDF
   - Présentations
   - Vidéos
   - Liens externes
3. Les étudiants y accèdent via leur portail

---

## 📊 Statistiques et Rapports

### Tableau de Bord Session

Vue d'ensemble :
- Nombre d'inscrits / Capacité
- Taux de remplissage
- Taux de présence moyen
- Note moyenne
- Chiffre d'affaires généré

### Rapports

Générez des rapports :
- **Bilan pédagogique** : Résultats, présences, évaluations
- **Feuille d'émargement consolidée**
- **Attestations de formation** (en masse)
- **Certificats de réalisation**

---

## 🔄 Workflows Automatisés

### Emails Automatiques

Configurez des emails automatiques (Paramètres → Workflows) :

**À l'inscription** :
- Email de confirmation
- Convocation avec dates et lieu
- Rappel du paiement

**Avant le début** :
- Rappel J-7
- Rappel J-1 avec toutes les infos pratiques

**Pendant la formation** :
- Partage de ressources après chaque séance
- Rappel des évaluations

**Après la formation** :
- Enquête de satisfaction
- Attestation de formation

### Facturation Automatique

Lors de l'inscription :
1. Une facture peut être générée automatiquement
2. Envoyée par email à l'étudiant
3. Rappels programmés si impayée

Configuration : Paramètres → Finances → **"Facturation automatique"**

---

## 📋 Catalogue Public

### Publier une Formation

Pour rendre une formation visible sur votre catalogue public :
1. Formation → Paramètres → **"Visible dans le catalogue public"**
2. La formation apparaît sur `votreorganisation.eduzen.io/catalogue`
3. Les visiteurs peuvent :
   - Consulter la fiche détaillée
   - Demander une inscription
   - Télécharger le programme

### Personnaliser la Fiche

Optimisez votre fiche pour le catalogue :
- **Image d'illustration** : Photo ou visuel
- **Vidéo de présentation** : Lien YouTube/Vimeo
- **Témoignages** : Avis d'anciens étudiants
- **FAQ spécifique** : Questions fréquentes sur cette formation

---

## ✅ Bonnes Pratiques

### 1. Organisation

- ✅ **Nommage clair** : "Développement Web - React - Janvier 2026"
- ✅ **Codes uniques** : Utilisez des codes cohérents (WEB-001, WEB-002)
- ✅ **Templates** : Créez des templates de formation pour gagner du temps

### 2. Planification

- ✅ **Anticipez** : Créez les sessions 2-3 mois à l'avance
- ✅ **Communiquez** : Informez les étudiants dès que possible
- ✅ **Calendrier** : Planifiez les séances en évitant les conflits

### 3. Pédagogie

- ✅ **Objectifs clairs** : Définissez des objectifs SMART
- ✅ **Programme détaillé** : Plan de cours séance par séance
- ✅ **Évaluations** : Variez les types d'évaluation

### 4. Administratif

- ✅ **Émargement rigoureux** : Pour les formations financées
- ✅ **Documents conformes** : Convention, programme, attestations
- ✅ **Traçabilité** : Conservez tous les justificatifs

---

## 🚨 Cas d'Usage Fréquents

### Annuler une Session

Si vous devez annuler une session :
1. Session → **"Annuler"**
2. Choisissez le motif
3. Les étudiants inscrits sont automatiquement notifiés
4. Proposez une session de remplacement si possible

### Reporter une Session

Pour changer les dates :
1. Session → Modifier
2. Changez les dates de début et fin
3. Mettez à jour le calendrier des séances
4. Notifiez les étudiants inscrits

### Fusionner des Sessions

Si vous avez 2 sessions peu remplies :
1. Sélectionnez les 2 sessions
2. Actions → **"Fusionner"**
3. Choisissez la session principale (dates conservées)
4. Les inscrits sont transférés automatiquement

### Former un Groupe de Niveau

Pour séparer les étudiants par niveau :
1. Créez 2 sessions (ex: Débutants, Avancés)
2. Lors de l'inscription, évaluez le niveau
3. Inscrivez dans la session appropriée

---

## 🔗 Liens Utiles

- [Guide Étudiants](./students.md)
- [Guide Présences](./attendance.md)
- [Guide Documents](./documents.md)
- [FAQ](./faq.md)

---

**Besoin d'aide ?** Contactez le support : support@eduzen.io
