# Audit : Sécurité, Étanchéité & Qualité du code (EDUZEN)

*Référence : checklist Sécurité RLS, Signature, BPF, PDF, "Code Humain"*

---

## 1. Sécurité & Étanchéité (Supabase RLS)

### [x] Isolation des données : RLS et `organization_id`

**État :** Conforme avec nuances.

- Les migrations RLS sont nombreuses (156 fichiers concernent `organization_id` / `auth.uid()`).
- **Exemples vérifiés :**
  - `digital_evidence` : SELECT limité aux users dont `u.organization_id = digital_evidence.organization_id` et `u.role IN ('admin', 'secretary', 'teacher', 'super_admin')`.
  - Storage `documents` : chemins du type `documents/{organization_id}/...` avec vérification via `auth.uid()` → `users.organization_id`.
- Les APIs sensibles (`/api/sign/document-pdf-url`, `/api/sign/submit`, `/api/sign/process-pdf-url`) utilisent **createAdminClient** (bypass RLS) et n’exposent des données qu’après résolution d’un **token** (UUID ou legacy). Aucune requête ne filtre par `organization_id` côté API pour ces routes ; l’isolation vient du fait que le token lie une demande à un document (donc une org). Donc pas de fuite inter-org par requête SQL directe côté client.

**Recommandation :** Documenter explicitement que pour les routes publiques (sign, process-pdf-url), l’isolation est assurée par le token, pas par une clause RLS côté client.

---

### [x] Fuite de documents : URL d’un PDF d’une autre organisation

**État :** Pas de fuite constatée.

- Les URLs de PDF à signer ne sont pas dérivées d’un ID devinable : elles sont obtenues via **token** (UUID ou legacy) dans `signature_requests` ou `signatories`.
- Après résolution du token, l’URL de lecture est une **signed URL** Supabase Storage (`createSignedUrl(path, EXPIRES_IN)` avec `EXPIRES_IN = 3600`), donc temporaire et non devinable.
- Fichiers concernés : `app/api/sign/document-pdf-url/route.ts`, `app/api/sign/process-pdf-url/route.ts`.

**Conclusion :** Un utilisateur de l’organisme A ne peut pas deviner l’URL d’un PDF de l’organisme B ; les URLs sont signées et temporaires.

---

### [ ] Input Validation : Données (ex. nom du stagiaire) et XSS dans le PDF

**État :** Partiel.

- **Côté PDF (seal-pdf) :** `signerName`, `signerEmail`, `signedAt`, `ip` sont passés tels quels à `pdf-lib` `drawText()`. Il n’y a pas d’exécution de script dans le PDF, mais des caractères spéciaux ou des chaînes très longues peuvent dégrader le rendu ou l’encodage.
- **Utilitaires existants :** `lib/utils/input-validation.ts` expose `sanitizeText`, `escapeHTML` ; `lib/utils/sanitize-html.ts` utilise DOMPurify. Ils ne sont pas utilisés dans `app/api/sign/submit/route.ts` ni dans `lib/utils/seal-pdf.ts` pour les champs inscrits sur le PDF.

**Recommandation :** Avant d’appeler `sealPdf`, normaliser/sanitizer les champs texte (nom, email, etc.) avec `sanitizeText` ou une couche dédiée (longueur max, caractères autorisés) pour éviter injections de caractères bizarres et garder un comportement prévisible dans le PDF.

---

## 2. Logique Métier (Moteur BPF)

### [x] Calcul des heures : émargement réel vs théorique

**État :** Basé sur l’émargement réel.

- `get_bpf_stats` (migration `20260124000002_bpf_magic_engine.sql`) :
  - Heures de créneaux : `EXTRACT(EPOCH FROM (sl.end_time - sl.start_time)) / 3600.0` (durée du slot).
  - Heures-stagiaires : `slot_duration_hours * present_count`, avec `present_count` issu de `electronic_attendance_requests` où `ear.status = 'signed'`.
- Donc les heures comptabilisées reposent sur les **signatures électroniques** (présence réelle), pas uniquement sur les effectifs inscrits.

**Nuance :** Le calcul est par créneau (présent / absent), pas par minute. Un stagiaire “arrivé en retard” ou “parti plus tôt” est quand même compté présent pour tout le créneau s’il a signé. Pour affiner (heures réelles par minute), il faudrait des horodatages de signature par créneau.

---

### [ ] Arrondis financiers : entiers (cents) vs Decimal

**État :** À clarifier côté CA / montants.

- Dans les fichiers parcourus, des `Math.round(...* 100) / 100` ou équivalents apparaissent (pourcentages, taux), mais pas de politique centralisée pour les **montants en euros/cents**.
- En base, des colonnes peuvent être en `NUMERIC` ou `DECIMAL` ; le code applicatif n’a pas été entièrement vérifié pour l’usage systématique d’entiers en centimes.

**Recommandation :** Stocker et calculer les montants financiers (CA, facturation) en **cents (entiers)** ou avec un type dédié (ex. `Decimal` en JS) et une règle d’arrondi documentée, pour éviter les erreurs du type 0.1 + 0.2 ≠ 0.3.

---

### [ ] Cas d’absence : formateur oublie de valider une présence

**État :** Non géré explicitement comme “alerte”.

- BPF : si une présence n’est pas validée, `present_count` sera plus bas (ou 0 pour la session), donc les heures-stagiaires et le taux de présence reflètent déjà l’absence de signature.
- Il n’y a pas de règle métier du type “alerte si créneau passé sans émargement” ou “compter 0 et remonter une anomalie”.

