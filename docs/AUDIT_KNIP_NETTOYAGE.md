# Audit Knip & Nettoyage de code (Performance & Clean Code)

Ce document décrit la procédure pour rendre EDUZEN plus léger et maintenable via **Knip** et un nettoyage ciblé.

---

## 1. La méthode automatisée : "The Knip Strike"

### Installation et lancement

```bash
npm install -D knip
npm run knip
```

Ou en une commande : `npx knip`

### Ce que Knip détecte

- **Fichiers orphelins** : jamais importés
- **Exports inutilisés** : fonctions/types exportés mais jamais utilisés
- **Types TypeScript orphelins** : interfaces/types non référencés
- **Dépendances inutiles** : librairies dans `package.json` jamais utilisées dans le code

### Configuration

Le fichier **`knip.jsonc`** à la racine :

- Exclut tests, e2e, scripts, supabase/functions, remotion (aligné sur `tsconfig.json`)
- Liste les dépendances de dev à ignorer (outils de test, ESLint, etc.) pour éviter faux positifs

Après `npm run knip`, traiter en priorité :

1. Fichiers inutilisés → supprimer ou déplacer vers un module partagé
2. Exports inutilisés → retirer l’export ou le code mort
3. Dépendances inutilisées → vérifier puis `npm uninstall <pkg>` si confirmé

---

## 2. Le "Nettoyage de Printemps" (refactoring manuel)

Trois familles de **code fantôme** que Knip ne voit pas toujours :

### Branches mortes (Logic Dead Code)

- Conditions `if` jamais vraies à cause d’une évolution métier (ex. ancien calcul de TVA)
- **Action** : rechercher les `if (false)`, conditions sur constantes, ou chemins rendus impossibles par les types

### Restes de debugging

- `console.log` / `console.debug` oubliés en production
- Fonctions de test (`test_generate_pdf`, etc.) qui traînent
- **Action** : remplacer par le logger (`lib/utils/logger.ts`) en production ou supprimer

### Sur-ingénierie

- Fonctions très longues pour des besoins simples (ex. formater une date avec 50 lignes alors que `Intl.DateTimeFormat` suffit)
- Interfaces ou types trop complexes pour le besoin réel
- **Action** : simplifier avec les APIs natives (JS/TS/Next.js) et réduire la complexité

---

## 3. Mega-prompt pour l’IA (nettoyage ciblé)

À utiliser pour un fichier précis quand vous voulez un nettoyage automatisé :

```
Rôle : Tu es un "Performance & Clean Code Engineer".

Objectif : Analyser le fichier [NOM_DU_FICHIER] pour supprimer tout le code inutile.

Instructions :
1. Identifie les fonctions exportées qui ne sont plus nécessaires.
2. Simplifie les fonctions trop complexes : si une logique peut être faite avec des fonctions natives de JavaScript/Next.js, remplace le code custom.
3. Supprime les commentaires de "remplissage" (ex: // set name) pour ne garder que les commentaires de logique métier.
4. Vérifie qu'il n'y a pas de variables déclarées mais non utilisées.

Critère de succès : Le fichier doit être ~20% plus court tout en gardant exactement les mêmes fonctionnalités.
```

---

## 4. Pourquoi cet audit = test de qualité

| Critère | Bénéfice |
|--------|----------|
| **Performance (Lighthouse)** | Moins de code → bundle JS plus petit → page plus rapide |
| **Sécurité** | Moins de surface d’attaque ; une vieille fonction oubliée peut devenir une faille |
| **Professionnalisme** | Code propre et maîtrisé pour un CTO ou un investisseur |

---

## 5. Actions déjà réalisées

- **Knip** : ajout dans `devDependencies`, script `npm run knip`, config `knip.jsonc`
- **Debug** : suppression des `console.log` de debug dans `app/(learner)/learner/evaluations/` (page liste + détail quiz)

À faire après `npm install` : lancer `npm run knip` et traiter les résultats (fichiers, exports, dépendances).
