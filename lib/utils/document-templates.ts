import { formatDateForDocument } from './pdf-generator'
import { formatCurrency } from '../utils'
import { generateHTML } from './document-generation/html-generator'
import type { DocumentTemplate, DocumentVariables } from '@/lib/types/document-templates'

/**
 * Génère le template avec balises {variable} pour une attestation de scolarité
 * Cette fonction retourne un template avec balises qui doit être traité avec processTemplateWithTags
 */
function generateAttestationTemplate(data: {
  student: {
    first_name: string
    last_name: string
    student_number: string
    date_of_birth?: string
    photo_url?: string
  }
  organization: {
    name: string
    address?: string
    phone?: string
    email?: string
    logo_url?: string
  }
  class?: {
    name: string
  }
  academicYear: string
  issueDate: string
  language?: 'fr' | 'en'
}) {
  const lang = data.language || 'fr'
  const texts = {
    fr: {
      title: 'ATTESTATION DE SCOLARITÉ',
      certifies: 'Je soussigné(e), Directeur(trice) de',
      certifiesThat: 'certifie que',
      isEnrolled: 'est régulièrement inscrit(e) en qualité d\'élève',
      inClass: 'dans la classe',
      academicYear: 'pour l\'année scolaire',
      date: 'Fait à',
      on: 'le',
      signature: 'Signature et cachet',
    },
    en: {
      title: 'SCHOOL ATTENDANCE CERTIFICATE',
      certifies: 'I, the undersigned, Director of',
      certifiesThat: 'certify that',
      isEnrolled: 'is duly enrolled as a student',
      inClass: 'in class',
      academicYear: 'for the academic year',
      date: 'Done at',
      on: 'on',
      signature: 'Signature and stamp',
    },
  }

  const t = texts[lang]

  // Retourner un template avec balises {variable} au lieu de template literals
  return `
    <div id="attestation-document" style="max-width: 210mm; margin: 0 auto; padding: 20mm; font-family: Arial, sans-serif; color: #000;">
      {organization_logo && <div style="text-align: center; margin-bottom: 20px;">
        <img src="{organization_logo}" alt="Logo" style="max-height: 80px;" />
      </div>}
      
      <h1 style="text-align: center; font-size: 24px; font-weight: bold; margin-bottom: 30px; text-transform: uppercase;">
        {title}
      </h1>
      
      <div style="line-height: 1.8; font-size: 14px; margin-bottom: 30px;">
        <p>{certifies} <strong>{organization_name}</strong>,</p>
        <p style="margin-top: 20px; text-indent: 30px;">
          {certifies_that} <strong>{student_first_name} {student_last_name}</strong>,
          {IF student_date_of_birth}né(e) le {student_date_of_birth},{ENDIF}
          {is_enrolled} {IF class_name}{in_class} <strong>{class_name}</strong> {ENDIF}
          {academic_year} <strong>{academic_year}</strong>.
        </p>
      </div>
      
      <div style="margin-top: 50px; margin-bottom: 30px;">
        <p>{date} <strong>{organization_address}</strong>, {on} <strong>{issue_date}</strong></p>
      </div>
      
      <div style="margin-top: 60px; text-align: right;">
        <p style="margin-bottom: 50px;">{signature}</p>
        <p>_________________________</p>
        <p style="margin-top: 5px; font-size: 12px;">Directeur(trice)</p>
      </div>
    </div>
  `
}

/**
 * Génère le HTML final pour une attestation de scolarité en utilisant les balises {variable}
 * Cette fonction convertit les données en variables et traite le template avec le système de génération HTML avancé
 */
export async function generateAttestationHTML(data: {
  student: {
    first_name: string
    last_name: string
    student_number: string
    date_of_birth?: string
    photo_url?: string
  }
  organization: {
    name: string
    address?: string
    phone?: string
    email?: string
    logo_url?: string
  }
  class?: {
    name: string
  }
  academicYear: string
  issueDate: string
  language?: 'fr' | 'en'
  documentId?: string
  organizationId?: string
}): Promise<string> {
  const lang = data.language || 'fr'
  const texts = {
    fr: {
      title: 'ATTESTATION DE SCOLARITÉ',
      certifies: 'Je soussigné(e), Directeur(trice) de',
      certifiesThat: 'certifie que',
      isEnrolled: 'est régulièrement inscrit(e) en qualité d\'élève',
      inClass: 'dans la classe',
      academicYear: 'pour l\'année scolaire',
      date: 'Fait à',
      on: 'le',
      signature: 'Signature et cachet',
    },
    en: {
      title: 'SCHOOL ATTENDANCE CERTIFICATE',
      certifies: 'I, the undersigned, Director of',
      certifiesThat: 'certify that',
      isEnrolled: 'is duly enrolled as a student',
      inClass: 'in class',
      academicYear: 'for the academic year',
      date: 'Done at',
      on: 'on',
      signature: 'Signature and stamp',
    },
  }

  const t = texts[lang]
  
  // Générer le template avec balises
  const template = generateAttestationTemplate(data)
  
  // Préparer les variables pour le système de balises
  const variables: any = {
    organisation_logo: data.organization.logo_url || '',
    title: t.title,
    certifies: t.certifies,
    organization_name: data.organization.name,
    certifies_that: t.certifiesThat,
    student_first_name: data.student.first_name,
    student_last_name: data.student.last_name,
    student_date_of_birth: data.student.date_of_birth ? formatDateForDocument(data.student.date_of_birth) : '',
    is_enrolled: t.isEnrolled,
    class_name: data.class?.name || '',
    in_class: t.inClass,
    academic_year: data.academicYear,
    date: t.date,
    organization_address: data.organization.address || '',
    on: t.on,
    issue_date: formatDateForDocument(data.issueDate),
    signature: t.signature,
  }
  
  // Traiter le template avec le système de génération HTML
  return await processTemplateWithTags(template, variables, data.documentId, data.organizationId)
}

/**
 * Génère le template avec balises {variable} pour un certificat de formation
 */
function generateCertificateTemplate(data: {
  student: {
    first_name: string
    last_name: string
    student_number: string
  }
  organization: {
    name: string
    address?: string
    logo_url?: string
  }
  program: {
    name: string
    duration_hours?: number
  }
  session: {
    name: string
    start_date: string
    end_date: string
  }
  issueDate: string
  language?: 'fr' | 'en'
}): string {
  // Retourner un template avec balises {variable}
  return `
    <div id="certificate-document" style="max-width: 210mm; margin: 0 auto; padding: 20mm; font-family: Arial, sans-serif; color: #000; border: 5px solid #2563EB; min-height: 297mm;">
      {organization_logo && <div style="text-align: center; margin-bottom: 30px;">
        <img src="{organization_logo}" alt="Logo" style="max-height: 100px;" />
      </div>}
      
      <h1 style="text-align: center; font-size: 32px; font-weight: bold; margin-bottom: 50px; text-transform: uppercase; color: #2563EB;">
        {title}
      </h1>
      
      <div style="text-align: center; line-height: 2; font-size: 16px; margin: 60px 0;">
        <p style="font-size: 18px; margin-bottom: 30px;">
          {certifies}
        </p>
        <p style="font-size: 24px; font-weight: bold; margin: 30px 0;">
          {student_first_name_upper}<br />
          {student_last_name_upper}
        </p>
        <p style="margin-top: 40px;">
          {has_completed}
        </p>
        <p style="font-size: 20px; font-weight: bold; margin: 20px 0; color: #2563EB;">
          "{program_name}"
        </p>
        {IF program_duration_hours}<p style="margin-top: 20px;">
          {duration} <strong>{program_duration_hours}</strong> {hours}
        </p>{ENDIF}
        <p style="margin-top: 20px;">
          {during} <strong>{session_name}</strong><br />
          {session_start_date} - {session_end_date}
        </p>
      </div>
      
      <div style="margin-top: 80px; text-align: center;">
        <p style="margin-bottom: 50px;">{date} <strong>{organization_address}</strong>, {on} <strong>{issue_date}</strong></p>
        <div style="margin-top: 60px;">
          <p>{signature}</p>
          <p style="margin-top: 50px;">_________________________</p>
          <p style="margin-top: 5px; font-size: 12px;">Directeur(trice)</p>
        </div>
      </div>
    </div>
  `
}

/**
 * Génère le HTML final pour un certificat de formation en utilisant les balises {variable}
 */
export async function generateCertificateHTML(data: {
  student: {
    first_name: string
    last_name: string
    student_number: string
  }
  organization: {
    name: string
    address?: string
    logo_url?: string
  }
  program: {
    name: string
    duration_hours?: number
  }
  session: {
    name: string
    start_date: string
    end_date: string
  }
  issueDate: string
  language?: 'fr' | 'en'
  documentId?: string
  organizationId?: string
}): Promise<string> {
  const lang = data.language || 'fr'
  const texts = {
    fr: {
      title: 'CERTIFICAT DE FORMATION',
      certifies: 'certifie que',
      hasCompleted: 'a suivi avec succès la formation',
      duration: 'd\'une durée de',
      hours: 'heures',
      during: 'pendant la session',
      date: 'Fait à',
      on: 'le',
      signature: 'Signature et cachet',
    },
    en: {
      title: 'TRAINING CERTIFICATE',
      certifies: 'certifies that',
      hasCompleted: 'has successfully completed the training',
      duration: 'with a duration of',
      hours: 'hours',
      during: 'during the session',
      date: 'Done at',
      on: 'on',
      signature: 'Signature and stamp',
    },
  }

  const t = texts[lang]

  // Générer le template avec balises
  const template = generateCertificateTemplate(data)
  
  // Préparer les variables pour le système de balises
  const variables: any = {
    organisation_logo: data.organization.logo_url || '',
    title: t.title,
    certifies: t.certifies,
    student_first_name_upper: data.student.first_name.toUpperCase(),
    student_last_name_upper: data.student.last_name.toUpperCase(),
    has_completed: t.hasCompleted,
    program_name: data.program.name,
    program_duration_hours: data.program.duration_hours || 0,
    duration: t.duration,
    hours: t.hours,
    during: t.during,
    session_name: data.session.name,
    session_start_date: formatDateForDocument(data.session.start_date),
    session_end_date: formatDateForDocument(data.session.end_date),
    date: t.date,
    organization_address: data.organization.address || '',
    on: t.on,
    issue_date: formatDateForDocument(data.issueDate),
    signature: t.signature,
  }
  
  // Traiter le template avec le système de génération HTML
  return await processTemplateWithTags(template, variables, data.documentId, data.organizationId)
}

/**
 * Génère le template avec balises {variable} pour une facture
 */
function generateInvoiceTemplate(data: {
  invoice: {
    invoice_number: string
    issue_date: string
    due_date: string
    amount: number
    tax_amount: number
    total_amount: number
    currency: string
    items?: Array<{ description: string; quantity: number; unit_price: number; total: number }>
  }
  student: {
    first_name: string
    last_name: string
    student_number: string
    address?: string
  }
  organization: {
    name: string
    address?: string
    phone?: string
    email?: string
    logo_url?: string
  }
  language?: 'fr' | 'en'
}): string {
  return `
    <div id="invoice-document" style="max-width: 210mm; margin: 0 auto; padding: 20mm; font-family: Arial, sans-serif; color: #000;">
      {organization_logo && <div style="text-align: right; margin-bottom: 30px;">
        <img src="{organization_logo}" alt="Logo" style="max-height: 60px;" />
      </div>}
      
      <div style="display: flex; justify-content: space-between; margin-bottom: 40px;">
        <div>
          <h1 style="font-size: 28px; font-weight: bold; margin-bottom: 10px;">{title}</h1>
          <p><strong>{organization_name}</strong></p>
          {IF organization_address}<p>{organization_address}</p>{ENDIF}
          {IF organization_phone}<p>Tél: {organization_phone}</p>{ENDIF}
          {IF organization_email}<p>Email: {organization_email}</p>{ENDIF}
        </div>
        <div style="text-align: right;">
          <p><strong>{invoice_number_label}:</strong> {invoice_number}</p>
          <p><strong>{issue_date_label}:</strong> {issue_date}</p>
          <p><strong>{due_date_label}:</strong> {due_date}</p>
        </div>
      </div>
      
      <div style="margin-bottom: 30px;">
        <p><strong>{bill_to}:</strong></p>
        <p>{student_first_name} {student_last_name}</p>
        <p>N° étudiant: {student_number}</p>
        {IF student_address}<p>{student_address}</p>{ENDIF}
      </div>
      
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
        <thead>
          <tr style="background-color: #f3f4f6;">
            <th style="padding: 12px; text-align: left; border: 1px solid #ddd;">{description_label}</th>
            <th style="padding: 12px; text-align: center; border: 1px solid #ddd;">{quantity_label}</th>
            <th style="padding: 12px; text-align: right; border: 1px solid #ddd;">{unit_price_label}</th>
            <th style="padding: 12px; text-align: right; border: 1px solid #ddd;">{total_label}</th>
          </tr>
        </thead>
        <tbody>
          {invoice_items_html}
        </tbody>
      </table>
      
      <div style="margin-left: auto; width: 300px; margin-bottom: 30px;">
        <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #ddd;">
          <span>{subtotal_label}:</span>
          <span><strong>{subtotal_amount}</strong></span>
        </div>
        {IF tax_amount}<div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #ddd;">
          <span>{tax_label}:</span>
          <span><strong>{tax_amount_formatted}</strong></span>
        </div>{ENDIF}
        <div style="display: flex; justify-content: space-between; padding: 12px 0; background-color: #f3f4f6; font-size: 18px; font-weight: bold;">
          <span>{total_amount_label}:</span>
          <span>{total_amount_formatted}</span>
        </div>
      </div>
    </div>
  `
}

/**
 * Génère le HTML final pour une facture en utilisant les balises {variable}
 */
