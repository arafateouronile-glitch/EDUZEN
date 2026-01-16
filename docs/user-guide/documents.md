# 📄 Guide de Gestion des Documents

Guide complet pour générer et gérer les documents dans EDUZEN.

---

## 📋 Table des Matières

1. [Vue d'Ensemble](#vue-densemble)
2. [Générer un Document](#générer-un-document)
3. [Templates de Documents](#templates-de-documents)
4. [Signatures Électroniques](#signatures-électroniques)
5. [Stockage et Archivage](#stockage-et-archivage)
6. [Envoi et Partage](#envoi-et-partage)

---

## 📊 Vue d'Ensemble

### Accès au Module

**Navigation** : Dashboard → Documents

### Types de Documents

EDUZEN génère automatiquement tous les documents nécessaires :

#### Documents Pédagogiques
- Programme de formation
- Convention de formation
- Convocation
- Feuille d'émargement
- Attestation de présence
- Certificat de réalisation
- Livret d'apprentissage

#### Documents Administratifs
- Contrat d'apprentissage
- Contrat de professionnalisation
- Règlement intérieur
- Certificat de stage

#### Documents Financiers
- Facture (voir [Guide Paiements](./payments.md))
- Avoir
- Reçu de paiement
- Devis

#### Documents RH
- Contrat de travail formateur
- Fiche de paie (intégration externe)

---

## 📝 Générer un Document

### Méthode Rapide

1. **Dashboard → Documents → "

+ Nouveau document"**
2. Choisissez le **type de document**
3. Sélectionnez l'**étudiant** (ou formateur selon le document)
4. Le document est **pré-rempli** automatiquement avec les données
5. **Prévisualisez**
6. **Générez**

Le document est créé en PDF et archivé automatiquement.

### Génération Contextuelle

Depuis d'autres modules, générez directement :

**Depuis un Étudiant** :
- Fiche étudiant → Actions → **"Générer un document"**
- Choisissez le type
- Le document est pré-rempli avec les infos de l'étudiant

**Depuis une Session** :
- Session → Actions → **"Générer les documents"**
- Options :
  - Feuilles d'émargement
  - Convocations (en masse)
  - Attestations (à la fin)

**Depuis une Facture** :
- La facture est un document PDF généré automatiquement

---

## 🎨 Templates de Documents

### Templates Disponibles

EDUZEN fournit des templates conformes :
- Modèles Cerfa officiels (pour France)
- Modèles personnalisables
- Modèles multi-langues

### Personnaliser un Template

1. **Dashboard → Paramètres → Templates de documents**
2. Sélectionnez un template
3. Cliquez sur **"Modifier"**

#### Personnalisation Disponible

**En-tête et Pied de Page**
- Logo de votre organisation
- Coordonnées
- Numéro de déclaration d'activité
- Liens (site web, réseaux sociaux)

**Contenu**
- Texte personnalisable
- Variables dynamiques
- Mise en forme (gras, italique, listes)
- Tableaux

**Style**
- Police de caractère
- Couleurs (charte graphique)
- Marges
- Numérotation des pages

#### Variables Dynamiques

Insérez des variables pour remplissage automatique :

**Variables Étudiant**
```
{nom_etudiant}
{prenom_etudiant}
{email_etudiant}
{telephone_etudiant}
{adresse_etudiant}
{date_naissance}
{numero_etudiant}
```

**Variables Formation**
```
{nom_formation}
{code_formation}
{duree_formation}
{date_debut}
{date_fin}
{lieu_formation}
{prix_formation}
```

**Variables Organisation**
```
{nom_organisation}
{adresse_organisation}
{siret}
{numero_declaration_activite}
{email_organisation}
{telephone_organisation}
```

**Variables Diverses**
```
{date_du_jour}
{numero_document}
{annee_en_cours}
```

### Créer un Template Personnalisé

1. **Paramètres → Templates → "+ Nouveau template"**
2. Nommez votre template (ex: "Certificat de stage")
3. Choisissez le type de document
4. Utilisez l'**éditeur visuel** :
   - Glissez-déposez des éléments
   - Insérez des variables
   - Ajoutez des images, tableaux
5. **Prévisualisez** avec des données de test
6. **Enregistrez**

---

## ✍️ Signatures Électroniques

### Fonctionnement

EDUZEN intègre la signature électronique conforme **eIDAS** :
- Signature électronique qualifiée
- Valeur légale équivalente à une signature manuscrite
- Horodatage certifié
- Traçabilité complète

### Demander une Signature

1. Générez le document à signer (convention, contrat, etc.)
2. Cliquez sur **"Demander une signature"**
3. Sélectionnez les **signataires** :
   - Étudiant
   - Tuteur légal (si mineur)
   - Formateur
   - Représentant de l'organisation
4. Définissez l'**ordre de signature** (si plusieurs signataires)
5. **Envoyez**

### Processus de Signature

1. Le signataire reçoit un **email** avec un lien sécurisé
2. Il clique sur le lien (lien unique et temporaire)
3. Il **vérifie le document**
4. Il **signe électroniquement** :
   - Saisie de signature manuscrite (souris/tactile)
   - Upload d'une signature scannée
   - Signature automatique (initiales)
5. Il reçoit une **copie signée** par email

### Suivi des Signatures

Dashboard → Documents → Onglet **"En attente de signature"**

Pour chaque document :
- Statut :
  - ⏳ En attente : Non encore signé
  - ✅ Signé : Complètement signé
  - 🔴 Expiré : Délai dépassé (lien expiré)
- Date de demande
- Date de signature
- Signataires (avec leur statut individuel)

### Relance Automatique

Si un signataire n'a pas signé :
1. Relance automatique après **7 jours** (configurable)
2. Relance manuelle : Cliquez sur **"Relancer"**

---

## 💾 Stockage et Archivage

### Organisation des Documents

Les documents sont organisés automatiquement :

**Par Étudiant** :
- Fiche étudiant → Onglet **"Documents"**
- Tous les documents liés à cet étudiant

**Par Formation** :
- Formation/Session → Onglet **"Documents"**
- Tous les documents liés à cette session

**Vue Globale** :
- Dashboard → Documents
- Tous les documents de l'organisation

### Catégories

Les documents sont catégorisés :
- 📚 Pédagogique
- 📄 Administratif
- 💰 Financier
- 🤝 RH
- 📁 Autre

### Recherche et Filtres

**Barre de recherche** : Recherche par nom, numéro, étudiant

**Filtres** :
- Type de document
- Catégorie
- Date de création
- Statut (brouillon, validé, signé)
- Étudiant, Formation

### Durée de Conservation

Conformément aux obligations légales :
- **Documents pédagogiques** : 10 ans minimum
- **Documents financiers** : 10 ans minimum
- **Documents RH** : Variable selon le type

EDUZEN conserve automatiquement. Vous pouvez exporter pour archivage externe.

---

## 📤 Envoi et Partage

### Envoyer par Email

1. Sélectionnez un ou plusieurs documents
2. Cliquez sur **"Envoyer par email"**
3. Choisissez les destinataires :
   - Étudiant concerné
   - Tuteur
   - Autre (email personnalisé)
4. Personnalisez le message
5. **Envoyez**

### Télécharger

Pour télécharger un document :
- Cliquez sur **"Télécharger"** (icône ⬇️)
- Le PDF est téléchargé sur votre ordinateur

**Téléchargement en masse** :
- Sélectionnez plusieurs documents (cases à cocher)
- Cliquez sur **"Télécharger"**
- Un ZIP est généré

### Partage via Lien

Pour partager un document sans email :
1. Document → **"Générer un lien"**
2. Copiez le lien
3. Partagez-le (chat, SMS, etc.)

**Options** :
- Lien permanent ou temporaire (expire après X jours)
- Accès avec mot de passe (optionnel)
- Traçabilité (qui a consulté)

### Accès Portail

Les étudiants accèdent à leurs documents via le portail :
- Portail Apprenant → **"Mes documents"**
- Ils peuvent :
  - Consulter
  - Télécharger
  - Signer (si signature demandée)

---

## ⚙️ Configuration Avancée

### Watermark (Filigrane)

Pour les documents confidentiels :
1. Template → **"Paramètres avancés"**
2. Activez **"Watermark"**
3. Choisissez :
   - Texte (ex: "CONFIDENTIEL")
   - Image (logo en transparence)
   - Position et opacité

### Signature Manuscrite (Scan)

Pour ajouter une signature scannée à vos templates :
1. Scannez votre signature
2. Upload : Paramètres → Profil → **"Ma signature"**
3. Elle sera insérée automatiquement dans les documents nécessaires

### Numérotation Automatique

Les documents sont numérotés automatiquement :
- Conventions : CONV-2026-001
- Attestations : ATT-2026-001
- Certificats : CERT-2026-001

Configuration : Paramètres → Documents → **"Numérotation"**

### Export Comptable

Pour votre comptabilité :
1. Documents → Filtrer par "Financier"
2. Sélectionnez la période
3. Exportez en **CSV** ou **Excel**

---

## ✅ Bonnes Pratiques

### 1. Organisation

- ✅ **Nommez clairement** : Utilisez des noms descriptifs
- ✅ **Catégorisez** : Assignez une catégorie à chaque document
- ✅ **Vérifiez avant envoi** : Prévisualisez toujours

### 2. Conformité

- ✅ **Mentions légales** : Vérifiez que tous les champs obligatoires sont remplis
- ✅ **RGPD** : Ne collectez que les données nécessaires
- ✅ **Archivage** : Conservez 10 ans minimum

### 3. Automatisation

- ✅ **Génération automatique** : Lors de l'inscription, générez convention + convocation
- ✅ **Envoi automatique** : Configurez l'envoi automatique après génération
- ✅ **Rappels** : Activez les rappels pour les signatures en attente

---

## 🚨 Cas d'Usage Fréquents

### Générer des Convocations en Masse

Pour une session :
1. Session → **"Générer les documents"**
2. Type : **Convocation**
3. Sélectionnez tous les étudiants
4. Cliquez sur **"Générer"**
5. Option : **"Envoyer automatiquement"**

### Corriger un Document Déjà Généré

Si une erreur est détectée après génération :
1. **Option A** : Régénérez le document (si pas encore envoyé)
2. **Option B** : Annotez le PDF (si déjà envoyé) et renvoyez

**Recommandation** : Régénérez pour garder une version propre.

### Document Perdu par l'Étudiant

L'étudiant peut :
1. Se connecter au portail
2. Onglet **"Documents"**
3. Retélécharger

Vous pouvez aussi :
1. Fiche étudiant → Documents
2. Cliquez sur **"Renvoyer par email"**

---

## 🔗 Liens Utiles

- [Guide Étudiants](./students.md)
- [Guide Formations](./formations.md)
- [Guide Paiements](./payments.md)
- [FAQ](./faq.md)

---

**Besoin d'aide ?** Contactez le support : support@eduzen.io
