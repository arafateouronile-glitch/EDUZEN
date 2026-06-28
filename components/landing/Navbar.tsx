'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from '@/components/ui/motion'
import { Menu, X, ArrowRight, Sparkles, ChevronDown } from 'lucide-react'

const SOLUTIONS = [
  { label: 'CFA', href: '/pour/cfa', icon: '🎓' },
  { label: 'Auto-écoles', href: '/pour/auto-ecole', icon: '🚗' },
  { label: 'Formation en entreprise', href: '/pour/formation-entreprise', icon: '🏢' },
  { label: 'Formations réglementées', href: '/pour/organisme-securite', icon: '⚠️' },
  { label: 'Établissements scolaires', href: '/pour/etablissement-scolaire', icon: '🏫' },
]

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isSolutionsOpen, setIsSolutionsOpen] = useState(false)
  const solutionsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const navItems = [
    { label: 'Fonctionnalités', href: '#features' },
    { label: 'Tarifs', href: '#tarifs' },
    { label: 'Affiliation', href: '/affiliation' },
    { label: 'FAQ', href: '#faq' },
    { label: 'Contact', href: '/contact' },
  ]

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (solutionsRef.current && !solutionsRef.current.contains(e.target as Node)) {
        setIsSolutionsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <motion.nav
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
      className="fixed top-0 left-0 right-0 z-50"
    >
      {/* Subtle top accent line */}
      <div className="h-[1px] bg-gradient-to-r from-transparent via-brand-cyan/40 to-transparent" />

      <div className={`transition-all duration-700 ease-out ${
        isScrolled
          ? 'bg-white/80 backdrop-blur-2xl shadow-[0_8px_40px_-12px_rgba(39,68,114,0.12)] border-b border-gray-100/80'
          : 'bg-transparent'
      }`}>
        <div className="container mx-auto px-4 md:px-6 lg:px-8">
          <div className={`flex items-center justify-between transition-all duration-700 ${
            isScrolled ? 'h-16 md:h-[72px]' : 'h-20 md:h-24'
          }`}>
            {/* Logo */}
            <Link href="/" className="relative flex items-center gap-2.5 group">
              <motion.div
                whileHover={{ scale: 1.03 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
                className="flex items-center gap-2"
              >
                {/* Logo mark */}
                <div className="relative">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-blue via-brand-blue-dark to-brand-cyan/80 flex items-center justify-center shadow-lg shadow-brand-blue/20 group-hover:shadow-brand-blue/30 transition-shadow duration-500">
                    <span className="text-white font-black text-sm tracking-tighter italic">E</span>
                  </div>
                  <div className="absolute -inset-0.5 rounded-xl bg-gradient-to-br from-brand-blue to-brand-cyan opacity-0 group-hover:opacity-20 blur-sm transition-opacity duration-500" />
                </div>
                <span className="text-[22px] md:text-2xl font-black tracking-[-0.04em] bg-clip-text text-transparent bg-gradient-to-r from-brand-blue via-brand-blue-dark to-brand-blue font-display">
                  EDUZEN
                </span>
              </motion.div>
            </Link>

            {/* Desktop Navigation - Floating pill */}
            <div className="hidden lg:flex items-center">
              <div className={`relative flex items-center gap-1 rounded-full px-2 py-1.5 transition-all duration-700 ${
                isScrolled
                  ? 'bg-gradient-to-r from-brand-cyan/10 via-brand-cyan/15 to-brand-cyan/10 border border-brand-cyan/20 shadow-sm shadow-brand-cyan/10'
                  : 'bg-gradient-to-r from-brand-cyan/8 via-brand-cyan/12 to-brand-cyan/8 backdrop-blur-sm border border-brand-cyan/15'
              }`}>
                {/* Solutions dropdown */}
                <div ref={solutionsRef} className="relative">
                  <button
                    onClick={() => setIsSolutionsOpen(!isSolutionsOpen)}
                    className="relative flex items-center gap-1 px-4 py-2 rounded-full text-[13px] font-medium transition-all duration-300 text-brand-blue-dark/80 hover:text-brand-blue hover:bg-white/60"
                  >
                    Solutions
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isSolutionsOpen ? 'rotate-180' : ''}`} />
                  </button>
                  <AnimatePresence>
                    {isSolutionsOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.97 }}
                        transition={{ duration: 0.18 }}
                        className="absolute top-full left-0 mt-2 w-56 bg-white rounded-2xl shadow-xl shadow-brand-blue/10 border border-gray-100 overflow-hidden z-50"
                      >
                        {SOLUTIONS.map((s) => (
                          <Link
                            key={s.href}
                            href={s.href}
                            onClick={() => setIsSolutionsOpen(false)}
                            className="flex items-center gap-3 px-4 py-3 text-[13px] font-medium text-gray-700 hover:text-brand-blue hover:bg-brand-blue/[0.04] transition-colors"
                          >
                            <span>{s.icon}</span>
                            {s.label}
                          </Link>
                        ))}
                        <div className="border-t border-gray-100">
                          <Link
                            href="/pour"
                            onClick={() => setIsSolutionsOpen(false)}
                            className="flex items-center gap-2 px-4 py-3 text-[12px] font-semibold text-brand-blue hover:bg-brand-blue/[0.04] transition-colors"
                          >
                            Voir tous les secteurs <ArrowRight className="w-3 h-3" />
                          </Link>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {navItems.map((item, index) => (
                  <motion.div
                    key={item.label}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.2 + index * 0.08, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
                  >
                    <Link
                      href={item.href}
                      className="relative px-4 py-2 rounded-full text-[13px] font-medium transition-all duration-300 group text-brand-blue-dark/80 hover:text-brand-blue hover:bg-white/60"
                    >
                      {item.label}
                      <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-0 h-[2px] rounded-full bg-gradient-to-r from-brand-blue to-brand-cyan group-hover:w-4 transition-all duration-300" />
                    </Link>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Desktop CTA */}
            <div className="hidden lg:flex items-center gap-3">
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.5, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
              >
                <Link
                  href="/auth/login"
                  className={`px-5 py-2.5 rounded-full text-[13px] font-semibold transition-all duration-300 ${
                    isScrolled
                      ? 'text-gray-600 hover:text-brand-blue hover:bg-brand-blue/[0.06]'
                      : 'text-gray-700 hover:text-brand-blue hover:bg-white/40'
                  }`}
                >
                  Se connecter
                </Link>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.6, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
              >
                <Link href="/auth/register">
                  <motion.div
                    whileHover={{ scale: 1.02, y: -1 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
                    className="relative group"
                  >
                    {/* Glow effect */}
                    <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-brand-blue via-brand-cyan to-brand-blue opacity-0 group-hover:opacity-30 blur-lg transition-opacity duration-500" />
                    <div className="relative flex items-center gap-2 px-6 py-2.5 rounded-full bg-gradient-to-r from-brand-blue to-brand-blue-dark text-white text-[13px] font-semibold shadow-lg shadow-brand-blue/25 group-hover:shadow-xl group-hover:shadow-brand-blue/30 transition-all duration-500">
                      <Sparkles className="w-3.5 h-3.5 opacity-80" />
                      Commencer
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform duration-300" />
                    </div>
                  </motion.div>
                </Link>
              </motion.div>
            </div>

            {/* Mobile Menu Button */}
            <motion.button
              whileTap={{ scale: 0.92 }}
              className={`lg:hidden relative p-2.5 rounded-xl transition-all duration-300 ${
                isScrolled
                  ? 'bg-gray-50 border border-gray-200 text-gray-700 hover:border-brand-blue/30 hover:text-brand-blue'
                  : 'bg-white/10 backdrop-blur-sm border border-white/20 text-gray-700 hover:bg-white/30'
              }`}
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </motion.button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
            className="lg:hidden absolute top-full left-0 right-0 bg-white/95 backdrop-blur-2xl border-b border-gray-100 shadow-[0_24px_48px_-12px_rgba(39,68,114,0.15)] overflow-hidden"
          >
            <div className="container mx-auto px-4 py-6">
              <div className="flex flex-col gap-1">
                {navItems.map((item, index) => (
                  <motion.div
                    key={item.label}
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, delay: index * 0.06, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
                  >
                    <Link
                      href={item.href}
                      className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-[15px] font-medium text-gray-700 hover:text-brand-blue hover:bg-brand-blue/[0.04] transition-all duration-300"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <span className="w-1 h-1 rounded-full bg-brand-cyan/50" />
                      {item.label}
                    </Link>
                  </motion.div>
                ))}

                <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent my-1" />
                <div className="px-4 py-2">
                  <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Solutions par secteur</p>
                  <div className="grid grid-cols-2 gap-1">
                    {SOLUTIONS.map((s) => (
                      <Link
                        key={s.href}
                        href={s.href}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-[13px] font-medium text-gray-700 hover:text-brand-blue hover:bg-brand-blue/[0.04] transition-colors"
                      >
                        <span>{s.icon}</span>
                        {s.label}
                      </Link>
                    ))}
                  </div>
                </div>
                <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent my-1" />

                <motion.div
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: 0.3, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
                >
                  <Link
                    href="/auth/login"
                    className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-[15px] font-medium text-gray-600 hover:text-brand-blue hover:bg-brand-blue/[0.04] transition-all duration-300"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Se connecter
                  </Link>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.4, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
                  className="mt-2"
                >
                  <Link href="/auth/register" onClick={() => setIsMobileMenuOpen(false)}>
                    <div className="relative group">
                      <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-brand-blue to-brand-cyan opacity-20 blur-sm" />
                      <div className="relative flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl bg-gradient-to-r from-brand-blue to-brand-blue-dark text-white text-[15px] font-semibold shadow-lg shadow-brand-blue/20">
                        <Sparkles className="w-4 h-4 opacity-80" />
                        Commencer gratuitement
                        <ArrowRight className="w-4 h-4" />
                      </div>
                    </div>
                  </Link>
                </motion.div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  )
}
