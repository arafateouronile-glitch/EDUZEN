# 📝 Composants de Signature Électronique

Composants React pour la signature électronique dans EDUZEN.

---

## 📦 Composants Disponibles

### 1. SignaturePad

Composant de signature manuscrite avec canvas HTML5.

**Import:**
```tsx
import { SignaturePad } from '@/components/signatures'
```

**Usage basique:**
```tsx
<SignaturePad
  width={500}
  height={200}
  onSave={(signatureData) => {
    console.log('Signature sauvegardée:', signatureData)
  }}
  onClear={() => {
    console.log('Signature effacée')
  }}
/>
```

**Props complètes:**
```tsx
interface SignaturePadProps {
  width?: number                    // Largeur (défaut: 500)
  height?: number                   // Hauteur (défaut: 200)
  backgroundColor?: string          // Couleur fond (défaut: '#ffffff')
  penColor?: string                 // Couleur trait (défaut: '#000000')
  onSave: (data: string) => void   // Callback sauvegarde (base64)
  onClear?: () => void              // Callback nettoyage
  defaultValue?: string             // Signature pré-remplie
  disabled?: boolean                // Désactiver édition
  showControls?: boolean            // Afficher boutons (défaut: true)
  title?: string                    // Titre affiché
  description?: string              // Description affichée
}
```

**Fonctionnalités:**
- ✅ Dessin à la souris ou au doigt (tactile)
- ✅ Export en PNG base64
- ✅ Import depuis fichier image
- ✅ Boutons Effacer, Télécharger, Importer
- ✅ Responsive
- ✅ Accessible (ARIA)

---

### 2. SignaturesHistory

Composant d'affichage de l'historique des signatures.

**Import:**
```tsx
import { SignaturesHistory } from '@/components/signatures'
```

**Usage basique:**
```tsx
<SignaturesHistory
  signatures={signatures}
  showDocument={true}
  onRevoke={async (signatureId) => {
    await revokeSignature(signatureId)
  }}
/>
```

**Props:**
```tsx
interface SignaturesHistoryProps {
  signatures: SignatureWithUser[]
  showDocument?: boolean
  onRevoke?: (signatureId: string) => Promise<void>
}
```

**Type SignatureWithUser:**
```tsx
interface SignatureWithUser {
  id: string
  document_id: string
  signer_id: string
  signer_name: string | null
  signer_email: string | null
  signer_role: string | null
  signature_data: string  // Base64 image
  signature_type: 'handwritten' | 'typed' | 'image'
  status: 'pending' | 'signed' | 'revoked' | 'expired'
  signed_at: string | null
  comment: string | null
  is_valid: boolean
  signer?: {
    id: string
    full_name: string | null
    email: string | null
    role: string | null
  } | null
  document?: {
    id: string
    title: string | null
  } | null
}
```

**Fonctionnalités:**
- ✅ Affichage en grille ou liste
- ✅ Filtrage par statut
- ✅ Preview de la signature
- ✅ Informations du signataire
- ✅ Bouton de révocation (admin)
- ✅ Badges de statut colorés

---

## 🎨 Exemples d'Utilisation

### Exemple 1: Page de Signature Simple

```tsx
'use client'

import { useState } from 'react'
import { SignaturePad } from '@/components/signatures'
import { signatureService } from '@/lib/services/signature.service'
import { Button } from '@/components/ui/button'

export default function SignPage() {
  const [saved, setSaved] = useState(false)

  const handleSave = async (signatureData: string) => {
    try {
      await signatureService.createSignature({
        documentId: 'doc-123',
        organizationId: 'org-456',
        signerId: 'user-789',
        signatureData,
        signatureType: 'handwritten',
        signerName: 'John Doe',
        signerEmail: 'john@example.com',
      })
      setSaved(true)
    } catch (error) {
      console.error('Erreur:', error)
    }
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Signez ce document</h1>

      {!saved ? (
        <SignaturePad
          width={600}
          height={200}
          onSave={handleSave}
          title="Votre signature"
          description="Dessinez votre signature ci-dessous"
        />
      ) : (
        <div className="bg-green-100 p-4 rounded">
          ✓ Signature enregistrée avec succès
        </div>
      )}
    </div>
  )
}
```

### Exemple 2: Avec Prévisualisation

