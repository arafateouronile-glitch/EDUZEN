# 🎨 Guide d'Intégration UI - Signature Électronique

Guide pratique pour intégrer les composants de signature dans l'interface EDUZEN.

---

## 📦 Composants Disponibles

### 1. SignaturePad (Canvas de signature)

**Fichier:** [components/signatures/signature-canvas.tsx](components/signatures/signature-canvas.tsx)

**Usage:**

```tsx
import { SignaturePad } from '@/components/signatures'

function DocumentSignaturePage() {
  const [signatureData, setSignatureData] = useState<string | null>(null)

  const handleSave = async (data: string) => {
    setSignatureData(data)

    // Enregistrer en base de données
    await signatureService.createSignature({
      documentId: 'doc-123',
      organizationId: 'org-456',
      signerId: userId,
      signatureData: data,
      signatureType: 'handwritten',
      signerName: userName,
      signerEmail: userEmail,
    })
  }

  return (
    <SignaturePad
      width={500}
      height={200}
      onSave={handleSave}
      onClear={() => setSignatureData(null)}
      title="Veuillez signer ci-dessous"
      description="Utilisez votre souris ou votre doigt pour dessiner votre signature"
      showControls={true}
    />
  )
}
```

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `width` | `number` | 500 | Largeur du canvas |
| `height` | `number` | 200 | Hauteur du canvas |
| `backgroundColor` | `string` | '#ffffff' | Couleur de fond |
| `penColor` | `string` | '#000000' | Couleur du trait |
| `onSave` | `(data: string) => void` | - | Callback lors de la sauvegarde |
| `onClear` | `() => void` | - | Callback lors du nettoyage |
| `defaultValue` | `string` | - | Signature pré-remplie (base64) |
| `disabled` | `boolean` | false | Désactiver l'édition |
| `showControls` | `boolean` | true | Afficher les boutons |
| `title` | `string` | - | Titre affiché |
| `description` | `string` | - | Description affichée |

---

### 2. SignaturesHistory (Historique des signatures)

**Fichier:** [components/signatures/signatures-history.tsx](components/signatures/signatures-history.tsx)

**Usage:**

```tsx
import { SignaturesHistory } from '@/components/signatures'

function DocumentHistoryPage() {
  const [signatures, setSignatures] = useState([])

  useEffect(() => {
    loadSignatures()
  }, [documentId])

  const loadSignatures = async () => {
    const sigs = await signatureService.getSignaturesByDocument(documentId)
    setSignatures(sigs)
  }

  return (
    <SignaturesHistory
      signatures={signatures}
      showDocument={false}
      onRevoke={async (id) => {
        await signatureService.revokeSignature(id, 'Révoquée par l\'utilisateur')
        await loadSignatures()
      }}
    />
  )
}
```

**Props:**

| Prop | Type | Description |
|------|------|-------------|
| `signatures` | `SignatureWithUser[]` | Liste des signatures |
| `showDocument` | `boolean` | Afficher les infos du document |
| `onRevoke` | `(id: string) => void` | Callback révocation |

---

## 🖼️ Scénarios d'Intégration

### Scénario 1: Page de Signature de Document

**Page:** `/dashboard/documents/[id]/sign`

```tsx
'use client'

import { useState, useEffect } from 'react'
import { SignaturePad, SignaturesHistory } from '@/components/signatures'
import { signatureService } from '@/lib/services/signature.service'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'

export default function SignDocumentPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [document, setDocument] = useState(null)
  const [signatures, setSignatures] = useState([])
  const [isSigned, setIsSigned] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadDocument()
    loadSignatures()
  }, [params.id])

  const loadDocument = async () => {
    // Charger le document depuis Supabase
    const supabase = createClient()
    const { data } = await supabase
      .from('documents')
      .select('*')
      .eq('id', params.id)
      .single()
    setDocument(data)
  }

  const loadSignatures = async () => {
    const sigs = await signatureService.getSignaturesByDocument(params.id)
    setSignatures(sigs)

    // Vérifier si l'utilisateur actuel a déjà signé
    const userSig = sigs.find(s => s.signer_id === currentUserId)
    setIsSigned(!!userSig)
  }

  const handleSaveSignature = async (signatureData: string) => {
    setLoading(true)
    try {
      await signatureService.createSignature({
        documentId: params.id,
        organizationId: document.organization_id,
        signerId: currentUserId,
        signatureData,
        signatureType: 'handwritten',
        signerName: currentUserName,
        signerEmail: currentUserEmail,
        signerRole: currentUserRole,
      })

      // Recharger les signatures
      await loadSignatures()

      // Notification
      toast.success('Signature enregistrée avec succès')

      // Rediriger après 2 secondes
      setTimeout(() => {
        router.push('/dashboard/documents')
      }, 2000)
    } catch (error) {
      toast.error('Erreur lors de l\'enregistrement de la signature')
    } finally {
      setLoading(false)
    }
  }

  if (!document) return <div>Chargement...</div>

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Signer le document</h1>

      {/* Aperçu du document */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-2">{document.title}</h2>
        <p className="text-gray-600 mb-4">{document.description}</p>

        {/* Iframe ou lien de prévisualisation */}
        <Button variant="outline" onClick={() => window.open(document.file_url)}>
          Voir le document complet
        </Button>
      </div>

      {/* Zone de signature */}
      {!isSigned ? (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">Votre signature</h3>
          <SignaturePad
            width={600}
            height={200}
            onSave={handleSaveSignature}
            title="Signez ci-dessous pour valider ce document"
            description="Votre signature sera horodatée et enregistrée de manière sécurisée"
            disabled={loading}
          />
        </div>
      ) : (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
          <p className="text-green-800 font-semibold">
            ✓ Vous avez déjà signé ce document
          </p>
        </div>
      )}

      {/* Historique des signatures */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Historique des signatures</h3>
        <SignaturesHistory signatures={signatures} showDocument={false} />
      </div>
    </div>
  )
}
```