export async function generateInvoiceHTML(data: {
  invoice: {
    invoice_number: string
    issue_date: string
    due_date: string
    amount: number
    tax_amount: number
    total_amount: number
    currency: string
    items?: Array<{ description: string; quantity: number; unit_price: number; total: number }>
  }
  student: {
    first_name: string
    last_name: string
    student_number: string
    address?: string
  }
  organization: {
    name: string
    address?: string
    phone?: string
    email?: string
    logo_url?: string
  }
  language?: 'fr' | 'en'
  documentId?: string
  organizationId?: string
}): Promise<string> {
  const lang = data.language || 'fr'
  const texts = {
    fr: {
      title: 'FACTURE',
      invoiceNumber: 'Facture N°',
      issueDate: 'Date d\'émission',
      dueDate: 'Date d\'échéance',
      billTo: 'Facturé à',
      description: 'Description',
      quantity: 'Qté',
      unitPrice: 'Prix unitaire',
      total: 'Total',
      subtotal: 'Sous-total',
      tax: 'TVA',
      totalAmount: 'TOTAL',
      language: 'fr',
    },
    en: {
      title: 'INVOICE',
      invoiceNumber: 'Invoice N°',
      issueDate: 'Issue date',
      dueDate: 'Due date',
      billTo: 'Bill to',
      description: 'Description',
      quantity: 'Qty',
      unitPrice: 'Unit price',
      total: 'Total',
      subtotal: 'Subtotal',
      tax: 'Tax',
      totalAmount: 'TOTAL',
      language: 'en',
    },
  }

  const t = texts[lang]

  // Formater les items de la facture en HTML
  let invoiceItemsHTML = ''
  if (data.invoice.items && data.invoice.items.length > 0) {
    invoiceItemsHTML = data.invoice.items.map(
                (item) => `
                  <tr>
                    <td style="padding: 12px; border: 1px solid #ddd;">${item.description}</td>
                    <td style="padding: 12px; text-align: center; border: 1px solid #ddd;">${item.quantity}</td>
                    <td style="padding: 12px; text-align: right; border: 1px solid #ddd;">${formatCurrency(item.unit_price, data.invoice.currency)}</td>
                    <td style="padding: 12px; text-align: right; border: 1px solid #ddd;">${formatCurrency(item.total, data.invoice.currency)}</td>
                  </tr>
                `
              ).join('')
  } else {
    invoiceItemsHTML = `
                <tr>
                  <td style="padding: 12px; border: 1px solid #ddd;" colspan="4">Scolarité</td>
                  <td style="padding: 12px; text-align: right; border: 1px solid #ddd;">${formatCurrency(data.invoice.amount, data.invoice.currency)}</td>
                </tr>
    `
  }
  
  // Générer le template avec balises
  const template = generateInvoiceTemplate(data)
  
  // Préparer les variables pour le système de balises
  const variables: any = {
    organisation_logo: data.organization.logo_url || '',
    title: t.title,
    organization_name: data.organization.name,
    organization_address: data.organization.address || '',
    organization_phone: data.organization.phone || '',
    organization_email: data.organization.email || '',
    invoice_number_label: t.invoiceNumber,
    invoice_number: data.invoice.invoice_number,
    issue_date_label: t.issueDate,
    issue_date: formatDateForDocument(data.invoice.issue_date),
    due_date_label: t.dueDate,
    due_date: formatDateForDocument(data.invoice.due_date),
    bill_to: t.billTo,
    student_first_name: data.student.first_name,
    student_last_name: data.student.last_name,
    student_number: data.student.student_number,
    student_address: data.student.address || '',
    description_label: t.description,
    quantity_label: t.quantity,
    unit_price_label: t.unitPrice,
    total_label: t.total,
    invoice_items_html: invoiceItemsHTML,
    subtotal_label: t.subtotal,
    subtotal_amount: formatCurrency(data.invoice.amount, data.invoice.currency),
    tax_amount: data.invoice.tax_amount > 0 ? data.invoice.tax_amount : 0,
    tax_label: t.tax,
    tax_amount_formatted: formatCurrency(data.invoice.tax_amount, data.invoice.currency),
    total_amount_label: t.totalAmount,
    total_amount_formatted: formatCurrency(data.invoice.total_amount, data.invoice.currency),
  }
  
  // Traiter le template avec le système de génération HTML
  return await processTemplateWithTags(template, variables, data.documentId, data.organizationId)
}

/**
 * Génère le template avec balises {variable} pour un reçu de paiement
 */
function generateReceiptTemplate(data: {
  payment: {
    amount: number
    currency: string
    payment_method: string
    transaction_id?: string
    paid_at: string
  }
  invoice: {
    invoice_number: string
  }
  student: {
    first_name: string
    last_name: string
    student_number: string
  }
  organization: {
    name: string
    address?: string
    phone?: string
    email?: string
    logo_url?: string
  }
  language?: 'fr' | 'en'
}): string {
  return `
    <div id="receipt-document" style="max-width: 210mm; margin: 0 auto; padding: 20mm; font-family: Arial, sans-serif; color: #000;">
      {organization_logo && <div style="text-align: center; margin-bottom: 20px;">
        <img src="{organization_logo}" alt="Logo" style="max-height: 60px;" />
      </div>}
      
      <h1 style="text-align: center; font-size: 24px; font-weight: bold; margin-bottom: 30px; text-transform: uppercase;">
        {title}
      </h1>
      
      <div style="margin-bottom: 30px;">
        <p><strong>{receipt_number_label}:</strong> {receipt_number}</p>
        <p><strong>{date_label}:</strong> {payment_date}</p>
        </div>
      
      <div style="margin-bottom: 30px; padding: 20px; background-color: #f9fafb; border-radius: 8px;">
        <p><strong>{paid_by_label}:</strong></p>
        <p style="font-size: 18px; font-weight: bold; margin-top: 10px;">
          {student_first_name} {student_last_name}
        </p>
        <p>N° étudiant: {student_number}</p>
        </div>
      
      <div style="margin-bottom: 30px;">
        <p><strong>{invoice_label}:</strong> {invoice_number}</p>
        <p style="font-size: 24px; font-weight: bold; margin-top: 20px; color: #335ACF;">
          {amount_label}: {payment_amount}
        </p>
        <p style="margin-top: 15px;"><strong>{method_label}:</strong> {payment_method_label}</p>
        {IF transaction_id}<p><strong>{transaction_id_label}:</strong> {transaction_id}</p>{ENDIF}
      </div>
      
      <div style="text-align: center; margin-top: 50px; padding: 20px; background-color: #ecfdf5; border-radius: 8px;">
        <p style="font-size: 18px; font-weight: bold; color: #335ACF;">{thank_you}</p>
      </div>
      
      <div style="margin-top: 50px; text-align: center;">
        <p>{organization_name}</p>
        {IF organization_address}<p>{organization_address}</p>{ENDIF}
      </div>
    </div>
  `
}

/**
 * Génère le HTML final pour un reçu de paiement en utilisant les balises {variable}
 */
export async function generateReceiptHTML(data: {
  payment: {
    amount: number
    currency: string
    payment_method: string
    transaction_id?: string
    paid_at: string
  }
  invoice: {
    invoice_number: string
  }
  student: {
    first_name: string
    last_name: string
    student_number: string
  }
  organization: {
    name: string
    address?: string
    phone?: string
    email?: string
    logo_url?: string
  }
  language?: 'fr' | 'en'
  documentId?: string
  organizationId?: string
}): Promise<string> {
  const lang = data.language || 'fr'
  const texts = {
    fr: {
      title: 'REÇU DE PAIEMENT',
      receiptNumber: 'Reçu N°',
      date: 'Date',
      paidBy: 'Reçu de',
      invoice: 'Facture N°',
      amount: 'Montant',
      method: 'Méthode de paiement',
      transactionId: 'ID Transaction',
      thankYou: 'Merci pour votre paiement',
    },
    en: {
      title: 'PAYMENT RECEIPT',
      receiptNumber: 'Receipt N°',
      date: 'Date',
      paidBy: 'Received from',
      invoice: 'Invoice N°',
      amount: 'Amount',
      method: 'Payment method',
      transactionId: 'Transaction ID',
      thankYou: 'Thank you for your payment',
    },
  }

  const t = texts[lang]

  const getPaymentMethodLabel = (method: string) => {
    const methods: Record<string, { fr: string; en: string }> = {
      cash: { fr: 'Espèces', en: 'Cash' },
      mobile_money: { fr: 'Mobile Money', en: 'Mobile Money' },
      card: { fr: 'Carte bancaire', en: 'Credit Card' },
      bank_transfer: { fr: 'Virement bancaire', en: 'Bank Transfer' },
    }
    return methods[method]?.[lang] || method
  }

  // Générer le template avec balises
  const template = generateReceiptTemplate(data)
  
  // Préparer les variables pour le système de balises
  const variables: any = {
    organisation_logo: data.organization.logo_url || '',
    title: t.title,
    receipt_number_label: t.receiptNumber,
    receipt_number: `REC-${data.payment.paid_at.replace(/-/g, '').slice(0, 8)}`,
    date_label: t.date,
    payment_date: formatDateForDocument(data.payment.paid_at),
    paid_by_label: t.paidBy,
    student_first_name: data.student.first_name,
    student_last_name: data.student.last_name,
    student_number: data.student.student_number,
    invoice_label: t.invoice,
    invoice_number: data.invoice.invoice_number,
    amount_label: t.amount,
    payment_amount: formatCurrency(data.payment.amount, data.payment.currency),
    method_label: t.method,
    payment_method_label: getPaymentMethodLabel(data.payment.payment_method),
    transaction_id: data.payment.transaction_id || '',
    transaction_id_label: t.transactionId,
    thank_you: t.thankYou,
    organization_name: data.organization.name,
    organization_address: data.organization.address || '',
  }
  
  // Traiter le template avec le système de génération HTML
  return await processTemplateWithTags(template, variables, data.documentId, data.organizationId)
}

/**
 * Génère le template avec balises {variable} pour une convention de formation professionnelle
 */
