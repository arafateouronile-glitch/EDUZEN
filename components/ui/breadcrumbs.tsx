'use client'

import React from 'react'
import Link from 'next/link'
import { ChevronRight, Home } from 'lucide-react'
import { motion } from '@/components/ui/motion'
import { cn } from '@/lib/utils'

interface BreadcrumbItem {
  label: string
  href?: string
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[]
  className?: string
}

export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumb" className={cn('flex items-center space-x-2 text-sm', className)}>
      <motion.div
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
      >
        <Link
          href="/dashboard"
          className="text-muted-foreground hover:text-foreground transition-colors duration-200 flex items-center"
        >
          <Home className="h-4 w-4" />
        </Link>
      </motion.div>

      {items.map((item, index) => {
        const isLast = index === items.length - 1

        return (
          <React.Fragment key={index}>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            {isLast || !item.href ? (
              <span className={cn(
                'font-medium',
                isLast ? 'text-foreground' : 'text-muted-foreground'
              )}>
                {item.label}
              </span>
            ) : (
              <motion.div whileHover={{ x: 2 }}>
                <Link
                  href={item.href}
                  className="text-muted-foreground hover:text-foreground transition-colors duration-200"
                >
                  {item.label}
                </Link>
              </motion.div>
            )}
          </React.Fragment>
        )
      })}
    </nav>
  )
}
























