import { Navbar } from '@/components/landing/Navbar'
import { Footer } from '@/components/landing/Footer'

/** Mise en page des pages publiques des outils gratuits */
export function OutilPageShell({
  badge,
  title,
  subtitle,
  children,
}: {
  badge: string
  title: string
  subtitle: string
  children: React.ReactNode
}) {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gray-50/60">
        <section className="bg-gradient-to-b from-white to-gray-50/60 pb-10 pt-32 md:pt-40">
          <div className="mx-auto max-w-3xl px-4 text-center">
            <span className="inline-flex items-center rounded-full border border-brand-blue-pale bg-brand-blue-ghost px-4 py-1.5 text-sm font-medium text-brand-blue-darker">
              {badge}
            </span>
            <h1 className="mt-6 text-3xl font-bold tracking-tight text-gray-900 md:text-5xl">{title}</h1>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-600">{subtitle}</p>
          </div>
        </section>
        <div className="mx-auto max-w-3xl px-4 pb-20">{children}</div>
      </main>
      <Footer />
    </>
  )
}