function generateConventionTemplate(data: {
  session: {
    name: string
    start_date: string
    end_date: string
    location?: string
    start_time?: string
    end_time?: string
  }
  formation: {
    name: string
    code?: string
    price?: number
    duration_hours?: number
    objectives?: string
    prerequisites?: string
    targetAudience?: string
  }
  program?: {
    name: string
  }
  organization: {
    name: string
    address?: string
    phone?: string
    email?: string
    logo_url?: string
    siret?: string
    rcs?: string
    vat_number?: string
  }
  client?: {
    name?: string
    address?: string
    contact?: string
    email?: string
    phone?: string
  }
  issueDate: string
  language?: 'fr' | 'en'
}) {
  const lang = data.language || 'fr'
  const texts = {
    fr: {
      title: 'CONVENTION DE FORMATION PROFESSIONNELLE',
      between: 'ENTRE',
      theOrganization: 'L\'organisme de formation',
      representedBy: 'représenté(e) par',
      director: 'Directeur(trice)',
      and: 'ET',
      theClient: 'Le client',
      company: 'Entreprise',
      object: 'ARTICLE 1 - OBJET',
      conventionObject: 'La présente convention a pour objet de définir les conditions dans lesquelles',
      willProvide: 's\'engage à dispenser la formation professionnelle suivante',
      program: 'Programme',
      formation: 'Intitulé de la formation',
      session: 'Session',
      dates: 'Dates de formation',
      location: 'Lieu de formation',
      duration: 'Durée',
      hours: 'heures',
      schedule: 'Horaires',
      objectives: 'Objectifs pédagogiques',
      prerequisites: 'Prérequis',
      targetAudience: 'Public visé',
      terms: 'ARTICLE 2 - MODALITÉS DE DÉROULEMENT',
      termsContent: 'La formation se déroulera selon les modalités définies dans le programme de formation. Les méthodes pédagogiques, les supports de cours et les modalités d\'évaluation sont détaillés dans le programme remis au client.',
      financial: 'ARTICLE 3 - CONDITIONS FINANCIÈRES',
      price: 'Montant total de la formation',
      paymentTerms: 'Modalités de paiement',
      paymentTermsContent: 'Le paiement s\'effectuera selon les modalités convenues entre les parties. Un acompte peut être demandé à la signature de la présente convention.',
      cancellation: 'ARTICLE 4 - ANNULATION',
      cancellationContent: 'En cas d\'annulation par le client moins de 15 jours avant le début de la formation, des frais d\'annulation pourront être appliqués. L\'organisme de formation se réserve le droit d\'annuler la formation en cas de nombre insuffisant de participants, avec remboursement intégral des sommes versées.',
      signature: 'Signature et cachet',
      doneAt: 'Fait à',
      on: 'le',
      inDuplicate: 'En double exemplaire',
      for: 'Pour',
      andAccept: 'et accepté',
    },
    en: {
      title: 'PROFESSIONAL TRAINING AGREEMENT',
      between: 'BETWEEN',
      theOrganization: 'The training organization',
      representedBy: 'represented by',
      director: 'Director',
      and: 'AND',
      theClient: 'The client',
      company: 'Company',
      object: 'ARTICLE 1 - OBJECT',
      conventionObject: 'This agreement defines the conditions under which',
      willProvide: 'commits to provide the following professional training',
      program: 'Program',
      formation: 'Training title',
      session: 'Session',
      dates: 'Training dates',
      location: 'Training location',
      duration: 'Duration',
      hours: 'hours',
      schedule: 'Schedule',
      objectives: 'Learning objectives',
      prerequisites: 'Prerequisites',
      targetAudience: 'Target audience',
      terms: 'ARTICLE 2 - TRAINING MODALITIES',
      termsContent: 'The training will be conducted according to the modalities defined in the training program. Teaching methods, course materials and assessment methods are detailed in the program provided to the client.',
      financial: 'ARTICLE 3 - FINANCIAL CONDITIONS',
      price: 'Total training amount',
      paymentTerms: 'Payment terms',
      paymentTermsContent: 'Payment will be made according to the terms agreed between the parties. A deposit may be required upon signing this agreement.',
      cancellation: 'ARTICLE 4 - CANCELLATION',
      cancellationContent: 'In case of cancellation by the client less than 15 days before the start of training, cancellation fees may apply. The training organization reserves the right to cancel the training in case of insufficient number of participants, with full refund of amounts paid.',
      signature: 'Signature and stamp',
      doneAt: 'Done at',
      on: 'on',
      inDuplicate: 'In duplicate',
      for: 'For',
      andAccept: 'and accepted',
    },
  }

  return `
    <div id="convention-document" style="max-width: 210mm; margin: 0 auto; padding: 20mm; font-family: 'Times New Roman', serif; color: #000; line-height: 1.6;">
      {organization_logo && <div style="text-align: center; margin-bottom: 30px;">
        <img src="{organization_logo}" alt="Logo" style="max-height: 80px;" />
      </div>}
      
      <h1 style="text-align: center; font-size: 20px; font-weight: bold; margin-bottom: 40px; text-transform: uppercase; letter-spacing: 1px;">
        {title}
      </h1>
      
      <div style="margin-bottom: 30px; border: 1px solid #000; padding: 15px;">
        <p style="font-weight: bold; margin-bottom: 15px; font-size: 14px;">{between}</p>
        
        <div style="margin-bottom: 20px;">
          <p style="margin-bottom: 5px;"><strong>{the_organization}</strong> : {organization_name}</p>
          {IF organization_address}<p style="margin-left: 20px; margin-bottom: 3px;">{organization_address}</p>{ENDIF}
          {IF organization_phone}<p style="margin-left: 20px; margin-bottom: 3px;">Tél: {organization_phone}</p>{ENDIF}
          {IF organization_email}<p style="margin-left: 20px; margin-bottom: 3px;">Email: {organization_email}</p>{ENDIF}
          {IF organization_siret}<p style="margin-left: 20px; margin-bottom: 3px;">SIRET: {organization_siret}</p>{ENDIF}
          {IF organization_rcs}<p style="margin-left: 20px; margin-bottom: 3px;">RCS: {organization_rcs}</p>{ENDIF}
          {IF organization_vat_number}<p style="margin-left: 20px;">N° TVA: {organization_vat_number}</p>{ENDIF}
        </div>
        
        <p style="margin-top: 20px; margin-bottom: 15px;"><strong>{and}</strong></p>
        
        <div>
          {IF client_name}<p style="margin-bottom: 5px;"><strong>{client_label}</strong> : {client_name}</p>
          {IF client_address}<p style="margin-left: 20px; margin-bottom: 3px;">{client_address}</p>{ENDIF}
          {IF client_phone}<p style="margin-left: 20px; margin-bottom: 3px;">Tél: {client_phone}</p>{ENDIF}
          {IF client_email}<p style="margin-left: 20px;">Email: {client_email}</p>{ENDIF}
          {ELSE}<p style="margin-bottom: 5px;"><strong>{the_client}</strong> : [Nom du client/entreprise]</p>
            <p style="margin-left: 20px; margin-bottom: 3px;">[Adresse]</p>
          <p style="margin-left: 20px;">[Téléphone/Email]</p>{ENDIF}
        </div>
      </div>
      
      <div style="margin-top: 40px; margin-bottom: 30px;">
        <h2 style="font-size: 16px; font-weight: bold; margin-bottom: 15px; text-transform: uppercase; border-bottom: 2px solid #000; padding-bottom: 5px;">
          {object}
        </h2>
        <p style="line-height: 1.8; text-align: justify; margin-bottom: 15px;">
          {convention_object} <strong>{organization_name}</strong> {will_provide} :
        </p>
        <div style="margin-left: 30px; margin-top: 15px; line-height: 2;">
          {IF program_name}<p><strong>{program}:</strong> {program_name}</p>{ENDIF}
          <p><strong>{formation}:</strong> {formation_name}{IF formation_code} (Code: {formation_code}){ENDIF}</p>
          <p><strong>{session}:</strong> {session_name}</p>
          <p><strong>{dates}:</strong> Du {session_start_date} au {session_end_date}</p>
          {IF session_start_time && session_end_time}<p><strong>{schedule}:</strong> {session_start_time} - {session_end_time}</p>{ENDIF}
          {IF session_location}<p><strong>{location}:</strong> {session_location}</p>{ENDIF}
          {IF formation_duration_hours}<p><strong>{duration}:</strong> {formation_duration_hours} {hours}</p>{ENDIF}
          {IF formation_objectives}<p style="margin-top: 10px;"><strong>{objectives}:</strong> {formation_objectives}</p>{ENDIF}
          {IF formation_prerequisites}<p><strong>{prerequisites}:</strong> {formation_prerequisites}</p>{ENDIF}
          {IF formation_target_audience}<p><strong>{target_audience}:</strong> {formation_target_audience}</p>{ENDIF}
        </div>
      </div>
      
      <div style="margin-top: 40px; margin-bottom: 30px;">
        <h2 style="font-size: 16px; font-weight: bold; margin-bottom: 15px; text-transform: uppercase; border-bottom: 2px solid #000; padding-bottom: 5px;">
          {terms}
        </h2>
        <p style="line-height: 1.8; text-align: justify;">
          {terms_content}
        </p>
      </div>
      
      <div style="margin-top: 40px; margin-bottom: 30px;">
        <h2 style="font-size: 16px; font-weight: bold; margin-bottom: 15px; text-transform: uppercase; border-bottom: 2px solid #000; padding-bottom: 5px;">
          {financial}
        </h2>
        <div style="margin-left: 20px; line-height: 2;">
          {IF formation_price}<p><strong>{price}:</strong> {formation_price_formatted} TTC</p>{ENDIF}
          <p style="margin-top: 10px;"><strong>{payment_terms}:</strong></p>
          <p style="margin-left: 20px; text-align: justify;">{payment_terms_content}</p>
        </div>
      </div>
      
      <div style="margin-top: 40px; margin-bottom: 30px;">
        <h2 style="font-size: 16px; font-weight: bold; margin-bottom: 15px; text-transform: uppercase; border-bottom: 2px solid #000; padding-bottom: 5px;">
          {cancellation}
        </h2>
        <p style="line-height: 1.8; text-align: justify;">
          {cancellation_content}
        </p>
      </div>
      
      <div style="margin-top: 60px; display: flex; justify-content: space-between; page-break-inside: avoid;">
        <div style="width: 45%;">
          <p style="margin-bottom: 50px; font-weight: bold;">{signature}</p>
          <p style="border-top: 1px solid #000; padding-top: 5px; margin-top: 60px;">_________________________</p>
          <p style="margin-top: 5px; font-size: 11px;">{organization_name}</p>
          <p style="margin-top: 5px; font-size: 11px;">{director}</p>
        </div>
        <div style="width: 45%;">
          <p style="margin-bottom: 50px; font-weight: bold;">{signature}</p>
          <p style="border-top: 1px solid #000; padding-top: 5px; margin-top: 60px;">_________________________</p>
          <p style="margin-top: 5px; font-size: 11px;">{client_name_or_label}</p>
        </div>
      </div>
      
      <div style="margin-top: 50px; text-align: center; font-size: 12px;">
        <p><strong>{done_at}</strong> {organization_address}, <strong>{on}</strong> <strong>{issue_date}</strong></p>
        <p style="margin-top: 10px; font-style: italic;">{in_duplicate}</p>
      </div>
    </div>
  `
}

/**
 * Génère le HTML final pour une convention de formation professionnelle en utilisant les balises {variable}
 */
export async function generateConventionHTML(data: {
  session: {
    name: string
    start_date: string
    end_date: string
    location?: string
    start_time?: string
    end_time?: string
  }
  formation: {
    name: string
    code?: string
    price?: number
    duration_hours?: number
    objectives?: string
    prerequisites?: string
    targetAudience?: string
  }
  program?: {
    name: string
  }
  organization: {
    name: string
    address?: string
    phone?: string
    email?: string
    logo_url?: string
    siret?: string
    rcs?: string
    vat_number?: string
  }
  client?: {
    name?: string
    address?: string
    contact?: string
    email?: string
    phone?: string
  }
  issueDate: string
  language?: 'fr' | 'en'
  documentId?: string
  organizationId?: string
}): Promise<string> {
  const lang = data.language || 'fr'
  const texts = {
    fr: {
      title: 'CONVENTION DE FORMATION PROFESSIONNELLE',
      between: 'ENTRE',
      theOrganization: 'L\'organisme de formation',
      representedBy: 'représenté(e) par',
      director: 'Directeur(trice)',
      and: 'ET',
      theClient: 'Le client',
      company: 'Entreprise',
      object: 'ARTICLE 1 - OBJET',
      conventionObject: 'La présente convention a pour objet de définir les conditions dans lesquelles',
      willProvide: 's\'engage à dispenser la formation professionnelle suivante',
      program: 'Programme',
      formation: 'Intitulé de la formation',
      session: 'Session',
      dates: 'Dates de formation',
      location: 'Lieu de formation',
      duration: 'Durée',
      hours: 'heures',
      schedule: 'Horaires',
      objectives: 'Objectifs pédagogiques',
      prerequisites: 'Prérequis',
      targetAudience: 'Public visé',
      terms: 'ARTICLE 2 - MODALITÉS DE DÉROULEMENT',
      termsContent: 'La formation se déroulera selon les modalités définies dans le programme de formation. Les méthodes pédagogiques, les supports de cours et les modalités d\'évaluation sont détaillés dans le programme remis au client.',
      financial: 'ARTICLE 3 - CONDITIONS FINANCIÈRES',
      price: 'Montant total de la formation',
      paymentTerms: 'Modalités de paiement',
      paymentTermsContent: 'Le paiement s\'effectuera selon les modalités convenues entre les parties. Un acompte peut être demandé à la signature de la présente convention.',
      cancellation: 'ARTICLE 4 - ANNULATION',
      cancellationContent: 'En cas d\'annulation par le client moins de 15 jours avant le début de la formation, des frais d\'annulation pourront être appliqués. L\'organisme de formation se réserve le droit d\'annuler la formation en cas de nombre insuffisant de participants, avec remboursement intégral des sommes versées.',
      signature: 'Signature et cachet',
      doneAt: 'Fait à',
      on: 'le',
      inDuplicate: 'En double exemplaire',
      for: 'Pour',
      andAccept: 'et accepté',
    },
    en: {
      title: 'PROFESSIONAL TRAINING AGREEMENT',
      between: 'BETWEEN',
      theOrganization: 'The training organization',
      representedBy: 'represented by',
      director: 'Director',
      and: 'AND',
      theClient: 'The client',
      company: 'Company',
      object: 'ARTICLE 1 - OBJECT',
      conventionObject: 'This agreement defines the conditions under which',
      willProvide: 'commits to provide the following professional training',
      program: 'Program',
      formation: 'Training title',
      session: 'Session',
      dates: 'Training dates',
      location: 'Training location',
      duration: 'Duration',
      hours: 'hours',
      schedule: 'Schedule',
      objectives: 'Learning objectives',
      prerequisites: 'Prerequisites',
      targetAudience: 'Target audience',
      terms: 'ARTICLE 2 - TRAINING MODALITIES',
      termsContent: 'The training will be conducted according to the modalities defined in the training program. Teaching methods, course materials and assessment methods are detailed in the program provided to the client.',
      financial: 'ARTICLE 3 - FINANCIAL CONDITIONS',
      price: 'Total training amount',
      paymentTerms: 'Payment terms',
      paymentTermsContent: 'Payment will be made according to the terms agreed between the parties. A deposit may be required upon signing this agreement.',
      cancellation: 'ARTICLE 4 - CANCELLATION',
      cancellationContent: 'In case of cancellation by the client less than 15 days before the start of training, cancellation fees may apply. The training organization reserves the right to cancel the training in case of insufficient number of participants, with full refund of amounts paid.',
      signature: 'Signature and stamp',
      doneAt: 'Done at',
      on: 'on',
      inDuplicate: 'In duplicate',
      for: 'For',
      andAccept: 'and accepted',
    },
  }

  const t = texts[lang]
  
  // Générer le template avec balises
  const template = generateConventionTemplate(data)
  
  // Préparer les variables pour le système de balises
  const variables: any = {
    organisation_logo: data.organization.logo_url || '',
    title: t.title,
    between: t.between,
    the_organization: t.theOrganization,
    organization_name: data.organization.name,
    organization_address: data.organization.address || '',
    organization_phone: data.organization.phone || '',
    organization_email: data.organization.email || '',
    organization_siret: data.organization.siret || '',
    organization_rcs: data.organization.rcs || '',
    organization_vat_number: data.organization.vat_number || '',
    and: t.and,
    client_name: data.client?.name || '',
    client_label: data.client?.name ? (data.client?.name ? t.company : t.theClient) : '',
    client_address: data.client?.address || '',
    client_phone: data.client?.phone || '',
    client_email: data.client?.email || '',
    the_client: t.theClient,
    object: t.object,
    convention_object: t.conventionObject,
    will_provide: t.willProvide,
    program: t.program,
    program_name: data.program?.name || '',
    formation: t.formation,
    formation_name: data.formation.name,
    formation_code: data.formation.code || '',
    session: t.session,
    session_name: data.session.name,
    dates: t.dates,
    session_start_date: formatDateForDocument(data.session.start_date),
    session_end_date: formatDateForDocument(data.session.end_date),
    session_start_time: data.session.start_time || '',
    session_end_time: data.session.end_time || '',
    schedule: t.schedule,
    location: t.location,
    session_location: data.session.location || '',
    duration: t.duration,
    formation_duration_hours: data.formation.duration_hours || 0,
    hours: t.hours,
    objectives: t.objectives,
    formation_objectives: data.formation.objectives || '',
    prerequisites: t.prerequisites,
    formation_prerequisites: data.formation.prerequisites || '',
    target_audience: t.targetAudience,
    formation_target_audience: data.formation.targetAudience || '',
    terms: t.terms,
    terms_content: t.termsContent,
    financial: t.financial,
    price: t.price,
    formation_price: data.formation.price || 0,
    formation_price_formatted: data.formation.price ? formatCurrency(data.formation.price, 'EUR') : '',
    payment_terms: t.paymentTerms,
    payment_terms_content: t.paymentTermsContent,
    cancellation: t.cancellation,
    cancellation_content: t.cancellationContent,
    signature: t.signature,
    director: t.director,
    client_name_or_label: data.client?.name || t.theClient,
    done_at: t.doneAt,
    on: t.on,
    issue_date: formatDateForDocument(data.issueDate),
    in_duplicate: t.inDuplicate,
  }
  
  // Traiter le template avec le système de génération HTML
  return await processTemplateWithTags(template, variables, data.documentId, data.organizationId)
}

