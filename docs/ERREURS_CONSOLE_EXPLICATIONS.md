# Explications des erreurs et avertissements de la console

Ce document décrit les erreurs que vous avez rencontrées et les correctifs appliqués ou recommandés.

---

## 1. NotFoundError: Failed to execute 'removeChild' on 'Node'

```
Uncaught NotFoundError: Failed to execute 'removeChild' on 'Node':
The node to be removed is not a child of this node.
    at e (frame_start.js:2:9232)
    at t.onload (frame_start.js:2:9320)
```

### Cause

- **Origine** : Le fichier `frame_start.js` appartient au **frame de prévisualisation** (Vercel / Cursor), pas à votre application. C’est le script du **parent** qui affiche votre app dans une iframe.
- L’erreur se produit quand du code appelle `parent.removeChild(child)` alors que `child` n’est plus un enfant de `parent` (déjà retiré, ou déplacé ailleurs).
- Dans votre app, l’usage de **portails React** (`createPortal(..., document.body)`) ajoute et retire des nœuds directement sous `document.body`. Lors d’un HMR, d’un changement de route ou d’une action du frame, le frame peut lui-même tenter de retirer un nœud (script, iframe, etc.) qui a déjà été retiré ou modifié par React, ce qui déclenche cette erreur côté frame.

### Correctifs appliqués

1. **Racine de portail unique** (`lib/utils/dom-utils.ts`)  
   - Une seule div `#eduzen-portal-root` est créée et laissée en place dans `document.body`.  
   - Tous les portails (sidebar mobile, dropdown Select) rendent dans cette div au lieu d’ajouter/supprimer des enfants directs de `body`.  
   - On évite ainsi des allers-retours d’ajout/suppression de nœuds sous `body`, ce qui limite les conflits avec le frame.

2. **Utilisation dans les composants**  
   - `components/dashboard/mobile-sidebar.tsx` et `components/ui/select.tsx` utilisent désormais `getPortalRoot()` au lieu de `document.body` pour `createPortal`.

3. **Utilitaire `safeRemoveChild`**  
   - Pour tout code qui fait encore `parent.removeChild(node)` (exports PDF, téléchargements, etc.), utiliser `safeRemoveChild(node)` qui ne fait le `removeChild` que si `node.parentNode` existe, ce qui évite la même erreur côté app.

### Si l’erreur réapparaît

- Elle peut encore venir du frame (Vercel/Cursor). Tester en ouvrant l’app **sans** prévisualisation (même URL dans un onglet normal).  
- Si elle disparaît en mode “sans frame”, c’est bien le frame qui est en cause ; les changements ci‑dessus réduisent les risques côté app.

---

## 2. Document already DOMContentLoaded, initializing app immediately

- **Signification** : Le script d’init (souvent le point d’entrée Next/React) s’exécute après que l’événement `DOMContentLoaded` a déjà été déclenché.  
- **Impact** : Aucun en général ; l’app s’initialise quand même.  
- **Action** : Aucune requise ; c’est courant en dev (HMR, chargement asynchrone).

---

## 3. Container has a non-static position (scroll offset)

- **Signification** : Un composant (souvent Framer Motion avec `useScroll` ou une lib de scroll) calcule le décalage de scroll à partir d’un conteneur qui a `position: static`.  
- **Impact** : Le calcul du scroll peut être faux.  
- **Action** : Donner au conteneur de scroll une position non statique, par ex. `relative` :  
  `className="... relative"` ou `style={{ position: 'relative' }}` sur l’élément qui contient la zone scrollable.

---

## 4. Invalid keyframe value for property transform: translateY(0.00012)

- **Origine** : Framer Motion / motion-dom (animation WAAPI). Une valeur interpolée devient un float très petit (`0.00012`) au lieu d’un entier ou d’une valeur “propre”.  
- **Impact** : Certains navigateurs ou moteurs d’animation peuvent ignorer ou mal interpréter la keyframe.  
- **Action** :  
  - Vous pouvez arrondir les valeurs d’animation (ex. `round: 2` dans les options de transition) si vous contrôlez les keyframes.  
  - Pour les animations internes à Framer Motion, mettre à jour `framer-motion` / `motion-dom` peut corriger le bug côté lib.

---

## 5. Erreurs API (406, 403)

### 406 (sessions)

- **Requête** : `.../rest/v1/sessions?select=*&id=eq....`  
- **Signification** : “Not Acceptable” — souvent un souci d’en-tête `Accept` ou de format de réponse attendu par le client.  
- **À vérifier** :  
  - En-têtes envoyés par le client (Supabase client).  
  - Politique RLS et droits sur la table `sessions`.  
  - Que le `select=*` et le format de réponse soient acceptés par l’API.

### 403 (session_programs)

- **Requête** : `POST .../rest/v1/session_programs?columns=...`  
- **Signification** : Accès refusé (RLS ou rôle insuffisant).  
- **À vérifier** :  
  - RLS sur `session_programs` (SELECT/INSERT/UPDATE) pour le rôle utilisé (anon, authenticated, service_role).  
  - Que l’utilisateur connecté a bien le droit d’écrire dans cette table (organisation, rôle métier).

---

## Résumé des correctifs côté code

| Problème              | Correctif appliqué / recommandé                          |
|-----------------------|-----------------------------------------------------------|
| removeChild (frame)   | Portail unique `getPortalRoot()` + `safeRemoveChild`     |
| Scroll / position     | Conteneur en `position: relative` (ou non static)         |
| translateY(0.00012)   | Mise à jour Framer Motion ; optionnel : `round` en transition |
| 406 / 403             | Vérifier RLS, en-têtes et droits sur `sessions` / `session_programs` |
