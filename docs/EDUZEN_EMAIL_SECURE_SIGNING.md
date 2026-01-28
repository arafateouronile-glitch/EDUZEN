# EDUZEN – Système de signature sécurisée par email

Système d’émargement et de signature électronique **par lien unique** envoyé par email. Chaîne de preuve conforme OPCO/Qualiopi.

---

## 1. Workflow

1. **Génération de token**  
   - Table `signature_requests` (documents) ou `electronic_attendance_requests` (émargement).  
   - `access_token` : UUID v4, usage unique.  
   - `token_expires_at` : expiration du lien (ex. 4 h).

2. **Envoi d’email**  
   - Déclenché par l’admin (dashboard).  
   - Email via Resend (ou Postmark) avec lien :  
     `https://eduzen.app/sign/[TOKEN]`

3. **Portail de signature** (`/sign/[token]`)  
   - Pas de connexion : identification par **possession du lien**.  
   - Récap document/session, canvas de signature, case « Je certifie sur l’honneur… », validation.

4. **Chaîne de preuve**  
   - Métadonnées : IP, User-Agent, fingerprint (optionnel), timestamp UTC, géolocalisation (optionnelle).  
   - Hash SHA-256 : `email + signature_data + metadata + secret`.  
   - Enregistrement dans `digital_evidence` (INSERT uniquement, pas de UPDATE/DELETE).

5. **Workflow document (conventions)**  
   - **PDF viewer** : URL signée temporaire (`GET /api/sign/document-pdf-url?token=...`) pour lire le PDF avant signature.  
   - **Scellement PDF** : `pdf-lib` fusionne signature + nom, date, IP sur la dernière page. Hash SHA-256 du PDF final.  
   - **Upload** : `convention_signee_{documentId}.pdf` dans Storage, mise à jour `documents` (signed_file_url, status=signed).  
   - **Emails** : envoi automatique de la copie signée au client et à l'admin (Resend).

---

## 2. Fichiers principaux

| Fichier | Rôle |
|--------|------|
| `supabase/migrations/20260125000001_eduzen_secure_sign_digital_evidence.sql` | Table `digital_evidence`, colonnes `access_token` / `token_expires_at`, RLS, triggers |
| `app/api/sign/public/[token]/route.ts` | GET : résolution token → demande signature ou émargement |
| `app/api/sign/submit/route.ts` | POST : signature + preuve → `digital_evidence` + mise à jour demande |
| `app/(public)/sign/[token]/page.tsx` | Portail /sign (glassmorphism, Framer Motion) |
| `components/sign/SignPortalLayout.tsx` | Layout du portail |
| `components/sign/SignatureStepWithCheckbox.tsx` | Canvas + case de certification |
| `components/attendance/AttendanceSheetGenerator.tsx` | Feuille d’émargement PDF + Certificat d’intégrité |
| `lib/utils/signature-evidence.ts` | Calcul du hash d’intégrité |
| `supabase/functions/sign-reminder/index.ts` | Relance automatique (1 h sans signature → rappel email) |

---

## 3. Variables d’environnement

| Variable | Description |
|----------|-------------|
| `SIGNATURE_EVIDENCE_SECRET` ou `EDUZEN_SIGNATURE_SECRET` | Secret pour le hash (min. 16 caractères). **Obligatoire** pour `/api/sign/submit`. |
| `NEXT_PUBLIC_APP_URL` | URL de l’app (ex. `https://eduzen.app`) pour les liens email. |
| `RESEND_API_KEY` | Clé Resend (Edge Function `sign-reminder`). |
| `EDUZEN_APP_URL` | URL de l’app (secrets Supabase, pour `sign-reminder`). |

---

## 4. Relance automatique

- Edge Function **`sign-reminder`** : si, **1 h** après l’envoi, le stagiaire n’a pas signé/émargé, envoi d’un rappel par Resend.  
- Maximum **3 rappels** par demande.  
- Déclenchement : cron (ex. toutes les 15 min) ou appel manuel.  
- Voir `supabase/functions/sign-reminder/README.md`.

---

## 5. Feuille d’émargement et certificat d’intégrité

- Composant **`AttendanceSheetGenerator`** : génération PDF de la feuille d’émargement.  
- En bas de page : **Certificat d’intégrité** avec hash du document (si fourni).  
- Hash optionnel : peut venir de `digital_evidence` ou d’un service dédié.

---

## 6. Design

- Style **glassmorphism**, inspiré Apple.  
- Couleurs : **#274472** (bleu profond), **#34B9EE** (cyan électrique).  
- Transitions **Framer Motion** (signature → écran de succès « Merci, votre présence est enregistrée »).

---

## 7. Exécution des migrations

```bash
supabase db push
# ou
supabase migration up
```

Puis régénérer les types si besoin :

```bash
npm run db:generate
```