---

### Scénario 2: Émargement avec Signature

**Page:** `/dashboard/attendance/[sessionId]`

```tsx
'use client'

import { useState } from 'react'
import { SignaturePad } from '@/components/signatures'
import { attendanceService } from '@/lib/services/attendance.service'

export default function AttendancePage({ params }: { params: { sessionId: string } }) {
  const [students, setStudents] = useState([])
  const [teacherSignature, setTeacherSignature] = useState<string | null>(null)

  const handleMarkPresent = async (studentId: string) => {
    await attendanceService.markAttendance({
      sessionId: params.sessionId,
      studentId,
      status: 'present',
      date: new Date().toISOString(),
    })
    // Recharger la liste
  }

  const handleSaveTeacherSignature = async (signatureData: string) => {
    setTeacherSignature(signatureData)

    // Enregistrer la signature de l'enseignant
    const attendanceId = await getAttendanceId() // À implémenter
    await attendanceService.saveTeacherSignature(attendanceId, signatureData)
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Feuille d'émargement</h1>

      {/* Liste des étudiants */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <table className="w-full">
          <thead>
            <tr>
              <th>Nom</th>
              <th>Présence</th>
              <th>Heure d'arrivée</th>
            </tr>
          </thead>
          <tbody>
            {students.map(student => (
              <tr key={student.id}>
                <td>{student.name}</td>
                <td>
                  <button onClick={() => handleMarkPresent(student.id)}>
                    Marquer présent
                  </button>
                </td>
                <td>{student.arrival_time || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Signature de l'enseignant */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Signature de l'enseignant</h3>
        <SignaturePad
          width={400}
          height={150}
          onSave={handleSaveTeacherSignature}
          title="Signature de validation de la séance"
          defaultValue={teacherSignature}
        />
      </div>
    </div>
  )
}
```

---

### Scénario 3: Génération de Document avec Signature

**Composant:** Bouton de génération de PDF

```tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { generateAndDownloadPDF } from '@/lib/utils/document-generation/pdf-with-signatures'
import { Download, Loader2 } from 'lucide-react'

export function GeneratePDFButton({ documentId, htmlContent, variables }: {
  documentId: string
  htmlContent: string
  variables: Record<string, any>
}) {
  const [generating, setGenerating] = useState(false)

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      await generateAndDownloadPDF(htmlContent, {
        documentId,
        variables,
        filename: `document-${documentId}.pdf`,
        includeMetadata: true,
        addWatermark: false,
      })

      toast.success('PDF généré avec succès')
    } catch (error) {
      toast.error('Erreur lors de la génération du PDF')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <Button onClick={handleGenerate} disabled={generating}>
      {generating ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Génération en cours...
        </>
      ) : (
        <>
          <Download className="mr-2 h-4 w-4" />
          Télécharger le PDF
        </>
      )}
    </Button>
  )
}
```

---

### Scénario 4: Envoi pour Signature Externe (Yousign)

**Composant:** Dialog d'envoi

