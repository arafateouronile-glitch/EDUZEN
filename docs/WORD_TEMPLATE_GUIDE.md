# Guide de Création de Templates Word pour docxtemplater

Ce guide explique comment créer des templates Word (.docx) pour générer des conventions de formation avec `docxtemplater`.

## 📋 Structure du Template Word

### 1. En-tête et Pied de Page

#### En-tête
Dans l'en-tête de votre document Word, vous pouvez utiliser les variables suivantes :

```
{organisme_nom}
{organisme_adresse_complete}
{organisme_telephone}
{organisme_email}
```

**Exemple d'en-tête :**
```
{organisme_nom}
{organisme_adresse_complete}
Tél: {organisme_telephone} | Email: {organisme_email}
```

#### Pied de Page
Dans le pied de page, utilisez :

```
SIRET: {organisme_siret} | NDA: {organisme_nda}
```

**Exemple de pied de page :**
```
{organisme_nom} | {organisme_adresse_complete} | SIRET: {organisme_siret} | NDA: {organisme_nda}
```

### 2. Variables Simples

Pour insérer des variables simples dans le corps du document, utilisez la syntaxe `{variable}` :

```
Nom du stagiaire: {stagiaire_nom_complet}
Date de naissance: {stagiaire_date_naissance}
Formation: {formation_titre}
Durée: {formation_duree_heures} heures ({formation_duree_jours} jours)
```

### 3. Tableaux Dynamiques (Boucles)

Pour créer un tableau de sessions qui se répète pour chaque session :

#### Étape 1 : Créer le tableau dans Word
1. Insérez un tableau avec les colonnes : Date, Heure, Lieu, Formateur
2. Dans la **première cellule** de la première ligne, écrivez : `{#sessions}`
3. Dans les autres cellules de cette ligne, écrivez :
   - `{date}` (colonne Date)
   - `{horaire}` (colonne Heure)
   - `{lieu}` (colonne Lieu)
   - `{formateur}` (colonne Formateur)
4. Dans la **dernière cellule** de cette ligne, écrivez : `{/sessions}`

**Exemple de tableau :**

