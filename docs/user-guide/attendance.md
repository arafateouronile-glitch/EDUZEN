# ✅ Guide de Gestion des Présences

Guide complet pour gérer les émargements et présences dans EDUZEN.

---

## 📋 Table des Matières

1. [Vue d'Ensemble](#vue-densemble)
2. [Émargement Manuel](#émargement-manuel)
3. [Émargement Électronique](#émargement-électronique)
4. [Gestion des Absences](#gestion-des-absences)
5. [Rapports et Statistiques](#rapports-et-statistiques)
6. [Conformité Réglementaire](#conformité-réglementaire)

---

## 📊 Vue d'Ensemble

### Accès au Module

**Navigation** : Dashboard → Présences

### Méthodes d'Émargement

EDUZEN propose **3 méthodes** :

| Méthode | Avantages | Cas d'usage |
|---------|-----------|-------------|
| **Manuel** | Simple, pas de matériel | Petits groupes, ponctuel |
| **QR Code** | Rapide, sans contact | Grands groupes, COVID-safe |
| **Lien URL** | À distance, flexible | Formation distancielle |

### Importance des Présences

- **Obligation légale** : Pour les formations financées (CPF, OPCO, etc.)
- **Suivi pédagogique** : Identifier les étudiants en difficulté
- **Facturation** : Prouver la réalisation de la formation
- **Statistiques** : Taux de présence, abandons

---

## ✏️ Émargement Manuel

### Émarger une Séance

1. **Dashboard → Présences**
2. Sélectionnez la **session**
3. Sélectionnez la **séance** (date du jour)
4. Cochez les **étudiants présents**
5. **Validez**

### Émargement Rapide

Pour émarger rapidement :
- **Tout cocher** : Bouton "Tous présents"
- **Inversez** : Bouton "Inverser sélection"
- **Dernière fois** : Bouton "Reprendre dernière séance"

### Modifier un Émargement

Si vous devez corriger après validation :
1. Séance → **"Modifier l'émargement"**
2. Cochez/décochez
3. **Enregistrez**

**Note** : Les modifications sont tracées (qui, quand, pourquoi).

---

## 📱 Émargement Électronique

### Méthode 1 : QR Code

**Avantages** :
- Rapide (scan avec smartphone)
- Sans contact
- Anti-fraude (QR unique et temporaire)

#### Configuration

1. Session → Séance → **"Émargement électronique"**
2. Choisissez **"QR Code"**
3. Définissez la fenêtre d'émargement :
   - Début : 15 min avant la séance (par défaut)
   - Fin : 15 min après le début (par défaut)
4. **Générez le QR Code**

#### Utilisation en Cours

1. **Affichez** le QR Code (vidéoprojecteur, tablette, impression)
2. Les étudiants **scannent** avec leur smartphone
3. Ils sont redirigés vers une page de confirmation
4. La présence est **enregistrée automatiquement**
5. Vous voyez en temps réel les présents

#### Sécurité

- QR Code **unique** par séance
- **Expire** après la fenêtre d'émargement
- **Géolocalisation** (optionnel) : Limite au lieu de formation
- **Photo** (optionnel) : L'étudiant prend un selfie

### Méthode 2 : Lien URL

**Avantages** :
- Pour formation à distance
- Accessible sur ordinateur
- Pas de scan nécessaire

#### Configuration

1. Session → Séance → **"Émargement électronique"**
2. Choisissez **"Lien URL"**
3. Définissez la fenêtre d'émargement
4. **Générez le lien**

#### Utilisation

1. **Partagez** le lien :
   - Par email (automatique)
   - Dans le chat de la visioconférence
   - Sur l'espace de cours
2. Les étudiants cliquent sur le lien
3. Présence enregistrée

#### Options Avancées

- **Code PIN** : L'étudiant doit saisir un code affiché par le formateur
- **Question de vérification** : Ex: "Quel est le sujet du jour ?"
- **Limite par IP** : Un seul émargement par IP

### Méthode 3 : Auto-émargement (Portail)

Les étudiants s'émargent eux-mêmes via le portail :

1. Portail Apprenant → **"Mes séances"**
2. Séance du jour : Bouton **"Émarger"**
3. L'étudiant clique (dans la fenêtre autorisée)
4. Présence enregistrée

**Usage** : Formations en autonomie, e-learning

---

## ❌ Gestion des Absences

### Signaler une Absence

#### Par le Formateur

1. Émargement → Décochez l'étudiant absent
2. Statut : **Absent non justifié** 🔴

#### Par l'Étudiant (Justification)

1. L'étudiant se connecte au portail
2. **"Mes présences"** → Séance absente
3. **"Justifier mon absence"**
4. Upload du justificatif (certificat médical, etc.)
5. Vous recevez une notification

#### Validation du Justificatif

1. Dashboard → Présences → **"Absences à justifier"**
2. Consultez le justificatif uploadé
3. **Acceptez** ou **Refusez**
4. L'absence devient **"Justifiée"** 🟡 ou reste **"Non justifiée"** 🔴

### Types d'Absence

- 🟢 **Présent** : Étudiant présent
- 🔴 **Absent non justifié** : Absence sans justificatif
- 🟡 **Absent justifié** : Absence avec justificatif valide
- ⏳ **En attente** : Justificatif en cours de validation
- 🟣 **Retard** : Arrivée après le début (optionnel)

### Alertes Absences

Configuration : Paramètres → Présences → **"Alertes"**

**Alertes automatiques** :
- Après **2 absences consécutives** : Email à l'étudiant
- Après **3 absences** : Email au formateur + responsable
- Après **5 absences** : Alerte décrochage

### Gestion du Décrochage

Pour un étudiant avec absences répétées :
1. Dashboard → Étudiants → [Étudiant] → **"Absences"**
2. Consultez l'historique
3. Actions :
   - **Envoyer un message** : Prendre contact
   - **Planifier un entretien** : RDV de suivi
   - **Signaler au tuteur** : Si mineur ou demandeur d'emploi

---

## 📊 Rapports et Statistiques

### Tableau de Bord Présences

**Navigation** : Dashboard → Présences → **"Statistiques"**

**Indicateurs clés** :
- Taux de présence global
- Taux par formation
- Évolution dans le temps
- Top/Flop présences

### Rapports Individuels

Pour un étudiant :
1. Fiche étudiant → Onglet **"Présences"**
2. Vue détaillée :
   - Taux de présence
   - Nombre d'absences justifiées/non justifiées
   - Historique séance par séance
   - Graphique d'évolution

### Rapports par Session

Pour une session :
1. Session → Onglet **"Présences"**
2. Vue d'ensemble :
   - Taux de présence moyen
   - Séance par séance
   - Étudiants à risque de décrochage
3. Exportez en **Excel** ou **PDF**

### Feuilles d'Émargement (PDF)

Générez les feuilles d'émargement officielles :
1. Session → **"Feuilles d'émargement"**
2. Choisissez :
   - Une séance
   - Toutes les séances (consolidé)
3. Format : **Cerfa** ou **Personnalisé**
4. **Générez le PDF**

**Contenu** :
- Liste des étudiants
- Date et horaires
- Signatures (si émargement manuel)
- Signature du formateur
- Cachet de l'organisation

---

## 📜 Conformité Réglementaire

### Obligations Légales (France)

Pour les **organismes de formation** :

#### Formations Financées

- **Cerfa** : Utilisation des feuilles d'émargement Cerfa 6110-04
- **Conservation** : 10 ans minimum
- **Contrôle** : Auditeurs OPCO, Pôle Emploi, etc.

#### Formations CPF

- **Preuve** : Émargement électronique ou papier obligatoire
- **Traçabilité** : Horodatage des émargements électroniques
- **Signature** : Étudiant + formateur

### Émargement Électronique Conforme

L'émargement électronique EDUZEN est **conforme** :

✅ **Horodatage certifié** : Date et heure exactes  
✅ **Traçabilité** : Qui, quand, où, comment  
✅ **Anti-fraude** : QR unique, géolocalisation, photo  
✅ **Archivage sécurisé** : 10 ans minimum  
✅ **Export PDF** : Feuille d'émargement Cerfa  

### Qualiopi

Pour la certification **Qualiopi** :

**Indicateur 3** : Assiduité
- ✅ Feuilles d'émargement conformes
- ✅ Suivi individualisé
- ✅ Actions en cas d'absences répétées

**Preuves à fournir** :
- Feuilles d'émargement (EDUZEN génère automatiquement)
- Justificatifs d'absence
- Traces de relances (emails enregistrés)

---

## ⚙️ Configuration

### Paramètres Généraux

**Navigation** : Dashboard → Paramètres → **Présences**

**Options** :
- **Fenêtre d'émargement** : Avant/après début de séance
- **Retards** : Activer le statut "Retard" (arrivée après X minutes)
- **Géolocalisation** : Activer pour émargement électronique
- **Photo** : Demander un selfie lors de l'émargement
- **Alertes** : Seuils d'absences pour alertes automatiques

### Modèles de Feuilles d'Émargement

Personnalisez vos feuilles d'émargement :
1. Paramètres → Présences → **"Modèles"**
2. Choisissez :
   - Cerfa standard (recommandé)
   - Template personnalisé
3. Personnalisez :
   - Logo
   - En-tête/pied de page
   - Champs supplémentaires

---

## ✅ Bonnes Pratiques

### 1. Choix de la Méthode

- ✅ **Présentiel, grand groupe** : QR Code
- ✅ **Distanciel** : Lien URL
- ✅ **Petit groupe, ponctuel** : Manuel

### 2. Rigueur

- ✅ **Émargez à chaque séance** : Pas d'oubli
- ✅ **Vérifiez les justificatifs** : Ne validez que si valides
- ✅ **Archivez** : Exportez régulièrement en PDF

### 3. Pédagogie

- ✅ **Communiquez** : Rappelez l'importance des présences
- ✅ **Accompagnez** : Contactez les étudiants absents
- ✅ **Prévenez** : Informez des conséquences (exclusion, non-financement)

### 4. Technique

- ✅ **Testez avant** : Vérifiez que le QR fonctionne avant la première séance
- ✅ **Géolocalisation** : Activez si risque de fraude
- ✅ **Backups** : Gardez aussi les émargements papier en secours

---

## 🚨 Cas d'Usage Fréquents

### QR Code ne Fonctionne Pas

**Problème** : Étudiant ne peut pas scanner

**Solutions** :
1. Vérifiez que la fenêtre d'émargement est ouverte
2. Régénérez le QR Code
3. Utilisez le **lien URL** en secours
4. Émargement manuel en dernier recours

### Étudiant Oublie d'Émarger

Si l'étudiant était présent mais a oublié :
1. Présences → Séance → Cochez manuellement
2. Ajoutez un commentaire : "Émargement manuel - oubli"
3. Conservez la trace

### Formation Hybride (Présentiel + Distanciel)

Pour gérer les 2 :
1. Créez **2 groupes** : Présentiel / Distanciel
2. **Présentiel** : QR Code à scanner en salle
3. **Distanciel** : Lien URL envoyé par email
4. Les présences sont consolidées automatiquement

### Contrôle OPCO

Lors d'un contrôle :
1. Dashboard → Présences → Session concernée
2. **"Exporter tout"** : PDF complet avec toutes les feuilles
3. Fournissez le PDF (signatures électroniques horodatées)
4. Justificatifs d'absence disponibles

---

## 🔗 Liens Utiles

- [Guide Formations](./formations.md)
- [Guide Étudiants](./students.md)
- [Guide Documents](./documents.md)
- [FAQ](./faq.md)

---

**Besoin d'aide ?** Contactez le support : support@eduzen.io
