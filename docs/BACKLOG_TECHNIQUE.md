# Backlog technique — EDUZEN

Document de suivi des actions techniques reportées ou à traiter par lots.

---

## 1. `noUncheckedIndexedAccess` (tsconfig)

**Objectif :** Renforcer la sécurité des accès indexés (tableaux, `Record`) en rendant le type `T[]` équivalent à `(T | undefined)[]` pour les accès par index.

**État :** Reporté — à activer progressivement.

**Pour activer :**
1. Dans `tsconfig.json`, ajouter dans `compilerOptions` :
   ```json
   "noUncheckedIndexedAccess": true
   ```
2. Lancer `npm run type-check` : de nombreuses erreurs apparaîtront (accès `arr[i]`, `obj[key]`).
3. Corriger par lots (fichiers critiques d’abord : `lib/utils/`, `lib/services/`, puis `app/`).

**Alternative :** Créer un `tsconfig.strict.json` qui étend `tsconfig.json` et n’ajoute que cette option, pour utiliser dans une branche dédiée ou au fil de l’eau.

---

## 2. ESLint 9 + eslint-config-next@16

**Objectif :** Aligner la config lint sur Next.js 16.

**Contrainte :** `eslint-config-next@16` exige `eslint>=9`. Le projet est actuellement sur `eslint@8`.

**Étapes recommandées :**
1. Mettre à jour ESLint : `npm install eslint@9 --save-dev`
2. Vérifier la compatibilité de `eslint-config-next` avec ESLint 9 (voir [Next.js docs](https://nextjs.org/docs/app/api-reference/config/eslint)).
3. Mettre à jour les plugins (typescript-eslint, etc.) vers des versions compatibles ESLint 9 (flat config).
4. Migrer `.eslintrc.json` vers `eslint.config.js` (format flat) si requis par ESLint 9.
5. Exécuter `npm run lint` et corriger les régressions.

**Référence :** Audit complet 28/02/2026 — point 18 (P3).

---

## 3. Réduction des `any`

**Objectif :** Passer sous 100 occurrences de `any` (objectif moyen terme < 100).

**Fait récemment :**
- `lib/services/api.service.ts` : remplacement des alias `type APIKey = any` etc. par des interfaces (`APIKeyRow`, `WebhookRow`, `WebhookInsert`, `WebhookUpdate`, `QuotaUpdate`, `APIKeyUpdate`). Les `(this.supabase as any)` restent tant que les tables `api_keys`, `webhooks`, `api_quotas`, etc. ne sont pas dans `Database` (génération Supabase).

**À traiter par lots :**
- `lib/utils/document-generation/variable-extractor.ts` (nombreux `any`)
- Autres services avec `any` : voir rapport de couverture / grep `: any\b|as any`

**Pour les tables API absentes du schéma :** soit ajouter les tables dans Supabase et regénérer `types/database.types.ts`, soit conserver un cast minimal avec des types de retour explicites (comme en api.service).

---

## 4. Couverture de tests

**Objectifs :**
- Lines : 72 % → 80 %
- Branches : 65 % → 75 %
- Services : prioriser `elearning.service`, `compliance.service`, `electronic-attendance.service` (déjà partiellement couverts).

**Commandes :**
- `npm run test:coverage` — rapport global
- Cibler un fichier : `npm run test -- --run lib/services/elearning.service.test.ts`

---

## 5. Tests « happy path » sur les routes API

**Objectif :** En plus des tests d’erreur (401, 403, 400), ajouter des cas nominaux (200 + body attendu) sur les routes critiques.

**Exemples :**
- `GET /api/health` → 200 + `{ status: 'ok' }`
- `GET /api/learner/data?type=student` avec token valide → 200 + données student
- Routes dashboard, documents, etc. avec auth mockée

---

*Dernière mise à jour : mars 2026.*
