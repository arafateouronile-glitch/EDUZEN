import { PageTransition } from '@/components/public/page-transition'

export default function PublicCatalogLayout({ children }: { children: React.ReactNode }) {
  return <PageTransition>{children}</PageTransition>
}
