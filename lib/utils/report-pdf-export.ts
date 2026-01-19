/**
 * Utilitaires pour exporter les rapports en PDF
 */

import { jsPDF } from 'jspdf'
import { formatDate, formatCurrency } from '@/lib/utils/format'

export interface DashboardStats {
  totalStudents: number
  activeSessions: number
  monthlyRevenue: number
  pendingInvoices: number
  attendanceRate?: number
  completedPayments?: number
}

export interface ReportData {
  title: string
  organization: {
    name: string
    address?: string
    logo?: string
  }
  period?: {
    start: string
    end: string
  }
  stats: DashboardStats
  charts?: Array<{
    title: string
    data: any[]
    type: 'line' | 'bar' | 'pie'
  }>
  generatedAt: string
}

/**
 * Génère un PDF de rapport à partir des données du dashboard
 */
export async function generateReportPDF(data: ReportData): Promise<Blob> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  })

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 20
  let yPosition = margin

  // Couleurs
  const primaryColor: [number, number, number] = [37, 99, 235] // brand-blue
  const textColor: [number, number, number] = [31, 41, 55] // gray-800
  const lightGray: [number, number, number] = [243, 244, 246] // gray-100

  // En-tête avec logo
  if (data.organization.logo) {
    try {
      // Si le logo est une URL, on pourrait l'inclure
      // Pour l'instant, on passe cette partie
    } catch (error) {
      console.warn('Impossible de charger le logo:', error)
    }
  }

  // Titre du rapport
  doc.setFontSize(24)
  doc.setTextColor(...primaryColor)
  doc.setFont('helvetica', 'bold')
  doc.text(data.title, margin, yPosition)
  yPosition += 10

  // Informations de l'organisation
  doc.setFontSize(12)
  doc.setTextColor(...textColor)
  doc.setFont('helvetica', 'normal')
  doc.text(data.organization.name, margin, yPosition)
  yPosition += 5

  if (data.organization.address) {
    doc.setFontSize(10)
    doc.setTextColor(107, 114, 128) // gray-500
    doc.text(data.organization.address, margin, yPosition)
    yPosition += 5
  }

  // Période du rapport
  if (data.period) {
    doc.setFontSize(10)
    doc.setTextColor(107, 114, 128)
    doc.text(
      `Période: ${formatDate(data.period.start)} - ${formatDate(data.period.end)}`,
      margin,
      yPosition
    )
    yPosition += 8
  } else {
    yPosition += 5
  }

  // Ligne de séparation
  doc.setDrawColor(...lightGray)
  doc.setLineWidth(0.5)
  doc.line(margin, yPosition, pageWidth - margin, yPosition)
  yPosition += 10

  // Statistiques principales
  doc.setFontSize(16)
  doc.setTextColor(...textColor)
  doc.setFont('helvetica', 'bold')
  doc.text('Statistiques Principales', margin, yPosition)
  yPosition += 10

  // Grille de statistiques (2 colonnes)
  const stats = [
    { label: 'Étudiants totaux', value: data.stats.totalStudents.toString() },
    { label: 'Sessions actives', value: data.stats.activeSessions.toString() },
    {
      label: 'Revenus mensuels',
      value: formatCurrency(data.stats.monthlyRevenue),
    },
    {
      label: 'Factures en attente',
      value: data.stats.pendingInvoices.toString(),
    },
  ]

  if (data.stats.attendanceRate !== undefined) {
    stats.push({
      label: 'Taux de présence',
      value: `${data.stats.attendanceRate}%`,
    })
  }

  if (data.stats.completedPayments !== undefined) {
    stats.push({
      label: 'Paiements complétés',
      value: data.stats.completedPayments.toString(),
    })
  }

  const colWidth = (pageWidth - 2 * margin) / 2
  const rowHeight = 15
  let col = 0
  let row = 0

  stats.forEach((stat, index) => {
    const x = margin + col * colWidth
    const y = yPosition + row * rowHeight

    // Fond gris clair
    doc.setFillColor(...lightGray)
    doc.roundedRect(x, y - 8, colWidth - 5, 12, 2, 2, 'F')

    // Label
    doc.setFontSize(9)
    doc.setTextColor(107, 114, 128)
    doc.setFont('helvetica', 'normal')
    doc.text(stat.label, x + 3, y - 2)

    // Valeur
    doc.setFontSize(14)
    doc.setTextColor(...textColor)
    doc.setFont('helvetica', 'bold')
    doc.text(stat.value, x + 3, y + 4)

    // Passer à la colonne suivante
    col++
    if (col >= 2) {
      col = 0
      row++
    }
  })

  yPosition += row * rowHeight + 15

  // Vérifier si on doit créer une nouvelle page
  if (yPosition > pageHeight - 40) {
    doc.addPage()
    yPosition = margin
  }

  // Informations de génération
  doc.setFontSize(8)
  doc.setTextColor(156, 163, 175) // gray-400
  doc.setFont('helvetica', 'italic')
  doc.text(
    `Généré le ${formatDate(data.generatedAt)}`,
    margin,
    pageHeight - 15
  )

  // Retourner le blob
  return doc.output('blob')
}

/**
 * Télécharge un PDF de rapport
 * 
 * @param data - Données du rapport
 * @param filename - Nom du fichier (optionnel)
 * @param options - Options supplémentaires (organizationId, userId pour l'historique)
 */
