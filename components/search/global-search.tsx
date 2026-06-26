'use client'

import { useState, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { Search, Users, BookOpen, FileText, MessageSquare, Loader2, X, Tag } from 'lucide-react'
import { cn } from '@/lib/utils'
import { searchService, type SearchResult, SEARCH_FILTERS, type SearchFilter } from '@/lib/services/search.service.client'
import { useAuth } from '@/lib/hooks/use-auth'
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value'
import { useClickOutside } from '@/lib/hooks/use-click-outside'
import { motion, AnimatePresence } from '@/components/ui/motion'
import { highlightText } from '@/lib/utils/highlight'
import { analytics } from '@/lib/utils/analytics'

interface GlobalSearchProps {
  className?: string
}

const typeIcons = {
  student: Users,
  session: BookOpen,
  document: FileText,
  message: MessageSquare,
}

const typeLabels = {
  student: 'Étudiant',
  session: 'Session',
  document: 'Document',
  message: 'Message',
}

export function GlobalSearch({ className }: GlobalSearchProps) {
  const { user } = useAuth()
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  const [activeFilters, setActiveFilters] = useState<SearchFilter[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const debouncedQuery = useDebouncedValue(query, 300)
  const searchRef = useClickOutside<HTMLDivElement>(() => {
    setIsOpen(false)
    setIsFocused(false)
  })

  const hasFilters = activeFilters.length > 0

  // Recherche texte classique (sans filtres)
  const { data: textResults, isLoading: isTextLoading } = useQuery({
    queryKey: ['global-search', debouncedQuery, user?.organization_id, user?.id],
    queryFn: async () => {
      if (!debouncedQuery || debouncedQuery.length < 2 || !user?.organization_id) return []
      const results = await searchService.searchGlobal(debouncedQuery, user.organization_id, user.id)
      if (results.length > 0) analytics.search.performed(debouncedQuery, results.length)
      return results
    },
    enabled: !hasFilters && debouncedQuery.length >= 2 && !!user?.organization_id,
    staleTime: 30000,
  })

  // Recherche multi-filtres — toutes les requêtes en parallèle, résultats fusionnés
  const { data: filterResults, isLoading: isFilterLoading } = useQuery({
    queryKey: ['filter-search', activeFilters.map((f) => f.id).join(','), debouncedQuery, user?.organization_id],
    queryFn: async () => {
      if (!hasFilters || !user?.organization_id) return []
      const allResults = await Promise.all(
        activeFilters.map((f) =>
          searchService.searchByFilter(
            f.id,
            user.organization_id!,
            debouncedQuery.length >= 1 ? debouncedQuery : undefined
          )
        )
      )
      // Fusionner et dédupliquer par type+id
      const seen = new Set<string>()
      return allResults.flat().filter((r) => {
        const key = `${r.type}-${r.id}`
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
    },
    enabled: hasFilters && !!user?.organization_id,
    staleTime: 30000,
  })

  const results = hasFilters ? filterResults : textResults
  const isLoading = hasFilters ? isFilterLoading : isTextLoading

  // Ouvrir le dropdown dès le focus
  const handleFocus = () => {
    setIsFocused(true)
    setIsOpen(true)
  }

  const handleSelect = (result: SearchResult) => {
    router.push(result.url)
    setQuery('')
    setActiveFilters([])
    setIsOpen(false)
    setIsFocused(false)
  }

  const toggleFilter = (filter: SearchFilter) => {
    setActiveFilters((prev) => {
      const exists = prev.some((f) => f.id === filter.id)
      return exists ? prev.filter((f) => f.id !== filter.id) : [...prev, filter]
    })
    setIsOpen(true)
    inputRef.current?.focus()
  }

  const removeFilter = (filterId: string) => {
    setActiveFilters((prev) => prev.filter((f) => f.id !== filterId))
    inputRef.current?.focus()
  }

  const clearAll = () => {
    setActiveFilters([])
    setQuery('')
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      if (hasFilters) clearAll()
      else { setIsOpen(false); setIsFocused(false) }
    } else if (e.key === 'Enter' && results && results.length > 0) {
      handleSelect(results[0])
    } else if (e.key === 'Backspace' && query === '' && hasFilters) {
      setActiveFilters((prev) => prev.slice(0, -1))
    }
  }

  const showFilterChips = isOpen && !hasFilters && query.length === 0
  const showResults = isOpen && results && results.length > 0
  const showEmpty = isOpen && (hasFilters || query.length >= 2) && !isLoading && (!results || results.length === 0)

  return (
    <div ref={searchRef} className={cn('relative flex-1 max-w-xl', className)}>
      {/* Input */}
      <div
        className={cn(
          'flex items-center w-full pl-10 md:pl-12 pr-3 rounded-xl border-2 transition-all duration-300',
          'bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm',
          isFocused || isOpen
            ? 'border-brand-cyan shadow-lg shadow-brand-cyan/20 bg-white dark:bg-gray-800'
            : 'border-white/30 dark:border-gray-700/30 hover:border-white/50 dark:hover:border-gray-700/50'
        )}
      >
        <div className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 pointer-events-none">
          {isLoading ? (
            <Loader2 className="h-4 w-4 md:h-5 md:w-5 animate-spin text-text-tertiary" />
          ) : (
            <Search className="h-4 w-4 md:h-5 md:w-5 text-text-tertiary" />
          )}
        </div>

        {/* Badges filtres actifs */}
        {activeFilters.map((filter) => (
          <span
            key={filter.id}
            className={cn(
              'flex items-center gap-1 shrink-0 text-xs font-medium px-2 py-0.5 rounded-md mr-1.5 my-1.5 whitespace-nowrap',
              filter.badgeColor
            )}
          >
            <filter.icon className="h-3 w-3" />
            {filter.label}
            <button
              onClick={() => removeFilter(filter.id)}
              className="ml-0.5 hover:opacity-60 transition-opacity"
              aria-label={`Retirer ${filter.label}`}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}

        <input
          ref={inputRef}
          type="text"
          placeholder={hasFilters ? 'Affiner la recherche...' : 'Rechercher des étudiants, sessions, documents...'}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={handleFocus}
          onBlur={() => setTimeout(() => setIsFocused(false), 200)}
          onKeyDown={handleKeyDown}
          className="flex-1 min-w-0 py-2.5 md:py-3 text-sm md:text-base focus:outline-none bg-transparent text-text-primary placeholder:text-text-placeholder"
        />

        {/* Bouton clear global */}
        {(query || hasFilters) && (
          <button
            onClick={clearAll}
            className="shrink-0 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ml-1"
            aria-label="Tout effacer"
          >
            <X className="h-4 w-4 text-text-tertiary" />
          </button>
        )}
      </div>

      {/* Dropdown */}
      <AnimatePresence>
        {/* Chips de filtres */}
        {showFilterChips && (
          <motion.div
            key="filter-chips"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full mt-2 w-full bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 p-3 z-50"
          >
            <div className="flex items-center gap-2 mb-2.5">
              <Tag className="h-3.5 w-3.5 text-text-tertiary" />
              <span className="text-xs font-semibold text-text-tertiary uppercase tracking-wide">
                Filtres rapides
              </span>
              <span className="ml-auto text-xs text-text-tertiary">Sélection multiple</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {SEARCH_FILTERS.map((filter) => (
                <button
                  key={filter.id}
                  onClick={() => toggleFilter(filter)}
                  className={cn(
                    'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors border',
                    filter.bgColor,
                    filter.color,
                    'border-transparent'
                  )}
                >
                  <filter.icon className="h-3.5 w-3.5" />
                  {filter.label}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Panel filtres + résultats (quand des filtres sont actifs) */}
        {isOpen && hasFilters && (
          <motion.div
            key="filter-panel"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full mt-2 w-full bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden"
          >
            {/* Sélecteur de filtres compact */}
            <div className="px-3 py-2.5 border-b border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-1.5 flex-wrap">
                {SEARCH_FILTERS.map((filter) => {
                  const isActive = activeFilters.some((f) => f.id === filter.id)
                  return (
                    <button
                      key={filter.id}
                      onClick={() => toggleFilter(filter)}
                      className={cn(
                        'flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-all border',
                        isActive
                          ? cn(filter.badgeColor, 'border-brand-cyan/40 shadow-sm')
                          : 'border-gray-200 dark:border-gray-600 text-text-tertiary hover:border-brand-cyan/30 hover:text-brand-blue dark:hover:text-brand-cyan'
                      )}
                    >
                      <filter.icon className="h-3 w-3" />
                      {filter.label}
                      {isActive && <X className="h-2.5 w-2.5 ml-0.5 opacity-60" />}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Résultats */}
            {showResults && (
              <>
                <div className="px-4 py-2 bg-gray-50/50 dark:bg-gray-700/30 flex items-center gap-2">
                  <span className="text-xs font-semibold text-text-tertiary">
                    {results!.length} résultat{results!.length > 1 ? 's' : ''}
                  </span>
                  {activeFilters.length > 1 && (
                    <span className="text-xs text-text-tertiary">
                      · {activeFilters.length} filtres actifs
                    </span>
                  )}
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {results!.map((result) => <ResultRow key={`${result.type}-${result.id}`} result={result} query={debouncedQuery} onSelect={handleSelect} showBadge />)}
                </div>
              </>
            )}

            {showEmpty && (
              <p className="text-sm text-text-tertiary text-center px-4 py-5">
                Aucun résultat pour les filtres sélectionnés{query ? ` et "${query}"` : ''}
              </p>
            )}

            {isLoading && (
              <div className="flex items-center justify-center gap-2 py-5 text-sm text-text-tertiary">
                <Loader2 className="h-4 w-4 animate-spin" />
                Recherche en cours…
              </div>
            )}
          </motion.div>
        )}

        {/* Résultats texte seuls (sans filtres) */}
        {!hasFilters && showResults && (
          <motion.div
            key="text-results"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full mt-2 w-full bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden max-h-96 overflow-y-auto"
          >
            {results!.map((result) => <ResultRow key={`${result.type}-${result.id}`} result={result} query={debouncedQuery} onSelect={handleSelect} showBadge />)}
          </motion.div>
        )}

        {/* Vide texte seul */}
        {!hasFilters && showEmpty && (
          <motion.div
            key="text-empty"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full mt-2 w-full bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 p-4 z-50"
          >
            <p className="text-sm text-text-tertiary text-center">
              Aucun résultat trouvé pour &ldquo;{query}&rdquo;
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// Composant ligne résultat extrait pour réutilisation
function ResultRow({
  result,
  query,
  onSelect,
  showBadge,
}: {
  result: SearchResult
  query: string
  onSelect: (r: SearchResult) => void
  showBadge?: boolean
}) {
  const Icon = typeIcons[result.type]
  const titleParts = query
    ? highlightText(result.title, query)
    : [{ text: result.title, highlight: false }]
  const descParts = result.description && query
    ? highlightText(result.description, query)
    : result.description
    ? [{ text: result.description, highlight: false }]
    : null

  return (
    <button
      onClick={() => onSelect(result)}
      className="w-full px-4 py-3 flex items-start gap-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
    >
      <Icon className="h-5 w-5 text-brand-cyan mt-0.5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium text-text-primary truncate">
            {titleParts.map((part, i) =>
              part.highlight ? (
                <mark key={i} className="bg-brand-cyan/20 text-brand-cyan dark:bg-brand-cyan/30 dark:text-brand-cyan font-semibold px-0.5 rounded">
                  {part.text}
                </mark>
              ) : (
                <span key={i}>{part.text}</span>
              )
            )}
          </p>
          {showBadge && (
            <span className="text-xs text-text-tertiary bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded flex-shrink-0">
              {typeLabels[result.type]}
            </span>
          )}
        </div>
        {descParts && (
          <p className="text-sm text-text-tertiary mt-0.5 truncate">
            {descParts.map((part, i) =>
              part.highlight ? (
                <mark key={i} className="bg-brand-cyan/20 text-brand-cyan dark:bg-brand-cyan/30 dark:text-brand-cyan font-semibold px-0.5 rounded">
                  {part.text}
                </mark>
              ) : (
                <span key={i}>{part.text}</span>
              )
            )}
          </p>
        )}
      </div>
    </button>
  )
}
