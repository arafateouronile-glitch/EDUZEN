import { describe, it, expect } from 'vitest'
import { getDefaultTemplateContent } from '@/lib/utils/document-template-defaults'
import { bodyHash, isUncustomizedCertificat, PREVIOUS_DEFAULT_BODY_HASHES } from '@/lib/utils/certificat-realisation-migration'

describe('certificat de réalisation par défaut', () => {
  const body = getDefaultTemplateContent('certificat_realisation')!.bodyContent

  it('reprend le modèle officiel du Ministère du Travail', () => {
    for (const v of ['{ecole_representant}', '{ecole_nom}', '{eleve_nom}', '{eleve_prenom}', '{entreprise_nom}',
      '{formation_nom}', '{session_debut}', '{session_fin}', '{formation_duree}', '{ecole_ville}', '{date_jour}']) {
      expect(body).toContain(v)
    }
    for (const nature of ['action de formation', 'bilan de compétences', 'action de VAE', 'action de formation par apprentissage']) {
      expect(body).toContain(nature)
    }
    expect(body).toContain('pendant une durée de 3 ans')
    expect(body).toContain('CERTIFICAT DE REALISATION')
  })

  it("n'est pas confondu avec un ancien modèle par défaut", () => {
    expect(PREVIOUS_DEFAULT_BODY_HASHES.has(bodyHash(body))).toBe(false)
  })
})

describe('isUncustomizedCertificat', () => {
  const old = { created_at: '2026-01-01T00:00:00Z', updated_at: '2026-03-01T00:00:00Z' }

  it('modèle jamais réenregistré : non personnalisé', () => {
    expect(isUncustomizedCertificat({ created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:10Z', content: { html: '<p>x</p>' } })).toBe(true)
  })

  it('HTML modifié puis réenregistré : personnalisé', () => {
    expect(isUncustomizedCertificat({ ...old, content: { html: '<p>Mon certificat</p>' } })).toBe(false)
  })

  it("ignore les différences d'espaces avec un ancien modèle", () => {
    const html = '<p>a</p>'
    const known = bodyHash(html)
    PREVIOUS_DEFAULT_BODY_HASHES.add(known)
    expect(isUncustomizedCertificat({ ...old, content: { html: '  <p>a</p>\n ' } })).toBe(true)
    PREVIOUS_DEFAULT_BODY_HASHES.delete(known)
  })
})
