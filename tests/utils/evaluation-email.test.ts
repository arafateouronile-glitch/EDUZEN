/**
 * Tests unitaires pour la mise en page des emails d'évaluation
 */

import { describe, it, expect } from 'vitest'
import { buildEvaluationEmailHtml, withEmailLayout } from '@/lib/utils/evaluation-email'
import { findUnresolvedVariables, withQuestionnaireLink } from '@/lib/services/email-schedule-run'

describe('buildEvaluationEmailHtml', () => {
  const html = buildEvaluationEmailHtml({
    organizationName: 'INSSI <FORMATION>',
    recipientName: 'Kossi AKPEMADO',
    title: 'Questionnaire de satisfaction',
    messageHtml: 'Merci de participer à <strong>Excel</strong>.',
    url: 'https://www.eduzen.io/q/abc',
    buttonLabel: 'Répondre au questionnaire',
  })

  it('reprend la mise en page des modèles : bandeau, message encadré, bouton, signature', () => {
    expect(html).toContain('<!DOCTYPE html>')
    expect(html).toContain('Bonjour Kossi AKPEMADO,')
    expect(html).toContain('Merci de participer à <strong>Excel</strong>.')
    expect(html).toContain('href="https://www.eduzen.io/q/abc"')
    expect(html).toContain("L'équipe INSSI &lt;FORMATION&gt;")
  })

  it('ne laisse aucune balise non remplie', () => {
    expect(findUnresolvedVariables('Objet', html, null)).toEqual([])
  })
})

describe('withEmailLayout', () => {
  it('garde {organization_name} pour le remplacement à l\'envoi des automatisations', () => {
    const { bodyHtml } = withQuestionnaireLink('<p>Bonjour {student_first_name},</p>', '')
    const html = withEmailLayout('Votre avis', bodyHtml)
    expect(html).toContain('{organization_name}')
    expect(html).toContain('href="{questionnaire_url}"')
  })

  it('place le bouton avant la formule de politesse', () => {
    const { bodyHtml } = withQuestionnaireLink('<p>Merci.</p>\n<p style="margin-top: 24px;">Cordialement,<br/>X</p>', '')
    expect(bodyHtml.indexOf('{questionnaire_url}')).toBeLessThan(bodyHtml.indexOf('Cordialement'))
  })

  it('laisse intact un modèle qui a déjà sa propre mise en page', () => {
    const full = '<!DOCTYPE html><html><body><a href="{questionnaire_url}">Go</a></body></html>'
    expect(withEmailLayout('Votre avis', full)).toBe(full)
  })
})
