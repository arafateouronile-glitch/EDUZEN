# 💰 Guide de Gestion des Paiements

Guide complet pour gérer les factures et paiements dans EDUZEN.

---

## 📋 Table des Matières

1. [Vue d'Ensemble](#vue-densemble)
2. [Créer une Facture](#créer-une-facture)
3. [Enregistrer un Paiement](#enregistrer-un-paiement)
4. [Suivi et Relances](#suivi-et-relances)
5. [Rapports Financiers](#rapports-financiers)
6. [Configuration](#configuration)

---

## 📊 Vue d'Ensemble

### Accès au Module

**Navigation** : Dashboard → Paiements

### Fonctionnalités

- Création et gestion des factures
- Enregistrement des paiements (multiples modes)
- Paiements partiels
- Avoir et remboursements
- Relances automatiques
- Rapports financiers
- Export comptable

---

## 📄 Créer une Facture

### Nouvelle Facture

1. Cliquez sur **"+ Nouvelle facture"**
2. Sélectionnez l'**étudiant** (requis)
3. Remplissez les informations :

#### En-tête de Facture
- **Numéro de facture** : Généré automatiquement (FACT-YYYY-XXXX)
- **Date d'émission** : Par défaut aujourd'hui
- **Date d'échéance** : Par défaut +30 jours (configurable)
- **Devise** : EUR par défaut

#### Lignes de Facturation

Pour chaque ligne :
- **Désignation** : Description du service/produit
- **Quantité** : Nombre d'unités
- **Prix unitaire HT** : Prix hors taxes
- **TVA** : Taux applicable (0%, 5.5%, 10%, 20%)
- **Total HT** : Calculé automatiquement
- **Total TTC** : Calculé automatiquement

**Exemples de lignes** :
```
Formation "Développeur Web" - 1500€ HT - TVA 20%
Matériel pédagogique - 150€ HT - TVA 20%
```

#### Totaux Automatiques
- Sous-total HT
- Total TVA (par taux)
- **Total TTC**

4. **Options avancées** :
   - Ajouter une note/commentaire
   - Conditions de paiement personnalisées
   - Coordonnées bancaires spécifiques

5. **Actions** :
   - **Enregistrer comme brouillon** : Facture non envoyée
   - **Valider et envoyer** : Facture envoyée par email à l'étudiant

### Facture Depuis une Formation

**Méthode rapide** : Générer une facture directement depuis une inscription

1. Dashboard → Formations → [Sélectionnez une session]
2. Cliquez sur un étudiant inscrit
3. Cliquez sur **"Générer une facture"**
4. Les informations sont pré-remplies :
   - Désignation : Nom de la formation
   - Montant : Prix de la session
5. Complétez et validez

---

## 💳 Enregistrer un Paiement

### Paiement Simple (Total)

1. Depuis la liste des factures, cliquez sur la facture
2. Cliquez sur **"Enregistrer un paiement"**
3. Remplissez :
   - **Montant** : Pré-rempli avec le solde restant
   - **Date de paiement** : Par défaut aujourd'hui
   - **Mode de paiement** :
     - Espèces
     - Chèque
     - Virement bancaire
     - Carte bancaire
     - Autre
   - **Référence** : N° de transaction, chèque, etc.
4. **Validez**

Le statut de la facture passe à **"Payée"** 🟢

### Paiement Partiel

Si l'étudiant paie en plusieurs fois :

1. **Enregistrer un paiement** comme ci-dessus
2. Entrez le **montant partiel** (ex: 500€ sur 1500€)
3. Validez

Le statut de la facture passe à **"Partiellement payée"** 🟡

**Solde restant** : Affiché clairement (ex: 1000€ restant)

Vous pouvez enregistrer d'autres paiements partiels jusqu'au solde complet.

### Historique des Paiements

Dans la fiche facture, onglet **"Paiements"** :
- Liste de tous les paiements enregistrés
- Montant, date, mode, référence
- Total payé / Total à payer

---

## 📧 Suivi et Relances

### Statuts de Facture

| Statut | Description | Couleur |
|--------|-------------|---------|
| Brouillon | Non envoyée | ⚪ Gris |
| Envoyée | Envoyée, en attente de paiement | 🔵 Bleu |
| Partiellement payée | Paiement(s) partiel(s) | 🟡 Orange |
| Payée | Totalement payée | 🟢 Vert |
| En retard | Échéance dépassée | 🔴 Rouge |
| Annulée | Facture annulée | ⚫ Noir |

### Filtrer par Statut

Utilisez les filtres pour afficher :
- Factures en retard
- Factures à échéance dans X jours
- Factures non payées

### Relances Automatiques

**Configuration** : Dashboard → Paramètres → Finances → Relances

1. **Activer les relances automatiques**
2. Définir les règles :
   - Relance 1 : J+7 après échéance
   - Relance 2 : J+15 après échéance
   - Relance 3 : J+30 après échéance

3. **Personnaliser le modèle d'email** :
   - Objet
   - Corps du message
   - Variables dynamiques : {nom_etudiant}, {numero_facture}, {montant}, {echeance}

### Relance Manuelle

Pour une relance ponctuelle :
1. Sélectionnez une ou plusieurs factures
2. Cliquez sur **"Envoyer un rappel"**
3. Prévisualisez l'email
4. Envoyez

---

## 📊 Rapports Financiers

### Tableau de Bord Financier

**Navigation** : Dashboard → Paiements → Rapports

**Indicateurs clés** :
- Chiffre d'affaires (mois en cours, année)
- Paiements reçus
- Factures en attente
- Factures en retard
- Taux de recouvrement

**Graphiques** :
- Évolution du CA par mois
- Répartition par mode de paiement
- Répartition par formation

### Exports Comptables

Pour votre comptabilité :

1. Cliquez sur **"Exporter"**
2. Choisissez la période (mois, trimestre, année, personnalisée)
3. Sélectionnez le format :
   - **Excel** : Liste détaillée
   - **CSV** : Import dans votre logiciel comptable
   - **PDF** : Rapport imprimable
   - **FEC** : Fichier des Écritures Comptables (format légal France)

### Grand Livre

Vue détaillée de toutes les écritures :
- Factures émises
- Paiements reçus
- Avoirs
- Avec date, référence, montant, statut

---

## ⚙️ Configuration

### Informations de Facturation

**Navigation** : Dashboard → Paramètres → Finances → Facturation

- **Informations légales** :
  - Raison sociale
  - Numéro SIRET
  - Numéro TVA intracommunautaire
  - Adresse du siège social
  - RCS

- **Coordonnées bancaires** :
  - IBAN
  - BIC
  - Titulaire du compte

- **Conditions de paiement par défaut**
  - Délai de paiement (ex: 30 jours)
  - Texte des conditions

### Numérotation

Personnalisez la numérotation des factures :
- Préfixe : FACT, INV, F
- Format : FACT-{YYYY}-{XXXX}
- Compteur : Réinitialisé annuellement ou continu

### Modes de Paiement

Activez/désactivez les modes de paiement disponibles :
- ✅ Espèces
- ✅ Chèque
- ✅ Virement bancaire
- ✅ Carte bancaire
- ✅ Prélèvement
- ❌ Crypto-monnaie (si non utilisé)

### TVA

Configurez les taux de TVA applicables :
- TVA 20% (taux normal)
- TVA 10% (taux intermédiaire)
- TVA 5.5% (taux réduit)
- TVA 0% (exonération)

**Cas particulier** : Formations exonérées de TVA (voir article 261-4-4° du CGI)

---

## 💡 Bonnes Pratiques

### 1. Facturation Régulière

- ✅ Envoyez les factures rapidement après l'inscription
- ✅ Précisez clairement les échéances
- ✅ Utilisez des références uniques

### 2. Suivi Rigoureux

- ✅ Consultez quotidiennement les factures en retard
- ✅ Relancez rapidement (J+7 maximum)
- ✅ Documentez tous les paiements

### 3. Communication

- ✅ Informez les étudiants des modalités de paiement dès l'inscription
- ✅ Proposez des échéanciers si nécessaire
- ✅ Soyez professionnel mais bienveillant dans les relances

### 4. Conformité

- ✅ Respectez les obligations légales (mentions obligatoires)
- ✅ Conservez les factures 10 ans minimum
- ✅ Générez le FEC annuel pour contrôle fiscal

---

## 🚨 Cas d'Usage Fréquents

### Annuler une Facture

Si une facture a été émise par erreur :
1. Ouvrez la facture
2. Cliquez sur **"Annuler"**
3. Confirmez
4. La facture passe en statut "Annulée" (elle reste visible pour traçabilité)

### Créer un Avoir

Pour un remboursement ou une réduction :
1. Depuis la facture d'origine, cliquez sur **"Créer un avoir"**
2. Indiquez le montant
3. Validez
4. L'avoir est lié à la facture d'origine

### Échéancier de Paiement

Pour un paiement en plusieurs fois :
1. Créez la facture principale
2. Cliquez sur **"Créer un échéancier"**
3. Définissez les échéances :
   - Nombre de mensualités
   - Montants
   - Dates
4. Validez

Des factures intermédiaires seront créées automatiquement.

### Paiement par un Tiers

Si le paiement est effectué par un parent ou un financeur :
1. Enregistrez le paiement normalement
2. Dans "Payé par", indiquez le nom du tiers
3. Conservez la référence (ex: virement de M. Dupont)

---

## 🔗 Liens Utiles

- [Guide Étudiants](./students.md)
- [Guide Formations](./formations.md)
- [Guide Documents](./documents.md)
- [FAQ](./faq.md)

---

**Besoin d'aide ?** Contactez le support : support@eduzen.io
