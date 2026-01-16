'use client'

import { useState, useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { Search, Users, BookOpen, FileText, MessageSquare, Loader2, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { searchService, type SearchResult } from '@/lib/services/search.service'
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
  const debouncedQuery = useDebouncedValue(query, 300)
  const searchRef = useRef<HTMLDivElement>(null)

  useClickOutside(searchRef, () => setIsOpen(false))

  const { data: results, isLoading } = useQuery({
    queryKey: ['global-search', debouncedQuery, user?.organization_id, user?.id],
    queryFn: async () => {
      if (!debouncedQuery || debouncedQuery.length < 2 || !user?.organization_id) {
        return []
      }
      const searchResults = await searchService.searchGlobal(
        debouncedQuery,
        user.organization_id,
        user.id
      )
      
      // Track l'événement de recherche
      if (searchResults.length > 0) {
        analytics.search.performed(debouncedQuery, searchResults.length)
      }
      
      return searchResults
    },
    enabled: debouncedQuery.length >= 2 && !!user?.organization_id,
    staleTime: 30000, // Cache 30 secondes
  })

  useEffect(() => {
    if (query.length >= 2 && isFocused) {
      setIsOpen(true)
    } else if (query.length === 0) {
      setIsOpen(false)
    }
  }, [query, isFocused])

  const handleSelect = (result: SearchResult) => {
    router.push(result.url)
    setQuery('')
    setIsOpen(false)
    setIsFocused(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false)
      setIsFocused(false)
    } else if (e.key === 'Enter' && results && results.length > 0) {
      handleSelect(results[0])
    }
  }

  return (
    <div ref={searchRef} className={cn('relative flex-1 max-w-xl', className)}>
      <div className="relative">
        <div className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 pointer-events-none">
          {isLoading ? (
            <Loader2 className="h-4 w-4 md:h-5 md:w-5 animate-spin text-text-tertiary" />
          ) : (
            <Search className="h-4 w-4 md:h-5 md:w-5 text-text-tertiary" />
          )}
        </div>
        <input
          type="text"
          placeholder="Rechercher des étudiants, sessions, documents..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => {
            // Délai pour permettre le clic sur les résultats
            setTimeout(() => setIsFocused(false), 200)
          }}
          onKeyDown={handleKeyDown}
          className={cn(
            'w-full pl-10 md:pl-12 pr-10 py-2.5 md:py-3 rounded-xl border-2 transition-all duration-300 text-sm md:text-base',
            'focus:outline-none focus:ring-2 focus:ring-brand-cyan/30',
            'bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm text-text-primary placeholder:text-text-placeholder',
            isFocused || isOpen
              ? 'border-brand-cyan shadow-lg shadow-brand-cyan/20 bg-white dark:bg-gray-800'
              : 'border-white/30 dark:border-gray-700/30 hover:border-white/50 dark:hover:border-gray-700/50'
          )}
        />
        {query && (
          <button
            onClick={() => {
              setQuery('')
              setIsOpen(false)
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X className="h-4 w-4 text-text-tertiary" />
          </button>
        )}
      </div>

      <AnimatePresence>
        {isOpen && results && results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full mt-2 w-full bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 max-h-96 overflow-y-auto z-50"
          >
            {results.map((result) => {
              const Icon = typeIcons[result.type]
              const titleParts = highlightText(result.title, debouncedQuery)
              const descriptionParts = result.description
                ? highlightText(result.description, debouncedQuery)
                : null

              return (
                <button
                  key={`${result.type}-${result.id}`}
                  onClick={() => handleSelect(result)}
                  className="w-full px-4 py-3 flex items-start gap-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left first:rounded-t-xl last:rounded-b-xl"
                >
                  <Icon className="h-5 w-5 text-brand-cyan mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-text-primary truncate">
                        {titleParts.map((part, i) =>
                          part.highlight ? (
                            <mark
                              key={i}
                              className="bg-brand-cyan/20 text-brand-cyan dark:bg-brand-cyan/30 dark:text-brand-cyan font-semibold px-0.5 rounded"
                            >
                              {part.text}
                            </mark>
                          ) : (
                            <span key={i}>{part.text}</span>
                          )
                        )}
                      </p>
                      <span className="text-xs text-text-tertiary bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded flex-shrink-0">
                        {typeLabels[result.type]}
                      </span>
                    </div>
                    {descriptionParts && (
                      <p className="text-sm text-text-tertiary mt-1 truncate">
                        {descriptionParts.map((part, i) =>
                          part.highlight ? (
                            <mark
                              key={i}
                              className="bg-brand-cyan/20 text-brand-cyan dark:bg-brand-cyan/30 dark:text-brand-cyan font-semibold px-0.5 rounded"
                            >
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
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {isOpen && query.length >= 2 && !isLoading && (!results || results.length === 0) && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="absolute top-full mt-2 w-full bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 p-4 z-50"
        >
          <p className="text-sm text-text-tertiary text-center">
            Aucun résultat trouvé pour "{query}"
          </p>
        </motion.div>
      )}
    </div>
  )
}

