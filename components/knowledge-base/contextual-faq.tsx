'use client'

import { useQuery } from '@tanstack/react-query'
import { usePathname } from 'next/navigation'
import { knowledgeBaseService, type KnowledgeBaseArticle } from '@/lib/services/knowledge-base.service'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { HelpCircle, BookOpen, ChevronRight, X } from 'lucide-react'
import { motion, AnimatePresence } from '@/components/ui/motion'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import Link from 'next/link'

interface ContextualFAQProps {
  maxArticles?: number
  className?: string
}

export function ContextualFAQ({ maxArticles = 3, className }: ContextualFAQProps) {
  const pathname = usePathname()
  const [isExpanded, setIsExpanded] = useState(false)

  const { data: articles, isLoading } = useQuery<KnowledgeBaseArticle[]>({
    queryKey: ['knowledge-base-articles', pathname],
    queryFn: async () => {
      if (!pathname) return []
      return knowledgeBaseService.getArticlesForPage(pathname)
    },
    enabled: !!pathname,
  })

  if (isLoading || !articles || articles.length === 0) {
    return null
  }

  const displayedArticles = articles.slice(0, maxArticles)

  return (
    <AnimatePresence>
      {displayedArticles.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className={cn('mt-6', className)}
        >
          <Card className="border-brand-cyan/20 bg-gradient-to-br from-brand-cyan/5 to-white">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <HelpCircle className="w-5 h-5 text-brand-cyan" />
                  <h3 className="font-semibold text-sm">Questions fréquentes</h3>
                </div>
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="text-xs text-brand-blue hover:underline"
                >
                  {isExpanded ? 'Réduire' : 'Voir tout'}
                </button>
              </div>

              <div className="space-y-2">
                {(isExpanded ? articles : displayedArticles).map((article, index) => (
                  <motion.div
                    key={article.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="group"
                  >
                    <Link
                      href={`/dashboard/knowledge-base/${article.id}`}
                      className="flex items-start gap-3 p-3 rounded-lg hover:bg-white/50 transition-colors"
                    >
                      <BookOpen className="w-4 h-4 text-brand-cyan mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 group-hover:text-brand-blue transition-colors">
                          {article.title}
                        </p>
                        {article.content && (
                          <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                            {article.content.substring(0, 100)}...
                          </p>
                        )}
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-brand-blue transition-colors flex-shrink-0" />
                    </Link>
                  </motion.div>
                ))}
              </div>

              {articles.length > maxArticles && !isExpanded && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full mt-3 text-xs"
                  onClick={() => setIsExpanded(true)}
                >
                  Voir {articles.length - maxArticles} autres articles
                </Button>
              )}

              <div className="mt-4 pt-4 border-t">
                <Link
                  href="/dashboard/knowledge-base"
                  className="text-xs text-brand-blue hover:underline flex items-center gap-1"
                >
                  Accéder à la base de connaissances complète
                  <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/**
 * Composant compact pour afficher un lien FAQ contextuel
 */
export function ContextualFAQLink({ pagePath }: { pagePath?: string }) {
  const pathname = usePathname()
  const currentPath = pagePath || pathname

  const { data: articles } = useQuery({
    queryKey: ['knowledge-base-articles-count', currentPath],
    queryFn: async () => {
      if (!currentPath) return []
      return knowledgeBaseService.getArticlesForPage(currentPath)
    },
    enabled: !!currentPath,
  })

  if (!articles || articles.length === 0) {
    return null
  }

  return (
    <Link
      href="/dashboard/knowledge-base"
      className="inline-flex items-center gap-2 text-xs text-brand-blue hover:underline"
    >
      <HelpCircle className="w-4 h-4" />
      <span>
        {articles.length} article{articles.length > 1 ? 's' : ''} disponible{articles.length > 1 ? 's' : ''}
      </span>
    </Link>
  )
}