**Recommandation :** Définir une règle (ex. après clôture du créneau : présence non signée = 0 et optionnellement alerte BPF / notification) et l’implémenter si besoin.

---

## 3. Signature Électronique (Chaîne de preuve)

### [x] Immuabilité : PDF signé “verrouillé”

**État :** Partiel.

- **Table `digital_evidence` :** Immuable. Trigger `prevent_digital_evidence_modification` interdit UPDATE et DELETE. INSERT uniquement (via service role).
- **Fichier PDF dans Storage :** Le bucket `documents` a des politiques RLS qui autorisent **UPDATE** pour les utilisateurs de l’organisation. Donc le fichier signé (ex. `signed_file_path`) peut techniquement être **écrasé** par un admin/org, alors que la preuve dans `digital_evidence` reste inchangée.

**Recommandation :** Pour une immuabilité complète du fichier : soit bucket dédié “signed” sans politique UPDATE, soit versioning d’objets activé et utilisation de versions non écrasables.

---

### [x] Audit Trail : métadonnées (IP, User-Agent, timestamp) dans une table protégée

**État :** Conforme.

- Table `digital_evidence` : champs `metadata` (jsonb), `integrity_hash`, `created_at` (UTC). Les métadonnées (IP, user agent, etc.) sont enregistrées à l’insertion depuis `/api/sign/submit`.
- RLS : SELECT réservé aux rôles admin / secretary / teacher / super_admin de la même organisation. Pas de mise à jour ni suppression.

---

### [x] Hash : SHA-256 après fusion de la signature sur le PDF

**État :** Conforme.

- `lib/utils/seal-pdf.ts` : après `pdfDoc.save()`, `integrityHash = createHash('sha256').update(sealedPdf).digest('hex')`, puis ce hash est stocké dans `digital_evidence.integrity_hash`. Le hash est donc bien calculé **après** fusion de la signature dans le PDF.

---

## 4. Front-end & Rendu PDF

### [x] Symétrie : marges en unités fixes (mm / pt)

**État :** Conforme.

- `lib/utils/document-generation/html-generator.ts` : marges en **mm** (ex. 20mm gauche/droite), dimensions A4 210mm x 297mm, largeur contenu 170mm. Commentaires du type “forcer 170mm car les imprimantes de bureau tronquent souvent au-delà” indiquent une logique métier explicite.

---

### [x] Fonts : polices intégrées (embedded)

**État :** Conforme pour le scellement PDF.

- `lib/utils/seal-pdf.ts` : `embedStandardFont('Helvetica')` — police standard pdf-lib, donc intégrée au PDF. Pas de dépendance à une police système côté serveur pour le tampon de signature.

---

### [x] Responsive Editor : Focus Mode, 100 % largeur, pas de scrollbar horizontale

**État :** Conforme après les changements “Canvas-First” / Zero-Margin.

- Layout éditeur : conteneur central en `flex-1 w-full`, workspace gris en `w-full`, padding interne (p-8/p-12), feuille blanche centrée avec `max-w-[900px]`. Pas de `max-w-7xl` ou `container` sur le wrapper principal. Focus Mode masque les sidebars et le contenu prend toute la largeur.

---

## 5. Détecteur de “Code Humain” (Edge cases, commentaires, refactoring)

### [ ] Gestion des edge cases : perte de réseau pendant la signature

**État :** Non traité.

- Aucun retry, file d’attente offline ou gestion d’erreur réseau explicite trouvée dans `app/(public)/sign` (ex. formulaire de signature). En cas de coupure après clic “Valider”, l’utilisateur peut se retrouver sans retour clair (échec silencieux ou message générique).

**Recommandation :** Ajouter retry limité côté client (ex. 2–3 tentatives), message explicite “Problème de connexion, réessayez”, et éventuellement sauvegarde locale du payload pour reprise après reconnexion (en restant conforme RGPD / durée de conservation).

---

### [x] Clarté des commentaires : “pourquoi” vs “quoi”

**État :** Bon dans les parties auditées.

- Exemples repérés : “Largeur du conteneur central : A4 (210mm) - marges … = 170mm”, “On force 170mm car les imprimantes de bureau tronquent souvent au-delà”. Les commentaires expliquent la contrainte métier ou technique, pas seulement la syntaxe.

---

### [ ] Refactoring : code mort / fonctions fantômes

**État :** Non audité exhaustivement.

- Beaucoup de modules (services, API, composants) ; une recherche ciblée “fonctions exportées jamais importées” ou “branches jamais exécutées” n’a pas été faite.

**Recommandation :** Utiliser un outil (ex. ts-prune, knip, ou analyse de couverture) pour repérer exports inutilisés et dead code, puis nettoyer par domaine prioritaire (signature, BPF, documents).

---

## Synthèse des actions recommandées

| Priorité | Point | Action |
|----------|--------|--------|
| Haute | Input PDF | Sanitizer (longueur + caractères) pour `signerName` / champs texte avant `sealPdf` et affichage. |
| Haute | Réseau signature | Gestion erreur réseau + retry limité + message clair sur la page de signature. |
| Moyenne | Immuabilité fichier | Renforcer politique storage (bucket/versioning ou pas d’UPDATE) pour les PDF signés. |
| Moyenne | Finances | Convention de calcul (cents / Decimal) et arrondis documentés pour le CA. |
| Basse | Absence formateur | Règle métier : présence non validée = 0 + alerte optionnelle. |
| Basse | Dead code | Analyse automatisée (ts-prune / knip) et nettoyage. |

---

*Rapport généré à partir du codebase et des migrations Supabase (état au moment de l’audit).*