/**
 * Génère le template avec balises {variable} pour un rapport de session complet
 */
function generateSessionReportTemplate(data: {
  session: {
    name: string
    start_date: string
    end_date: string
    start_time?: string
    end_time?: string
    location?: string
    status: string
  }
  formation: {
    name: string
    code?: string
    duration_hours?: number
    price?: number
  }
  program?: {
    name: string
  }
  organization: {
    name: string
    address?: string
    phone?: string
    email?: string
    logo_url?: string
  }
  statistics: {
    totalEnrollments: number
    activeEnrollments: number
    completedEnrollments: number
    attendanceRate: number
    averageGrade?: number
    averagePercentage?: number
    totalRevenue: number
    paidAmount: number
    remainingAmount: number
  }
  students: Array<{
    first_name: string
    last_name: string
    student_number?: string
    email?: string
    attendanceRate: number
    averageGrade?: number
    paymentStatus: string
    enrollmentDate: string
  }>
  issueDate: string
  language?: 'fr' | 'en'
}) {
  const lang = data.language || 'fr'
  const t = {
    fr: {
      title: 'RAPPORT DE SESSION',
      subtitle: 'Rapport complet de la session de formation',
      sessionInfo: 'Informations de la session',
      program: 'Programme',
      formation: 'Formation',
      session: 'Session',
      dates: 'Dates',
      times: 'Horaires',
      location: 'Lieu',
      status: 'Statut',
      duration: 'Durée',
      hours: 'heures',
      statistics: 'Statistiques',
      enrollments: 'Inscriptions',
      active: 'Actives',
      completed: 'Terminées',
      attendanceRate: 'Taux de présence',
      averageGrade: 'Note moyenne',
      averagePercentage: 'Pourcentage moyen',
      financial: 'Financier',
      totalRevenue: 'Revenu total',
      paidAmount: 'Montant payé',
      remainingAmount: 'Reste à payer',
      students: 'Apprenants',
      studentName: 'Nom',
      studentNumber: 'Numéro',
      email: 'Email',
      attendance: 'Présence',
      grade: 'Note',
      paymentStatus: 'Statut paiement',
      enrollmentDate: 'Date d\'inscription',
      doneAt: 'Fait à',
      on: 'le',
      currency: 'FCFA',
    },
    en: {
      title: 'SESSION REPORT',
      subtitle: 'Complete training session report',
      sessionInfo: 'Session information',
      program: 'Program',
      formation: 'Training',
      session: 'Session',
      dates: 'Dates',
      times: 'Schedule',
      location: 'Location',
      status: 'Status',
      duration: 'Duration',
      hours: 'hours',
      statistics: 'Statistics',
      enrollments: 'Enrollments',
      active: 'Active',
      completed: 'Completed',
      attendanceRate: 'Attendance rate',
      averageGrade: 'Average grade',
      averagePercentage: 'Average percentage',
      financial: 'Financial',
      totalRevenue: 'Total revenue',
      paidAmount: 'Paid amount',
      remainingAmount: 'Remaining amount',
      students: 'Students',
      studentName: 'Name',
      studentNumber: 'Number',
      email: 'Email',
      attendance: 'Attendance',
      grade: 'Grade',
      paymentStatus: 'Payment status',
      enrollmentDate: 'Enrollment date',
      doneAt: 'Done at',
      on: 'on',
      currency: 'FCFA',
    },
  }[lang]

  const statusLabels = {
    fr: {
      planned: 'Planifiée',
      ongoing: 'En cours',
      completed: 'Terminée',
      cancelled: 'Annulée',
    },
    en: {
      planned: 'Planned',
      ongoing: 'Ongoing',
      completed: 'Completed',
      cancelled: 'Cancelled',
    },
  }[lang]

  const paymentStatusLabels = {
    fr: {
      pending: 'En attente',
      partial: 'Partiel',
      paid: 'Payé',
      overdue: 'En retard',
    },
    en: {
      pending: 'Pending',
      partial: 'Partial',
      paid: 'Paid',
      overdue: 'Overdue',
    },
  }[lang]

  return `
    <div id="session-report-document" style="max-width: 210mm; margin: 0 auto; padding: 15mm; font-family: Arial, sans-serif; color: #000; line-height: 1.6;">
      {organization_logo && <div style="text-align: center; margin-bottom: 30px;">
        <img src="{organization_logo}" alt="Logo" style="max-height: 80px;" />
      </div>}
      
      <h1 style="text-align: center; font-size: 28px; font-weight: bold; margin-bottom: 10px; text-transform: uppercase; color: #1e40af;">
        {title}
      </h1>
      <p style="text-align: center; font-size: 14px; color: #6b7280; margin-bottom: 40px;">
        {subtitle}
      </p>
      
      <!-- Informations de la session -->
      <div style="margin-bottom: 30px; padding: 20px; background-color: #f9fafb; border-radius: 8px; border-left: 4px solid #1e40af;">
        <h2 style="font-size: 18px; font-weight: bold; margin-bottom: 15px; color: #1e40af;">
          {session_info}
        </h2>
        <table style="width: 100%; border-collapse: collapse;">
          {IF program_name}<tr>
            <td style="padding: 8px 0; font-weight: bold; width: 30%;">{program}:</td>
            <td style="padding: 8px 0;">{program_name}</td>
          </tr>{ENDIF}
          <tr>
            <td style="padding: 8px 0; font-weight: bold; width: 30%;">{formation}:</td>
            <td style="padding: 8px 0;">{formation_name}{IF formation_code} ({formation_code}){ENDIF}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold;">{session}:</td>
            <td style="padding: 8px 0;">{session_name}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold;">{dates}:</td>
            <td style="padding: 8px 0;">{session_start_date} - {session_end_date}</td>
          </tr>
          {IF session_start_time && session_end_time}<tr>
            <td style="padding: 8px 0; font-weight: bold;">{times}:</td>
            <td style="padding: 8px 0;">{session_start_time} - {session_end_time}</td>
          </tr>{ENDIF}
          {IF session_location}<tr>
            <td style="padding: 8px 0; font-weight: bold;">{location}:</td>
            <td style="padding: 8px 0;">{session_location}</td>
          </tr>{ENDIF}
          <tr>
            <td style="padding: 8px 0; font-weight: bold;">{status}:</td>
            <td style="padding: 8px 0;">{session_status_label}</td>
          </tr>
          {IF formation_duration_hours}<tr>
            <td style="padding: 8px 0; font-weight: bold;">{duration}:</td>
            <td style="padding: 8px 0;">{formation_duration_hours} {hours}</td>
          </tr>{ENDIF}
        </table>
      </div>

      <!-- Statistiques -->
      <div style="margin-bottom: 30px;">
        <h2 style="font-size: 18px; font-weight: bold; margin-bottom: 15px; color: #1e40af;">
          {statistics}
        </h2>
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 20px;">
          <div style="padding: 15px; background-color: #eff6ff; border-radius: 8px; text-align: center;">
            <div style="font-size: 24px; font-weight: bold; color: #1e40af;">{total_enrollments}</div>
            <div style="font-size: 12px; color: #6b7280; margin-top: 5px;">{enrollments}</div>
            <div style="font-size: 11px; color: #6b7280; margin-top: 3px;">{active_enrollments} {active}</div>
          </div>
          <div style="padding: 15px; background-color: #f0fdf4; border-radius: 8px; text-align: center;">
            <div style="font-size: 24px; font-weight: bold; color: #335ACF;">{completed_enrollments}</div>
            <div style="font-size: 12px; color: #6b7280; margin-top: 5px;">{completed}</div>
            <div style="font-size: 11px; color: #6b7280; margin-top: 3px;">{attendance_rate}% {attendance_rate_label}</div>
          </div>
          <div style="padding: 15px; background-color: #fef3c7; border-radius: 8px; text-align: center;">
            <div style="font-size: 24px; font-weight: bold; color: #d97706;">
              {average_display}
            </div>
            <div style="font-size: 12px; color: #6b7280; margin-top: 5px;">
              {average_label}
            </div>
          </div>
        </div>
      </div>

      <!-- Statistiques financières -->
      <div style="margin-bottom: 30px; padding: 20px; background-color: #f0fdf4; border-radius: 8px;">
        <h2 style="font-size: 18px; font-weight: bold; margin-bottom: 15px; color: #1e40af;">
          {financial}
        </h2>
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px;">
          <div style="text-align: center;">
            <div style="font-size: 20px; font-weight: bold; color: #335ACF;">{total_revenue}</div>
            <div style="font-size: 12px; color: #6b7280; margin-top: 5px;">{total_revenue_label}</div>
          </div>
          <div style="text-align: center;">
            <div style="font-size: 20px; font-weight: bold; color: #1e40af;">{paid_amount}</div>
            <div style="font-size: 12px; color: #6b7280; margin-top: 5px;">{paid_amount_label}</div>
          </div>
          <div style="text-align: center;">
            <div style="font-size: 20px; font-weight: bold; color: #d97706;">{remaining_amount}</div>
            <div style="font-size: 12px; color: #6b7280; margin-top: 5px;">{remaining_amount_label}</div>
          </div>
        </div>
      </div>

      <!-- Liste des apprenants -->
      <div style="margin-bottom: 30px;">
        <h2 style="font-size: 18px; font-weight: bold; margin-bottom: 15px; color: #1e40af;">
          {students} ({students_count})
        </h2>
        <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
          <thead>
            <tr style="background-color: #1e40af; color: white;">
              <th style="padding: 10px; text-align: left; border: 1px solid #1e3a8a;">{student_name}</th>
              <th style="padding: 10px; text-align: left; border: 1px solid #1e3a8a;">{student_number}</th>
              <th style="padding: 10px; text-align: center; border: 1px solid #1e3a8a;">{attendance}</th>
              <th style="padding: 10px; text-align: center; border: 1px solid #1e3a8a;">{grade}</th>
              <th style="padding: 10px; text-align: center; border: 1px solid #1e3a8a;">{payment_status}</th>
              <th style="padding: 10px; text-align: center; border: 1px solid #1e3a8a;">{enrollment_date}</th>
            </tr>
          </thead>
          <tbody>
            {students_table_rows}
          </tbody>
        </table>
      </div>

      <!-- Informations de l'organisation -->
      <div style="margin-top: 40px; padding-top: 20px; border-top: 2px solid #e5e7eb;">
        <p style="font-size: 12px; color: #6b7280; margin-bottom: 10px;">
          <strong>{organization_name}</strong>
        </p>
        {IF organization_address}<p style="font-size: 12px; color: #6b7280;">{organization_address}</p>{ENDIF}
        {IF organization_phone}<p style="font-size: 12px; color: #6b7280;">Tél: {organization_phone}</p>{ENDIF}
        {IF organization_email}<p style="font-size: 12px; color: #6b7280;">Email: {organization_email}</p>{ENDIF}
        <p style="font-size: 12px; color: #6b7280; margin-top: 20px;">
          {done_at} <strong>{organization_address}</strong>, {on} <strong>{issue_date}</strong>
        </p>
      </div>
    </div>
  `
}

/**
 * Génère le HTML final pour un rapport de session complet en utilisant les balises {variable}
 */
