'use client'

import { motion } from '@/components/ui/motion'
import Link from 'next/link'
import { Facebook, Twitter, Instagram, Linkedin, Heart, ArrowRight } from 'lucide-react'

export function Footer() {
  return (
    <footer className="relative bg-gradient-to-b from-white via-gray-50 to-white border-t-2 border-gray-200 pt-24 md:pt-32 lg:pt-40 pb-12">
      <div className="container mx-auto px-4 md:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12 lg:gap-16 mb-16 md:mb-20">
          {/* Brand Column */}
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            >
              <Link href="/" className="inline-block mb-8">
                <span className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-brand-blue to-brand-cyan font-display">
                  EDUZEN
                </span>
              </Link>
              <p className="text-lg md:text-xl text-gray-600 mb-10 leading-relaxed max-w-md font-light tracking-tight">
                La plateforme de gestion{' '}
                <span className="italic font-normal text-brand-blue">nouvelle génération</span> pour les organismes de formation en France et en Europe.{' '}
                <span className="font-semibold">Simple, puissante, conforme</span>.
              </p>

              {/* Social Icons */}
              <div className="flex gap-4">
                {[
                  { Icon: Twitter, href: '#' },
                  { Icon: Facebook, href: '#' },
                  { Icon: Linkedin, href: '#' },
                  { Icon: Instagram, href: '#' },
                ].map(({ Icon, href }, index) => (
                  <motion.a
                    key={index}
                    href={href}
                    whileHover={{ scale: 1.1, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                    className="w-12 h-12 rounded-2xl bg-white border-2 border-gray-200 hover:border-brand-blue flex items-center justify-center text-gray-500 hover:text-brand-blue hover:shadow-lg transition-all duration-600"
                  >
                    <Icon className="w-5 h-5" />
                  </motion.a>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Links Columns */}
          {[
            {
              title: 'Produit',
              links: [
                { label: 'Fonctionnalités', href: '#features' },
                { label: 'Tarifs', href: '#tarifs' },
                { label: 'Guide d\'utilisation', href: '#' },
                { label: 'Mises à jour', href: '#' },
              ]
            },
            {
              title: 'Entreprise',
              links: [
                { label: 'À propos', href: '#' },
                { label: 'Carrières', href: '#' },
                { label: 'Blog', href: '/blog' },
                { label: 'Contact', href: '#' },
              ]
            },
            {
              title: 'Légal',
              links: [
                { label: 'Confidentialité', href: '/legal/privacy' },
                { label: 'CGU', href: '/legal/terms' },
                { label: 'Sécurité', href: '#' },
                { label: 'RGPD', href: '/legal/privacy#9-droits-des-utilisateurs-rgpd' },
              ]
            }
          ].map((column, colIndex) => (
            <motion.div
              key={colIndex}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: colIndex * 0.1, ease: [0.16, 1, 0.3, 1] }}
            >
              <h4 className="text-lg md:text-xl font-bold text-gray-900 mb-6 md:mb-8 font-display">{column.title}</h4>
              <ul className="space-y-4">
                {column.links.map((link, linkIndex) => (
                  <li key={linkIndex}>
                    <Link
                      href={link.href}
                      className="group inline-flex items-center gap-2 text-base md:text-lg text-gray-600 hover:text-brand-blue transition-all duration-400"
                    >
                      <span>{link.label}</span>
                      <ArrowRight className="w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-400" />
                    </Link>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        {/* Bottom Section */}
        <div className="border-t-2 border-gray-200 pt-10 md:pt-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col md:flex-row justify-between items-center gap-8 mb-10"
          >
            {/* Badges */}
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="flex items-center gap-3">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  className="flex items-center gap-2 px-4 py-2.5 bg-brand-cyan-ghost border-2 border-brand-cyan-pale rounded-full"
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-brand-cyan animate-pulse"></span>
                  <span className="text-sm font-bold text-brand-cyan-darker">Certifié Qualiopi</span>
                </motion.div>
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  className="flex items-center gap-2 px-4 py-2.5 bg-brand-blue-ghost border-2 border-brand-blue-pale rounded-full"
                >
                  <span className="text-sm font-bold text-brand-blue-darker">✓ RGPD conforme</span>
                </motion.div>
              </div>
              <p className="text-base md:text-lg font-light text-gray-700 tracking-tight">
                <span className="font-normal">Rejoignez</span>{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-blue to-brand-cyan font-extrabold italic tracking-tighter">+500 organismes</span>{' '}
                <span className="font-medium">qui nous font confiance</span>
              </p>
            </div>

            {/* Made with love */}
            <p className="text-base text-gray-600 flex items-center gap-2 font-medium">
              Fait avec <Heart className="w-5 h-5 text-red-500 fill-current animate-pulse" /> en France
            </p>
          </motion.div>

          {/* Copyright */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col md:flex-row justify-between items-center gap-4 pt-8 border-t border-gray-200"
          >
            <p className="text-sm md:text-base text-gray-500">
              © {new Date().getFullYear()} EduZen. Tous droits réservés.
            </p>
            <p className="text-sm md:text-base text-gray-500 font-light italic tracking-wide">
              Votre organisme de formation{' '}
              <span className="font-semibold not-italic text-brand-blue">mérite mieux</span>
            </p>
          </motion.div>
        </div>
      </div>
    </footer>
  )
}
