# Guide complet - Signature électronique et Émargement

Ce guide explique comment utiliser les systèmes de signature électronique et d'émargement électronique dans EDUZEN.

## Table des matières

1. [Demandes de signature par email](#demandes-de-signature-par-email)
2. [Émargement électronique](#émargement-électronique)
3. [API Reference](#api-reference)
4. [Composants UI](#composants-ui)
5. [Base de données](#base-de-données)

---

## Demandes de signature par email

### Vue d'ensemble

Le système de demande de signature permet d'envoyer des documents pour signature électronique par email. Les destinataires reçoivent un lien sécurisé pour accéder au document et le signer.

### Fonctionnalités

- ✅ Envoi de demandes de signature individuelles ou en masse
- ✅ Emails personnalisables avec sujet et message
- ✅ Date d'expiration configurable
- ✅ Page de signature publique sécurisée
- ✅ Suivi des statuts (pending, signed, expired, declined, cancelled)
- ✅ Rappels automatiques
- ✅ Conformité eIDAS

### Utilisation du composant

```tsx
import { SendSignatureRequestDialog } from '@/components/signatures'

// Dans votre page de gestion de documents
function DocumentPage({ document }) {
  // Préparer les destinataires disponibles
  const recipients = [
    {
      id: 'student-1',
      email: 'student@example.com',
      name: 'Jean Dupont',
      type: 'student',
    },
    {
      id: 'funder-1',
      email: 'funder@example.com',
      name: 'OPCO Finance',
      type: 'funder',
    },
  ]

  return (
    <SendSignatureRequestDialog
      documentId={document.id}
      documentTitle={document.title}
      availableRecipients={recipients}
      onSuccess={() => {
        // Rafraîchir la liste, afficher une notification, etc.
        console.log('Demande de signature envoyée')
      }}
    />
  )
}
```

### API Programmatique

```typescript
import { signatureRequestService } from '@/lib/services/signature-request.service'

// Envoi à un seul destinataire
const request = await signatureRequestService.createSignatureRequest({
  documentId: 'doc-123',
  organizationId: 'org-456',
  recipientEmail: 'recipient@example.com',
  recipientName: 'Jean Dupont',
  recipientType: 'student',
  recipientId: 'student-123', // optionnel
  subject: 'Demande de signature : Contrat de formation',
  message: 'Merci de signer ce document avant le 31 janvier',
  expiresAt: '2026-01-31T23:59:59Z',
  reminderFrequency: 'weekly',
})

// Envoi en masse
const result = await signatureRequestService.createBulkSignatureRequests(
  'doc-123',
  'org-456',
  [
    { email: 'student1@example.com', name: 'Student 1', type: 'student', id: 'st1' },
    { email: 'student2@example.com', name: 'Student 2', type: 'student', id: 'st2' },
  ],
  {
    subject: 'Demande de signature',
    message: 'Merci de signer ce document',
  }
)

console.log(`${result.successful.length} envoyés, ${result.failed.length} échecs`)
```

### Workflow

1. **Création de la demande** : Utiliser le composant ou l'API pour créer une demande
2. **Envoi de l'email** : Un email est automatiquement envoyé avec un lien sécurisé
3. **Accès à la page de signature** : Le destinataire clique sur le lien
4. **Signature** : Le destinataire visualise le document et signe
5. **Confirmation** : La signature est enregistrée et la demande passe au statut "signed"
6. **Notification** : (Optionnel) Notification au demandeur

### URLs

- **Page de signature publique** : `/signature/[token]`
- **API endpoint public** : `/api/signature-requests/public/[token]`
- **API endpoint de signature** : `/api/signature-requests/sign`

---

## Émargement électronique

### Vue d'ensemble

Le système d'émargement électronique permet de gérer les présences des apprenants via signature électronique. Chaque session de formation peut avoir plusieurs sessions d'émargement.

### Fonctionnalités

- ✅ Création de sessions d'émargement par date
- ✅ Envoi automatique d'emails aux apprenants inscrits
- ✅ Géolocalisation GPS optionnelle avec validation de proximité
- ✅ Page d'émargement publique sécurisée
- ✅ Suivi en temps réel des émargements
- ✅ Export des données
- ✅ Rappels aux apprenants n'ayant pas émargé

### Utilisation du composant

```tsx
import { ElectronicAttendanceManager } from '@/components/attendance/electronic-attendance-manager'

// Dans votre page de gestion de session
function SessionDetailPage({ session }) {
  return (
    <div>
      <h1>{session.title}</h1>

      {/* Autres sections... */}

      <ElectronicAttendanceManager
        sessionId={session.id}
        organizationId={session.organization_id}
      />
    </div>
  )
}
```

### API Programmatique

```typescript
import { electronicAttendanceService } from '@/lib/services/electronic-attendance.service'

// 1. Créer une session d'émargement
const attendanceSession = await electronicAttendanceService.createAttendanceSession({
  sessionId: 'session-123',
  organizationId: 'org-456',
  title: 'Émargement du 15 janvier',
  date: '2026-01-15',
  startTime: '09:00',
  endTime: '17:00',
  mode: 'electronic',
  requireGeolocation: true,
  allowedRadiusMeters: 100,
  latitude: 48.8566,
  longitude: 2.3522,
  locationName: 'Centre de formation Paris',
})

// 2. Lancer la session (envoie les emails)
const result = await electronicAttendanceService.launchAttendanceSession(
  attendanceSession.id,
  true // sendEmails
)

console.log(`${result.requests.length} demandes envoyées`)

// 3. Récupérer les sessions d'une formation
const sessions = await electronicAttendanceService.getAttendanceSessionsBySession('session-123')

// 4. Fermer une session
await electronicAttendanceService.closeAttendanceSession(attendanceSession.id)

// 5. Envoyer un rappel à un apprenant
await electronicAttendanceService.sendAttendanceReminder('request-id')
```

### Workflow

1. **Création de la session d'émargement**
   - Définir la date, l'heure, et les paramètres
   - Le système récupère automatiquement les apprenants inscrits

2. **Lancement de la session**
   - Envoi automatique d'emails à tous les apprenants
   - Chaque apprenant reçoit un lien unique et sécurisé

3. **Émargement par les apprenants**
   - L'apprenant clique sur le lien dans l'email
   - Visualise les informations de la session
   - Si requis, autorise la géolocalisation
   - Signe électroniquement

4. **Validation et enregistrement**
   - Si géolocalisation activée : vérification de la distance
   - Enregistrement de la signature
   - Création automatique de l'entrée dans la table `attendance`
   - Mise à jour du statut de la demande

5. **Suivi et gestion**
   - Vue en temps réel des émargements
   - Envoi de rappels aux retardataires
   - Export des données
   - Fermeture de la session

### Géolocalisation

Quand la géolocalisation est activée :

```typescript
// Configuration dans la session
{
  requireGeolocation: true,
  allowedRadiusMeters: 100, // Distance maximale en mètres
  latitude: 48.8566,        // Coordonnées du lieu de formation
  longitude: 2.3522,
  locationName: 'Centre de formation',
}
```

Le système :
- Demande la position GPS à l'apprenant
- Calcule la distance avec la formule de Haversine
- Vérifie que l'apprenant est dans le rayon autorisé
- Marque `location_verified: true` si validé

### URLs

- **Page d'émargement publique** : `/attendance/[token]`
- **API endpoint public** : `/api/electronic-attendance/public/[token]`
- **API endpoint de signature** : `/api/electronic-attendance/sign`

---

## API Reference

### Endpoints - Demandes de signature

#### GET `/api/signature-requests`

Récupère les demandes de signature d'une organisation.

**Query params** :
- `status` : 'pending' | 'signed' | 'expired' | 'declined' | 'cancelled'
- `recipientType` : 'student' | 'funder' | 'teacher' | 'other'

**Response** :
```json
[
  {
    "id": "req-123",
    "document": { "id": "doc-456", "title": "Document" },
    "recipient_email": "user@example.com",
    "recipient_name": "Jean Dupont",
    "status": "pending",
    "created_at": "2026-01-13T10:00:00Z"
  }
]
```

#### POST `/api/signature-requests`

Crée une ou plusieurs demandes de signature.

**Body (single)** :
```json
{
  "documentId": "doc-123",
  "recipientEmail": "user@example.com",
  "recipientName": "Jean Dupont",
  "recipientType": "student",
  "subject": "Demande de signature",
  "message": "Merci de signer ce document",
  "expiresAt": "2026-02-13T23:59:59Z"
}
```

**Body (multiple)** :
```json
{
  "documentId": "doc-123",
  "recipients": [
    { "email": "user1@example.com", "name": "User 1", "type": "student" },
    { "email": "user2@example.com", "name": "User 2", "type": "student" }
  ],
  "subject": "Demande de signature",
  "message": "Merci de signer ce document"
}
```

#### PATCH `/api/signature-requests/[id]`

Met à jour une demande de signature.

**Body** :
```json
{
  "action": "cancel" | "remind"
}
```

### Endpoints - Émargement électronique

#### GET `/api/electronic-attendance/sessions`

Récupère les sessions d'émargement.

**Query params** :
- `status` : 'draft' | 'active' | 'closed' | 'cancelled'
- `sessionId` : ID de la session de formation
- `date` : Date au format YYYY-MM-DD

#### POST `/api/electronic-attendance/sessions`

Crée une session d'émargement.

**Body** :
```json
{
  "sessionId": "session-123",
  "title": "Émargement du 15 janvier",
  "date": "2026-01-15",
  "startTime": "09:00",
  "endTime": "17:00",
  "requireGeolocation": true,
  "allowedRadiusMeters": 100,
  "latitude": 48.8566,
  "longitude": 2.3522,
  "locationName": "Centre de formation"
}
```

#### PATCH `/api/electronic-attendance/sessions/[id]`

Lance ou ferme une session d'émargement.

**Body** :
```json
{
  "action": "launch" | "close",
  "sendEmails": true
}
```

#### POST `/api/electronic-attendance/sign`

Signe une demande d'émargement (endpoint public).

**Body** :
```json
{
  "token": "att-xxx-yyy-zzz",
  "signatureData": "data:image/png;base64,...",
  "location": {
    "latitude": 48.8566,
    "longitude": 2.3522,
    "accuracy": 10
  }
}
```

---

## Composants UI

### SendSignatureRequestDialog

Dialog pour envoyer des demandes de signature.

**Props** :
```typescript
interface SendSignatureRequestDialogProps {
  documentId: string
  documentTitle: string
  availableRecipients?: Recipient[]
  onSuccess?: () => void
  trigger?: React.ReactNode
}
```

**Exemple** :
```tsx
<SendSignatureRequestDialog
  documentId="doc-123"
  documentTitle="Contrat de formation"
  availableRecipients={recipients}
  onSuccess={() => console.log('Envoyé !')}
/>
```

### ElectronicAttendanceManager

Composant complet de gestion des émargements.

**Props** :
```typescript
interface ElectronicAttendanceManagerProps {
  sessionId: string
  organizationId: string
}
```

**Exemple** :
```tsx
<ElectronicAttendanceManager
  sessionId="session-123"
  organizationId="org-456"
/>
```

---

## Base de données

### Table `signature_requests`

```sql
CREATE TABLE signature_requests (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL,
  document_id uuid NOT NULL,
  requester_id uuid NOT NULL,

  -- Recipient info
  recipient_email text NOT NULL,
  recipient_name text NOT NULL,
  recipient_type text NOT NULL, -- 'student', 'funder', 'teacher', 'other'
  recipient_id uuid,

  -- Request details
  subject text NOT NULL,
  message text,
  status text NOT NULL DEFAULT 'pending',

  -- Signature tracking
  signature_token text NOT NULL UNIQUE,
  signature_id uuid,
  signed_at timestamptz,

  -- Expiration
  expires_at timestamptz,
  reminder_frequency text DEFAULT 'none',
  reminder_count integer DEFAULT 0,
  last_reminder_sent_at timestamptz,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### Table `electronic_attendance_sessions`

```sql
CREATE TABLE electronic_attendance_sessions (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL,
  session_id uuid NOT NULL,

  -- Session details
  title text NOT NULL,
  date date NOT NULL,
  start_time time,
  end_time time,
  status text NOT NULL DEFAULT 'draft',
  mode text NOT NULL DEFAULT 'electronic',

  -- Settings
  require_signature boolean DEFAULT true,
  require_geolocation boolean DEFAULT false,
  allowed_radius_meters integer DEFAULT 100,
  qr_code_enabled boolean DEFAULT false,

  -- Location
  latitude double precision,
  longitude double precision,
  location_name text,

  -- Timing
  opens_at timestamptz,
  closes_at timestamptz,

  -- Stats
  total_expected integer DEFAULT 0,
  total_signed integer DEFAULT 0,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### Table `electronic_attendance_requests`

```sql
CREATE TABLE electronic_attendance_requests (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL,
  attendance_session_id uuid NOT NULL,

  -- Student info
  student_id uuid NOT NULL,
  student_email text NOT NULL,
  student_name text NOT NULL,

  -- Request details
  status text NOT NULL DEFAULT 'pending',
  signature_token text NOT NULL UNIQUE,

  -- Signature tracking
  signature_data text,
  signed_at timestamptz,
  attendance_id uuid,

  -- Geolocation
  latitude double precision,
  longitude double precision,
  location_accuracy double precision,
  location_verified boolean DEFAULT false,

  -- Device info
  ip_address inet,
  user_agent text,

  -- Reminders
  reminder_count integer DEFAULT 0,
  last_reminder_sent_at timestamptz,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

---

## Cas d'usage

### 1. Envoi de conventions aux financeurs

```tsx
// Dans la page de gestion de session
import { SendSignatureRequestDialog } from '@/components/signatures'

function SessionConventionsSection({ session, conventions }) {
  const funders = session.funders.map(f => ({
    id: f.id,
    email: f.email,
    name: f.name,
    type: 'funder' as const,
  }))

  return (
    <div>
      {conventions.map(convention => (
        <div key={convention.id}>
          <h3>{convention.title}</h3>
          <SendSignatureRequestDialog
            documentId={convention.id}
            documentTitle={convention.title}
            availableRecipients={funders}
            trigger={
              <Button variant="outline">
                Envoyer au financeur
              </Button>
            }
          />
        </div>
      ))}
    </div>
  )
}
```

### 2. Émargement quotidien d'une session

```tsx
// Dans la page de suivi de session
import { ElectronicAttendanceManager } from '@/components/attendance/electronic-attendance-manager'

function SessionTrackingPage({ session }) {
  return (
    <div>
      <h1>Suivi de la session</h1>

      {/* Section émargement */}
      <section>
        <ElectronicAttendanceManager
          sessionId={session.id}
          organizationId={session.organization_id}
        />
      </section>
    </div>
  )
}
```

### 3. Workflow automatisé après génération de document

```typescript
// Après génération d'un document
async function onDocumentGenerated(document: Document) {
  // Envoyer automatiquement en signature
  if (document.type === 'contract') {
    const student = await getStudent(document.student_id)

    await signatureRequestService.createSignatureRequest({
      documentId: document.id,
      organizationId: document.organization_id,
      recipientEmail: student.email,
      recipientName: `${student.first_name} ${student.last_name}`,
      recipientType: 'student',
      recipientId: student.id,
      subject: `Signature requise : ${document.title}`,
      message: 'Merci de signer ce document dans les meilleurs délais.',
    })
  }
}
```

---

## Sécurité et conformité

### Signatures électroniques

- ✅ **eIDAS compliant** : Conforme aux normes européennes
- ✅ **Tokens uniques** : Chaque demande a un token unique et sécurisé
- ✅ **Code de validation** : Chaque signature a un code de validation unique
- ✅ **Traçabilité** : IP, user agent, timestamp enregistrés
- ✅ **Expiration** : Les demandes expirent automatiquement
- ✅ **Révocation** : Possibilité de révoquer une signature

### Émargements électroniques

- ✅ **Géolocalisation** : Validation GPS optionnelle avec distance
- ✅ **Tokens uniques** : Liens sécurisés par apprenant
- ✅ **Horodatage** : Date et heure précises de signature
- ✅ **Intégrité** : Lien automatique avec la table `attendance`
- ✅ **Traçabilité** : Toutes les actions sont enregistrées

---

## Support et contribution

Pour toute question ou suggestion :
- Issues GitHub : [lien vers repo]
- Documentation : Ce fichier
- Contact : support@eduzen.com

---

**Version** : 1.0.0
**Date** : 13 janvier 2026
**Auteur** : Équipe EDUZEN