export async function generateSessionReportHTML(data: {
  session: {
    name: string
    start_date: string
    end_date: string
    start_time?: string
    end_time?: string
    location?: string
    status: string
  }
  formation: {
    name: string
    code?: string
    duration_hours?: number
    price?: number
  }
  program?: {
    name: string
  }
  organization: {
    name: string
    address?: string
    phone?: string
    email?: string
    logo_url?: string
  }
  statistics: {
    totalEnrollments: number
    activeEnrollments: number
    completedEnrollments: number
    attendanceRate: number
    averageGrade?: number
    averagePercentage?: number
    totalRevenue: number
    paidAmount: number
    remainingAmount: number
  }
  students: Array<{
    first_name: string
    last_name: string
    student_number?: string
    email?: string
    attendanceRate: number
    averageGrade?: number
    paymentStatus: string
    enrollmentDate: string
  }>
  issueDate: string
  language?: 'fr' | 'en'
  documentId?: string
  organizationId?: string
}): Promise<string> {
  const lang = data.language || 'fr'
  const t = {
    fr: {
      title: 'RAPPORT DE SESSION',
      subtitle: 'Rapport complet de la session de formation',
      sessionInfo: 'Informations de la session',
      program: 'Programme',
      formation: 'Formation',
      session: 'Session',
      dates: 'Dates',
      times: 'Horaires',
      location: 'Lieu',
      status: 'Statut',
      duration: 'Durée',
      hours: 'heures',
      statistics: 'Statistiques',
      enrollments: 'Inscriptions',
      active: 'Actives',
      completed: 'Terminées',
      attendanceRate: 'Taux de présence',
      averageGrade: 'Note moyenne',
      averagePercentage: 'Pourcentage moyen',
      financial: 'Financier',
      totalRevenue: 'Revenu total',
      paidAmount: 'Montant payé',
      remainingAmount: 'Reste à payer',
      students: 'Apprenants',
      studentName: 'Nom',
      studentNumber: 'Numéro',
      email: 'Email',
      attendance: 'Présence',
      grade: 'Note',
      paymentStatus: 'Statut paiement',
      enrollmentDate: 'Date d\'inscription',
      doneAt: 'Fait à',
      on: 'le',
      currency: 'FCFA',
    },
    en: {
      title: 'SESSION REPORT',
      subtitle: 'Complete training session report',
      sessionInfo: 'Session information',
      program: 'Program',
      formation: 'Training',
      session: 'Session',
      dates: 'Dates',
      times: 'Schedule',
      location: 'Location',
      status: 'Status',
      duration: 'Duration',
      hours: 'hours',
      statistics: 'Statistics',
      enrollments: 'Enrollments',
      active: 'Active',
      completed: 'Completed',
      attendanceRate: 'Attendance rate',
      averageGrade: 'Average grade',
      averagePercentage: 'Average percentage',
      financial: 'Financial',
      totalRevenue: 'Total revenue',
      paidAmount: 'Paid amount',
      remainingAmount: 'Remaining amount',
      students: 'Students',
      studentName: 'Name',
      studentNumber: 'Number',
      email: 'Email',
      attendance: 'Attendance',
      grade: 'Grade',
      paymentStatus: 'Payment status',
      enrollmentDate: 'Enrollment date',
      doneAt: 'Done at',
      on: 'on',
      currency: 'FCFA',
    },
  }[lang]

  const statusLabels = {
    fr: {
      planned: 'Planifiée',
      ongoing: 'En cours',
      completed: 'Terminée',
      cancelled: 'Annulée',
    },
    en: {
      planned: 'Planned',
      ongoing: 'Ongoing',
      completed: 'Completed',
      cancelled: 'Cancelled',
    },
  }[lang]

  const paymentStatusLabels = {
    fr: {
      pending: 'En attente',
      partial: 'Partiel',
      paid: 'Payé',
      overdue: 'En retard',
    },
    en: {
      pending: 'Pending',
      partial: 'Partial',
      paid: 'Paid',
      overdue: 'Overdue',
    },
  }[lang]
  
  // Formater la liste des étudiants en HTML
  const studentsTableRows = data.students.map((student, index) => `
    <tr style="${index % 2 === 0 ? 'background-color: #f9fafb;' : ''}">
      <td style="padding: 8px; border: 1px solid #e5e7eb;">
        <strong>${student.first_name} ${student.last_name}</strong>
        ${student.email ? `<br/><span style="font-size: 10px; color: #6b7280;">${student.email}</span>` : ''}
      </td>
      <td style="padding: 8px; border: 1px solid #e5e7eb;">${student.student_number || '-'}</td>
      <td style="padding: 8px; text-align: center; border: 1px solid #e5e7eb;">${student.attendanceRate}%</td>
      <td style="padding: 8px; text-align: center; border: 1px solid #e5e7eb;">${student.averageGrade !== null && student.averageGrade !== undefined ? student.averageGrade : '-'}</td>
      <td style="padding: 8px; text-align: center; border: 1px solid #e5e7eb;">${paymentStatusLabels[student.paymentStatus as keyof typeof paymentStatusLabels] || student.paymentStatus}</td>
      <td style="padding: 8px; text-align: center; border: 1px solid #e5e7eb;">${formatDateForDocument(student.enrollmentDate)}</td>
    </tr>
  `).join('')
  
  // Générer le template avec balises
  const template = generateSessionReportTemplate(data)
  
  // Préparer les variables pour le système de balises
  const averageDisplay = data.statistics.averagePercentage !== null 
    ? `${data.statistics.averagePercentage}%` 
    : data.statistics.averageGrade 
      ? `${data.statistics.averageGrade}` 
      : 'N/A'
  const averageLabel = data.statistics.averagePercentage !== null 
    ? t.averagePercentage 
    : t.averageGrade
  
  const variables: any = {
    organisation_logo: data.organization.logo_url || '',
    title: t.title,
    subtitle: t.subtitle,
    session_info: t.sessionInfo,
    program: t.program,
    program_name: data.program?.name || '',
    formation: t.formation,
    formation_name: data.formation.name,
    formation_code: data.formation.code || '',
    session: t.session,
    session_name: data.session.name,
    dates: t.dates,
    session_start_date: formatDateForDocument(data.session.start_date),
    session_end_date: formatDateForDocument(data.session.end_date),
    times: t.times,
    session_start_time: data.session.start_time || '',
    session_end_time: data.session.end_time || '',
    location: t.location,
    session_location: data.session.location || '',
    status: t.status,
    session_status_label: statusLabels[data.session.status as keyof typeof statusLabels] || data.session.status,
    duration: t.duration,
    formation_duration_hours: data.formation.duration_hours || 0,
    hours: t.hours,
    statistics: t.statistics,
    total_enrollments: data.statistics.totalEnrollments,
    enrollments: t.enrollments,
    active_enrollments: data.statistics.activeEnrollments,
    active: t.active,
    completed_enrollments: data.statistics.completedEnrollments,
    completed: t.completed,
    attendance_rate: data.statistics.attendanceRate,
    attendance_rate_label: t.attendanceRate,
    average_display: averageDisplay,
    average_label: averageLabel,
    financial: t.financial,
    total_revenue: formatCurrency(data.statistics.totalRevenue, 'XOF'),
    total_revenue_label: t.totalRevenue,
    paid_amount: formatCurrency(data.statistics.paidAmount, 'XOF'),
    paid_amount_label: t.paidAmount,
    remaining_amount: formatCurrency(data.statistics.remainingAmount, 'XOF'),
    remaining_amount_label: t.remainingAmount,
    students: t.students,
    students_count: data.students.length,
    student_name: t.studentName,
    student_number: t.studentNumber,
    attendance: t.attendance,
    grade: t.grade,
    payment_status: t.paymentStatus,
    enrollment_date: t.enrollmentDate,
    students_table_rows: studentsTableRows,
    organization_name: data.organization.name,
    organization_address: data.organization.address || '',
    organization_phone: data.organization.phone || '',
    organization_email: data.organization.email || '',
    done_at: t.doneAt,
    on: t.on,
    issue_date: formatDateForDocument(data.issueDate),
  }
  
  // Traiter le template avec le système de génération HTML
  return await processTemplateWithTags(template, variables, data.documentId, data.organizationId)
}

/**
 * Génère le template avec balises {variable} pour un contrat particulier de formation professionnelle
 */
function generateContractTemplate(data: {
  student: {
    first_name: string
    last_name: string
    email?: string
    phone?: string
    address?: string
    date_of_birth?: string
    student_number?: string
    national_id?: string
  }
  session: {
    name: string
    start_date: string
    end_date: string
    location?: string
    start_time?: string
    end_time?: string
  }
  formation: {
    name: string
    code?: string
    price?: number
    duration_hours?: number
    objectives?: string
    prerequisites?: string
    targetAudience?: string
  }
  program?: {
    name: string
  }
  organization: {
    name: string
    address?: string
    phone?: string
    email?: string
    logo_url?: string
    siret?: string
    rcs?: string
    vat_number?: string
  }
  enrollment: {
    enrollment_date: string
    total_amount: number
    paid_amount: number
    payment_method?: string
    payment_schedule?: string
  }
  issueDate: string
  language?: 'fr' | 'en'
}) {
  const lang = data.language || 'fr'
  const t = {
    fr: {
      title: 'CONTRAT PARTICULIER DE FORMATION PROFESSIONNELLE',
      between: 'ENTRE',
      theOrganization: 'L\'organisme de formation',
      representedBy: 'représenté(e) par',
      director: 'Directeur(trice)',
      and: 'ET',
      theTrainee: 'Le stagiaire',
      dateOfBirth: 'Né(e) le',
      address: 'Adresse',
      email: 'Email',
      phone: 'Téléphone',
      studentNumber: 'N° stagiaire',
      nationalId: 'N° pièce d\'identité',
      object: 'ARTICLE 1 - OBJET',
      contractObject: 'La présente convention a pour objet de définir les conditions dans lesquelles',
      willProvide: 's\'engage à dispenser la formation professionnelle suivante au stagiaire',
      program: 'Programme',
      formation: 'Intitulé de la formation',
      session: 'Session',
      dates: 'Dates de formation',
      location: 'Lieu de formation',
      duration: 'Durée',
      hours: 'heures',
      schedule: 'Horaires',
      objectives: 'Objectifs pédagogiques',
      prerequisites: 'Prérequis',
      targetAudience: 'Public visé',
      financial: 'ARTICLE 2 - CONDITIONS FINANCIÈRES',
      price: 'Montant total de la formation',
      paid: 'Montant payé',
      remaining: 'Reste à payer',
      enrollmentDate: 'Date d\'inscription',
      paymentMethod: 'Mode de paiement',
      paymentSchedule: 'Échéancier de paiement',
      terms: 'ARTICLE 3 - MODALITÉS DE DÉROULEMENT',
      termsContent: 'La formation se déroulera selon les modalités définies dans le programme de formation. Les méthodes pédagogiques, les supports de cours et les modalités d\'évaluation sont détaillés dans le programme remis au stagiaire.',
      attendance: 'ARTICLE 4 - ASSIDUITÉ',
      attendanceContent: 'Le stagiaire s\'engage à suivre assidûment la formation. En cas d\'absence non justifiée, l\'organisme de formation se réserve le droit de refuser la délivrance de l\'attestation de formation.',
      cancellation: 'ARTICLE 5 - ANNULATION',
      cancellationContent: 'En cas d\'annulation par le stagiaire moins de 15 jours avant le début de la formation, des frais d\'annulation pourront être appliqués. L\'organisme de formation se réserve le droit d\'annuler la formation en cas de nombre insuffisant de participants, avec remboursement intégral des sommes versées.',
      signature: 'Signature et cachet',
      doneAt: 'Fait à',
      on: 'le',
      inDuplicate: 'En double exemplaire',
      for: 'Pour',
      andAccept: 'et accepté',
    },
    en: {
      title: 'INDIVIDUAL PROFESSIONAL TRAINING CONTRACT',
      between: 'BETWEEN',
      theOrganization: 'The training organization',
      representedBy: 'represented by',
      director: 'Director',
      and: 'AND',
      theTrainee: 'The trainee',
      dateOfBirth: 'Born on',
      address: 'Address',
      email: 'Email',
      phone: 'Phone',
      studentNumber: 'Trainee number',
      nationalId: 'ID number',
      object: 'ARTICLE 1 - OBJECT',
      contractObject: 'This contract defines the conditions under which',
      willProvide: 'commits to provide the following professional training to the trainee',
      program: 'Program',
      formation: 'Training title',
      session: 'Session',
      dates: 'Training dates',
      location: 'Training location',
      duration: 'Duration',
      hours: 'hours',
      schedule: 'Schedule',
      objectives: 'Learning objectives',
      prerequisites: 'Prerequisites',
      targetAudience: 'Target audience',
      financial: 'ARTICLE 2 - FINANCIAL CONDITIONS',
      price: 'Total training amount',
      paid: 'Amount paid',
      remaining: 'Remaining',
      enrollmentDate: 'Enrollment date',
      paymentMethod: 'Payment method',
      paymentSchedule: 'Payment schedule',
      terms: 'ARTICLE 3 - TRAINING MODALITIES',
      termsContent: 'The training will be conducted according to the modalities defined in the training program. Teaching methods, course materials and assessment methods are detailed in the program provided to the trainee.',
      attendance: 'ARTICLE 4 - ATTENDANCE',
      attendanceContent: 'The trainee undertakes to attend the training regularly. In case of unjustified absence, the training organization reserves the right to refuse the issuance of the training certificate.',
      cancellation: 'ARTICLE 5 - CANCELLATION',
      cancellationContent: 'In case of cancellation by the trainee less than 15 days before the start of training, cancellation fees may apply. The training organization reserves the right to cancel the training in case of insufficient number of participants, with full refund of amounts paid.',
      signature: 'Signature and stamp',
      doneAt: 'Done at',
      on: 'on',
      inDuplicate: 'In duplicate',
      for: 'For',
      andAccept: 'and accepted',
    },
  }[lang]

  return `
    <div id="contract-document" style="max-width: 210mm; margin: 0 auto; padding: 20mm; font-family: 'Times New Roman', serif; color: #000; line-height: 1.6;">
      {organization_logo && <div style="text-align: center; margin-bottom: 30px;">
        <img src="{organization_logo}" alt="Logo" style="max-height: 80px;" />
      </div>}
      
      <h1 style="text-align: center; font-size: 20px; font-weight: bold; margin-bottom: 40px; text-transform: uppercase; letter-spacing: 1px;">
        {title}
      </h1>
      
      <div style="margin-bottom: 30px; border: 1px solid #000; padding: 15px;">
        <p style="font-weight: bold; margin-bottom: 15px; font-size: 14px;">{between}</p>
        
        <div style="margin-bottom: 20px;">
          <p style="margin-bottom: 5px;"><strong>{the_organization}</strong> : {organization_name}</p>
          {IF organization_address}<p style="margin-left: 20px; margin-bottom: 3px;">{organization_address}</p>{ENDIF}
          {IF organization_phone}<p style="margin-left: 20px; margin-bottom: 3px;">Tél: {organization_phone}</p>{ENDIF}
          {IF organization_email}<p style="margin-left: 20px; margin-bottom: 3px;">Email: {organization_email}</p>{ENDIF}
          {IF organization_siret}<p style="margin-left: 20px; margin-bottom: 3px;">SIRET: {organization_siret}</p>{ENDIF}
          {IF organization_rcs}<p style="margin-left: 20px; margin-bottom: 3px;">RCS: {organization_rcs}</p>{ENDIF}
          {IF organization_vat_number}<p style="margin-left: 20px;">N° TVA: {organization_vat_number}</p>{ENDIF}
        </div>
        
        <p style="margin-top: 20px; margin-bottom: 15px;"><strong>{and}</strong></p>
        
        <div>
          <p style="margin-bottom: 5px;"><strong>{the_trainee}</strong> : {student_first_name} {student_last_name}</p>
          <div style="margin-left: 20px; margin-top: 10px;">
            {IF student_date_of_birth}<p style="margin-bottom: 3px;">{date_of_birth}: {student_date_of_birth}</p>{ENDIF}
            {IF student_address}<p style="margin-bottom: 3px;">{address}: {student_address}</p>{ENDIF}
            {IF student_email}<p style="margin-bottom: 3px;">{email}: {student_email}</p>{ENDIF}
            {IF student_phone}<p style="margin-bottom: 3px;">{phone}: {student_phone}</p>{ENDIF}
            {IF student_number}<p style="margin-bottom: 3px;">{student_number_label}: {student_number}</p>{ENDIF}
            {IF student_national_id}<p>{national_id}: {student_national_id}</p>{ENDIF}
          </div>
        </div>
      </div>
      
      <div style="margin-top: 40px; margin-bottom: 30px;">
        <h2 style="font-size: 16px; font-weight: bold; margin-bottom: 15px; text-transform: uppercase; border-bottom: 2px solid #000; padding-bottom: 5px;">
          {object}
        </h2>
        <p style="line-height: 1.8; text-align: justify; margin-bottom: 15px;">
          {contract_object} <strong>{organization_name}</strong> {will_provide} :
        </p>
        <div style="margin-left: 30px; margin-top: 15px; line-height: 2;">
          {IF program_name}<p><strong>{program}:</strong> {program_name}</p>{ENDIF}
          <p><strong>{formation}:</strong> {formation_name}{IF formation_code} (Code: {formation_code}){ENDIF}</p>
          <p><strong>{session}:</strong> {session_name}</p>
          <p><strong>{dates}:</strong> Du {session_start_date} au {session_end_date}</p>
          {IF session_start_time && session_end_time}<p><strong>{schedule}:</strong> {session_start_time} - {session_end_time}</p>{ENDIF}
          {IF session_location}<p><strong>{location}:</strong> {session_location}</p>{ENDIF}
          {IF formation_duration_hours}<p><strong>{duration}:</strong> {formation_duration_hours} {hours}</p>{ENDIF}
          {IF formation_objectives}<p style="margin-top: 10px;"><strong>{objectives}:</strong> {formation_objectives}</p>{ENDIF}
          {IF formation_prerequisites}<p><strong>{prerequisites}:</strong> {formation_prerequisites}</p>{ENDIF}
          {IF formation_target_audience}<p><strong>{target_audience}:</strong> {formation_target_audience}</p>{ENDIF}
        </div>
      </div>
      
      <div style="margin-top: 40px; margin-bottom: 30px;">
        <h2 style="font-size: 16px; font-weight: bold; margin-bottom: 15px; text-transform: uppercase; border-bottom: 2px solid #000; padding-bottom: 5px;">
          {financial}
        </h2>
        <div style="margin-left: 20px; line-height: 2;">
          <p><strong>{price}:</strong> {total_amount_formatted} TTC</p>
          <p><strong>{paid}:</strong> {paid_amount_formatted}</p>
          <p><strong>{remaining}:</strong> {remaining_amount_formatted}</p>
          <p><strong>{enrollment_date_label}:</strong> {enrollment_date}</p>
          {IF payment_method}<p><strong>{payment_method_label}:</strong> {payment_method}</p>{ENDIF}
          {IF payment_schedule}<p><strong>{payment_schedule_label}:</strong> {payment_schedule}</p>{ENDIF}
        </div>
      </div>
      
      <div style="margin-top: 40px; margin-bottom: 30px;">
        <h2 style="font-size: 16px; font-weight: bold; margin-bottom: 15px; text-transform: uppercase; border-bottom: 2px solid #000; padding-bottom: 5px;">
          {terms}
        </h2>
        <p style="line-height: 1.8; text-align: justify;">
          {terms_content}
        </p>
      </div>
      
      <div style="margin-top: 40px; margin-bottom: 30px;">
        <h2 style="font-size: 16px; font-weight: bold; margin-bottom: 15px; text-transform: uppercase; border-bottom: 2px solid #000; padding-bottom: 5px;">
          {attendance}
        </h2>
        <p style="line-height: 1.8; text-align: justify;">
          {attendance_content}
        </p>
      </div>
      
      <div style="margin-top: 40px; margin-bottom: 30px;">
        <h2 style="font-size: 16px; font-weight: bold; margin-bottom: 15px; text-transform: uppercase; border-bottom: 2px solid #000; padding-bottom: 5px;">
          {cancellation}
        </h2>
        <p style="line-height: 1.8; text-align: justify;">
          {cancellation_content}
        </p>
      </div>
      
      <div style="margin-top: 60px; display: flex; justify-content: space-between; page-break-inside: avoid;">
        <div style="width: 45%;">
          <p style="margin-bottom: 50px; font-weight: bold;">{signature}</p>
          <p style="border-top: 1px solid #000; padding-top: 5px; margin-top: 60px;">_________________________</p>
          <p style="margin-top: 5px; font-size: 11px;">{organization_name}</p>
          <p style="margin-top: 5px; font-size: 11px;">{director}</p>
        </div>
        <div style="width: 45%;">
          <p style="margin-bottom: 50px; font-weight: bold;">{signature}</p>
          <p style="border-top: 1px solid #000; padding-top: 5px; margin-top: 60px;">_________________________</p>
          <p style="margin-top: 5px; font-size: 11px;">{student_first_name} {student_last_name}</p>
          <p style="margin-top: 5px; font-size: 11px;">{the_trainee}</p>
        </div>
      </div>
      
      <div style="margin-top: 50px; text-align: center; font-size: 12px;">
        <p><strong>{done_at}</strong> {organization_address}, <strong>{on}</strong> <strong>{issue_date}</strong></p>
        <p style="margin-top: 10px; font-style: italic;">{in_duplicate}</p>
      </div>
    </div>
  `
}

