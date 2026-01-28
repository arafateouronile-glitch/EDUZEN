'use client'

import { useId } from 'react'
import { generatePDFFromHTML } from '@/lib/utils/pdf-generator'
import { Button } from '@/components/ui/button'
import { FileDown } from 'lucide-react'
import { cn } from '@/lib/utils'

const DEEP_BLUE = '#274472'
const ELECTRIC_CYAN = '#34B9EE'

export interface AttendanceSheetStudent {
  id: string
  firstName: string
  lastName: string
  studentNumber?: string
  signatureData?: string | null
  signedAt?: string | null
  status?: 'present' | 'absent' | 'late' | 'excused'
}

export interface AttendanceSheetGeneratorProps {
  sessionTitle: string
  sessionDate: string
  organizationName: string
  organizationAddress?: string
  students: AttendanceSheetStudent[]
  integrityHash?: string
  filename?: string
  className?: string
  onExport?: (blob: Blob) => void
}

const ELEMENT_ID = 'attendance-sheet-pdf'

/**
 * Génère une feuille d'émargement PDF avec Certificat d'Intégrité (hash).
 * Style minimaliste, couleurs EDUZEN #274472 / #34B9EE.
 */
export function AttendanceSheetGenerator({
  sessionTitle,
  sessionDate,
  organizationName,
  organizationAddress,
  students,
  integrityHash,
  filename,
  className,
  onExport,
}: AttendanceSheetGeneratorProps) {
  const uid = useId().replace(/:/g, '-')
  const elementId = `${ELEMENT_ID}-${uid}`

  const handleExport = async () => {
    const fn = filename ?? `Feuille_emargement_${sessionTitle.replace(/\s+/g, '_')}_${sessionDate}.pdf`
    const blob = await generatePDFFromHTML(elementId, fn)
    onExport?.(blob)
  }

  const formattedDate = new Date(sessionDate).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className={cn('space-y-4', className)}>
      <div
        id={elementId}
        className="bg-white text-gray-900 rounded-lg shadow-sm border border-gray-200 overflow-hidden"
        style={{ maxWidth: '210mm', margin: '0 auto' }}
      >
        {/* Header */}
        <div
          className="px-8 pt-8 pb-6 border-b"
          style={{ borderColor: ELECTRIC_CYAN, borderWidth: '0 0 3px 0' }}
        >
          <h1
            className="text-xl font-bold uppercase tracking-tight mb-2"
            style={{ color: DEEP_BLUE }}
          >
            Feuille d&apos;émargement
          </h1>
          <p className="text-sm text-gray-600 font-medium">{organizationName}</p>
          {organizationAddress && (
            <p className="text-xs text-gray-500">{organizationAddress}</p>
          )}
        </div>

        {/* Session info */}
        <div className="px-8 py-4 bg-gray-50 border-b border-gray-200">
          <div className="flex flex-wrap gap-6 text-sm">
            <div>
              <span className="text-gray-500">Session :</span>{' '}
              <span className="font-medium">{sessionTitle}</span>
            </div>
            <div>
              <span className="text-gray-500">Date :</span>{' '}
              <span className="font-medium">{formattedDate}</span>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="px-8 py-6">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr style={{ backgroundColor: DEEP_BLUE, color: 'white' }}>
                <th className="text-left py-3 px-4 font-semibold rounded-tl">N°</th>
                <th className="text-left py-3 px-4 font-semibold">Nom</th>
                <th className="text-left py-3 px-4 font-semibold">Prénom</th>
                {students.some((s) => s.studentNumber) && (
                  <th className="text-left py-3 px-4 font-semibold">N° stagiaire</th>
                )}
                <th className="text-left py-3 px-4 font-semibold">Signature</th>
                <th className="text-left py-3 px-4 font-semibold rounded-tr">Date signature</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s, i) => (
                <tr
                  key={s.id}
                  className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                  style={{ borderBottom: '1px solid #e5e7eb' }}
                >
                  <td className="py-3 px-4">{i + 1}</td>
                  <td className="py-3 px-4 font-medium">{s.lastName}</td>
                  <td className="py-3 px-4">{s.firstName}</td>
                  {students.some((x) => x.studentNumber) && (
                    <td className="py-3 px-4 text-gray-600">{s.studentNumber ?? '—'}</td>
                  )}
                  <td className="py-3 px-4">
                    {s.signatureData ? (
                      <img
                        src={s.signatureData}
                        alt={`Signature ${s.lastName}`}
                        className="h-10 object-contain"
                        style={{ maxWidth: 120 }}
                      />
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-gray-600">
                    {s.signedAt
                      ? new Date(s.signedAt).toLocaleString('fr-FR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Certificat d'intégrité */}
        <div
          className="px-8 py-6 mt-6 border-t-2"
          style={{ borderColor: DEEP_BLUE, backgroundColor: 'rgba(39,68,114,0.04)' }}
        >
          <h2
            className="text-sm font-bold uppercase tracking-wider mb-2"
            style={{ color: DEEP_BLUE }}
          >
            Certificat d&apos;intégrité
          </h2>
          <p className="text-xs text-gray-600 mb-2">
            Ce document a été scellé par un hash SHA-256. Toute modification invalide le hash.
            Conforme OPCO/Qualiopi.
          </p>
          {integrityHash ? (
            <p
              className="font-mono text-xs break-all py-2 px-3 rounded bg-gray-100 border border-gray-200"
              title="Hash d'intégrité"
            >
              {integrityHash}
            </p>
          ) : (
            <p className="text-xs text-gray-400 italic">
              Hash non disponible (génération hors chaîne de preuve).
            </p>
          )}
          <p className="text-xs text-gray-500 mt-2">
            Généré le {new Date().toLocaleString('fr-FR')} — EDUZEN
          </p>
        </div>
      </div>

      <Button
        type="button"
        variant="outline"
        onClick={handleExport}
        className="gap-2"
      >
        <FileDown className="h-4 w-4" />
        Exporter en PDF
      </Button>
    </div>
  )
}
