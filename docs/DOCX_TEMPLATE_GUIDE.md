# Guide de Création de Templates Word (.docx)

Ce guide explique comment créer des templates Word (.docx) pour la génération de documents avec le système EDUZEN.

## Table des Matières

1. [Introduction](#introduction)
2. [Syntaxe des Variables](#syntaxe-des-variables)
3. [Variables Disponibles](#variables-disponibles)
4. [Boucles et Tableaux](#boucles-et-tableaux)
5. [Conditions](#conditions)
6. [Images](#images)
7. [Bonnes Pratiques](#bonnes-pratiques)
8. [Exemple Complet](#exemple-complet)

---

## Introduction

Le système utilise **docxtemplater** pour générer des documents Word. Cette approche offre:

- ✅ **Fidélité parfaite** : Le document généré est exactement comme le template
- ✅ **Éditeur familier** : Créez vos templates dans Microsoft Word
- ✅ **Styles préservés** : Polices, couleurs, tableaux, images sont conservés
- ✅ **Mise en page exacte** : En-têtes, pieds de page, marges respectés

---

## Syntaxe des Variables

### Variables Simples

Utilisez les accolades `{` et `}` pour insérer une variable :

```
Nom de l'élève : {eleve_nom}
Prénom : {eleve_prenom}
Date de naissance : {eleve_date_naissance_formate}
```

### Variables avec Formatage

Certaines variables ont des versions formatées :

| Variable | Description |
|----------|-------------|
| `{montant_ht}` | Montant brut (ex: 1500) |
| `{montant_ht_formate}` | Montant formaté (ex: 1 500,00 €) |
| `{session_debut}` | Date brute (ex: 2026-01-15) |
| `{session_debut_formate}` | Date formatée (ex: 15 Janvier 2026) |

---

## Variables Disponibles

### Informations de l'Élève

| Variable | Description |
|----------|-------------|
| `{eleve_nom}` | Nom de famille |
| `{eleve_prenom}` | Prénom |
| `{eleve_email}` | Adresse email |
| `{eleve_telephone}` | Numéro de téléphone |
| `{eleve_adresse}` | Adresse postale |
| `{eleve_code_postal}` | Code postal |
| `{eleve_ville}` | Ville |
| `{eleve_date_naissance}` | Date de naissance |
| `{eleve_date_naissance_formate}` | Date de naissance formatée |
| `{eleve_numero}` | Numéro d'étudiant |

### Informations de la Formation

| Variable | Description |
|----------|-------------|
| `{formation_nom}` | Nom de la formation |
| `{formation_description}` | Description |
| `{formation_duree}` | Durée totale |
| `{formation_niveau}` | Niveau |
| `{formation_prerequis}` | Prérequis |
| `{formation_objectifs}` | Objectifs pédagogiques |

### Informations de la Session

| Variable | Description |
|----------|-------------|
| `{session_nom}` | Nom de la session |
| `{session_debut}` | Date de début |
| `{session_debut_formate}` | Date de début formatée |
| `{session_fin}` | Date de fin |
| `{session_fin_formate}` | Date de fin formatée |
| `{session_lieu}` | Lieu |
| `{session_horaires}` | Horaires |
| `{session_duree_heures}` | Durée en heures |
| `{session_mode}` | Mode (présentiel/distanciel) |

### Informations Financières

| Variable | Description |
|----------|-------------|
| `{montant_ht}` | Montant HT |
| `{montant_ht_formate}` | Montant HT formaté |
| `{montant_tva}` | Montant TVA |
| `{montant_tva_formate}` | Montant TVA formaté |
| `{montant_ttc}` | Montant TTC |
| `{montant_ttc_formate}` | Montant TTC formaté |
| `{mode_paiement}` | Mode de paiement |
| `{echeances}` | Échéances de paiement |

### Informations de l'Organisme

| Variable | Description |
|----------|-------------|
| `{organisme_nom}` | Nom de l'organisme |
| `{organisme_adresse}` | Adresse |
| `{organisme_siret}` | Numéro SIRET |
| `{organisme_code_naf}` | Code NAF |
| `{organisme_numero_da}` | Numéro de déclaration d'activité |
| `{organisme_email}` | Email |
| `{organisme_telephone}` | Téléphone |
| `{organisme_logo}` | Logo (pour les images) |

### Variables de Système

| Variable | Description |
|----------|-------------|
| `{date_generation}` | Date de génération du document |
| `{annee_courante}` | Année en cours |
| `{numero_document}` | Numéro du document |

---

## Boucles et Tableaux

### Syntaxe de Boucle

Pour afficher une liste d'éléments, utilisez `{#liste}` et `{/liste}` :

```
{#modules}
- {nom} ({duree} heures)
{/modules}
```

### Boucle dans un Tableau

Pour créer un tableau dynamique :

| Module | Durée | Formateur |
|--------|-------|-----------|
| {#modules}{nom} | {duree}h | {formateur}{/modules} |

**Important** : La balise `{#modules}` et `{/modules}` doivent être sur la même ligne dans le tableau.

### Exemple avec Modules de Formation

```
PROGRAMME DE FORMATION

{#modules}
Module : {nom}
Durée : {duree} heures
Objectifs : {objectifs}

{/modules}
```

---

## Conditions

### Affichage Conditionnel

Utilisez `{#condition}` pour afficher du contenu uniquement si la condition est vraie :

```
{#est_cpf}
Ce financement est éligible au CPF.
{/est_cpf}

{#a_prerequis}
Prérequis : {formation_prerequis}
{/a_prerequis}
```

### Condition Négative

Utilisez `{^condition}` pour afficher si la condition est fausse :

```
{^a_tva}
TVA non applicable, art. 293B du CGI
{/a_tva}
```

---

## Images

### Logo de l'Organisme

Pour insérer le logo, ajoutez une image dans le template puis remplacez-la par une balise :

1. Insérez une image placeholder dans Word
2. Sélectionnez l'image
3. Clic droit → "Modifier le texte de remplacement"
4. Entrez : `{%organisme_logo}`

### Syntaxe des Images

| Syntaxe | Description |
|---------|-------------|
| `{%image}` | Image simple |
| `{%image:100x50}` | Image avec dimensions (100px × 50px) |

---

## Bonnes Pratiques

### 1. Nommage des Variables

- Utilisez des noms en minuscules avec underscores
- Soyez descriptif : `eleve_date_naissance` plutôt que `ddn`

### 2. Gestion des Valeurs Vides

Les variables non définies seront remplacées par une chaîne vide. Utilisez des conditions si nécessaire :

```
{#eleve_telephone}Tél : {eleve_telephone}{/eleve_telephone}
```

### 3. Formatage dans Word

- Appliquez les styles (gras, italique, couleur) directement dans Word
- Les styles seront conservés dans le document généré

### 4. En-têtes et Pieds de Page

- Vous pouvez utiliser des variables dans les en-têtes et pieds de page
- Le logo peut être inséré dans l'en-tête avec `{%organisme_logo}`

### 5. Test du Template

Avant de mettre en production :
1. Testez avec des données réelles
2. Vérifiez toutes les variables
3. Testez les cas limites (valeurs vides, longs textes)

---

## Exemple Complet

### Convention de Formation

```
{organisme_nom}
{organisme_adresse}
SIRET : {organisme_siret}
N° DA : {organisme_numero_da}

CONVENTION DE FORMATION PROFESSIONNELLE
Article L6353-1 et suivants du Code du Travail

Entre :
L'organisme de formation {organisme_nom}, représenté par son directeur,
ci-après dénommé « l'Organisme »

Et :
{#est_entreprise}
La société {client_raison_sociale}
Représentée par {client_representant}
{/est_entreprise}
{^est_entreprise}
M./Mme {eleve_prenom} {eleve_nom}
Demeurant {eleve_adresse}, {eleve_code_postal} {eleve_ville}
{/est_entreprise}
ci-après dénommé(e) « le Client »

Il a été convenu ce qui suit :

ARTICLE 1 – OBJET
La présente convention a pour objet la réalisation de l'action de formation :
{formation_nom}

ARTICLE 2 – DURÉE ET DATES
Durée totale : {session_duree_heures} heures
Du {session_debut_formate} au {session_fin_formate}
Lieu : {session_lieu}

ARTICLE 3 – PROGRAMME
{#modules}
• {nom} - {duree} heures
{/modules}

ARTICLE 4 – COÛT DE LA FORMATION
Montant HT : {montant_ht_formate}
{#a_tva}
TVA (20%) : {montant_tva_formate}
Montant TTC : {montant_ttc_formate}
{/a_tva}
{^a_tva}
TVA non applicable, art. 293B du CGI
{/a_tva}

Fait à {organisme_ville}, le {date_generation}

L'Organisme                          Le Client
(signature)                          (signature)
```

---

## Upload du Template

### Via l'Interface

1. Allez dans **Paramètres** > **Templates de Documents**
2. Sélectionnez le template à modifier
3. Cliquez sur **Uploader un fichier DOCX**
4. Sélectionnez votre fichier .docx
5. Sauvegardez

### Via l'API

```typescript
// Upload du template DOCX
const formData = new FormData()
formData.append('file', docxFile)
formData.append('templateId', 'id-du-template')

await fetch('/api/documents/upload-template', {
  method: 'POST',
  body: formData,
})
```

---

## Support

Pour toute question sur la création de templates :
- Consultez la documentation docxtemplater : https://docxtemplater.com/
- Contactez le support technique
