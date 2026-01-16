# WordGeneratorService - Guide d'Utilisation

## 📦 Installation

Les dépendances sont déjà installées :
- `docxtemplater` : Bibliothèque principale pour générer des documents Word
- `pizzip` : Pour décompresser/manipuler les fichiers .docx (qui sont des archives ZIP)
- `date-fns` : Pour le formatage des dates

## 🚀 Utilisation Rapide

### 1. Créer un Template Word

Créez un fichier `.docx` avec Microsoft Word et ajoutez les balises suivantes :

```
CONVENTION DE FORMATION

Organisme : {organisme_nom}
Adresse : {organisme_adresse_complete}

Stagiaire : {stagiaire_nom_complet}

Formation : {formation_titre}

SESSIONS :
{#sessions}
Date: {date} | Heure: {horaire} | Lieu: {lieu}
{/sessions}

Prix TTC : {prix_ttc_formate}
```

### 2. Utiliser le Service

```typescript
import { wordGeneratorService, ConventionData } from '@/lib/services/word-generator.service'

const data: ConventionData = {
  organisme: {
    nom: 'UNIVERSITE PARIS IVRY',
    adresse: '1 rue jean jacques rousseau',
    code_postal: '94200',
    ville: 'Ivry-sur-Seine',
    siret: '12345678901234',
    numero_declaration_activite: '11 75 12345 67',
  },
  stagiaire: {
    nom: 'Nolan',
    prenom: 'Eddie',
  },
  formation: {
    titre: 'Design UI/UX avec Figma',
    duree_heures: 35,
  },
  sessions: [
    {
      date: '16 Janvier 2026',
      debut: '09:00',
      fin: '17:00',
      lieu: 'Salle A',
    },
  ],
}

await wordGeneratorService.generateDoc(
  './templates/convention-template.docx',
  data,
  './output/convention.docx'
)
```

## 📋 Structure JSON Complète

Voir `lib/services/word-generator.example.ts` pour un exemple complet avec toutes les variables disponibles.

## 🎯 Avantages de cette Approche

1. **Simplicité** : Les templates sont créés dans Word, pas besoin de coder la mise en page
2. **Flexibilité** : Les utilisateurs peuvent modifier les templates sans toucher au code
3. **Performance** : Génération rapide même pour des documents complexes
4. **Compatibilité** : Les documents générés sont compatibles avec Microsoft Word, LibreOffice, etc.

## ⚠️ Différence avec l'Approche Actuelle (docx)

L'approche actuelle utilise la bibliothèque `docx` qui construit le document programmatiquement. Cette nouvelle approche avec `docxtemplater` utilise des templates Word existants.

**Quand utiliser docxtemplater :**
- Templates complexes avec beaucoup de formatage
- Besoin de laisser les utilisateurs modifier les templates
- Documents avec des tableaux complexes
- Besoin de générer rapidement de nombreux documents

**Quand utiliser docx (approche actuelle) :**
- Génération dynamique complète depuis le code
- Pas besoin de templates Word préexistants
- Contrôle total sur la structure du document

## 🔄 Migration depuis l'Approche Actuelle

Pour migrer vers docxtemplater :

1. Créez un template Word basé sur votre générateur PDF actuel
2. Remplacez les variables dynamiques par des balises `{variable}`
3. Utilisez `{#array}` et `{/array}` pour les boucles
4. Testez avec les données existantes
5. Mettez à jour les appels API pour utiliser le nouveau service

## 📚 Documentation Complète

Voir `docs/WORD_TEMPLATE_GUIDE.md` pour le guide complet de création de templates.