/**
 * Génère le HTML final pour un contrat particulier de formation professionnelle en utilisant les balises {variable}
 */
export async function generateContractHTML(data: {
  student: {
    first_name: string
    last_name: string
    email?: string
    phone?: string
    address?: string
    date_of_birth?: string
    student_number?: string
    national_id?: string
  }
  session: {
    name: string
    start_date: string
    end_date: string
    location?: string
    start_time?: string
    end_time?: string
  }
  formation: {
    name: string
    code?: string
    price?: number
    duration_hours?: number
    objectives?: string
    prerequisites?: string
    targetAudience?: string
  }
  program?: {
    name: string
  }
  organization: {
    name: string
    address?: string
    phone?: string
    email?: string
    logo_url?: string
    siret?: string
    rcs?: string
    vat_number?: string
  }
  enrollment: {
    enrollment_date: string
    total_amount: number
    paid_amount: number
    payment_method?: string
    payment_schedule?: string
  }
  issueDate: string
  language?: 'fr' | 'en'
  documentId?: string
  organizationId?: string
}): Promise<string> {
  const lang = data.language || 'fr'
  const t = {
    fr: {
      title: 'CONTRAT PARTICULIER DE FORMATION PROFESSIONNELLE',
      between: 'ENTRE',
      theOrganization: 'L\'organisme de formation',
      representedBy: 'représenté(e) par',
      director: 'Directeur(trice)',
      and: 'ET',
      theTrainee: 'Le stagiaire',
      dateOfBirth: 'Né(e) le',
      address: 'Adresse',
      email: 'Email',
      phone: 'Téléphone',
      studentNumber: 'N° stagiaire',
      nationalId: 'N° pièce d\'identité',
      object: 'ARTICLE 1 - OBJET',
      contractObject: 'La présente convention a pour objet de définir les conditions dans lesquelles',
      willProvide: 's\'engage à dispenser la formation professionnelle suivante au stagiaire',
      program: 'Programme',
      formation: 'Intitulé de la formation',
      session: 'Session',
      dates: 'Dates de formation',
      location: 'Lieu de formation',
      duration: 'Durée',
      hours: 'heures',
      schedule: 'Horaires',
      objectives: 'Objectifs pédagogiques',
      prerequisites: 'Prérequis',
      targetAudience: 'Public visé',
      financial: 'ARTICLE 2 - CONDITIONS FINANCIÈRES',
      price: 'Montant total de la formation',
      paid: 'Montant payé',
      remaining: 'Reste à payer',
      enrollmentDate: 'Date d\'inscription',
      paymentMethod: 'Mode de paiement',
      paymentSchedule: 'Échéancier de paiement',
      terms: 'ARTICLE 3 - MODALITÉS DE DÉROULEMENT',
      termsContent: 'La formation se déroulera selon les modalités définies dans le programme de formation. Les méthodes pédagogiques, les supports de cours et les modalités d\'évaluation sont détaillés dans le programme remis au stagiaire.',
      attendance: 'ARTICLE 4 - ASSIDUITÉ',
      attendanceContent: 'Le stagiaire s\'engage à suivre assidûment la formation. En cas d\'absence non justifiée, l\'organisme de formation se réserve le droit de refuser la délivrance de l\'attestation de formation.',
      cancellation: 'ARTICLE 5 - ANNULATION',
      cancellationContent: 'En cas d\'annulation par le stagiaire moins de 15 jours avant le début de la formation, des frais d\'annulation pourront être appliqués. L\'organisme de formation se réserve le droit d\'annuler la formation en cas de nombre insuffisant de participants, avec remboursement intégral des sommes versées.',
      signature: 'Signature et cachet',
      doneAt: 'Fait à',
      on: 'le',
      inDuplicate: 'En double exemplaire',
      for: 'Pour',
      andAccept: 'et accepté',
    },
    en: {
      title: 'INDIVIDUAL PROFESSIONAL TRAINING CONTRACT',
      between: 'BETWEEN',
      theOrganization: 'The training organization',
      representedBy: 'represented by',
      director: 'Director',
      and: 'AND',
      theTrainee: 'The trainee',
      dateOfBirth: 'Born on',
      address: 'Address',
      email: 'Email',
      phone: 'Phone',
      studentNumber: 'Trainee number',
      nationalId: 'ID number',
      object: 'ARTICLE 1 - OBJECT',
      contractObject: 'This contract defines the conditions under which',
      willProvide: 'commits to provide the following professional training to the trainee',
      program: 'Program',
      formation: 'Training title',
      session: 'Session',
      dates: 'Training dates',
      location: 'Training location',
      duration: 'Duration',
      hours: 'hours',
      schedule: 'Schedule',
      objectives: 'Learning objectives',
      prerequisites: 'Prerequisites',
      targetAudience: 'Target audience',
      financial: 'ARTICLE 2 - FINANCIAL CONDITIONS',
      price: 'Total training amount',
      paid: 'Amount paid',
      remaining: 'Remaining',
      enrollmentDate: 'Enrollment date',
      paymentMethod: 'Payment method',
      paymentSchedule: 'Payment schedule',
      terms: 'ARTICLE 3 - TRAINING MODALITIES',
      termsContent: 'The training will be conducted according to the modalities defined in the training program. Teaching methods, course materials and assessment methods are detailed in the program provided to the trainee.',
      attendance: 'ARTICLE 4 - ATTENDANCE',
      attendanceContent: 'The trainee undertakes to attend the training regularly. In case of unjustified absence, the training organization reserves the right to refuse the issuance of the training certificate.',
      cancellation: 'ARTICLE 5 - CANCELLATION',
      cancellationContent: 'In case of cancellation by the trainee less than 15 days before the start of training, cancellation fees may apply. The training organization reserves the right to cancel the training in case of insufficient number of participants, with full refund of amounts paid.',
      signature: 'Signature and stamp',
      doneAt: 'Done at',
      on: 'on',
      inDuplicate: 'In duplicate',
      for: 'For',
      andAccept: 'and accepted',
    },
  }[lang]
  
  const remaining = data.enrollment.total_amount - data.enrollment.paid_amount
  
  // Générer le template avec balises
  const template = generateContractTemplate(data)
  
  // Préparer les variables pour le système de balises
  const variables: any = {
    organisation_logo: data.organization.logo_url || '',
    title: t.title,
    between: t.between,
    the_organization: t.theOrganization,
    organization_name: data.organization.name,
    organization_address: data.organization.address || '',
    organization_phone: data.organization.phone || '',
    organization_email: data.organization.email || '',
    organization_siret: data.organization.siret || '',
    organization_rcs: data.organization.rcs || '',
    organization_vat_number: data.organization.vat_number || '',
    and: t.and,
    the_trainee: t.theTrainee,
    student_first_name: data.student.first_name,
    student_last_name: data.student.last_name,
    student_date_of_birth: data.student.date_of_birth ? formatDateForDocument(data.student.date_of_birth) : '',
    date_of_birth: t.dateOfBirth,
    address: t.address,
    student_address: data.student.address || '',
    email: t.email,
    student_email: data.student.email || '',
    phone: t.phone,
    student_phone: data.student.phone || '',
    student_number_label: t.studentNumber,
    student_number: data.student.student_number || '',
    national_id: t.nationalId,
    student_national_id: data.student.national_id || '',
    object: t.object,
    contract_object: t.contractObject,
    will_provide: t.willProvide,
    program: t.program,
    program_name: data.program?.name || '',
    formation: t.formation,
    formation_name: data.formation.name,
    formation_code: data.formation.code || '',
    session: t.session,
    session_name: data.session.name,
    dates: t.dates,
    session_start_date: formatDateForDocument(data.session.start_date),
    session_end_date: formatDateForDocument(data.session.end_date),
    schedule: t.schedule,
    session_start_time: data.session.start_time || '',
    session_end_time: data.session.end_time || '',
    location: t.location,
    session_location: data.session.location || '',
    duration: t.duration,
    formation_duration_hours: data.formation.duration_hours || 0,
    hours: t.hours,
    objectives: t.objectives,
    formation_objectives: data.formation.objectives || '',
    prerequisites: t.prerequisites,
    formation_prerequisites: data.formation.prerequisites || '',
    target_audience: t.targetAudience,
    formation_target_audience: data.formation.targetAudience || '',
    financial: t.financial,
    price: t.price,
    total_amount_formatted: formatCurrency(data.enrollment.total_amount, 'EUR'),
    paid: t.paid,
    paid_amount_formatted: formatCurrency(data.enrollment.paid_amount, 'EUR'),
    remaining: t.remaining,
    remaining_amount_formatted: formatCurrency(remaining, 'EUR'),
    enrollment_date_label: t.enrollmentDate,
    enrollment_date: formatDateForDocument(data.enrollment.enrollment_date),
    payment_method: data.enrollment.payment_method || '',
    payment_method_label: t.paymentMethod,
    payment_schedule: data.enrollment.payment_schedule || '',
    payment_schedule_label: t.paymentSchedule,
    terms: t.terms,
    terms_content: t.termsContent,
    attendance: t.attendance,
    attendance_content: t.attendanceContent,
    cancellation: t.cancellation,
    cancellation_content: t.cancellationContent,
    signature: t.signature,
    director: t.director,
    done_at: t.doneAt,
    on: t.on,
    issue_date: formatDateForDocument(data.issueDate),
    in_duplicate: t.inDuplicate,
  }
  
  // Traiter le template avec le système de génération HTML
  return await processTemplateWithTags(template, variables, data.documentId, data.organizationId)
}

