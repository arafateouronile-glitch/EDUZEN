/**
 * Générateur HTML — Feuille d'émargement Qualiopi
 * Format A4 paysage, conforme aux exigences françaises de formation professionnelle.
 */

export interface AttendanceSheetData {
  organization: {
    name: string
    nda_number?: string | null
    address?: string | null
    city?: string | null
    logo_url?: string | null
  }
  session: {
    name: string
    start_date: string
    end_date: string
    location?: string | null
  }
  formation?: { name: string | null } | null
  teacher?: { full_name: string | null } | null
  students: { last_name: string; first_name: string; company?: string | null }[]
  slots: { date: string; time_slot: string; label: string }[] // label = "Matin" | "Après-midi"
}

function esc(s: string | null | undefined): string {
  return (s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function fmtDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

function fmtDateShort(iso: string): string {
  try {
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit', month: '2-digit',
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

// Max colonnes par page (A4 paysage ~10 slots, portrait ~6)
const SLOTS_PER_PAGE = 10
const STUDENTS_PER_PAGE = 20

export function generateAttendanceSheetHtml(data: AttendanceSheetData): string {
  const { organization, session, formation, teacher, students, slots } = data

  // Regrouper les slots par page (max SLOTS_PER_PAGE colonnes par page)
  const slotChunks: typeof slots[] = []
  for (let i = 0; i < slots.length; i += SLOTS_PER_PAGE) {
    slotChunks.push(slots.slice(i, i + SLOTS_PER_PAGE))
  }
  if (slotChunks.length === 0) slotChunks.push([]) // au moins une page même sans slots

  // Regrouper les étudiants par page
  const studentChunks: typeof students[] = []
  for (let i = 0; i < students.length; i += STUDENTS_PER_PAGE) {
    studentChunks.push(students.slice(i, i + STUDENTS_PER_PAGE))
  }
  if (studentChunks.length === 0) studentChunks.push([])

  const pages: string[] = []

  for (const slotChunk of slotChunks) {
    for (const studentChunk of studentChunks) {
      const colWidth = slotChunk.length > 0
        ? Math.max(48, Math.floor(560 / slotChunk.length))
        : 80

      // En-tête colonnes (regroupées par date)
      const dateGroups = new Map<string, number>()
      for (const slot of slotChunk) {
        dateGroups.set(slot.date, (dateGroups.get(slot.date) ?? 0) + 1)
      }

      const dateHeaderCells = Array.from(dateGroups.entries())
        .map(([date, count]) =>
          `<th colspan="${count}" style="border:1px solid #ccc;padding:4px 2px;background:#f0f4f8;font-size:10px;text-align:center;white-space:nowrap;">
             ${fmtDateShort(date)}
           </th>`
        ).join('')

      const slotHeaderCells = slotChunk
        .map((s) =>
          `<th style="border:1px solid #ccc;padding:3px 1px;background:#e8edf2;font-size:9px;text-align:center;white-space:nowrap;width:${colWidth}px;">
             ${esc(s.label)}
           </th>`
        ).join('')

      const studentRows = studentChunk
        .map((st, idx) => {
          const signatureCells = slotChunk
            .map(() => `<td style="border:1px solid #ccc;width:${colWidth}px;height:36px;"></td>`)
            .join('')
          const bg = idx % 2 === 0 ? '#ffffff' : '#f9fafb'
          return `
            <tr style="background:${bg};">
              <td style="border:1px solid #ccc;padding:4px 8px;font-size:11px;white-space:nowrap;">
                <strong>${esc(st.last_name.toUpperCase())}</strong> ${esc(st.first_name)}
                ${st.company ? `<div style="font-size:9px;color:#666;">${esc(st.company)}</div>` : ''}
              </td>
              ${signatureCells}
            </tr>`
        }).join('')

      // Lignes vides si peu d'étudiants (au moins 10 lignes)
      const emptyRows = Math.max(0, 10 - studentChunk.length)
      const emptyRowsHtml = Array.from({ length: emptyRows })
        .map((_, idx) => {
          const signatureCells = slotChunk
            .map(() => `<td style="border:1px solid #ccc;width:${colWidth}px;height:36px;"></td>`)
            .join('')
          const bg = (studentChunk.length + idx) % 2 === 0 ? '#ffffff' : '#f9fafb'
          return `<tr style="background:${bg};">
            <td style="border:1px solid #ccc;padding:4px 8px;font-size:11px;height:36px;">&nbsp;</td>
            ${signatureCells}
          </tr>`
        }).join('')

      pages.push(`
        <div class="page">
          <!-- Header -->
          <table style="width:100%;margin-bottom:12px;border-collapse:collapse;">
            <tr>
              <td style="width:120px;vertical-align:middle;padding-right:12px;">
                ${organization.logo_url
                  ? `<img src="${esc(organization.logo_url)}" style="max-height:60px;max-width:110px;object-fit:contain;" />`
                  : `<div style="width:110px;height:55px;background:#274472;border-radius:6px;display:flex;align-items:center;justify-content:center;">
                       <span style="color:white;font-weight:bold;font-size:13px;">EDUZEN</span>
                     </div>`
                }
              </td>
              <td style="vertical-align:top;padding-left:8px;">
                <div style="font-size:18px;font-weight:bold;color:#274472;margin-bottom:2px;">
                  FEUILLE D'ÉMARGEMENT
                </div>
                <div style="font-size:11px;color:#555;">
                  ${esc(organization.name)}
                  ${organization.nda_number ? ` — Déclaration d'activité n° ${esc(organization.nda_number)}` : ''}
                </div>
              </td>
            </tr>
          </table>

          <!-- Infos session -->
          <table style="width:100%;margin-bottom:10px;border-collapse:collapse;font-size:11px;">
            <tr>
              <td style="padding:3px 8px;width:50%;background:#f0f4f8;border:1px solid #dde;">
                <strong>Formation :</strong> ${esc(formation?.name ?? session.name)}
              </td>
              <td style="padding:3px 8px;width:50%;background:#f0f4f8;border:1px solid #dde;">
                <strong>Session :</strong> ${esc(session.name)}
              </td>
            </tr>
            <tr>
              <td style="padding:3px 8px;border:1px solid #dde;">
                <strong>Dates :</strong> du ${fmtDate(session.start_date)} au ${fmtDate(session.end_date)}
              </td>
              <td style="padding:3px 8px;border:1px solid #dde;">
                <strong>Lieu :</strong> ${esc(session.location ?? 'Non renseigné')}
              </td>
            </tr>
            <tr>
              <td style="padding:3px 8px;border:1px solid #dde;" colspan="2">
                <strong>Formateur :</strong> ${esc(teacher?.full_name ?? 'Non assigné')}
              </td>
            </tr>
          </table>

          <!-- Tableau émargement -->
          <table style="width:100%;border-collapse:collapse;table-layout:fixed;">
            <colgroup>
              <col style="width:200px;" />
              ${slotChunk.map(() => `<col style="width:${colWidth}px;" />`).join('')}
            </colgroup>
            <thead>
              <tr>
                <th rowspan="2" style="border:1px solid #ccc;padding:6px 8px;background:#274472;color:white;font-size:11px;text-align:left;vertical-align:bottom;">
                  Nom / Prénom
                </th>
                ${dateHeaderCells || '<th style="border:1px solid #ccc;background:#f0f4f8;"></th>'}
              </tr>
              <tr>
                ${slotHeaderCells || '<th style="border:1px solid #ccc;background:#e8edf2;font-size:9px;">—</th>'}
              </tr>
            </thead>
            <tbody>
              ${studentRows}
              ${emptyRowsHtml}
            </tbody>
          </table>

          <!-- Signature formateur -->
          <div style="margin-top:20px;font-size:10px;color:#444;border-top:1px solid #ddd;padding-top:10px;">
            <p style="margin:0 0 8px;">
              Je soussigné(e), <strong>${esc(teacher?.full_name ?? '___________________________')}</strong>,
              certifie avoir dispensé la formation indiquée ci-dessus.
            </p>
            <table style="width:100%;font-size:10px;">
              <tr>
                <td style="width:50%;padding-top:4px;">
                  Signature du formateur :
                  <div style="margin-top:24px;border-bottom:1px solid #999;width:200px;"></div>
                </td>
                <td style="width:50%;padding-top:4px;">
                  Date :
                  <div style="margin-top:24px;border-bottom:1px solid #999;width:120px;"></div>
                </td>
              </tr>
            </table>
          </div>

          <!-- Pied de page -->
          <div style="position:absolute;bottom:12px;left:20px;right:20px;font-size:8px;color:#aaa;display:flex;justify-content:space-between;">
            <span>Document généré par EDUZEN</span>
            <span>${esc(organization.name)} — ${new Date().toLocaleDateString('fr-FR')}</span>
          </div>
        </div>
      `)
    }
  }

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, Helvetica, sans-serif; background: white; }
    .page {
      position: relative;
      width: 277mm;
      min-height: 190mm;
      padding: 14mm 14mm 20mm;
      page-break-after: always;
      background: white;
    }
    .page:last-child { page-break-after: avoid; }
    @page { size: A4 landscape; margin: 0; }
    @media print { body { margin: 0; } }
  </style>
</head>
<body>${pages.join('')}</body>
</html>`
}

/**
 * Génère des slots par défaut (matin/après-midi chaque jour) quand session_slots est vide.
 */
export function generateDefaultSlots(startDate: string, endDate: string): AttendanceSheetData['slots'] {
  const slots: AttendanceSheetData['slots'] = []
  const start = new Date(startDate)
  const end   = new Date(endDate)
  const cur   = new Date(start)
  while (cur <= end) {
    const iso = cur.toISOString().split('T')[0]
    slots.push({ date: iso, time_slot: 'morning',   label: 'Matin' })
    slots.push({ date: iso, time_slot: 'afternoon', label: 'Après-midi' })
    cur.setDate(cur.getDate() + 1)
  }
  return slots
}
