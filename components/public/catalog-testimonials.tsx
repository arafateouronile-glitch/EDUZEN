'use client'

import { motion } from '@/components/ui/motion'
import { Star, Quote } from 'lucide-react'
import { lightenHexColor } from '@/lib/utils'

export interface CatalogTestimonial {
  author_name: string
  author_role?: string | null
  quote: string
  rating?: number | null
}

interface CatalogTestimonialsProps {
  testimonials: CatalogTestimonial[]
  primaryColor: string
}

export function CatalogTestimonials({ testimonials, primaryColor }: CatalogTestimonialsProps) {
  if (!testimonials || testimonials.length === 0) return null

  const accentColor = lightenHexColor(primaryColor, 0.4)

  return (
    <section className="relative py-20 lg:py-24 bg-white overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:40px_40px]" />

      <div className="relative container mx-auto px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6 }}
          className="max-w-2xl mx-auto text-center mb-14"
        >
          <h2 className="font-display text-3xl lg:text-5xl font-bold text-gray-900 mb-4 tracking-tight">
            Ce qu&apos;en disent nos apprenants
          </h2>
          <div className="flex items-center justify-center gap-4">
            <div
              className="h-2 w-32 rounded-full"
              style={{ background: `linear-gradient(to right, ${primaryColor}, ${accentColor}, transparent)` }}
            />
          </div>
        </motion.div>

        <div className="flex gap-6 overflow-x-auto snap-x snap-mandatory pb-4 -mx-6 px-6 lg:mx-0 lg:px-0 lg:grid lg:grid-cols-3 lg:overflow-visible">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={`${testimonial.author_name}-${index}`}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="relative shrink-0 w-[85vw] sm:w-[420px] lg:w-auto snap-start"
            >
              <div className="relative h-full rounded-[26px] bg-white border border-gray-200/60 shadow-lg p-8 flex flex-col">
                <Quote
                  className="w-9 h-9 mb-4 shrink-0"
                  style={{ color: `${primaryColor}30` }}
                  fill="currentColor"
                />

                {typeof testimonial.rating === 'number' && testimonial.rating > 0 && (
                  <div className="flex items-center gap-0.5 mb-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className="w-4 h-4"
                        style={{ color: i < testimonial.rating! ? '#f5b400' : '#e5e7eb' }}
                        fill={i < testimonial.rating! ? '#f5b400' : '#e5e7eb'}
                      />
                    ))}
                  </div>
                )}

                <p className="text-gray-700 leading-relaxed mb-6 flex-1">
                  &laquo;&nbsp;{testimonial.quote}&nbsp;&raquo;
                </p>

                <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
                  <div
                    className="flex items-center justify-center w-11 h-11 rounded-full font-display font-bold text-white shrink-0"
                    style={{ background: `linear-gradient(135deg, ${primaryColor}, ${accentColor})` }}
                  >
                    {testimonial.author_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{testimonial.author_name}</p>
                    {testimonial.author_role && (
                      <p className="text-sm text-gray-500 truncate">{testimonial.author_role}</p>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
