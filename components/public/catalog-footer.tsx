'use client'

import { motion } from '@/components/ui/motion'
import { sanitizeHTML } from '@/lib/utils/sanitize-html'
import { BRAND_COLORS } from '@/lib/config/app-config'

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

  return (
    <footer className="relative bg-gradient-to-b from-gray-50 to-white border-t border-gray-200/60 mt-20">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
      <div className="relative container mx-auto px-6 lg:px-8 py-16">
        {footerContent && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mb-12 text-gray-600 prose prose-sm max-w-none prose-headings:text-gray-900 prose-a:text-blue-600 hover:prose-a:text-blue-700"
            dangerouslySetInnerHTML={{ __html: sanitizeHTML(footerContent) }}
          />
        )}
        
        <div className="border-t border-gray-200/60 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="text-center md:text-left space-y-2"
            >
              {contactAddress && (
                <p className="text-sm text-gray-600 font-medium">{contactAddress}</p>
              )}
              <div className="flex flex-col md:flex-row gap-3 md:gap-6 text-sm">
                {contactEmail && (
                  <a 
                    href={`mailto:${contactEmail}`}
                    className="text-gray-600 hover:text-gray-900 transition-colors font-medium"
                  >
                    {contactEmail}
                  </a>
                )}
                {contactPhone && (
                  <a 
                    href={`tel:${contactPhone}`}
                    className="text-gray-600 hover:text-gray-900 transition-colors font-medium"
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
              className="text-sm text-gray-500 font-medium"
            >
              © {currentYear} {organizationName}. Tous droits réservés.
            </motion.p>
          </div>
        </div>
      </div>
    </footer>
  )
}