/**
 * Génère le template avec balises {variable} pour une convocation à une session de formation
 */
function generateConvocationTemplate(data: {
  student: {
    first_name: string
    last_name: string
    email?: string
    phone?: string
  }
  session: {
    name: string
    start_date: string
    end_date: string
    start_time?: string
    end_time?: string
    location?: string
  }
  formation: {
    name: string
    code?: string
  }
  program?: {
    name: string
  }
  organization: {
    name: string
    address?: string
    phone?: string
    email?: string
    logo_url?: string
  }
  issueDate: string
  language?: 'fr' | 'en'
}) {
  const lang = data.language || 'fr'
  const t = {
    fr: {
      title: 'CONVOCATION À UNE FORMATION',
      dear: 'Madame, Monsieur',
      weInform: 'Nous vous informons que vous êtes convoqué(e) à la session de formation suivante',
      program: 'Programme',
      formation: 'Formation',
      session: 'Session',
      dates: 'Dates',
      times: 'Horaires',
      location: 'Lieu',
      contact: 'Pour toute information complémentaire, vous pouvez nous contacter',
      seeYou: 'Nous vous prions d\'agréer, Madame, Monsieur, l\'expression de nos salutations distinguées.',
      bestRegards: 'Cordialement',
      signature: 'Signature et cachet',
      doneAt: 'Fait à',
      on: 'le',
    },
    en: {
      title: 'TRAINING INVITATION',
      dear: 'Dear Sir/Madam',
      weInform: 'We inform you that you are invited to the following training session',
      program: 'Program',
      formation: 'Training',
      session: 'Session',
      dates: 'Dates',
      times: 'Schedule',
      location: 'Location',
      contact: 'For any additional information, you can contact us',
      seeYou: 'Yours sincerely',
      bestRegards: 'Best regards',
      signature: 'Signature and stamp',
      doneAt: 'Done at',
      on: 'on',
    },
  }[lang]

  return `
    <div id="convocation-document" style="max-width: 210mm; margin: 0 auto; padding: 20mm; font-family: Arial, sans-serif; color: #000;">
      {organization_logo && <div style="text-align: center; margin-bottom: 30px;">
        <img src="{organization_logo}" alt="Logo" style="max-height: 80px;" />
      </div>}
      
      <h1 style="text-align: center; font-size: 24px; font-weight: bold; margin-bottom: 40px; text-transform: uppercase;">
        {title}
      </h1>
      
      <div style="margin-bottom: 30px;">
        <p><strong>{organization_name}</strong></p>
        {IF organization_address}<p>{organization_address}</p>{ENDIF}
        {IF organization_phone}<p>Tél: {organization_phone}</p>{ENDIF}
        {IF organization_email}<p>Email: {organization_email}</p>{ENDIF}
      </div>
      
      <div style="margin-top: 40px; margin-bottom: 30px;">
        <p style="margin-bottom: 10px;"><strong>{student_first_name} {student_last_name}</strong></p>
        {IF student_email}<p>{student_email}</p>{ENDIF}
        {IF student_phone}<p>{student_phone}</p>{ENDIF}
      </div>
      
      <div style="margin-top: 40px; line-height: 1.8;">
        <p style="margin-bottom: 20px;">{dear},</p>
        <p style="text-align: justify; margin-bottom: 30px;">
          {we_inform} :
        </p>
        
        <div style="margin-left: 30px; margin-top: 20px; padding: 20px; background-color: #f9fafb; border-radius: 8px;">
          {IF program_name}<p><strong>{program}:</strong> {program_name}</p>{ENDIF}
          <p><strong>{formation}:</strong> {formation_name}{IF formation_code} ({formation_code}){ENDIF}</p>
          <p><strong>{session}:</strong> {session_name}</p>
          <p><strong>{dates}:</strong> {session_start_date} - {session_end_date}</p>
          {IF session_start_time && session_end_time}<p><strong>{times}:</strong> {session_start_time} - {session_end_time}</p>{ENDIF}
          {IF session_location}<p><strong>{location}:</strong> {session_location}</p>{ENDIF}
        </div>
        
        <p style="margin-top: 30px; text-align: justify;">
          {contact} :
        </p>
        <div style="margin-left: 30px; margin-top: 10px;">
          {IF organization_phone}<p>Téléphone: {organization_phone}</p>{ENDIF}
          {IF organization_email}<p>Email: {organization_email}</p>{ENDIF}
        </div>
        
        <p style="margin-top: 40px; text-align: justify;">
          {see_you}
        </p>
        
        <p style="margin-top: 30px;">
          {best_regards}
        </p>
      </div>
      
      <div style="margin-top: 60px; text-align: right;">
        <p style="margin-bottom: 40px;">{signature}</p>
        <p>_________________________</p>
        <p style="margin-top: 5px; font-size: 12px;">{organization_name}</p>
      </div>
      
      <div style="margin-top: 40px; text-align: center;">
        <p>{done_at} <strong>{organization_address}</strong>, {on} <strong>{issue_date}</strong></p>
      </div>
    </div>
  `
}

/**
 * Génère le HTML final pour une convocation à une session de formation en utilisant les balises {variable}
 */
export async function generateConvocationHTML(data: {
  student: {
    first_name: string
    last_name: string
    email?: string
    phone?: string
  }
  session: {
    name: string
    start_date: string
    end_date: string
    start_time?: string
    end_time?: string
    location?: string
  }
  formation: {
    name: string
    code?: string
  }
  program?: {
    name: string
  }
  organization: {
    name: string
    address?: string
    phone?: string
    email?: string
    logo_url?: string
  }
  issueDate: string
  language?: 'fr' | 'en'
  documentId?: string
  organizationId?: string
}): Promise<string> {
  const lang = data.language || 'fr'
  const t = {
    fr: {
      title: 'CONVOCATION À UNE FORMATION',
      dear: 'Madame, Monsieur',
      weInform: 'Nous vous informons que vous êtes convoqué(e) à la session de formation suivante',
      program: 'Programme',
      formation: 'Formation',
      session: 'Session',
      dates: 'Dates',
      times: 'Horaires',
      location: 'Lieu',
      contact: 'Pour toute information complémentaire, vous pouvez nous contacter',
      seeYou: 'Nous vous prions d\'agréer, Madame, Monsieur, l\'expression de nos salutations distinguées.',
      bestRegards: 'Cordialement',
      signature: 'Signature et cachet',
      doneAt: 'Fait à',
      on: 'le',
    },
    en: {
      title: 'TRAINING INVITATION',
      dear: 'Dear Sir/Madam',
      weInform: 'We inform you that you are invited to the following training session',
      program: 'Program',
      formation: 'Training',
      session: 'Session',
      dates: 'Dates',
      times: 'Schedule',
      location: 'Location',
      contact: 'For any additional information, you can contact us',
      seeYou: 'Yours sincerely',
      bestRegards: 'Best regards',
      signature: 'Signature and stamp',
      doneAt: 'Done at',
      on: 'on',
    },
  }[lang]
  
  // Générer le template avec balises
  const template = generateConvocationTemplate(data)
  
  // Préparer les variables pour le système de balises
  const variables: any = {
    organisation_logo: data.organization.logo_url || '',
    title: t.title,
    organization_name: data.organization.name,
    organization_address: data.organization.address || '',
    organization_phone: data.organization.phone || '',
    organization_email: data.organization.email || '',
    student_first_name: data.student.first_name,
    student_last_name: data.student.last_name,
    student_email: data.student.email || '',
    student_phone: data.student.phone || '',
    dear: t.dear,
    we_inform: t.weInform,
    program: t.program,
    program_name: data.program?.name || '',
    formation: t.formation,
    formation_name: data.formation.name,
    formation_code: data.formation.code || '',
    session: t.session,
    session_name: data.session.name,
    dates: t.dates,
    session_start_date: formatDateForDocument(data.session.start_date),
    session_end_date: formatDateForDocument(data.session.end_date),
    times: t.times,
    session_start_time: data.session.start_time || '',
    session_end_time: data.session.end_time || '',
    location: t.location,
    session_location: data.session.location || '',
    contact: t.contact,
    see_you: t.seeYou,
    best_regards: t.bestRegards,
    signature: t.signature,
    done_at: t.doneAt,
    on: t.on,
    issue_date: formatDateForDocument(data.issueDate),
  }
  
  // Traiter le template avec le système de génération HTML
  return await processTemplateWithTags(template, variables, data.documentId, data.organizationId)
}

/**
 * Génère le template avec balises {variable} pour un document de programme de formation
 */
function generateProgramTemplate(data: {
  program: {
    name: string
    description?: string
  }
  formation: {
    name: string
    code?: string
    subtitle?: string
    duration_hours?: number
    objectives?: string
    content?: string
    learner_profile?: string
  }
  organization: {
    name: string
    address?: string
    phone?: string
    email?: string
    logo_url?: string
  }
  issueDate: string
  language?: 'fr' | 'en'
}) {
  const lang = data.language || 'fr'
  const t = {
    fr: {
      title: 'PROGRAMME DE FORMATION',
      subtitle: 'Description du programme',
      program: 'Programme',
      formation: 'Formation',
      code: 'Code',
      duration: 'Durée',
      hours: 'heures',
      objectives: 'Objectifs pédagogiques',
      content: 'Contenu de la formation',
      learnerProfile: 'Profil des apprenants',
      doneAt: 'Fait à',
      on: 'le',
    },
    en: {
      title: 'TRAINING PROGRAM',
      subtitle: 'Program description',
      program: 'Program',
      formation: 'Training',
      code: 'Code',
      duration: 'Duration',
      hours: 'hours',
      objectives: 'Pedagogical objectives',
      content: 'Training content',
      learnerProfile: 'Learner profile',
      doneAt: 'Done at',
      on: 'on',
    },
  }[lang]

  return `
    <div id="program-document" style="max-width: 210mm; margin: 0 auto; padding: 15mm; font-family: Arial, sans-serif; color: #000; line-height: 1.6;">
      {organization_logo && <div style="text-align: center; margin-bottom: 30px;">
        <img src="{organization_logo}" alt="Logo" style="max-height: 80px;" />
      </div>}

      <h1 style="text-align: center; font-size: 28px; font-weight: bold; margin-bottom: 10px; text-transform: uppercase; color: #1e40af;">
        {title}
      </h1>
      <p style="text-align: center; font-size: 14px; color: #6b7280; margin-bottom: 40px;">
        {subtitle}
      </p>

      <div style="margin-bottom: 30px; padding: 20px; background-color: #f9fafb; border-radius: 8px; border-left: 4px solid #1e40af;">
        <h2 style="font-size: 18px; font-weight: bold; margin-bottom: 15px; color: #1e40af;">
          {program}: {program_name}
        </h2>
        {IF program_description}<p style="margin-top: 10px; color: #374151;">{program_description}</p>{ENDIF}
      </div>

      <div style="margin-bottom: 30px;">
        <h2 style="font-size: 18px; font-weight: bold; margin-bottom: 15px; color: #1e40af;">
          {formation}: {formation_name}
        </h2>
        {IF formation_subtitle}<p style="font-size: 16px; color: #6b7280; margin-bottom: 10px;">{formation_subtitle}</p>{ENDIF}
        {IF formation_code}<p style="margin-top: 10px;"><strong>{code}:</strong> {formation_code}</p>{ENDIF}
        {IF formation_duration_hours}<p style="margin-top: 10px;"><strong>{duration}:</strong> {formation_duration_hours} {hours}</p>{ENDIF}
      </div>

      {IF formation_objectives}<div style="margin-bottom: 30px;">
        <h3 style="font-size: 16px; font-weight: bold; margin-bottom: 10px; color: #1e40af;">
          {objectives}
        </h3>
        <div style="white-space: pre-wrap; color: #374151;">{formation_objectives}</div>
      </div>{ENDIF}

      {IF formation_content}<div style="margin-bottom: 30px;">
        <h3 style="font-size: 16px; font-weight: bold; margin-bottom: 10px; color: #1e40af;">
          {content}
        </h3>
        <div style="white-space: pre-wrap; color: #374151;">{formation_content}</div>
      </div>{ENDIF}

      {IF formation_learner_profile}<div style="margin-bottom: 30px;">
        <h3 style="font-size: 16px; font-weight: bold; margin-bottom: 10px; color: #1e40af;">
          {learner_profile}
        </h3>
        <div style="white-space: pre-wrap; color: #374151;">{formation_learner_profile}</div>
      </div>{ENDIF}

      <div style="margin-top: 40px; padding-top: 20px; border-top: 2px solid #e5e7eb;">
        <p style="font-size: 12px; color: #6b7280; margin-bottom: 10px;">
          <strong>{organization_name}</strong>
        </p>
        {IF organization_address}<p style="font-size: 12px; color: #6b7280;">{organization_address}</p>{ENDIF}
        {IF organization_phone}<p style="font-size: 12px; color: #6b7280;">Tél: {organization_phone}</p>{ENDIF}
        {IF organization_email}<p style="font-size: 12px; color: #6b7280;">Email: {organization_email}</p>{ENDIF}
        <p style="font-size: 12px; color: #6b7280; margin-top: 20px;">
          {done_at} <strong>{organization_address}</strong>, {on} <strong>{issue_date}</strong>
        </p>
      </div>
    </div>
  `
}

