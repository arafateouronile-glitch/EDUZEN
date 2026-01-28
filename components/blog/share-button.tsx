'use client'

import { useState } from 'react'
import { Share2, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { BlogPost } from '@/types/super-admin.types'
import { logger, sanitizeError } from '@/lib/utils/logger'

export function ShareButton({ post }: { post: BlogPost }) {
  const [copied, setCopied] = useState(false)

  const handleShare = async () => {
    const url = window.location.href
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: post.title,
          text: post.excerpt || '',
          url: url,
        })
      } catch (error) {
        // L'utilisateur a annulé le partage
        logger.debug('Share cancelled')
      }
    } else {
      // Fallback : copier dans le presse-papier
      try {
        await navigator.clipboard.writeText(url)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } catch (error) {
        logger.error('Failed to copy:', error)
      }
    }
  }

  return (
    <div className="mt-12 pt-8 border-t border-gray-200">
      <div className="flex items-center gap-4">
        <span className="text-sm font-semibold text-gray-700">Partager :</span>
        <Button
          onClick={handleShare}
          variant="outline"
          className="flex items-center gap-2"
        >
          {copied ? (
            <>
              <Check className="h-4 w-4" />
              <span>Copié !</span>
            </>
          ) : (
            <>
              <Share2 className="h-4 w-4" />
              <span>Partager</span>
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
