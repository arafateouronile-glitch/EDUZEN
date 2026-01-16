# Système de Templates DOCX Natifs

## Vue d'ensemble

Le système de génération de documents Word utilise désormais des **templates DOCX natifs** pour une fidélité parfaite au design.

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Génération Word                       │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Template DOCX natif existe ?                           │
│       │                                                  │
│       ├── OUI → docxtemplater → Document Word parfait   │
│       │                                                  │
│       └── NON → Conversion HTML → Document Word         │
│                 (qualité variable pour les tableaux)    │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

## Templates DOCX disponibles

Les templates sont générés automatiquement et stockés dans `public/docx-templates/` :

| Type | Fichier | Variables principales |
|------|---------|----------------------|
| Facture | `template_facture.docx` | `{numero_facture}`, `{eleve_nom}`, `{montant_ttc}` |
| Devis | `template_devis.docx` | `{numero_devis}`, `{validite_devis}`, `{formation_nom}` |
| Convention | `template_convention.docx` | `{formation_nom}`, `{session_debut}`, `{session_fin}` |

## Variables disponibles

### Variables École/Organisme

| Variable | Description |
|----------|-------------|
| `{ecole_nom}` | Nom de l'organisme de formation |
| `{ecole_adresse}` | Adresse |
| `{ecole_code_postal}` | Code postal |
| `{ecole_ville}` | Ville |
| `{ecole_email}` | Email |
| `{ecole_telephone}` | Téléphone |
| `{ecole_siret}` | Numéro SIRET |
| `{ecole_numero_declaration}` | Numéro de déclaration d'activité |
| `{ecole_region}` | Région |
| `{ecole_representant}` | Nom du représentant légal |

### Variables Élève/Client

| Variable | Description |
|----------|-------------|
| `{eleve_nom}` | Nom de l'élève |
| `{eleve_prenom}` | Prénom de l'élève |
| `{eleve_adresse}` | Adresse |
| `{eleve_code_postal}` | Code postal |
| `{eleve_ville}` | Ville |
| `{eleve_email}` | Email |
| `{eleve_telephone}` | Téléphone |
| `{eleve_numero}` | Numéro d'élève |
| `{eleve_date_naissance}` | Date de naissance |

### Variables Formation

| Variable | Description |
|----------|-------------|
| `{formation_nom}` | Nom de la formation |
| `{formation_description}` | Description |
| `{formation_duree}` | Durée totale |
| `{formation_objectifs}` | Objectifs |
| `{session_debut}` | Date de début |
| `{session_fin}` | Date de fin |
| `{session_lieu}` | Lieu |

### Variables Financières

| Variable | Description |
|----------|-------------|
| `{montant_ht}` | Montant HT |
| `{montant_ttc}` | Montant TTC |
| `{tva}` | Montant de la TVA |
| `{taux_tva}` | Taux de TVA |
| `{montant_lettres}` | Montant en lettres |
| `{mode_paiement}` | Mode de paiement |
| `{iban}` | IBAN |

### Variables Document

| Variable | Description |
|----------|-------------|
| `{numero_facture}` | Numéro de facture |
| `{numero_devis}` | Numéro de devis |
| `{date_emission}` | Date d'émission |
| `{date_echeance}` | Date d'échéance |
| `{validite_devis}` | Date de validité du devis |
| `{date_jour}` | Date du jour |

## Utilisation

### 1. Initialiser les templates pour une organisation

```typescript
// Via l'API
const response = await fetch('/api/documents/init-docx-templates', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ organizationId: 'org_xxx' })
})
```

### 2. Générer un document Word

```typescript
// Via l'API
const response = await fetch('/api/documents/generate-docx', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    templateId: 'template_xxx',
    variables: {
      eleve_nom: 'Dupont',
      eleve_prenom: 'Jean',
      // ...autres variables
    },
    filename: 'facture_2026-001.docx'
  })
})

const blob = await response.blob()
// Télécharger le fichier...
```

### 3. Uploader un template personnalisé

```typescript
const formData = new FormData()
formData.append('file', docxFile)
formData.append('type', 'facture')
formData.append('organizationId', 'org_xxx')

const response = await fetch('/api/documents/upload-docx-template', {
  method: 'POST',
  body: formData
})
```

## Personnalisation des templates

### Modifier un template existant

1. Téléchargez le template depuis `public/docx-templates/`
2. Ouvrez-le dans Microsoft Word
3. Modifiez le design tout en conservant les balises `{variable}`
4. Uploadez le nouveau template via l'interface ou l'API

### Créer un nouveau template

1. Créez un document Word vierge
2. Ajoutez les balises `{variable}` où vous voulez injecter les données
3. Stylisez le document selon vos besoins
4. Uploadez via l'API

### Syntaxe des balises

| Syntaxe | Description |
|---------|-------------|
| `{variable}` | Variable simple |
| `{#items}...{/items}` | Boucle sur un tableau |
| `{variable¦default}` | Variable avec valeur par défaut |

## Résolution des problèmes

### Le template DOCX n'est pas utilisé

Vérifiez que :
1. La colonne `docx_template_url` est remplie dans `document_templates`
2. L'URL est accessible (testez dans le navigateur)
3. Le bucket `docx-templates` existe dans Supabase Storage

### Les variables ne sont pas remplacées

Vérifiez que :
1. Les balises utilisent le bon format `{variable}`
2. Les noms de variables correspondent exactement (sensible à la casse)
3. Les données sont passées dans l'objet `variables`

### Erreur lors de la génération

Consultez les logs serveur pour le message d'erreur exact :
```
[DocxGenerator] ❌ Erreur lors de la génération: ...
```

## Migration depuis le système HTML

Le système conserve une compatibilité descendante :
- Si `docx_template_url` est défini → utilise docxtemplater (recommandé)
- Sinon → génère automatiquement depuis le HTML (fallback)

Pour migrer progressivement :
1. Générez les templates DOCX avec le script
2. Uploadez-les pour chaque organisation
3. Le système basculera automatiquement

## Scripts utiles

```bash
# Générer les templates DOCX
npx tsx scripts/generate-docx-templates.ts

# Les templates sont créés dans public/docx-templates/
```