export async function downloadReportPDF(
  data: ReportData,
  filename?: string,
  options?: {
    organizationId?: string
    userId?: string
  }
): Promise<void> {
  const blob = await generateReportPDF(data)
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  const finalFilename = filename || `rapport_${new Date().toISOString().split('T')[0]}.pdf`
  link.href = url
  link.download = finalFilename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)

  // Enregistrer dans l'historique si organizationId et userId sont fournis
  if (options?.organizationId && options?.userId) {
    try {
      const { exportHistoryService } = await import('@/lib/services/export-history.service')
      await exportHistoryService.create({
        organizationId: options.organizationId,
        userId: options.userId,
        exportType: 'pdf',
        entityType: 'dashboard_report',
        filename: finalFilename,
        recordCount: 0, // Les rapports n'ont pas de "records" au sens strict
        fileSizeBytes: blob.size,
      })
    } catch (error) {
      // Ne pas bloquer l'export si l'enregistrement de l'historique échoue
      console.warn('Erreur lors de l\'enregistrement de l\'historique d\'export:', error)
    }
  }
}

/**
 * Génère un PDF de rapport d'attendance
 */
export async function generateAttendanceReportPDF(data: {
  title: string
  organization: { name: string; address?: string }
  session: { name: string; startDate: string; endDate: string }
  stats: {
    total: number
    present: number
    absent: number
    late: number
    excused: number
    rate: number
  }
  students: Array<{
    name: string
    present: number
    absent: number
    late: number
    excused: number
    rate: number
  }>
  generatedAt: string
}): Promise<Blob> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  })

  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 20
  let yPosition = margin

  // Titre
  doc.setFontSize(20)
  doc.setTextColor(37, 99, 235)
  doc.setFont('helvetica', 'bold')
  doc.text(data.title, margin, yPosition)
  yPosition += 10

  // Organisation et session
  doc.setFontSize(10)
  doc.setTextColor(31, 41, 55)
  doc.setFont('helvetica', 'normal')
  doc.text(data.organization.name, margin, yPosition)
  yPosition += 5
  doc.text(`Session: ${data.session.name}`, margin, yPosition)
  yPosition += 5
  doc.text(
    `Période: ${formatDate(data.session.startDate)} - ${formatDate(data.session.endDate)}`,
    margin,
    yPosition
  )
  yPosition += 10

  // Statistiques globales
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('Statistiques Globales', margin, yPosition)
  yPosition += 8

  const globalStats = [
    { label: 'Total', value: data.stats.total },
    { label: 'Présents', value: data.stats.present },
    { label: 'Absents', value: data.stats.absent },
    { label: 'En retard', value: data.stats.late },
    { label: 'Excusés', value: data.stats.excused },
    { label: 'Taux de présence', value: `${data.stats.rate}%` },
  ]

  globalStats.forEach((stat) => {
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(`${stat.label}:`, margin, yPosition)
    doc.setFont('helvetica', 'bold')
    doc.text(stat.value.toString(), margin + 50, yPosition)
    yPosition += 6
  })

  yPosition += 5

  // Tableau des étudiants
  if (data.students.length > 0) {
    // Vérifier si on doit créer une nouvelle page
    if (yPosition > 200) {
      doc.addPage()
      yPosition = margin
    }

    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('Détail par étudiant', margin, yPosition)
    yPosition += 8

    // En-têtes du tableau
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setFillColor(243, 244, 246)
    doc.rect(margin, yPosition - 5, pageWidth - 2 * margin, 8, 'F')
    doc.text('Étudiant', margin + 2, yPosition)
    doc.text('Présent', margin + 70, yPosition)
    doc.text('Absent', margin + 85, yPosition)
    doc.text('Retard', margin + 100, yPosition)
    doc.text('Excusé', margin + 115, yPosition)
    doc.text('Taux', margin + 130, yPosition)
    yPosition += 8

    // Lignes du tableau
    data.students.forEach((student, index) => {
      if (yPosition > 270) {
        doc.addPage()
        yPosition = margin
        // Réimprimer les en-têtes
        doc.setFont('helvetica', 'bold')
        doc.setFillColor(243, 244, 246)
        doc.rect(margin, yPosition - 5, pageWidth - 2 * margin, 8, 'F')
        doc.text('Étudiant', margin + 2, yPosition)
        doc.text('Présent', margin + 70, yPosition)
        doc.text('Absent', margin + 85, yPosition)
        doc.text('Retard', margin + 100, yPosition)
        doc.text('Excusé', margin + 115, yPosition)
        doc.text('Taux', margin + 130, yPosition)
        yPosition += 8
      }

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.text(student.name.substring(0, 30), margin + 2, yPosition)
      doc.text(student.present.toString(), margin + 70, yPosition)
      doc.text(student.absent.toString(), margin + 85, yPosition)
      doc.text(student.late.toString(), margin + 100, yPosition)
      doc.text(student.excused.toString(), margin + 115, yPosition)
      doc.text(`${student.rate}%`, margin + 130, yPosition)
      yPosition += 6
    })
  }

  // Pied de page
  doc.setFontSize(8)
  doc.setTextColor(156, 163, 175)
  doc.setFont('helvetica', 'italic')
  doc.text(
    `Généré le ${formatDate(data.generatedAt)}`,
    margin,
    doc.internal.pageSize.getHeight() - 15
  )

  return doc.output('blob')
}