| {#sessions} | Date | Heure | Lieu | Formateur | {/sessions} |
|-------------|------|-------|------|-----------|-------------|
|             | {date} | {horaire} | {lieu} | {formateur} |             |

**Important :**
- `{#sessions}` indique le début de la boucle
- `{/sessions}` indique la fin de la boucle
- La ligne entre ces deux balises sera dupliquée pour chaque session dans votre JSON

#### Étape 2 : Formatage du tableau
- Vous pouvez formater les cellules normalement (bordures, couleurs, alignement)
- Le formatage sera préservé pour chaque ligne générée

### 4. Gestion des Sauts de Ligne dans les Adresses

Pour gérer les sauts de ligne dans les adresses, utilisez `\n` dans votre JSON :

**Dans votre code TypeScript :**
```typescript
organisme_adresse_complete: `${adresse}\n${code_postal} ${ville}`
```

**Dans le template Word :**
```
{organisme_adresse_complete}
```

Avec `linebreaks: true` dans la configuration docxtemplater, les `\n` seront automatiquement convertis en sauts de ligne dans Word.

### 5. Sections Conditionnelles

Pour afficher une section uniquement si une condition est vraie :

**Syntaxe :**
```
{#afficher_annexe_2}
Contenu de l'Annexe 2
{annexe_2_contenu}
{/afficher_annexe_2}
```

**Exemple :**
```
{#afficher_annexe_2}
ANNEXE 2 - INFORMATIONS COMPLÉMENTAIRES

{annexe_2_contenu}
{/afficher_annexe_2}
```

Si `afficher_annexe_2` est `true`, la section sera affichée. Sinon, elle sera complètement supprimée du document généré.

### 6. Formatage des Montants

Les montants sont automatiquement formatés en euros :

**Variables disponibles :**
- `{prix_ht_formate}` → "1 500,00 €"
- `{prix_ttc_formate}` → "1 800,00 €"
- `{tva_formate}` → "300,00 €"
- `{acompte_formate}` → "600,00 €"
- `{solde_formate}` → "1 200,00 €"

### 7. Formatage des Dates

Les dates sont automatiquement formatées en français :

**Variables disponibles :**
- `{date_signature}` → "16 Janvier 2026"
- `{date_debut_formation}` → "16 Janvier 2026"
- `{date_fin_formation}` → "20 Janvier 2026"

### 8. Échéancier de Paiement (Tableau Dynamique)

Pour créer un tableau d'échéancier :

| {#echeancier} | Date | Libellé | Montant | {/echeancier} |
|---------------|------|---------|---------|---------------|
|               | {date} | {libelle} | {montant_formate} |               |

## 🎨 Bonnes Pratiques

### 1. Nommage des Variables
- Utilisez des noms clairs et cohérents
- Préfixez avec le contexte (ex: `organisme_`, `stagiaire_`, `formation_`)

### 2. Formatage dans Word
- Formatez votre template comme vous voulez que le document final apparaisse
- Les styles (gras, italique, couleurs) seront préservés

### 3. Test des Templates
- Testez toujours avec des données réelles avant la production
- Vérifiez que les tableaux se répètent correctement
- Vérifiez que les sections conditionnelles fonctionnent

### 4. Gestion des Erreurs
- Si une variable n'est pas trouvée, docxtemplater laissera la balise telle quelle
- Assurez-vous que toutes les variables utilisées dans le template sont présentes dans vos données

## 📝 Exemple Complet de Template

```
CONVENTION DE FORMATION PROFESSIONNELLE

Entre l'organisme de formation :
{organisme_nom}
{organisme_adresse_complete}
SIRET: {organisme_siret}
NDA: {organisme_nda}

Et le stagiaire :
{stagiaire_nom_complet}
{stagiaire_adresse_complete}

Formation : {formation_titre}
Durée : {formation_duree_heures} heures

PLANNING DES SESSIONS

| Date | Heure | Lieu | Formateur |
|------|-------|------|-----------|
| {#sessions} | {date} | {horaire} | {lieu} | {formateur} | {/sessions} |

TARIFS

Prix HT : {prix_ht_formate}
TVA : {tva_formate}
Prix TTC : {prix_ttc_formate}

ÉCHÉANCIER DE PAIEMENT

| Date | Libellé | Montant |
|------|---------|---------|
| {#echeancier} | {date} | {libelle} | {montant_formate} | {/echeancier} |

{#afficher_annexe_2}
ANNEXE 2
{annexe_2_contenu}
{/afficher_annexe_2}

Fait à {organisme_ville}, le {date_signature}
```

## 🔧 Configuration Technique

### Options docxtemplater utilisées :
- `paragraphLoop: true` - Permet de boucler sur les paragraphes
- `linebreaks: true` - Gère les retours à la ligne (`\n`)
- `delimiters: { start: '{', end: '}' }` - Utilise `{variable}` comme syntaxe

### Modules Complémentaires (Optionnels)

Pour des fonctionnalités avancées :

1. **docxtemplater-image-module** : Pour insérer des images dynamiques (logos, signatures)
   ```bash
   npm install docxtemplater-image-module
   ```

2. **docxtemplater-chart-module** : Pour créer des graphiques
   ```bash
   npm install docxtemplater-chart-module
   ```

## ⚠️ Points d'Attention

1. **Ne pas modifier le template pendant l'exécution** : Le template doit être en lecture seule
2. **Encodage UTF-8** : Assurez-vous que votre template est en UTF-8 pour les caractères spéciaux
3. **Taille des fichiers** : Les templates avec beaucoup d'images peuvent être lents à traiter
4. **Validation des données** : Validez toujours vos données avant de générer le document

## 🚀 Prochaines Étapes

1. Créez votre template Word avec les balises appropriées
2. Testez avec les données d'exemple
3. Intégrez le service dans votre API Next.js
4. Ajoutez la gestion d'erreurs et les logs
5. Optimisez pour la production (cache, validation, etc.)