```tsx
'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { YousignAdapter } from '@/lib/services/esignature-adapters/yousign.adapter'

export function SendForESignatureDialog({ documentId, pdfBase64 }: {
  documentId: string
  pdfBase64: string
}) {
  const [open, setOpen] = useState(false)
  const [signers, setSigners] = useState([
    { firstName: '', lastName: '', email: '', role: 'student' }
  ])
  const [sending, setSending] = useState(false)

  const handleAddSigner = () => {
    setSigners([...signers, { firstName: '', lastName: '', email: '', role: 'student' }])
  }

  const handleSend = async () => {
    setSending(true)
    try {
      const yousign = new YousignAdapter({
        api_key: process.env.NEXT_PUBLIC_YOUSIGN_API_KEY!,
        environment: 'sandbox',
      })

      const request = await yousign.createSignatureRequest({
        name: `Document ${documentId}`,
        description: 'Demande de signature EDUZEN',
        signers: signers.map((signer, index) => ({
          info: {
            first_name: signer.firstName,
            last_name: signer.lastName,
            email: signer.email,
          },
          fields: [{
            type: 'signature',
            page: 1,
            x: 100,
            y: 700 - (index * 150),
            width: 200,
            height: 80,
            required: true,
          }],
        })),
        files: [{
          name: `document-${documentId}.pdf`,
          content: pdfBase64,
          nature: 'signable',
        }],
        metadata: {
          documentId,
          source: 'eduzen',
        },
      })

      toast.success('Document envoyé pour signature')
      setOpen(false)
    } catch (error) {
      toast.error('Erreur lors de l\'envoi')
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        Envoyer pour signature électronique
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Envoyer pour signature électronique</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {signers.map((signer, index) => (
              <div key={index} className="grid grid-cols-4 gap-2">
                <Input
                  placeholder="Prénom"
                  value={signer.firstName}
                  onChange={(e) => {
                    const newSigners = [...signers]
                    newSigners[index].firstName = e.target.value
                    setSigners(newSigners)
                  }}
                />
                <Input
                  placeholder="Nom"
                  value={signer.lastName}
                  onChange={(e) => {
                    const newSigners = [...signers]
                    newSigners[index].lastName = e.target.value
                    setSigners(newSigners)
                  }}
                />
                <Input
                  placeholder="Email"
                  value={signer.email}
                  onChange={(e) => {
                    const newSigners = [...signers]
                    newSigners[index].email = e.target.value
                    setSigners(newSigners)
                  }}
                />
                <select
                  value={signer.role}
                  onChange={(e) => {
                    const newSigners = [...signers]
                    newSigners[index].role = e.target.value
                    setSigners(newSigners)
                  }}
                  className="border rounded px-2"
                >
                  <option value="student">Apprenant</option>
                  <option value="trainer">Formateur</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            ))}

            <Button variant="outline" onClick={handleAddSigner}>
              Ajouter un signataire
            </Button>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Annuler
              </Button>
              <Button onClick={handleSend} disabled={sending}>
                {sending ? 'Envoi...' : 'Envoyer'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
```

---

## 🎨 Styles Personnalisés

### Personnaliser le SignaturePad

```tsx
<SignaturePad
  width={600}
  height={250}
  backgroundColor="#f9fafb"
  penColor="#1e40af"
  title="Ma signature personnalisée"
  description="Signez avec votre style"
  className="border-2 border-blue-500 rounded-lg"
/>
```

### Personnaliser l'Historique

```tsx
<SignaturesHistory
  signatures={signatures}
  showDocument={true}
  className="bg-gray-50 p-4 rounded"
  onRevoke={handleRevoke}
/>
```

---

## 🔔 Notifications et Feedback

### Toast Notifications

```tsx
import { toast } from 'sonner'

// Succès
toast.success('Signature enregistrée avec succès')

// Erreur
toast.error('Erreur lors de l\'enregistrement')

// Info
toast.info('Document envoyé aux signataires')

// Chargement
const toastId = toast.loading('Génération du PDF...')
// Plus tard
toast.success('PDF généré', { id: toastId })
```

---

## 📱 Responsive Design

Tous les composants sont responsive par défaut. Pour mobile :

```tsx
<SignaturePad
  width={window.innerWidth < 768 ? 300 : 600}
  height={window.innerWidth < 768 ? 150 : 200}
/>
```

---

## ✅ Checklist d'Intégration

- [ ] Importer les composants depuis `@/components/signatures`
- [ ] Configurer les variables d'environnement Yousign
- [ ] Tester la signature locale (canvas)
- [ ] Tester la génération de PDF
- [ ] Tester l'envoi via Yousign
- [ ] Configurer l'URL du webhook
- [ ] Tester la réception des webhooks
- [ ] Ajouter les notifications
- [ ] Tester sur mobile
- [ ] Déployer en staging

---

**Guide créé le:** 2026-01-12
**Pour:** EDUZEN Platform
