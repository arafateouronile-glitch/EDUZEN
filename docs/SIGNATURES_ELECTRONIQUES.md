# 📝 Signatures Électroniques - Documentation

## Vue d'ensemble

Système complet de signatures électroniques pour les documents. Permet aux utilisateurs de signer des documents directement depuis l'application avec une signature manuscrite, tapée ou importée.

## Fonctionnalités

### ✅ Implémenté

1. **Table de base de données** : `document_signatures`
   - Stockage des signatures en base64
   - Métadonnées complètes (signataire, date, position, etc.)
   - Code de validation pour l'intégrité
   - Support RLS (Row Level Security)

2. **Composant SignaturePad** : `components/signatures/signature-canvas.tsx`
   - Signature manuscrite avec `react-signature-canvas`
   - Import d'image de signature
   - Export de signature
   - Effacement et réinitialisation
   - Personnalisable (couleurs, dimensions, etc.)

3. **Service de signatures** : `lib/services/signature.service.ts`
   - CRUD complet des signatures
   - Récupération par document, utilisateur
   - Validation d'intégrité
   - Révoquation de signatures

4. **Page de signature** : `app/(dashboard)/dashboard/documents/[id]/sign/page.tsx`
   - Interface complète pour signer un document
   - Visualisation des signatures existantes
   - Commentaire optionnel
   - Prévention des doubles signatures

### ⏳ À faire

1. **Page de détails du document avec signatures**
   - Afficher les signatures sur le document
   - Visualisation des métadonnées de signature
   - Export PDF avec signatures

2. **Intégration dans l'éditeur de documents**
   - Zone de signature dans les templates
   - Placement des signatures sur le document

3. **Historique des signatures**
   - Page dédiée pour l'historique
   - Filtres et recherche
   - Export de l'historique

4. **Notifications**
   - Notifier lors de nouvelles signatures
   - Rappels pour documents à signer

## Structure de la base de données

### Table `document_signatures`

```sql
CREATE TABLE document_signatures (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL,
  document_id UUID NOT NULL,
  signature_data TEXT NOT NULL, -- Base64
  signature_type VARCHAR(50), -- 'handwritten', 'typed', 'image'
  signer_id UUID NOT NULL,
  signer_name VARCHAR(255),
  signer_email VARCHAR(255),
  signer_role VARCHAR(100),
  position_x INTEGER,
  position_y INTEGER,
  width INTEGER DEFAULT 200,
  height INTEGER DEFAULT 80,
  page_number INTEGER DEFAULT 1,
  status VARCHAR(50) DEFAULT 'signed',
  is_valid BOOLEAN DEFAULT TRUE,
  validation_code VARCHAR(100),
  comment TEXT,
  signed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
)
```

## Utilisation

### Signer un document

1. Accéder à un document : `/dashboard/documents/[id]`
2. Cliquer sur "Signer" → Redirige vers `/dashboard/documents/[id]/sign`
3. Signer dans la zone prévue
4. Ajouter un commentaire (optionnel)
5. Enregistrer la signature

### API Service

```typescript
import { signatureService } from '@/lib/services/signature.service'

// Créer une signature
const signature = await signatureService.createSignature({
  documentId: '...',
  organizationId: '...',
  signerId: '...',
  signatureData: 'data:image/png;base64,...',
})

// Récupérer les signatures d'un document
const signatures = await signatureService.getSignaturesByDocument(documentId)

// Récupérer les signatures d'un utilisateur
const userSignatures = await signatureService.getSignaturesByUser(userId, orgId)

// Révoquer une signature
await signatureService.revokeSignature(signatureId, 'Raison')
```

### Composant SignaturePad

```typescript
import { SignaturePad } from '@/components/signatures'

<SignaturePad
  width={600}
  height={200}
  onSave={(data) => console.log(data)}
  onClear={() => console.log('Cleared')}
  defaultValue="data:image/png;base64,..." // Optionnel
  showControls={true}
  title="Votre signature"
  description="Signez dans la zone ci-dessous"
/>
```

## Sécurité

### RLS Policies

- **SELECT** : Les utilisateurs voient les signatures des documents de leur organisation
- **INSERT** : Les utilisateurs peuvent créer des signatures pour les documents de leur organisation (seulement pour eux-mêmes)
- **UPDATE** : Les utilisateurs peuvent modifier leurs propres signatures (seulement si status='pending'). Les admins peuvent modifier toutes les signatures.
- **DELETE** : Les utilisateurs peuvent supprimer leurs propres signatures (seulement si status='pending'). Les admins peuvent supprimer toutes les signatures.

### Validation

- Code de validation généré pour chaque signature
- Métadonnées de traçabilité (IP, User Agent, timestamp)
- Statut de signature (pending, signed, revoked, expired)

## Prochaines étapes

1. ✅ Migration SQL créée
2. ✅ Composant SignaturePad créé
3. ✅ Service signature créé
4. ✅ Page de signature créée
5. ⏳ Page de détails avec signatures
6. ⏳ Intégration dans l'éditeur
7. ⏳ Historique des signatures
8. ⏳ Export PDF avec signatures

## Migration

Pour appliquer la migration :

```bash
# Via Supabase CLI
supabase db push

# Ou via le dashboard Supabase
# Exécuter le fichier : supabase/migrations/20260110000001_create_document_signatures.sql
```

## Notes

- Les signatures sont stockées en base64 (format PNG)
- La taille recommandée est de 200x80px
- Support des signatures manuscrites, tapées et importées
- Traçabilité complète (qui, quand, comment)
