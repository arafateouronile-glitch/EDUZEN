# Système de Templates Unifié : PDF et Word

## Aperçu

EDUZEN propose deux approches pour la génération de documents Word :

### 1. ✅ Recommandé : Templates DOCX Natifs (docxtemplater)

**Avantages :**
- Fidélité parfaite au design du template
- Tableaux, images, styles parfaitement préservés
- Templates modifiables dans Microsoft Word
- Solution mature et stable

**Comment ça marche :**
1. Créez un template Word (.docx) avec des balises `{variable}`
2. Uploadez-le dans les paramètres du template
3. Lors de la génération, le système injecte les variables

### 2. Fallback : Conversion HTML → docx

**Quand utilisé :**
- Si aucun template DOCX n'est uploadé
- Conversion automatique du template HTML en Word

**Limitations :**
- Mise en page approximative
- Tableaux et images parfois mal positionnés
- Styles partiellement préservés

---

## Architecture

```
Variables (communes PDF & Word)
    │
    ├─→ Template HTML ─→ generateHTML() ─→ Paged.js ─→ PDF
    │
    └─→ Template DOCX ─→ docxtemplater ─→ Word
         (si disponible)
         │
         └─→ Fallback : HTML ─→ docx (conversion)
```

---

## Configuration

### Étape 1 : Créer le Template DOCX

1. Ouvrez Microsoft Word
2. Créez le design de votre document
3. Utilisez les balises `{variable}` pour les données dynamiques

**Exemple :**
```
CONVENTION DE FORMATION

Organisme : {organisme_nom}
Adresse : {organisme_adresse}

Participant : {eleve_prenom} {eleve_nom}
Formation : {formation_nom}
Du {session_debut_formate} au {session_fin_formate}

Montant : {montant_ht_formate}
```

### Étape 2 : Uploader le Template

1. Allez dans **Paramètres** → **Templates de Documents**
2. Sélectionnez le template à configurer
3. Scrollez jusqu'à "Template Word Natif (DOCX)"
4. Uploadez votre fichier .docx

### Étape 3 : Générer

Lors de la génération :
- **PDF** : Utilise le template HTML (comme avant)
- **Word** : Utilise le template DOCX (si uploadé) ou la conversion HTML (fallback)

---

## Variables Disponibles

### Élève
| Variable | Description |
|----------|-------------|
| `{eleve_nom}` | Nom de famille |
| `{eleve_prenom}` | Prénom |
| `{eleve_email}` | Email |
| `{eleve_telephone}` | Téléphone |
| `{eleve_adresse}` | Adresse |
| `{eleve_code_postal}` | Code postal |
| `{eleve_ville}` | Ville |
| `{eleve_date_naissance_formate}` | Date de naissance formatée |

### Formation & Session
| Variable | Description |
|----------|-------------|
| `{formation_nom}` | Nom de la formation |
| `{session_nom}` | Nom de la session |
| `{session_debut_formate}` | Date de début formatée |
| `{session_fin_formate}` | Date de fin formatée |
| `{session_duree_heures}` | Durée en heures |
| `{session_lieu}` | Lieu |

### Financier
| Variable | Description |
|----------|-------------|
| `{montant_ht_formate}` | Montant HT formaté (ex: 1 500,00 €) |
| `{montant_tva_formate}` | TVA formatée |
| `{montant_ttc_formate}` | Montant TTC formaté |

### Organisme
| Variable | Description |
|----------|-------------|
| `{organisme_nom}` | Nom |
| `{organisme_adresse}` | Adresse |
| `{organisme_siret}` | SIRET |
| `{organisme_numero_da}` | N° déclaration d'activité |

### Système
| Variable | Description |
|----------|-------------|
| `{date_generation}` | Date de génération |
| `{annee_courante}` | Année en cours |

---

## Fonctionnalités Avancées

### Boucles (Tableaux dynamiques)

```
{#modules}
- {nom} : {duree} heures
{/modules}
```

### Conditions

```
{#est_cpf}
Formation éligible au CPF.
{/est_cpf}

{^a_tva}
TVA non applicable, art. 293B du CGI
{/a_tva}
```

### Images

Pour le logo, ajoutez une image dans Word puis :
1. Clic droit → Modifier le texte de remplacement
2. Entrez : `{%organisme_logo}`

---

## API

### Génération avec Template DOCX

```typescript
// POST /api/documents/generate-docx
{
  "templateUrl": "https://storage.../template.docx",
  "variables": {
    "eleve_nom": "Dupont",
    "eleve_prenom": "Jean",
    // ...
  },
  "filename": "convention_Dupont_Jean.docx"
}
```

### Upload de Template

```typescript
// POST /api/documents/upload-docx-template
// Content-Type: multipart/form-data
// - file: File (.docx)
// - templateId: string
```

---

## Migration

### Depuis l'ancien système (HTML → docx)

1. Créez un template DOCX correspondant au design HTML
2. Uploadez-le dans les paramètres du template
3. Testez la génération Word

Le fallback vers la conversion HTML reste disponible si aucun template DOCX n'est uploadé.

---

## Fichiers Clés

| Fichier | Description |
|---------|-------------|
| `lib/services/docx-generator.service.ts` | Service docxtemplater |
| `app/api/documents/generate-docx/route.ts` | API de génération |
| `app/api/documents/upload-docx-template/route.ts` | API d'upload |
| `components/document-templates/DocxTemplateUploader.tsx` | Composant d'upload |
| `docs/DOCX_TEMPLATE_GUIDE.md` | Guide complet |

---

## Support

Pour créer des templates DOCX complexes :
- Consultez la documentation [docxtemplater](https://docxtemplater.com/)
- Voir le guide complet : `docs/DOCX_TEMPLATE_GUIDE.md`
