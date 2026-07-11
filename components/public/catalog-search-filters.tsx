'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { motion } from '@/components/ui/motion'
import { Search, X, ShieldCheck } from 'lucide-react'

interface CatalogSearchFiltersProps {
  categories: string[]
  primaryColor: string
}

export function CatalogSearchFilters({ categories, primaryColor }: CatalogSearchFiltersProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const currentSearch = searchParams.get('search') || ''
  const currentCategory = searchParams.get('category') || ''
  const currentCpf = searchParams.get('cpf') === '1'

  const [searchValue, setSearchValue] = useState(currentSearch)
  const isFirstRender = useRef(true)
  const inputRef = useRef<HTMLInputElement>(null)

  // Garde l'input synchronisé si l'URL change depuis l'extérieur (retour arrière, clic sur
  // une pastille…). On évite d'écraser une frappe en cours si le champ a le focus, sinon la
  // recherche debouncée peut se faire "rattraper" par cet effet pendant l'aller-retour serveur.
  useEffect(() => {
    if (document.activeElement !== inputRef.current) {
      setSearchValue(currentSearch)
    }
  }, [currentSearch])

  const navigate = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString())
    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === '') {
        params.delete(key)
      } else {
        params.set(key, value)
      }
    }
    router.push(`${pathname}?${params.toString()}#programmes`, { scroll: false })
  }

  // Recherche "live" avec un léger debounce pour éviter une navigation à chaque frappe
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    const timeout = setTimeout(() => {
      if (searchValue !== currentSearch) {
        navigate({ search: searchValue || null })
      }
    }, 450)
    return () => clearTimeout(timeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchValue])

  const hasActiveFilters = Boolean(currentSearch || currentCategory || currentCpf)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="relative bg-white/90 backdrop-blur-md border border-gray-200/60 rounded-2xl shadow-lg p-4 md:p-5 mb-10"
    >
      <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4">
        {/* Barre de recherche */}
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            ref={inputRef}
            type="text"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder="Rechercher une formation..."
            className="w-full pl-11 pr-10 py-3 rounded-xl bg-gray-50 border border-gray-200/70 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:bg-white transition-colors"
            style={{ '--tw-ring-color': `${primaryColor}40` } as React.CSSProperties}
          />
          {searchValue && (
            <button
              type="button"
              onClick={() => setSearchValue('')}
              aria-label="Effacer la recherche"
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-200/60 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filtre Éligible CPF */}
        <button
          type="button"
          onClick={() => navigate({ cpf: currentCpf ? null : '1' })}
          className="inline-flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold border transition-all whitespace-nowrap"
          style={
            currentCpf
              ? { backgroundColor: primaryColor, borderColor: primaryColor, color: 'white' }
              : { backgroundColor: 'transparent', borderColor: '#e5e7eb', color: '#374151' }
          }
        >
          <ShieldCheck className="w-4 h-4" />
          Éligible CPF
        </button>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={() => {
              setSearchValue('')
              navigate({ search: null, category: null, cpf: null })
            }}
            className="inline-flex items-center gap-1.5 px-3 py-3 text-sm font-medium text-gray-500 hover:text-gray-800 transition-colors whitespace-nowrap"
          >
            <X className="w-3.5 h-3.5" />
            Réinitialiser
          </button>
        )}
      </div>

      {/* Pills de catégories */}
      {categories.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-100">
          <button
            type="button"
            onClick={() => navigate({ category: null })}
            className="px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all"
            style={
              !currentCategory
                ? { backgroundColor: primaryColor, color: 'white' }
                : { backgroundColor: '#f3f4f6', color: '#4b5563' }
            }
          >
            Toutes les catégories
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => navigate({ category: currentCategory === cat ? null : cat })}
              className="px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all"
              style={
                currentCategory === cat
                  ? { backgroundColor: primaryColor, color: 'white' }
                  : { backgroundColor: '#f3f4f6', color: '#4b5563' }
              }
            >
              {cat}
            </button>
          ))}
        </div>
      )}
    </motion.div>
  )
}
