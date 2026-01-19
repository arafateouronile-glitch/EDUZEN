/**
 * Exemple d'utilisation complète de l'intégration signature électronique
 * Ce fichier montre comment utiliser les différents services et composants
 */

import { SignatureService } from '@/lib/services/signature.service'
import { createClient } from '@/lib/supabase/client'
import { generatePDFWithSignatures, uploadSignedPDF } from '@/lib/utils/document-generation/pdf-with-signatures'
import { YousignAdapter } from '@/lib/services/esignature-adapters/yousign.adapter'

// Instancier le service pour les exemples
const signatureService = new SignatureService(createClient())

/**
 * EXEMPLE 1: Créer un template de document avec zones de signature
 */
export const documentTemplateWithSignatures = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Contrat de Formation</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 20px; }
    h1 { color: #1a1a1a; }
    .section { margin: 20px 0; }
  </style>
</head>
<body>
  <h1>Contrat de Formation Professionnelle</h1>

  <div class="section">
    <p>Entre les soussignés :</p>
    <p><strong>{{organization_name}}</strong>, organisme de formation</p>
    <p>Et <strong>{{student_first_name}} {{student_last_name}}</strong>, apprenant(e)</p>
  </div>

  <div class="section">
    <h2>Article 1 - Objet</h2>
    <p>Le présent contrat a pour objet la formation suivante : {{training_title}}</p>
  </div>

  <div class="section">
    <h2>Signatures</h2>
    <p>Fait en deux exemplaires à {{organization_city}}, le {{date}}</p>

    <div style="display: flex; justify-content: space-between; margin-top: 40px;">
      <div>
        <signature-field
          id="student-signature"
          type="signature"
          label="Signature de l'apprenant"
          required="true"
          signer-role="student"
          signer-email="{{student_email}}"
          width="200"
          height="100"
        />
      </div>

      <div>
        <signature-field
          id="trainer-signature"
          type="signature"
          label="Signature du formateur"
          required="true"
          signer-role="trainer"
          signer-email="{{trainer_email}}"
          width="200"
          height="100"
        />
      </div>
    </div>

    <div style="margin-top: 20px;">
      <signature-field
        id="signature-date"
        type="date"
        label="Date de signature"
        required="true"
      />
    </div>
  </div>
</body>
</html>
`

/**
 * EXEMPLE 2: Générer un document avec signature locale (canvas)
 */
export async function generateDocumentWithLocalSignature() {
  const documentId = 'doc-123'
  const organizationId = 'org-456'

  // Variables du document
  const variables = {
    organization_name: 'Mon Organisme de Formation',
    organization_city: 'Paris',
    student_first_name: 'Jean',
    student_last_name: 'Dupont',
    student_email: 'jean.dupont@example.com',
    training_title: 'Développement Web Full Stack',
    trainer_email: 'trainer@example.com',
    date: new Date().toLocaleDateString('fr-FR'),
  }

  // 1. Générer le PDF avec les zones de signature (vides ou remplies)
  const pdfResult = await generatePDFWithSignatures(documentTemplateWithSignatures, {
    documentId,
    variables,
    filename: 'contrat-formation.pdf',
    includeMetadata: true,
  })

  console.log('PDF généré:', {
    filename: pdfResult.filename,
    pageCount: pdfResult.pageCount,
    hasSignatures: pdfResult.hasSignatures,
  })

  // 2. Upload le PDF signé
  const signedUrl = await uploadSignedPDF(pdfResult.blob, documentId, organizationId)

  console.log('PDF signé uploadé:', signedUrl)

  return {
    pdfBlob: pdfResult.blob,
    signedUrl,
  }
}

/**
 * EXEMPLE 3: Créer une signature manuelle dans la base de données
 */
export async function createManualSignature(
  documentId: string,
  signatureDataBase64: string, // Image de signature en base64
  signerInfo: {
    id: string
    name: string
    email: string
    role: string
  }
) {
  const signature = await signatureService.createSignature({
    documentId,
    organizationId: 'org-456',
    signerId: signerInfo.id,
    signatureData: signatureDataBase64,
    signatureType: 'handwritten',
    signerName: signerInfo.name,
    signerEmail: signerInfo.email,
    signerRole: signerInfo.role,
    positionX: 100,
    positionY: 700,
    width: 200,
    height: 80,
    pageNumber: 1,
    comment: 'Signature apposée via l\'interface EDUZEN',
  })

  console.log('Signature créée:', signature.id)

  return signature
}

/**
 * EXEMPLE 4: Utiliser Yousign pour la signature électronique externe
 */
export async function sendDocumentForESignature(
  documentId: string,
  documentBase64: string,
  signers: Array<{
    firstName: string
    lastName: string
    email: string
    role: string
  }>
) {
  // Configuration Yousign
  const yousignAdapter = new YousignAdapter({
    api_key: process.env.YOUSIGN_API_KEY || '',
    environment: 'sandbox', // ou 'production'
  })

  try {
    // Créer la demande de signature
    const signatureRequest = await yousignAdapter.createSignatureRequest({
      name: `Document ${documentId}`,
      description: 'Demande de signature pour document EDUZEN',
      signers: signers.map((signer, index) => ({
        info: {
          first_name: signer.firstName,
          last_name: signer.lastName,
          email: signer.email,
        },
        fields: [
          {
            type: 'signature',
            page: 1,
            x: 100,
            y: 700 - (index * 150), // Position différente pour chaque signataire
            width: 200,
            height: 80,
            required: true,
          },
        ],
      })),
      files: [
        {
          name: `document-${documentId}.pdf`,
          content: documentBase64,
          nature: 'signable',
        },
      ],
      metadata: {
        documentId,
        source: 'eduzen',
      },
    })

    console.log('Demande de signature créée:', {
      id: signatureRequest.id,
      status: signatureRequest.status,
      signers: signatureRequest.signers.length,
    })

    return signatureRequest
  } catch (error) {
    console.error('Erreur lors de l\'envoi pour signature:', error)
    throw error
  }
}

/**
 * EXEMPLE 5: Récupérer toutes les signatures d'un document
 */
export async function getDocumentSignatures(documentId: string) {
  const signatures = await signatureService.getSignaturesByDocument(documentId)

  console.log(`${signatures.length} signature(s) trouvée(s)`)

  for (const signature of signatures) {
    console.log({
      id: signature.id,
      signerName: signature.signer_name,
      signerEmail: signature.signer_email,
      signedAt: signature.signed_at,
      status: signature.status,
      isValid: signature.is_valid,
    })
  }

  return signatures
}

/**
 * EXEMPLE 6: Vérifier si un document est complètement signé
 */
export async function checkDocumentSignatureStatus(documentId: string) {
  const signatures = await signatureService.getSignaturesByDocument(documentId)

  const totalSignatures = signatures.length
  const signedCount = signatures.filter(s => s.status === 'signed').length
  const pendingCount = signatures.filter(s => s.status === 'pending').length
  const isFullySigned = totalSignatures > 0 && signedCount === totalSignatures

  return {
    totalSignatures,
    signedCount,
    pendingCount,
    isFullySigned,
    signatures,
  }
}

/**
 * EXEMPLE 7: Workflow complet - De la création à la signature
 */
export async function completeSignatureWorkflow() {
  const documentId = 'doc-789'
  const organizationId = 'org-456'

  // Étape 1: Créer le document HTML avec zones de signature
  const htmlContent = documentTemplateWithSignatures.replace(
    /{{(\w+)}}/g,
    (_, key) => {
      const vars: Record<string, string> = {
        organization_name: 'Formation Excellence',
        organization_city: 'Lyon',
        student_first_name: 'Marie',
        student_last_name: 'Martin',
        student_email: 'marie.martin@example.com',
        training_title: 'Gestion de Projet Agile',
        trainer_email: 'trainer@formation-excellence.fr',
        date: new Date().toLocaleDateString('fr-FR'),
      }
      return vars[key] || ''
    }
  )

  // Étape 2: Générer le PDF sans signatures (pour envoi aux signataires)
  const pdfResult = await generatePDFWithSignatures(htmlContent, {
    documentId,
    filename: 'contrat-a-signer.pdf',
  })

  console.log('✅ PDF généré (sans signatures)')

  // Étape 3: Envoyer pour signature électronique via Yousign
  // Note: Convertir le blob en base64 d'abord
  const reader = new FileReader()
  const base64Promise = new Promise<string>((resolve) => {
    reader.onloadend = () => resolve(reader.result as string)
    reader.readAsDataURL(pdfResult.blob)
  })
  const pdfBase64 = (await base64Promise).split(',')[1]

  const signatureRequest = await sendDocumentForESignature(
    documentId,
    pdfBase64,
    [
      {
        firstName: 'Marie',
        lastName: 'Martin',
        email: 'marie.martin@example.com',
        role: 'student',
      },
      {
        firstName: 'Jean',
        lastName: 'Formateur',
        email: 'trainer@formation-excellence.fr',
        role: 'trainer',
      },
    ]
  )

  console.log('✅ Document envoyé pour signature via Yousign')

  // Étape 4: Attendre les webhooks de signature
  console.log('⏳ En attente des signatures...')
  console.log('Les webhooks Yousign mettront à jour automatiquement les signatures')

  // Étape 5: Une fois toutes les signatures reçues (via webhooks)
  // Le système génère automatiquement le PDF final avec toutes les signatures

  return {
    documentId,
    signatureRequestId: signatureRequest.id,
    status: 'pending_signatures',
  }
}

/**
 * EXEMPLE 8: Révoquer une signature
 */
export async function revokeDocumentSignature(
  signatureId: string,
  reason: string
) {
  await signatureService.revokeSignature(signatureId, reason)
  console.log('✅ Signature révoquée')
}

/**
 * UTILISATION DANS UN COMPOSANT REACT
 *
 * import { generateAndDownloadPDF } from '@/lib/utils/document-generation/pdf-with-signatures'
 * import { signatureService } from '@/lib/services/signature.service'
 *
 * function DocumentPage() {
 *   const handleGeneratePDF = async () => {
 *     await generateAndDownloadPDF(htmlContent, {
 *       documentId: 'doc-123',
 *       variables: { ... },
 *       filename: 'contrat.pdf',
 *     })
 *   }
 *
 *   const handleCreateSignature = async (signatureData: string) => {
 *     await signatureService.createSignature({
 *       documentId: 'doc-123',
 *       organizationId: 'org-456',
 *       signerId: userId,
 *       signatureData,
 *       signatureType: 'handwritten',
 *       ...
 *     })
 *   }
 *
 *   return (
 *     <div>
 *       <SignaturePad onSave={handleCreateSignature} />
 *       <button onClick={handleGeneratePDF}>Télécharger PDF</button>
 *     </div>
 *   )
 * }
 */
