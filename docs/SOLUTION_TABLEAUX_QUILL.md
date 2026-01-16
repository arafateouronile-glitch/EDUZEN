---
title: Solution Durable pour les Tableaux dans Quill
date: 2025-12-30
version: 1.0
author: EDUZEN Team
---


# Solution Durable pour les Tableaux dans Quill

## Problème Identifié

Quill ne supporte pas nativement les tableaux, et les tentatives d'insertion HTML directe causent des erreurs avec le MutationObserver de Quill (`Cannot read properties of undefined (reading 'emit')`).

## Solution Implémentée : Custom Blots

Nous avons implémenté une solution durable utilisant les **Custom Blots** de Quill pour encapsuler les tableaux et cadres comme des blocs éditables.

### Avantages de cette approche :

1. ✅ **Pas de problèmes avec le MutationObserver** : Les Custom Blots sont gérés nativement par Quill
2. ✅ **Édition via modal** : Chaque tableau/cadre peut être édité via une modal dédiée
3. ✅ **Données structurées** : Les tableaux sont stockés comme JSON, pas comme HTML brut
4. ✅ **Modifiable facilement** : Les tableaux sont des blocs non-modifiables dans l'éditeur, mais éditables via un bouton

## Architecture

### 1. Custom Blots (`lib/utils/quill-custom-blots.ts`)

- **TableBlot** : Blot personnalisé pour les tableaux
- **FrameBlot** : Blot personnalisé pour les cadres/borders

Chaque blot :
- Stocke les données en JSON dans un attribut `data-*`
- Affiche un aperçu visuel du tableau/cadre
- Fournit un bouton "Éditer" qui déclenche un événement custom

### 2. Helpers d'Insertion (`lib/utils/quill-table-helper-v2.ts`)

Nouvelles fonctions qui utilisent `quill.insertEmbed()` avec les Custom Blots :

- `insertTable()` : Tableau simple
- `insertTableWithProperties()` : Tableau avec propriétés avancées
- `insertBorderedFrame()` : Cadre avec border
- `insertFramedSection()` : Cadre avec titre
- `insertAdminTable()` : Tableau préformaté pour documents admin

### 3. Enregistrement dans ReactQuillClient

Les Custom Blots sont enregistrés automatiquement lors du chargement de ReactQuill.

## Utilisation

### Insérer un tableau simple :

```typescript
const editor = richTextEditorRef.current?.getEditor()
if (editor) {
  const { insertTable } = require('@/lib/utils/quill-table-helper-v2')
  insertTable(editor, 3, 3) // 3 lignes, 3 colonnes
}
```

### Insérer un tableau avec propriétés :

```typescript
const { insertTableWithProperties } = require('@/lib/utils/quill-table-helper-v2')
insertTableWithProperties(editor, {
  rows: 4,
  cols: 3,
  headers: 'first-row',
  cellSpacing: 0,
  borderSize: 2,
  cellPadding: 10,
  alignment: 'center',
  title: 'Mon Tableau'
})
```

## Prochaines Étapes

### 1. Créer une Modal d'Édition pour les Tableaux

Créer un composant `TableEditorModal` qui :
- Permet d'éditer le nombre de lignes/colonnes
- Permet de modifier le contenu des cellules
- Permet de changer les styles (borders, couleurs, etc.)
- Met à jour le Custom Blot via `node.setAttribute('data-table-data', JSON.stringify(newData))`

### 2. Créer une Modal d'Édition pour les Cadres

Similaire à la modal des tableaux, mais pour les cadres.

### 3. Optionnel : Migration vers TinyMCE

Pour une solution encore plus robuste à long terme, considérer la migration vers **TinyMCE** qui supporte nativement :
- Les tableaux (édition inline)
- Les formes et dessins
- Les équations mathématiques
- L'édition collaborative

## Avantages vs. l'Ancienne Approche

| Ancienne (HTML direct) | Nouvelle (Custom Blots) |
|------------------------|-------------------------|
| ❌ Erreurs MutationObserver | ✅ Géré nativement par Quill |
| ❌ Tableaux convertis en texte | ✅ Tableaux persistants |
| ❌ Difficile à éditer | ✅ Édition via modal |
| ❌ HTML fragile | ✅ Données structurées (JSON) |

## Tests

Pour tester la nouvelle implémentation :

1. Ouvrir un document template
2. Cliquer sur "Insérer un tableau"
3. Le tableau devrait s'afficher avec un bouton "Éditer le tableau"
4. Cliquer sur le bouton (actuellement une alerte, à remplacer par une modal)

## Notes Techniques

- Les Custom Blots utilisent `contenteditable="false"` pour éviter que Quill ne modifie leur contenu
- Les données sont stockées dans des attributs `data-*` en JSON
- Les événements custom `edit-table` et `edit-frame` sont utilisés pour déclencher l'édition
- Le HTML final contiendra les blots personnalisés qui seront convertis en HTML lors de la génération PDF/DOCX---

**Document EDUZEN** | [Retour à la documentation principale](../README.md) | Dernière mise à jour : 2025-12-30
© 2024 EDUZEN. Tous droits réservés.