```tsx
'use client'

import { useState } from 'react'
import { SignaturePad } from '@/components/signatures'

export default function SignWithPreview() {
  const [signature, setSignature] = useState<string | null>(null)

  return (
    <div className="grid md:grid-cols-2 gap-8 p-8">
      {/* Pad de signature */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Signez ici</h2>
        <SignaturePad
          width={400}
          height={200}
          onSave={(data) => setSignature(data)}
          onClear={() => setSignature(null)}
        />
      </div>

      {/* Prévisualisation */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Prévisualisation</h2>
        {signature ? (
          <div className="border rounded p-4">
            <img
              src={signature}
              alt="Signature"
              className="max-w-full h-auto"
            />
          </div>
        ) : (
          <div className="border-2 border-dashed rounded p-8 text-center text-gray-400">
            Aucune signature
          </div>
        )}
      </div>
    </div>
  )
}
```

### Exemple 3: Historique avec Filtres

```tsx
'use client'

import { useState, useEffect } from 'react'
import { SignaturesHistory } from '@/components/signatures'
import { signatureService } from '@/lib/services/signature.service'
import { Select } from '@/components/ui/select'

export default function HistoryPage() {
  const [signatures, setSignatures] = useState([])
  const [filter, setFilter] = useState<'all' | 'signed' | 'pending'>('all')

  useEffect(() => {
    loadSignatures()
  }, [])

  const loadSignatures = async () => {
    const sigs = await signatureService.getSignaturesByDocument('doc-123')
    setSignatures(sigs)
  }

  const filteredSignatures = signatures.filter(sig => {
    if (filter === 'all') return true
    return sig.status === filter
  })

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Historique des signatures</h1>

        <Select value={filter} onValueChange={setFilter}>
          <option value="all">Toutes</option>
          <option value="signed">Signées</option>
          <option value="pending">En attente</option>
        </Select>
      </div>

      <SignaturesHistory
        signatures={filteredSignatures}
        showDocument={false}
        onRevoke={async (id) => {
          await signatureService.revokeSignature(id)
          await loadSignatures()
        }}
      />
    </div>
  )
}
```

---

## 🎨 Personnalisation

### Thème personnalisé

```tsx
<SignaturePad
  width={600}
  height={250}
  backgroundColor="#f8f9fa"
  penColor="#2563eb"
  title="Signature personnalisée"
  description="Style custom"
  className="border-2 border-blue-500 rounded-lg shadow-lg"
/>
```

### Mode sombre

```tsx
<SignaturePad
  backgroundColor="#1f2937"
  penColor="#60a5fa"
  className="dark:bg-gray-800"
/>
```

---

## ♿ Accessibilité

Tous les composants suivent les standards WCAG 2.1:

- ✅ Contrôle au clavier
- ✅ Labels ARIA
- ✅ Contraste suffisant
- ✅ Focus visible
- ✅ Annonces screen reader

---

## 📱 Responsive

Les composants s'adaptent automatiquement:

```tsx
// Mobile
<SignaturePad width={window.innerWidth - 32} height={150} />

// Desktop
<SignaturePad width={600} height={200} />

// Ou utiliser Tailwind
<div className="w-full md:w-[600px]">
  <SignaturePad width={600} height={200} />
</div>
```

---

## 🔧 API Complète

### SignaturePad

**Méthodes exposées via ref:**

```tsx
const signaturePadRef = useRef<SignatureCanvasRef>(null)

// Effacer
signaturePadRef.current?.clear()

// Vérifier si vide
const isEmpty = signaturePadRef.current?.isEmpty()

// Obtenir les données
const data = signaturePadRef.current?.toDataURL()
```

**Événements:**

- `onSave(data: string)` - Quand sauvegardé
- `onClear()` - Quand effacé
- `onChange()` - À chaque trait (optionnel)

---

## 🐛 Dépannage

### La signature ne s'affiche pas

Vérifiez que le canvas a des dimensions:
```tsx
<SignaturePad width={500} height={200} />
```

### Images CORS bloquées

Ajoutez `useCORS: true` lors de la génération PDF:
```tsx
await html2canvas(element, { useCORS: true })
```

### Signature floue

Augmentez la résolution:
```tsx
<SignaturePad
  width={600}
  height={200}
  // Le canvas interne utilise scale: 2 par défaut
/>
```

---

## 📚 Voir Aussi

- [Guide d'intégration UI](../../SIGNATURE_UI_INTEGRATION_GUIDE.md)
- [Documentation technique](../../SIGNATURE_IMPLEMENTATION_COMPLETE.md)
- [Exemples complets](../../lib/examples/signature-integration-example.ts)
- [Service de signature](../../lib/services/signature.service.ts)

---

**Dernière mise à jour:** 2026-01-12
