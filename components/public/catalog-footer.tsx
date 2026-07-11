'use client'

import { motion } from '@/components/ui/motion'
import { sanitizeHTML } from '@/lib/utils/sanitize-html'
import { BRAND_COLORS } from '@/lib/config/app-config'
import { lightenHexColor } from '@/lib/utils'

interface CatalogFooterProps {
  organizationName: string
  footerContent?: string | null
  contactEmail?: string | null
  contactPhone?: string | null
  contactAddress?: string | null
  primaryColor?: string
}

export function CatalogFooter({
  organizationName,
  footerContent,
  contactEmail,
  contactPhone,
  contactAddress,
  primaryColor = BRAND_COLORS.primary,
}: CatalogFooterProps) {
  const currentYear = new Date().getFullYear()
  const accentColor = lightenHexColor(primaryColor, 0.4)

  return (
    <footer className="relative bg-[#0B0F19] text-white mt-20 overflow-hidden">
      {/* Filigrane géant du nom de l'organisme (motif landing page) */}
      <p
        aria-hidden
        className="pointer-events-none select-none absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap font-display font-black text-white/[0.04] text-[14vw] leading-none"
      >
        {organizationName}
      </p>
      {/* Ligne d'accent en dégradé en haut */}
      <div
        className="absolute top-0 left-0 right-0 h-px"
        style={{ background: `linear-gradient(to right, transparent, ${accentColor}, transparent)` }}
      />

      <div className="relative container mx-auto px-6 lg:px-8 py-16">
        {footerContent && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mb-12 text-white/70 prose prose-sm prose-invert max-w-none prose-headings:text-white prose-a:text-white hover:prose-a:text-white/80"
            dangerouslySetInnerHTML={{ __html: sanitizeHTML(footerContent) }}
          />
        )}

        <div className="border-t border-white/10 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="text-center md:text-left space-y-2"
            >
              {contactAddress && (
                <p className="text-sm text-white/60 font-medium">{contactAddress}</p>
              )}
              <div className="flex flex-col md:flex-row gap-3 md:gap-6 text-sm">
                {contactEmail && (
                  <a
                    href={`mailto:${contactEmail}`}
                    className="text-white/60 hover:text-white transition-colors font-medium"
                  >
                    {contactEmail}
                  </a>
                )}
                {contactPhone && (
                  <a
                    href={`tel:${contactPhone}`}
                    className="text-white/60 hover:text-white transition-colors font-medium"
                  >
                    {contactPhone}
                  </a>
                )}
              </div>
            </motion.div>
            <motion.p
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="text-sm text-white/50 font-medium"
            >
              © {currentYear} {organizationName}. Tous droits réservés.
            </motion.p>
          </div>
        </div>
      </div>
    </footer>
  )
}
