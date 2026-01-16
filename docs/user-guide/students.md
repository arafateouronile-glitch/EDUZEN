# 👥 Guide de Gestion des Étudiants

Guide complet pour gérer les étudiants/apprenants dans EDUZEN.

---

## 📋 Table des Matières

1. [Vue d'Ensemble](#vue-densemble)
2. [Créer un Étudiant](#créer-un-étudiant)
3. [Gérer les Étudiants](#gérer-les-étudiants)
4. [Tuteurs et Parents](#tuteurs-et-parents)
5. [Import en Masse](#import-en-masse)
6. [Documents Étudiants](#documents-étudiants)
7. [Bonnes Pratiques](#bonnes-pratiques)

---

## 📊 Vue d'Ensemble

### Accès au Module

**Navigation** : Dashboard → Étudiants

### Fonctionnalités Principales

- Création et gestion des fiches étudiants
- Gestion des tuteurs/parents
- Historique académique
- Documents associés
- Suivi des paiements
- Suivi des présences
- Import/Export en masse

---

## ➕ Créer un Étudiant

### Méthode Manuelle

1. Cliquez sur **"+ Nouvel étudiant"**
2. Remplissez le formulaire :

#### Informations Personnelles
- **Nom** (requis)
- **Prénom** (requis)
- **Date de naissance** (requis)
- **Lieu de naissance**
- **Genre**
- **Numéro étudiant** (généré automatiquement)

#### Coordonnées
- **Email** (pour accès portail)
- **Téléphone**
- **Adresse complète**
  - Rue
  - Code postal
  - Ville
  - Pays

#### Informations Académiques
- **Niveau d'études**
- **Diplômes obtenus**
- **Situation professionnelle**
- **Statut** (actif/inactif/diplômé)

#### Documents Administratifs
- **Numéro d'identité**
- **Numéro de Sécurité Sociale**
- Pièce d'identité (upload)
- CV (upload)

3. Cliquez sur **"Enregistrer"**

### Création Rapide

Pour une création rapide (informations minimales) :

1. Cliquez sur **"+ Création rapide"**
2. Remplissez uniquement :
   - Nom
   - Prénom
   - Email
3. Vous pourrez compléter plus tard

---

## 🔧 Gérer les Étudiants

### Recherche et Filtres

**Barre de recherche** : Recherchez par nom, prénom, email, numéro étudiant

**Filtres disponibles** :
- Statut (actif, inactif, diplômé)
- Formation en cours
- Situation de paiement
- Date d'inscription

### Fiche Étudiant

Cliquez sur un étudiant pour accéder à sa fiche complète :

#### Onglets Disponibles

1. **Vue d'ensemble**
   - Informations principales
   - Statistiques (présences, notes, paiements)
   - Dernières activités

2. **Formations**
   - Formations en cours
   - Historique des inscriptions
   - Résultats et évaluations

3. **Paiements**
   - Factures émises
   - Paiements effectués
   - Solde restant

4. **Présences**
   - Taux de présence
   - Historique détaillé
   - Absences justifiées/non justifiées

5. **Documents**
   - Documents générés (attestations, certificats)
   - Documents administratifs uploadés
   - Contrats signés

6. **Notes et Évaluations**
   - Résultats par module
   - Évaluations continues
   - Livret d'apprentissage

7. **Messages**
   - Historique des communications
   - Envoyer un message

### Actions Disponibles

- **✏️ Modifier** : Mettre à jour les informations
- **📧 Envoyer un email** : Communication directe
- **📄 Générer un document** : Attestation, certificat, etc.
- **💰 Créer une facture** : Nouvelle facturation
- **📚 Inscrire à une formation** : Inscription rapide
- **🗑️ Supprimer** : Suppression (attention : irréversible)

---

## 👨‍👩‍👧‍👦 Tuteurs et Parents

### Ajouter un Tuteur

1. Dans la fiche étudiant, section **"Tuteurs"**
2. Cliquez sur **"+ Ajouter un tuteur"**
3. Deux options :
   - **Tuteur existant** : Sélectionnez dans la liste
   - **Nouveau tuteur** : Créez un nouveau compte

#### Informations Tuteur
- Nom, Prénom
- Lien de parenté (père, mère, tuteur légal, autre)
- Email (pour accès portail parent)
- Téléphone
- Adresse (si différente de l'étudiant)

### Accès Portail Parent

Les tuteurs peuvent :
- Consulter le dossier de leur(s) enfant(s)
- Voir les présences et notes
- Consulter les paiements
- Recevoir des notifications
- Communiquer avec l'équipe pédagogique

---

## 📥 Import en Masse

### Importer depuis un Fichier Excel

1. Cliquez sur **"Import Excel"**
2. Téléchargez le **template Excel** fourni
3. Remplissez le template avec vos données :
   - Une ligne par étudiant
   - Respectez le format des colonnes
4. Uploadez le fichier
5. Vérifiez la prévisualisation
6. Confirmez l'import

#### Colonnes du Template

| Colonne | Type | Obligatoire | Exemple |
|---------|------|-------------|---------|
| nom | Texte | ✅ | Dupont |
| prenom | Texte | ✅ | Jean |
| email | Email | ✅ | jean.dupont@email.com |
| telephone | Texte | ❌ | +33 6 12 34 56 78 |
| date_naissance | Date | ✅ | 15/03/1995 |
| adresse | Texte | ❌ | 123 Rue de la Paix |
| ville | Texte | ❌ | Paris |
| code_postal | Texte | ❌ | 75001 |

### Gestion des Erreurs

Si des erreurs sont détectées :
- Un rapport d'erreur s'affiche
- Les lignes valides sont importées
- Les lignes en erreur sont listées avec le motif
- Vous pouvez corriger et réimporter

---

## 📄 Documents Étudiants

### Documents Générés Automatiquement

- **Fiche d'inscription** : À la création
- **Convention de formation** : À l'inscription à une session
- **Feuille d'émargement** : Pour chaque session
- **Attestation de présence** : Sur demande
- **Certificat de réalisation** : À la fin de la formation

### Documents Uploadés

Vous pouvez joindre des documents :
1. Dans la fiche étudiant, onglet **"Documents"**
2. Cliquez sur **"+ Ajouter un document"**
3. Uploadez le fichier (PDF, JPG, PNG, DOCX)
4. Catégorisez le document :
   - Administratif
   - Pédagogique
   - Financier
   - Autre

---

## ✅ Bonnes Pratiques

### 1. Saisie des Données

- ✅ **Utilisez toujours le même format** pour les dates, téléphones
- ✅ **Vérifiez l'email** : C'est l'identifiant pour le portail
- ✅ **Numéro étudiant unique** : Ne modifiez pas celui généré automatiquement
- ✅ **Complétez le profil** : Plus il est complet, meilleures sont les fonctionnalités

### 2. Organisation

- ✅ **Utilisez les statuts** : Actif, Inactif, Diplômé pour filtrer
- ✅ **Archivez** : Ne supprimez pas, archivez les anciens étudiants
- ✅ **Tags personnalisés** : Pour grouper par cohorte, projet, etc.

### 3. Sécurité

- ✅ **RGPD** : Ne collectez que les données nécessaires
- ✅ **Consentement** : Conservez les preuves de consentement
- ✅ **Droit à l'oubli** : Anonymisez ou supprimez sur demande

### 4. Communication

- ✅ **Messages groupés** : Utilisez les filtres pour envoyer des messages ciblés
- ✅ **Notifications automatiques** : Configurez les alertes (absences, paiements)
- ✅ **Portail actif** : Encouragez les étudiants à utiliser le portail

---

## 🚨 Cas d'Usage Fréquents

### Étudiant a Oublié son Mot de Passe

1. L'étudiant doit utiliser **"Mot de passe oublié"** sur la page de connexion
2. Si besoin, vous pouvez **réinitialiser manuellement** :
   - Fiche étudiant → Actions → Réinitialiser mot de passe

### Changement d'Email

1. Fiche étudiant → Modifier
2. Changez l'email
3. L'étudiant recevra un email de vérification

### Étudiant Inactif

Pour un étudiant qui ne suit plus de formation :
1. Changez le statut en **"Inactif"**
2. Il n'apparaîtra plus dans les listes par défaut
3. Son dossier reste accessible

### Export des Données

Pour exporter la liste complète :
1. Appliquez vos filtres
2. Cliquez sur **"Exporter"**
3. Choisissez le format (Excel, CSV, PDF)

---

## 🔗 Liens Utiles

- [Guide Formations](./formations.md)
- [Guide Paiements](./payments.md)
- [Guide Documents](./documents.md)
- [Guide Présences](./attendance.md)
- [FAQ](./faq.md)

---

**Besoin d'aide ?** Contactez le support : support@eduzen.io
