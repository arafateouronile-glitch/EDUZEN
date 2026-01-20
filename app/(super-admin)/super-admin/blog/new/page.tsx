'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { PlatformAdminGuard } from '@/components/super-admin/platform-admin-guard'
import { BlogPostEditor } from '@/components/super-admin/blog/blog-post-editor'
import { motion } from '@/components/ui/motion'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import type { CreateBlogPostInput } from '@/types/super-admin.types'

export default function NewBlogPostPage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSave = async (data: CreateBlogPostInput) => {
    setIsSubmitting(true)
    try {
      const response = await fetch('/api/super-admin/blog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, status: 'draft' }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erreur lors de la sauvegarde')
      }

      const result = await response.json()
      toast.success('Brouillon sauvegardé avec succès')
      router.push(`/super-admin/blog/${result.post.id}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la sauvegarde')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handlePublish = async (data: CreateBlogPostInput) => {
    setIsSubmitting(true)
    try {
      const response = await fetch('/api/super-admin/blog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, status: 'published' }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erreur lors de la publication')
      }

      toast.success('Article publié avec succès')
      router.push('/super-admin/blog')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la publication')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <PlatformAdminGuard requiredPermission="manage_blog">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/super-admin/blog">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <motion.h1
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-2xl font-bold tracking-tight"
            >
              Nouvel article
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="text-muted-foreground"
            >
              Rédigez et publiez un nouvel article de blog
            </motion.p>
          </div>
        </div>

        {/* Editor */}
        <BlogPostEditor onSave={handleSave} onPublish={handlePublish} />
      </div>
    </PlatformAdminGuard>
  )
}
