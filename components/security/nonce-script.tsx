'use client'

import { useNonce } from '@/lib/contexts/nonce-context'
import Script, { type ScriptProps } from 'next/script'
import { logger, sanitizeError } from '@/lib/utils/logger'

/**
 * Composant Script avec nonce CSP automatique
 *
 * Wrapper autour de next/script qui ajoute automatiquement le nonce CSP.
 * Utiliser ce composant au lieu de <Script> pour tous les scripts inline.
 *
 * @example
 * ```tsx
 * <NonceScript id="analytics" strategy="afterInteractive">
 *   {`logger.debug('Analytics loaded')`}
 * </NonceScript>
 * ```
 */
export function NonceScript({ children, ...props }: ScriptProps) {
  const nonce = useNonce()

  return (
    <Script {...props} nonce={nonce}>
      {children}
    </Script>
  )
}

/**
 * Composant pour les scripts inline avec nonce
 *
 * Pour les cas où vous avez besoin d'un script inline simple
 * sans les fonctionnalités de next/script.
 *
 * @example
 * ```tsx
 * <InlineScript>
 *   {`window.dataLayer = window.dataLayer || []`}
 * </InlineScript>
 * ```
 */
export function InlineScript({
  children,
  id,
}: {
  children: string
  id?: string
}) {
  const nonce = useNonce()

  return (
    <script
      id={id}
      nonce={nonce}
      dangerouslySetInnerHTML={{ __html: children }}
    />
  )
}
