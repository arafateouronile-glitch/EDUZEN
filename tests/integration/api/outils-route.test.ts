import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/utils/rate-limiter-distributed', () => ({
  withDistributedRateLimit: (req: Request, _type: string, handler: (r: Request) => Promise<Response>) => handler(req),
}))
vi.mock('@/lib/outils/generate', () => ({
  generateOutilPdf: vi.fn().mockResolvedValue({ pdf: Buffer.from('%PDF') }),
}))
vi.mock('@/lib/outils/leads', () => ({
  recordLead: vi.fn().mockResolvedValue({ id: 'l1', email: 'marie@exemple.fr', first_name: 'Marie', unsubscribe_token: 'tok', created: true }),
  unsubscribeUrl: (b: string, t: string) => `${b}/desabonnement?t=${t}`,
  unsubscribeHeaders: () => ({ 'List-Unsubscribe': '<x>' }),
}))
vi.mock('@/lib/utils/send-email-resend', () => ({
  sendEmailViaResend: vi.fn().mockResolvedValue({ success: true }),
}))

import { POST } from '@/app/api/outils/[tool]/route'
import { GET as cronGET } from '@/app/api/cron/lead-nurture/route'
import { generateOutilPdf } from '@/lib/outils/generate'
import { recordLead } from '@/lib/outils/leads'
import { sendEmailViaResend } from '@/lib/utils/send-email-resend'

const post = (tool: string, body: unknown) =>
  POST(new NextRequest(`http://localhost/api/outils/${tool}`, { method: 'POST', body: JSON.stringify(body) }), {
    params: Promise.resolve({ tool }),
  })

const valid = {
  organisme: { nom: 'OF Test', ville: 'Paris' },
  lead: { first_name: 'Marie', last_name: 'Dupont', email: 'marie@exemple.fr' },
  fields: { eleve_nom: 'DUPONT', eleve_prenom: 'Marie', formation_nom: 'SSIAP 1', formation_duree: '67 h', session_debut: '2026-11-02', session_fin: '2026-11-13' },
}

describe('POST /api/outils/[tool]', () => {
  beforeEach(() => vi.clearAllMocks())

  it('404 pour un outil inconnu', async () => {
    expect((await post('inconnu', valid)).status).toBe(404)
  })

  it('champ piège rempli : faux succès sans rien générer', async () => {
    const res = await post('certificat', { ...valid, website: 'spam' })
    expect(res.status).toBe(200)
    expect(generateOutilPdf).not.toHaveBeenCalled()
    expect(recordLead).not.toHaveBeenCalled()
  })

  it('400 si un champ obligatoire manque', async () => {
    const res = await post('certificat', { ...valid, fields: { ...valid.fields, eleve_nom: '' } })
    expect(res.status).toBe(400)
  })

  it('400 pour un logo en URL distante', async () => {
    const res = await post('certificat', { ...valid, organisme: { ...valid.organisme, logo: 'http://169.254.169.254/x.png' } })
    expect(res.status).toBe(400)
  })

  it('400 si le questionnaire Qualiopi est incomplet', async () => {
    const res = await post('qualiopi', { ...valid, organisme: { nom: 'OF' }, fields: { answers: { '1': 'oui' } } })
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/indicateur/)
  })

  it('génère, enregistre le lead et envoie le PDF par email', async () => {
    const res = await post('certificat', valid)
    expect(res.status).toBe(200)
    expect(recordLead).toHaveBeenCalledWith(expect.objectContaining({ email: 'marie@exemple.fr', tool: 'certificat' }))
    expect(sendEmailViaResend).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'marie@exemple.fr',
        attachments: [expect.objectContaining({ filename: 'certificat-de-realisation.pdf' })],
        headers: expect.objectContaining({ 'List-Unsubscribe': expect.any(String) }),
      })
    )
  })

  it("502 si l'email ne part pas", async () => {
    vi.mocked(sendEmailViaResend).mockResolvedValueOnce({ success: false, error: 'boom' })
    expect((await post('certificat', valid)).status).toBe(502)
  })
})

describe('GET /api/cron/lead-nurture', () => {
  it('401 sans le secret du cron', async () => {
    process.env.CRON_SECRET = 'secret'
    const res = await cronGET(new NextRequest('http://localhost/api/cron/lead-nurture'))
    expect(res.status).toBe(401)
  })
})
