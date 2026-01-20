'use client'

import { useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, X } from 'lucide-react'

export function BlogSearch({ initialSearch }: { initialSearch?: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [search, setSearch] = useState(initialSearch || '')
  const [isPending, startTransition] = useTransition()

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const params = new URLSearchParams(searchParams.toString())
    
    if (search.trim()) {
      params.set('search', search.trim())
      params.delete('page') // Reset to page 1
    } else {
      params.delete('search')
    }

    startTransition(() => {
      router.push(`/blog?${params.toString()}`)
    })
  }

  const handleClear = () => {
    setSearch('')
    const params = new URLSearchParams(searchParams.toString())
    params.delete('search')
    params.delete('page')
    
    startTransition(() => {
      router.push(`/blog?${params.toString()}`)
    })
  }

  return (
    <form onSubmit={handleSearch} className="relative">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
        <Input
          type="text"
          placeholder="Rechercher un article..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-12 pr-12 h-12 text-base"
        />
        {search && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>
      <Button
        type="submit"
        disabled={isPending}
        className="mt-4 w-full md:w-auto"
      >
        {isPending ? 'Recherche...' : 'Rechercher'}
      </Button>
    </form>
  )
}
