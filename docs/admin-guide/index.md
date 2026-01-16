# 👨‍💼 Guide Administration - EDUZEN

Guide complet pour les administrateurs d'EDUZEN.

---

## 📋 Table des Matières

1. [Vue d'Ensemble](#vue-densemble)
2. [Gestion de l'Organisation](#gestion-de-lorganisation)
3. [Gestion des Utilisateurs](#gestion-des-utilisateurs)
4. [Configuration Globale](#configuration-globale)
5. [Sécurité et Conformité](#sécurité-et-conformité)
6. [Sauvegarde et Maintenance](#sauvegarde-et-maintenance)

---

## 📊 Vue d'Ensemble

### Rôle de l'Administrateur

En tant qu'administrateur, vous avez **accès complet** à toutes les fonctionnalités d'EDUZEN :
- Configuration de l'organisation
- Gestion des utilisateurs et permissions
- Paramètres globaux
- Sécurité et conformité
- Exports et sauvegardes

### Accès Administration

**Navigation** : Dashboard → **Paramètres** (⚙️)

---

## 🏢 Gestion de l'Organisation

### Informations de l'Organisation

**Paramètres → Organisation**

#### Informations Générales

- **Nom de l'organisation** : Nom officiel
- **Raison sociale** : Nom légal (si différent)
- **Logo** : Format PNG/JPG, max 2MB
  - Utilisé sur tous les documents
  - Visible dans le portail
- **Description** : Présentation de votre organisme

#### Coordonnées

- **Adresse complète** :
  - Rue
  - Code postal
  - Ville
  - Pays
- **Téléphone** : Standard
- **Email** : Contact principal
- **Site web** : URL de votre site

#### Informations Légales (France)

- **SIRET** : Numéro d'identification
- **TVA intracommunautaire** : Si applicable
- **Numéro de déclaration d'activité** : Pour les organismes de formation
- **RCS** : Registre du Commerce
- **Code NAF/APE** : Code d'activité

#### Certifications

- **Qualiopi** : Oui/Non + Date d'obtention
- **Datadock** : Référencé ou non
- **Autres certifications** : Liste personnalisée

### Paramètres Régionaux

**Paramètres → Organisation → Régional**

- **Fuseau horaire** : Ex: Europe/Paris
- **Langue par défaut** : Français, Anglais, etc.
- **Format de date** : JJ/MM/AAAA ou MM/JJ/AAAA
- **Format d'heure** : 24h ou 12h (AM/PM)
- **Devise** : EUR, USD, XOF, etc.
- **Séparateur décimal** : Virgule ou point

### Vocabulaire Personnalisé

**Paramètres → Organisation → Vocabulaire**

Adaptez les termes selon votre contexte :

| Terme par défaut | Alternatives |
|------------------|--------------|
| Étudiant | Apprenant, Stagiaire, Participant |
| Formation | Programme, Parcours, Cursus |
| Session | Promotion, Cohorte, Classe |
| Formateur | Enseignant, Intervenant, Coach |
| Présence | Assiduité, Émargement |

---

## 👥 Gestion des Utilisateurs

### Types de Comptes

#### Utilisateurs Internes (Équipe)

Votre équipe pédagogique et administrative :

| Rôle | Permissions | Cas d'usage |
|------|-------------|-------------|
| **Admin** | Accès complet | Directeur, gérant |
| **Secrétaire** | Gestion administrative | Inscriptions, documents, communication |
| **Formateur** | Gestion pédagogique | Cours, notes, présences |
| **Comptable** | Gestion financière | Facturation, paiements, exports |

#### Utilisateurs Externes

- **Étudiants** : Accès au portail apprenant
- **Parents/Tuteurs** : Accès au portail parent
- **Formateurs externes** : Accès limité aux sessions qu'ils animent

### Inviter un Utilisateur

**Paramètres → Utilisateurs → "+ Inviter"**

1. **Email** : Adresse email professionnelle
2. **Rôle** : Sélectionnez le rôle approprié
3. **Permissions** : (Si rôle personnalisé)
4. **Message** : Personnalisez l'email d'invitation
5. **Envoyer**

L'utilisateur reçoit un email avec un lien pour activer son compte.

### Gérer les Permissions

**Paramètres → Utilisateurs → [Utilisateur] → Permissions**

#### Permissions Détaillées

Pour chaque module, définissez :
- **Lecture** : Consulter seulement
- **Écriture** : Créer et modifier
- **Suppression** : Supprimer des éléments
- **Admin** : Accès admin au module

**Exemples** :

**Formateur** :
- ✅ Étudiants : Lecture
- ✅ Formations : Lecture + Écriture (sessions assignées)
- ✅ Présences : Lecture + Écriture
- ✅ Notes : Lecture + Écriture
- ❌ Paiements : Pas d'accès
- ❌ Paramètres : Pas d'accès

**Comptable** :
- ✅ Étudiants : Lecture
- ✅ Paiements : Lecture + Écriture + Suppression
- ✅ Documents (financiers) : Lecture + Écriture
- ❌ Notes : Pas d'accès
- ❌ Paramètres : Pas d'accès

### Désactiver un Compte

Pour suspendre temporairement :
1. **Paramètres → Utilisateurs → [Utilisateur]**
2. Cliquez sur **"Désactiver"**
3. L'utilisateur ne peut plus se connecter
4. Réactivez quand nécessaire

### Supprimer un Compte

**Attention** : Suppression définitive.

1. **Paramètres → Utilisateurs → [Utilisateur]**
2. Cliquez sur **"Supprimer"**
3. Confirmez
4. Ses données sont anonymisées (RGPD)

---

## ⚙️ Configuration Globale

### Finances

**Paramètres → Finances**

#### Facturation

- **Informations légales** :
  - Coordonnées complètes
  - Numéro SIRET, TVA
  - Conditions de paiement
- **Numérotation** :
  - Format : FACT-{YYYY}-{XXXX}
  - Compteur : Réinitialisation annuelle ou continue
- **Échéances** :
  - Délai par défaut : 30 jours
  - Relances automatiques : J+7, J+15, J+30

#### Modes de Paiement

Activez les modes disponibles :
- ✅ Espèces
- ✅ Chèque
- ✅ Virement bancaire
- ✅ Carte bancaire (intégration Stripe)
- ✅ Prélèvement SEPA
- ❌ PayPal (si non utilisé)

#### TVA

Configurez les taux :
- TVA 20% (taux normal)
- TVA 10% (taux intermédiaire)
- TVA 5.5% (taux réduit)
- TVA 0% (exonération formations)

### Documents

**Paramètres → Documents**

- **Templates** : Personnalisez tous les modèles
- **Numérotation** : Format des numéros de document
- **Signatures** : Configurez la signature électronique
- **Stockage** : Durée de conservation (10 ans min)

### Présences

**Paramètres → Présences**

- **Méthodes** : Activez manuel, QR code, lien URL
- **Fenêtre d'émargement** : -15 min / +15 min par défaut
- **Géolocalisation** : Activer pour limiter au lieu de formation
- **Alertes** : Seuils d'absences (2, 3, 5 absences)
- **Justificatifs** : Documents acceptés (certificat médical, etc.)

### Messagerie

**Paramètres → Messages**

- **Notifications** : Email immédiat, résumé quotidien
- **Modèles** : Créez des modèles de messages
- **Archivage** : Durée de conservation

### Portail

**Paramètres → Portail**

- **Actif** : Activer/désactiver le portail
- **Permissions** : Ce que les étudiants peuvent voir/faire
- **Apparence** : Logo, couleurs, message de bienvenue
- **Invitations** : Envoi automatique
- **Notifications** : Événements notifiés

---

## 🔒 Sécurité et Conformité

### Authentification

**Paramètres → Sécurité → Authentification**

#### Politique de Mot de Passe

- **Longueur minimum** : 8 caractères (recommandé: 12)
- **Complexité** : Majuscules, minuscules, chiffres, caractères spéciaux
- **Expiration** : Renouvellement tous les X jours (optionnel)
- **Historique** : Ne pas réutiliser les X derniers mots de passe

#### Double Authentification (2FA)

- **Obligatoire pour** : Administrateurs (recommandé)
- **Optionnelle pour** : Autres rôles
- **Méthodes** :
  - TOTP (Google Authenticator, Authy)
  - Email
  - SMS

#### Tentatives de Connexion

- **Verrouillage après** : 5 tentatives échouées
- **Durée de verrouillage** : 30 minutes
- **Notification** : Email à l'utilisateur

### RGPD

**Paramètres → Sécurité → RGPD**

#### Politique de Confidentialité

- **Publiée** : Oui/Non
- **Dernière mise à jour** : Date
- **Lien** : URL de la politique

#### Consentements

- **Obligatoires** :
  - Acceptation CGU
  - Acceptation Politique de confidentialité
- **Optionnels** :
  - Emails marketing
  - Partage de données avec partenaires

#### Droits des Utilisateurs

Gérez les demandes RGPD :
- **Droit d'accès** : Export des données personnelles
- **Droit de rectification** : Modification des données
- **Droit à l'oubli** : Suppression/anonymisation
- **Droit à la portabilité** : Export en format standard

**Paramètres → Sécurité → Demandes RGPD**

Liste de toutes les demandes avec statut :
- ⏳ En attente
- ✅ Traitée
- ❌ Refusée (avec justification)

### Audit et Logs

**Paramètres → Sécurité → Logs**

Consultez l'historique complet :
- **Connexions** : Qui s'est connecté, quand, depuis où
- **Modifications** : Qui a modifié quoi, quand
- **Exports** : Qui a exporté des données
- **Suppressions** : Qui a supprimé quoi

**Rétention** : 12 mois minimum

---

## 💾 Sauvegarde et Maintenance

### Exports

**Paramètres → Données → Exports**

Exportez toutes vos données :

#### Export Complet

- **Fréquence** : Recommandé mensuel
- **Contenu** :
  - Étudiants
  - Formations
  - Paiements
  - Documents
  - Messages
- **Format** : ZIP contenant JSON + CSV + PDF
- **Taille** : Variable selon volume de données

#### Exports Ciblés

Par module :
- Étudiants : CSV, Excel
- Paiements : FEC (Fichier des Écritures Comptables)
- Formations : Excel
- Documents : ZIP avec tous les PDF

### Sauvegarde Automatique

Les données sont sauvegardées automatiquement :
- **Fréquence** : Quotidienne
- **Rétention** : 30 jours
- **Serveurs** : Hébergement sécurisé Europe

**Aucune action requise de votre part.**

### Restauration

En cas de problème (rare) :
1. Contactez le support : support@eduzen.io
2. Indiquez la date de restauration souhaitée
3. Le support effectue la restauration (< 4h)

**Recommandation** : Testez vos exports régulièrement.

### Mises à Jour

EDUZEN est mis à jour automatiquement :
- **Fréquence** : 1-2 fois par mois
- **Type** :
  - Nouvelles fonctionnalités
  - Corrections de bugs
  - Améliorations de performance
- **Notification** : Vous êtes notifié des mises à jour majeures

**Aucune action requise.**

---

## 📊 Rapports et Analytics

### Tableau de Bord Admin

**Dashboard → Analytics**

Vue d'ensemble de votre activité :

#### Indicateurs Clés

- **Étudiants actifs** : Nombre d'étudiants en formation
- **Taux de présence moyen** : Tous étudiants confondus
- **Chiffre d'affaires** : Mois en cours, année
- **Taux de réussite** : Étudiants validant leur formation
- **NPS (Net Promoter Score)** : Satisfaction étudiants

#### Graphiques

- Évolution des inscriptions
- Chiffre d'affaires par mois
- Taux de présence par formation
- Répartition des étudiants (âge, genre, statut)

### Rapports Personnalisés

Créez des rapports sur mesure :

**Dashboard → Rapports → "+ Nouveau rapport"**

1. Choisissez les **métriques**
2. Définissez les **filtres**
3. Sélectionnez la **période**
4. Choisissez le **format** (tableau, graphique)
5. **Générez**

**Export** : PDF, Excel, CSV

---

## ✅ Bonnes Pratiques

### 1. Sécurité

- ✅ **2FA obligatoire** : Pour tous les administrateurs
- ✅ **Permissions strictes** : Principe du moindre privilège
- ✅ **Audit régulier** : Consultez les logs mensuellement
- ✅ **Formation** : Sensibilisez votre équipe à la sécurité

### 2. Maintenance

- ✅ **Exports réguliers** : Mensuel minimum
- ✅ **Vérification** : Testez un export par an
- ✅ **Nettoyage** : Archivez les anciennes données
- ✅ **Mise à jour** : Profitez des nouvelles fonctionnalités

### 3. Organisation

- ✅ **Documentation** : Documentez vos processus internes
- ✅ **Rôles clairs** : Chaque utilisateur a un rôle adapté
- ✅ **Formation équipe** : Formez votre équipe à l'outil
- ✅ **Support** : N'hésitez pas à contacter le support

---

## 🆘 Support Administrateur

### Ressources

- **Documentation** : docs.eduzen.io
- **Vidéos** : youtube.com/eduzen
- **Blog** : blog.eduzen.io
- **Changelog** : eduzen.io/changelog

### Contact Support

**Support Prioritaire** pour les administrateurs :

- **Email** : admin-support@eduzen.io (réponse < 4h)
- **Chat** : Disponible dans l'app
- **Téléphone** : +33 (0)1 XX XX XX XX (Lun-Ven, 9h-18h)
- **Rendez-vous** : Planifiez une visio avec un expert

---

**Vous êtes prêt à administrer EDUZEN !** 🚀

Pour toute question, contactez : admin-support@eduzen.io
