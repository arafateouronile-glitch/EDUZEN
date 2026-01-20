'use client'

import { useRouter } from 'next/navigation'
import { PlatformAdminGuard } from '@/components/super-admin/platform-admin-guard'
import { BlogPostEditor } from '@/components/super-admin/blog/blog-post-editor'
import { motion } from '@/components/ui/motion'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import type { CreateBlogPostInput } from '@/types/super-admin.types'

export default function NewBlogPostPage() {
  const router = useRouter()

  const handleSave = async (data: CreateBlogPostInput) => {
    // In production, this would call the API
    console.log('Saving draft:', data)
    // After saving, could redirect or stay on page
  }

  const handlePublish = async (data: CreateBlogPostInput) => {
    // In production, this would call the API
    console.log('Publishing:', data)
    router.push('/super-admin/blog')
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
