'use client'

import { motion } from '@/components/ui/motion'
import Link from 'next/link'
import { Facebook, Twitter, Instagram, Linkedin, Heart, ArrowRight } from 'lucide-react'

export function Footer() {
  return (
    <footer className="relative bg-[#0B0F19] text-white pt-24 pb-12 overflow-hidden">
      
      {/* Massive Background Text */}
      <div className="absolute inset-0 flex items-end justify-center pointer-events-none overflow-hidden select-none">
        <h1 className="text-[15vw] md:text-[22vw] font-black text-white/[0.03] leading-none tracking-tighter font-display translate-y-[20%]">
          EDUZEN
        </h1>
      </div>

      <div className="container mx-auto px-4 md:px-6 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 mb-20">
          
          {/* Brand & Mission */}
          <div className="md:col-span-5 lg:col-span-4">
            <Link href="/" className="inline-block mb-8">
              <span className="text-3xl font-black text-white tracking-tight">
                EDUZEN
              </span>
            </Link>
            <p className="text-gray-400 text-lg leading-relaxed mb-8 max-w-sm">
              La plateforme tout-en-un qui libère le potentiel des organismes de formation.
            </p>
            <div className="flex gap-4">
              {[Twitter, Linkedin, Instagram].map((Icon, i) => (
                <a key={i} href="#" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white hover:text-black transition-all duration-300">
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Links */}
          <div className="md:col-span-7 lg:col-span-8 grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              {
                title: "Produit",
                links: [
                  { label: "Fonctionnalités", href: "/#features" },
                  { label: "Tarifs", href: "/pricing" },
                  { label: "Demo", href: "/demo" },
                  { label: "Contact", href: "/contact" },
                ]
              },
              {
                title: "Ressources",
                links: [
                  { label: "Blog", href: "/blog" },
                  { label: "À propos", href: "/a-propos" },
                  { label: "Programme d'affiliation", href: "/affiliation" },
                  { label: "Centre d'aide", href: "/contact" },
                ]
              },
              {
                title: "Solutions",
                links: [
                  { label: "Formation sécurité", href: "/pour/organisme-securite" },
                  { label: "Auto-écoles", href: "/pour/auto-ecole" },
                  { label: "CFA", href: "/pour/cfa" },
                  { label: "Formation en entreprise", href: "/pour/formation-entreprise" },
                  { label: "Établissements scolaires", href: "/pour/etablissement-scolaire" },
                ]
              },
              {
                title: "Comparatifs",
                links: [
                  { label: "EduZen vs Digiforma", href: "/comparatif/eduzen-vs-digiforma" },
                  { label: "EduZen vs Dendreo", href: "/comparatif/eduzen-vs-dendreo" },
                  { label: "EduZen vs SmartOF", href: "/comparatif/eduzen-vs-smartof" },
                  { label: "EduZen vs Qualiobee", href: "/comparatif/eduzen-vs-qualiobee" },
                  { label: "EduZen vs Ymag", href: "/comparatif/eduzen-vs-ymag" },
                  { label: "EduZen vs Teachizy", href: "/comparatif/eduzen-vs-teachizy" },
                ]
              },
              {
                title: "Légal",
                links: [
                  { label: "Confidentialité", href: "/legal/privacy" },
                  { label: "CGU", href: "/legal/terms" },
                  { label: "Mentions légales", href: "/legal/terms" },
                  { label: "Sécurité", href: "/contact" },
                ]
              }
            ].map((col, i) => (
              <div key={i}>
                <h4 className="font-bold text-white mb-6">{col.title}</h4>
                <ul className="space-y-4">
                  {col.links.map((link, j) => (
                    <li key={j}>
                      <Link href={link.href} className="text-gray-400 hover:text-white transition-colors text-sm hover:translate-x-1 inline-block duration-200">
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-gray-500">
          <p>© {new Date().getFullYear()} EduZen. Fait avec passion en France.</p>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            <span>Systèmes opérationnels</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
