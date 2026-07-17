'use client'

import { Lock, Zap, Webhook, Key, Headphones, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { motion } from '@/components/ui/motion'
import { SUPPORT_EMAIL } from '@/lib/config/app-config'

const FEATURES = [
  { icon: Key, label: 'Clés API haute performance' },
  { icon: Webhook, label: 'Webhooks temps réel illimités' },
  { icon: Headphones, label: 'Support technique développeur' },
]

export function APIPaywall() {
  return (
    <div className="relative min-h-[70vh] flex items-center justify-center overflow-hidden rounded-2xl">
      {/* Blurred background illustration */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/20" />
      <div className="absolute inset-0">
        <div className="absolute top-10 left-10 w-64 h-40 bg-gray-200/40 rounded-xl blur-sm rotate-2" />
        <div className="absolute top-16 left-16 w-56 h-8 bg-gray-300/30 rounded blur-[1px]" />
        <div className="absolute top-28 left-16 w-40 h-8 bg-gray-300/20 rounded blur-[1px]" />
        <div className="absolute bottom-20 right-10 w-72 h-48 bg-gray-200/40 rounded-xl blur-sm -rotate-1" />
        <div className="absolute bottom-28 right-16 w-48 h-8 bg-gray-300/30 rounded blur-[1px]" />
        <div className="absolute bottom-40 right-16 w-32 h-8 bg-gray-300/20 rounded blur-[1px]" />
        <div className="absolute top-1/2 left-1/3 w-20 h-20 bg-brand-blue/5 rounded-full blur-2xl" />
        <div className="absolute top-1/3 right-1/3 w-32 h-32 bg-purple-200/20 rounded-full blur-3xl" />
      </div>

      {/* Blur overlay */}
      <div className="absolute inset-0 backdrop-blur-[2px] bg-white/40" />

      {/* Central card */}
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-lg mx-4"
      >
        <Card className="border-2 border-brand-blue/10 shadow-2xl shadow-brand-blue/10 bg-white/95 backdrop-blur-xl overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-brand-blue via-brand-cyan to-purple-500" />

          <CardContent className="p-8 md:p-10 text-center">
            {/* Icon */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 300, damping: 15 }}
              className="mx-auto mb-6"
            >
              <div className="relative inline-flex">
                <div className="absolute inset-0 bg-gradient-to-br from-brand-blue to-brand-cyan rounded-2xl blur-xl opacity-30" />
                <div className="relative p-4 bg-gradient-to-br from-brand-blue to-brand-cyan rounded-2xl shadow-xl">
                  <Zap className="h-8 w-8 text-white" />
                </div>
                <div className="absolute -top-1 -right-1 p-1 bg-white rounded-full shadow-lg">
                  <Lock className="h-3.5 w-3.5 text-brand-blue" />
                </div>
              </div>
            </motion.div>

            {/* Title */}
            <h2 className="text-2xl md:text-3xl font-display font-bold text-gray-900 tracking-tight mb-3">
              Automatisez votre centre de formation
            </h2>

            {/* Description */}
            <p className="text-gray-600 text-base mb-8 max-w-sm mx-auto leading-relaxed">
              Connectez EDUZEN à plus de 5 000 applications (Zapier, Make, HubSpot) et créez vos propres intégrations sur mesure.
            </p>

            {/* Feature list */}
            <div className="space-y-3 mb-8">
              {FEATURES.map((feature, i) => (
                <motion.div
                  key={feature.label}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.1 }}
                  className="flex items-center gap-3 text-left"
                >
                  <div className="flex-shrink-0 p-1.5 bg-emerald-50 rounded-lg">
                    <feature.icon className="h-4 w-4 text-emerald-600" />
                  </div>
                  <span className="text-sm font-medium text-gray-700">{feature.label}</span>
                </motion.div>
              ))}
            </div>

            {/* CTA */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Button
                size="lg"
                className="w-full bg-gradient-to-r from-brand-blue to-brand-cyan hover:from-brand-blue-dark hover:to-brand-blue text-white shadow-xl shadow-brand-blue/25 font-semibold text-base h-12 group"
                onClick={() => window.open(`mailto:${SUPPORT_EMAIL}?subject=Passage%20au%20plan%20Enterprise`, '_blank')}
              >
                Passer au Plan Enterprise
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </motion.div>

            <p className="text-xs text-gray-400 mt-4">
              Contactez notre équipe pour une démonstration personnalisée
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