/**
 * Génère le HTML final pour un document de programme de formation en utilisant les balises {variable}
 */
export async function generateProgramHTML(data: {
  program: {
    name: string
    description?: string
  }
  formation: {
    name: string
    code?: string
    subtitle?: string
    duration_hours?: number
    objectives?: string
    content?: string
    learner_profile?: string
  }
  organization: {
    name: string
    address?: string
    phone?: string
    email?: string
    logo_url?: string
  }
  issueDate: string
  language?: 'fr' | 'en'
  documentId?: string
  organizationId?: string
}): Promise<string> {
  const lang = data.language || 'fr'
  const t = {
    fr: {
      title: 'PROGRAMME DE FORMATION',
      subtitle: 'Description du programme',
      program: 'Programme',
      formation: 'Formation',
      code: 'Code',
      duration: 'Durée',
      hours: 'heures',
      objectives: 'Objectifs pédagogiques',
      content: 'Contenu de la formation',
      learnerProfile: 'Profil des apprenants',
      doneAt: 'Fait à',
      on: 'le',
    },
    en: {
      title: 'TRAINING PROGRAM',
      subtitle: 'Program description',
      program: 'Program',
      formation: 'Training',
      code: 'Code',
      duration: 'Duration',
      hours: 'hours',
      objectives: 'Pedagogical objectives',
      content: 'Training content',
      learnerProfile: 'Learner profile',
      doneAt: 'Done at',
      on: 'on',
    },
  }[lang]
  
  // Générer le template avec balises
  const template = generateProgramTemplate(data)
  
  // Préparer les variables pour le système de balises
  const variables: any = {
    organisation_logo: data.organization.logo_url || '',
    title: t.title,
    subtitle: t.subtitle,
    program: t.program,
    program_name: data.program.name,
    program_description: data.program.description || '',
    formation: t.formation,
    formation_name: data.formation.name,
    formation_subtitle: data.formation.subtitle || '',
    code: t.code,
    formation_code: data.formation.code || '',
    duration: t.duration,
    formation_duration_hours: data.formation.duration_hours || 0,
    hours: t.hours,
    objectives: t.objectives,
    formation_objectives: data.formation.objectives || '',
    content: t.content,
    formation_content: data.formation.content || '',
    learner_profile: t.learnerProfile,
    formation_learner_profile: data.formation.learner_profile || '',
    organization_name: data.organization.name,
    organization_address: data.organization.address || '',
    organization_phone: data.organization.phone || '',
    organization_email: data.organization.email || '',
    done_at: t.doneAt,
    on: t.on,
    issue_date: formatDateForDocument(data.issueDate),
  }
  
  // Traiter le template avec le système de génération HTML
  return await processTemplateWithTags(template, variables, data.documentId, data.organizationId)
}

/**
 * Génère le template avec balises {variable} pour les Conditions Générales de Vente (CGV)
 */
function generateTermsTemplate(data: {
  organization: {
    name: string
    address?: string
    phone?: string
    email?: string
    logo_url?: string
  }
  issueDate: string
  language?: 'fr' | 'en'
}) {
  const lang = data.language || 'fr'
  const t = {
    fr: {
      title: 'CONDITIONS GÉNÉRALES DE VENTE',
      subtitle: 'CGV',
      intro: 'Les présentes Conditions Générales de Vente régissent les relations entre',
      and: 'et les clients pour tous les services de formation proposés.',
      doneAt: 'Fait à',
      on: 'le',
    },
    en: {
      title: 'TERMS AND CONDITIONS',
      subtitle: 'T&C',
      intro: 'These Terms and Conditions govern the relationship between',
      and: 'and customers for all training services offered.',
      doneAt: 'Done at',
      on: 'on',
    },
  }[lang]

  return `
    <div id="terms-document" style="max-width: 210mm; margin: 0 auto; padding: 15mm; font-family: Arial, sans-serif; color: #000; line-height: 1.6;">
      {organization_logo && <div style="text-align: center; margin-bottom: 30px;">
        <img src="{organization_logo}" alt="Logo" style="max-height: 80px;" />
      </div>}

      <h1 style="text-align: center; font-size: 28px; font-weight: bold; margin-bottom: 10px; text-transform: uppercase; color: #1e40af;">
        {title}
      </h1>
      <p style="text-align: center; font-size: 14px; color: #6b7280; margin-bottom: 40px;">
        {subtitle}
      </p>

      <div style="margin-bottom: 30px;">
        <p style="margin-bottom: 20px; text-align: justify;">
          {intro} <strong>{organization_name}</strong> {and}
        </p>
      </div>

      <div style="margin-top: 40px; padding-top: 20px; border-top: 2px solid #e5e7eb;">
        <p style="font-size: 12px; color: #6b7280; margin-bottom: 10px;">
          <strong>{organization_name}</strong>
        </p>
        {IF organization_address}<p style="font-size: 12px; color: #6b7280;">{organization_address}</p>{ENDIF}
        {IF organization_phone}<p style="font-size: 12px; color: #6b7280;">Tél: {organization_phone}</p>{ENDIF}
        {IF organization_email}<p style="font-size: 12px; color: #6b7280;">Email: {organization_email}</p>{ENDIF}
        <p style="font-size: 12px; color: #6b7280; margin-top: 20px;">
          {done_at} <strong>{organization_address}</strong>, {on} <strong>{issue_date}</strong>
        </p>
      </div>
    </div>
  `
}

/**
 * Génère le HTML final pour les Conditions Générales de Vente (CGV) en utilisant les balises {variable}
 */
export async function generateTermsHTML(data: {
  organization: {
    name: string
    address?: string
    phone?: string
    email?: string
    logo_url?: string
  }
  issueDate: string
  language?: 'fr' | 'en'
  documentId?: string
  organizationId?: string
}): Promise<string> {
  const lang = data.language || 'fr'
  const t = {
    fr: {
      title: 'CONDITIONS GÉNÉRALES DE VENTE',
      subtitle: 'CGV',
      intro: 'Les présentes Conditions Générales de Vente régissent les relations entre',
      and: 'et les clients pour tous les services de formation proposés.',
      doneAt: 'Fait à',
      on: 'le',
    },
    en: {
      title: 'TERMS AND CONDITIONS',
      subtitle: 'T&C',
      intro: 'These Terms and Conditions govern the relationship between',
      and: 'and customers for all training services offered.',
      doneAt: 'Done at',
      on: 'on',
    },
  }[lang]
  
  // Générer le template avec balises
  const template = generateTermsTemplate(data)
  
  // Préparer les variables pour le système de balises
  const variables: any = {
    organisation_logo: data.organization.logo_url || '',
    title: t.title,
    subtitle: t.subtitle,
    intro: t.intro,
    organization_name: data.organization.name,
    and: t.and,
    organization_address: data.organization.address || '',
    organization_phone: data.organization.phone || '',
    organization_email: data.organization.email || '',
    done_at: t.doneAt,
    on: t.on,
    issue_date: formatDateForDocument(data.issueDate),
  }
  
  // Traiter le template avec le système de génération HTML
  return await processTemplateWithTags(template, variables, data.documentId, data.organizationId)
}

/**
 * Génère le template avec balises {variable} pour la Politique de Confidentialité
 */
function generatePrivacyPolicyTemplate(data: {
  organization: {
    name: string
    address?: string
    phone?: string
    email?: string
    logo_url?: string
  }
  issueDate: string
  language?: 'fr' | 'en'
}) {
  const lang = data.language || 'fr'
  const t = {
    fr: {
      title: 'POLITIQUE DE CONFIDENTIALITÉ',
      subtitle: 'Protection des données personnelles',
      intro: 'La présente Politique de Confidentialité décrit comment',
      collects: 'collecte, utilise et protège vos données personnelles.',
      doneAt: 'Fait à',
      on: 'le',
    },
    en: {
      title: 'PRIVACY POLICY',
      subtitle: 'Personal data protection',
      intro: 'This Privacy Policy describes how',
      collects: 'collects, uses and protects your personal data.',
      doneAt: 'Done at',
      on: 'on',
    },
  }[lang]

  return `
    <div id="privacy-policy-document" style="max-width: 210mm; margin: 0 auto; padding: 15mm; font-family: Arial, sans-serif; color: #000; line-height: 1.6;">
      {organization_logo && <div style="text-align: center; margin-bottom: 30px;">
        <img src="{organization_logo}" alt="Logo" style="max-height: 80px;" />
      </div>}

      <h1 style="text-align: center; font-size: 28px; font-weight: bold; margin-bottom: 10px; text-transform: uppercase; color: #1e40af;">
        {title}
      </h1>
      <p style="text-align: center; font-size: 14px; color: #6b7280; margin-bottom: 40px;">
        {subtitle}
      </p>

      <div style="margin-bottom: 30px;">
        <p style="margin-bottom: 20px; text-align: justify;">
          {intro} <strong>{organization_name}</strong> {collects}
        </p>
      </div>

      <div style="margin-top: 40px; padding-top: 20px; border-top: 2px solid #e5e7eb;">
        <p style="font-size: 12px; color: #6b7280; margin-bottom: 10px;">
          <strong>{organization_name}</strong>
        </p>
        {IF organization_address}<p style="font-size: 12px; color: #6b7280;">{organization_address}</p>{ENDIF}
        {IF organization_phone}<p style="font-size: 12px; color: #6b7280;">Tél: {organization_phone}</p>{ENDIF}
        {IF organization_email}<p style="font-size: 12px; color: #6b7280;">Email: {organization_email}</p>{ENDIF}
        <p style="font-size: 12px; color: #6b7280; margin-top: 20px;">
          {done_at} <strong>{organization_address}</strong>, {on} <strong>{issue_date}</strong>
        </p>
      </div>
    </div>
  `
}

/**
 * Génère le HTML final pour la Politique de Confidentialité en utilisant les balises {variable}
 */
export async function generatePrivacyPolicyHTML(data: {
  organization: {
    name: string
    address?: string
    phone?: string
    email?: string
    logo_url?: string
  }
  issueDate: string
  language?: 'fr' | 'en'
  documentId?: string
  organizationId?: string
}): Promise<string> {
  const lang = data.language || 'fr'
  const t = {
    fr: {
      title: 'POLITIQUE DE CONFIDENTIALITÉ',
      subtitle: 'Protection des données personnelles',
      intro: 'La présente Politique de Confidentialité décrit comment',
      collects: 'collecte, utilise et protège vos données personnelles.',
      doneAt: 'Fait à',
      on: 'le',
    },
    en: {
      title: 'PRIVACY POLICY',
      subtitle: 'Personal data protection',
      intro: 'This Privacy Policy describes how',
      collects: 'collects, uses and protects your personal data.',
      doneAt: 'Done at',
      on: 'on',
    },
  }[lang]
  
  // Générer le template avec balises
  const template = generatePrivacyPolicyTemplate(data)
  
  // Préparer les variables pour le système de balises
  const variables: any = {
    organisation_logo: data.organization.logo_url || '',
    title: t.title,
    subtitle: t.subtitle,
    intro: t.intro,
    organization_name: data.organization.name,
    collects: t.collects,
    organization_address: data.organization.address || '',
    organization_phone: data.organization.phone || '',
    organization_email: data.organization.email || '',
    done_at: t.doneAt,
    on: t.on,
    issue_date: formatDateForDocument(data.issueDate),
  }
  
  // Traiter le template avec le système de génération HTML
  return await processTemplateWithTags(template, variables, data.documentId, data.organizationId)
}

/**
 * Fonction helper pour traiter un template avec balises {variable} et générer le HTML final
 * Utilise le système de génération HTML avancé pour traiter les balises conditionnelles, boucles, etc.
 * 
 * Note: Cette fonction doit être utilisée avec les templates convertis qui utilisent les balises {variable}
 * au lieu des template literals JavaScript ${variable}
 */
export async function processTemplateWithTags(
  templateContent: string,
  variables: DocumentVariables,
  documentId?: string,
  organizationId?: string
): Promise<string> {
  // Créer un template minimal pour le système de génération HTML
  const template: any = {
    id: documentId || 'temp',
    name: 'Template',
    type: 'convention', // Type par défaut
    content: {
      pageSize: 'A4',
      margins: {
        top: 20,
        right: 20,
        bottom: 20,
        left: 20,
      },
      elements: [
        {
          type: 'html',
          html: templateContent,
        },
      ],
    } as any,
    header: null,
    footer: null,
    header_enabled: false,
    footer_enabled: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    organization_id: organizationId || '',
  }

  // Utiliser le système de génération HTML pour traiter le template
  const result = await generateHTML(template, variables, documentId, organizationId)
  
  return result.html
}
