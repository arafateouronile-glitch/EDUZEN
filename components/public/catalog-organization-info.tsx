'use client'

import { motion } from '@/components/ui/motion'
import { Award, MapPin, Mail, Phone, Sparkles } from 'lucide-react'
import type { TableRow } from '@/lib/types/supabase-helpers'

type Organization = TableRow<'organizations'>

interface CatalogOrganizationInfoProps {
  organization: Organization
  logoUrl?: string | null
  primaryColor: string
}

export function CatalogOrganizationInfo({ organization, logoUrl, primaryColor }: CatalogOrganizationInfoProps) {
  return (
    <section className="relative py-20 lg:py-24 bg-gradient-to-b from-white via-gray-50/30 to-white">
      {/* Pattern de fond subtil */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:40px_40px]" />
      
      <div className="relative container mx-auto px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.8, ease: [0.23, 1, 0.32, 1] }}
          className="relative"
        >
          {/* Effet de glow autour de la carte */}
          <div 
            className="absolute -inset-1 bg-gradient-to-r opacity-20 blur-xl rounded-3xl"
            style={{
              background: `linear-gradient(135deg, ${primaryColor}40, ${primaryColor}20, ${primaryColor}40)`,
            }}
          />
          
          <div className="relative bg-white/90 backdrop-blur-2xl rounded-3xl shadow-2xl shadow-black/5 border border-gray-200/60 p-10 lg:p-14">
            {/* Accent decoration en haut */}
            <div 
              className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-1 rounded-full"
              style={{
                background: `linear-gradient(to right, transparent, ${primaryColor}, transparent)`,
              }}
            />
            
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-10">
              <div className="flex items-start gap-8 flex-1">
                {logoUrl && (
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0, rotate: -5 }}
                    whileInView={{ scale: 1, opacity: 1, rotate: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: 0.2, type: 'spring', stiffness: 200 }}
                    className="flex-shrink-0"
                  >
                    <div className="relative group">
                      {/* Glow effect au hover */}
                      <div 
                        className="absolute -inset-2 bg-gradient-to-r opacity-0 group-hover:opacity-30 blur-xl transition-opacity duration-500 rounded-3xl"
                        style={{
                          background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}88)`,
                        }}
                      />
                      <div className="relative w-32 h-32 lg:w-36 lg:h-36 rounded-3xl bg-gradient-to-br from-gray-50 via-white to-gray-100 p-5 shadow-xl border border-gray-200/60 group-hover:shadow-2xl transition-all duration-500">
                        <img
                          src={logoUrl}
                          alt={organization.name}
                          className="w-full h-full object-contain"
                        />
                      </div>
                    </div>
                  </motion.div>
                )}
                <div className="flex-1 space-y-4">
                  <div className="flex items-center gap-3">
                    <h2 className="text-4xl lg:text-5xl font-extrabold text-gray-900 tracking-tight">
                      {organization.name}
                    </h2>
                    <motion.div
                      initial={{ scale: 0 }}
                      whileInView={{ scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.4, delay: 0.4, type: 'spring' }}
                    >
                      <Sparkles 
                        className="w-6 h-6" 
                        style={{ color: primaryColor }}
                      />
                    </motion.div>
                  </div>
                  
                  {organization.address && (
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: 0.3 }}
                      className="flex items-start gap-4 text-gray-600 group"
                    >
                      <div 
                        className="p-2 rounded-xl bg-gray-50 group-hover:bg-gray-100 transition-colors"
                        style={{ backgroundColor: `${primaryColor}10` }}
                      >
                        <MapPin className="w-5 h-5 flex-shrink-0" style={{ color: primaryColor }} />
                      </div>
                      <p className="text-base lg:text-lg leading-relaxed pt-1">{organization.address}</p>
                    </motion.div>
                  )}
                  
                  <div className="flex flex-wrap gap-4 pt-2">
                    {organization.email && (
                      <motion.a
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.4, delay: 0.4 }}
                        whileHover={{ scale: 1.05 }}
                        href={`mailto:${organization.email}`}
                        className="flex items-center gap-3 px-4 py-2.5 text-gray-700 hover:text-gray-900 transition-all rounded-xl hover:bg-gray-50 group"
                      >
                        <div 
                          className="p-1.5 rounded-lg bg-gray-50 group-hover:bg-gray-100 transition-colors"
                          style={{ backgroundColor: `${primaryColor}10` }}
                        >
                          <Mail className="w-4 h-4 group-hover:scale-110 transition-transform" style={{ color: primaryColor }} />
                        </div>
                        <span className="text-sm font-semibold">{organization.email}</span>
                      </motion.a>
                    )}
                    {organization.phone && (
                      <motion.a
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.4, delay: 0.5 }}
                        whileHover={{ scale: 1.05 }}
                        href={`tel:${organization.phone}`}
                        className="flex items-center gap-3 px-4 py-2.5 text-gray-700 hover:text-gray-900 transition-all rounded-xl hover:bg-gray-50 group"
                      >
                        <div 
                          className="p-1.5 rounded-lg bg-gray-50 group-hover:bg-gray-100 transition-colors"
                          style={{ backgroundColor: `${primaryColor}10` }}
                        >
                          <Phone className="w-4 h-4 group-hover:scale-110 transition-transform" style={{ color: primaryColor }} />
                        </div>
                        <span className="text-sm font-semibold">{organization.phone}</span>
                      </motion.a>
                    )}
                  </div>
                </div>
              </div>

              {/* Attestation Qualiopi améliorée */}
              {organization.qualiopi_certificate_url && (
                <motion.div
                  initial={{ scale: 0.9, opacity: 0, x: 20 }}
                  whileInView={{ scale: 1, opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.4, type: 'spring' }}
                  whileHover={{ scale: 1.05, y: -2 }}
                  className="flex-shrink-0"
                >
                  <a
                    href={organization.qualiopi_certificate_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group relative inline-flex items-center gap-3 px-8 py-5 bg-gradient-to-br from-green-600 via-green-600 to-green-700 text-white rounded-2xl font-bold hover:from-green-700 hover:via-green-700 hover:to-green-800 transition-all duration-500 shadow-xl shadow-green-500/25 hover:shadow-2xl hover:shadow-green-500/35 border border-green-500/20 overflow-hidden"
                  >
                    {/* Effet de brillance */}
                    <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                    <Award className="w-6 h-6 relative z-10 group-hover:rotate-12 transition-transform duration-300" />
                    <span className="relative z-10">Attestation Qualiopi</span>
                    <svg className="w-5 h-5 relative z-10 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </motion.div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
