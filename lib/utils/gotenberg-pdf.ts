/**
 * Client Gotenberg pour la génération PDF côté serveur.
 * Délègue au service gotenberg.service (retry, auth, header/footer).
 *
 * Env: GOTENBERG_URL ; optionnel : GOTENBERG_API_KEY ou GOTENBERG_BASIC_AUTH
 */

import {
  isGotenbergConfigured,
  generatePDFWithGotenberg as generateFromService,
  type GotenbergHtmlToPdfOptions,
} from '@/lib/services/gotenberg.service'

export { isGotenbergConfigured, type GotenbergError } from '@/lib/services/gotenberg.service'

export type GotenbergPDFOptions = Pick<
  GotenbergHtmlToPdfOptions,
  'format' | 'marginTop' | 'marginBottom' | 'marginLeft' | 'marginRight' | 'waitDelay'
>

export async function generatePDFWithGotenberg(
  html: string,
  options: GotenbergPDFOptions = {}
): Promise<Buffer> {
  return generateFromService(html, options)
}
