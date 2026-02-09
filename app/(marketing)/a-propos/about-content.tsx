'use client'

import { memo } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  Heart,
  Target,
  Users,
  Lightbulb,
  ArrowRight,
  CheckCircle2,
  GraduationCap,
  Clock,
  FileText,
  Award
} from 'lucide-react'
import dynamic from 'next/dynamic'

const Footer = dynamic(
  () => import('@/components/landing/Footer').then(mod => ({ default: mod.Footer })),
  { loading: () => <div className="min-h-[200px] bg-gray-900" /> }
)

const values = [
  {
    icon: Heart,
    title: 'Passion',
    description: 'Nous croyons que la formation est le moteur du progrès. Chaque fonctionnalité est conçue avec la passion de simplifier votre métier.'
  },
  {
    icon: Target,
    title: 'Excellence',
    description: 'Nous visons l\'excellence dans chaque détail. De la conformité Qualiopi à l\'expérience utilisateur, rien n\'est laissé au hasard.'
  },
  {
    icon: Users,
    title: 'Proximité',
    description: 'Nous écoutons nos utilisateurs. Chaque mise à jour est le fruit de vos retours et de notre compréhension de vos défis quotidiens.'
  },
  {
    icon: Lightbulb,
    title: 'Innovation',
    description: 'Nous innovons pour vous faire gagner du temps. Signature électronique, émargement QR, automatisation... L\'innovation au service de votre efficacité.'
  }
]

const timeline = [
  {
    year: '2023',
    title: 'Le constat',
    description: 'En accompagnant des organismes de formation, nous avons constaté le même problème partout : des heures perdues en tâches administratives, des outils inadaptés, et un stress permanent avant chaque audit Qualiopi.'
  },
  {
    year: '2024',
    title: 'La naissance d\'EduZen',
    description: 'Nous avons décidé de créer l\'outil que nous aurions aimé avoir. Un logiciel pensé par des professionnels de la formation, pour des professionnels de la formation. Simple, efficace, et conforme.'
  },
  {
    year: '2025',
    title: 'L\'aventure continue',
    description: 'Aujourd\'hui, nous accompagnons nos premiers utilisateurs dans leur transformation digitale. Chaque jour, nous améliorons EduZen grâce à leurs retours précieux.'
  }
]

export const AboutContent = memo(function AboutContent() {
  return (
    <main className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 md:pt-40 md:pb-28 overflow-hidden bg-gradient-to-b from-white via-gray-50/50 to-white">
        {/* Background */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <div className="absolute top-1/4 right-0 w-[400px] h-[400px] bg-brand-blue/5 rounded-full blur-[80px]" />
          <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-brand-cyan/5 rounded-full blur-[80px]" />
        </div>

        <div className="container mx-auto px-4 md:px-6 lg:px-8 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <div className="animate-fade-in-up inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-brand-blue-ghost border border-brand-blue-pale mb-8">
              <Heart className="w-4 h-4 text-brand-blue" />
              <span className="text-sm font-medium text-brand-blue-darker">Notre histoire</span>
            </div>

            <h1 className="animate-fade-in-up animation-delay-100 text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-gray-900 mb-8">
              Créé par des{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-blue to-brand-cyan">
                professionnels de la formation
              </span>
              , pour des professionnels de la formation
            </h1>

            <p className="animate-fade-in-up animation-delay-200 text-lg md:text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              EduZen est né d'une frustration partagée par tous les organismes de formation :
              passer plus de temps sur l'administratif que sur la pédagogie. Nous avons décidé de changer ça.
            </p>
          </div>
        </div>
      </section>

      {/* Story Section */}
      <section className="py-20 md:py-28 bg-white">
        <div className="container mx-auto px-4 md:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            {/* Le problème */}
            <div className="mb-16 md:mb-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-red-100 flex items-center justify-center">
                  <FileText className="w-6 h-6 text-red-600" />
                </div>
                <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Le problème que nous avons vécu</h2>
              </div>

              <div className="prose prose-lg max-w-none text-gray-700">
                <p className="text-lg leading-relaxed">
                  <strong className="text-gray-900">Imaginez :</strong> vous êtes formateur ou responsable d'un organisme de formation.
                  Vous aimez transmettre votre savoir, voir vos stagiaires progresser, les accompagner vers la réussite.
                </p>
                <p className="text-lg leading-relaxed">
                  Mais votre quotidien, c'est aussi <span className="text-red-600 font-semibold">des heures passées sur des tâches administratives</span> :
                  conventions, feuilles de présence, attestations, relances de paiement, préparation des audits Qualiopi...
                </p>
                <p className="text-lg leading-relaxed">
                  Vous jonglez entre Excel, Word, des signatures papier, des emails qui se perdent.
                  Chaque audit est source de stress. Chaque fin de session est une course contre la montre pour générer les documents.
                </p>
                <p className="text-lg leading-relaxed font-semibold text-gray-900">
                  Nous l'avons vécu. Nous l'avons vu chez nos clients. Et nous avons décidé d'y remédier.
                </p>
              </div>
            </div>

            {/* La solution */}
            <div className="mb-16 md:mb-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-green-100 flex items-center justify-center">
                  <Lightbulb className="w-6 h-6 text-green-600" />
                </div>
                <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Notre solution</h2>
              </div>

              <div className="prose prose-lg max-w-none text-gray-700">
                <p className="text-lg leading-relaxed">
                  EduZen est né de cette frustration. Nous avons construit <strong className="text-gray-900">l'outil que nous aurions aimé avoir</strong> :
                  une plateforme qui automatise tout ce qui peut l'être, pour vous permettre de vous concentrer sur l'essentiel.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-8 not-prose">
                  {[
                    { icon: Clock, text: 'Gagnez 20h par semaine sur l\'administratif' },
                    { icon: Award, text: 'Passez vos audits Qualiopi sereinement' },
                    { icon: FileText, text: 'Générez tous vos documents en 1 clic' },
                    { icon: GraduationCap, text: 'Concentrez-vous enfin sur la pédagogie' }
                  ].map((item, index) => (
                    <div key={index} className="flex items-start gap-3 p-4 rounded-xl bg-gray-50 border border-gray-100">
                      <div className="w-10 h-10 rounded-xl bg-brand-blue/10 flex items-center justify-center flex-shrink-0">
                        <item.icon className="w-5 h-5 text-brand-blue" />
                      </div>
                      <span className="text-gray-800 font-medium">{item.text}</span>
                    </div>
                  ))}
                </div>

                <p className="text-lg leading-relaxed">
                  Chaque fonctionnalité d'EduZen a été pensée avec un seul objectif :
                  <span className="text-brand-blue font-semibold"> vous simplifier la vie</span>.
                  Parce que nous savons exactement ce que vous vivez au quotidien.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Timeline Section */}
      <section className="py-20 md:py-28 bg-gray-50">
        <div className="container mx-auto px-4 md:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Notre parcours</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              De l'idée à la réalité : comment EduZen est devenu la solution que vous attendiez.
            </p>
          </div>

          <div className="max-w-3xl mx-auto">
            {timeline.map((item, index) => (
              <div key={index} className="relative pl-8 pb-12 last:pb-0">
                {/* Line */}
                {index < timeline.length - 1 && (
                  <div className="absolute left-[11px] top-8 w-0.5 h-full bg-gradient-to-b from-brand-blue to-brand-cyan" />
                )}

                {/* Dot */}
                <div className="absolute left-0 top-1 w-6 h-6 rounded-full bg-gradient-to-br from-brand-blue to-brand-cyan flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-white" />
                </div>

                {/* Content */}
                <div className="bg-white rounded-2xl p-6 md:p-8 shadow-lg border border-gray-100">
                  <span className="text-sm font-bold text-brand-blue">{item.year}</span>
                  <h3 className="text-xl font-bold text-gray-900 mt-1 mb-3">{item.title}</h3>
                  <p className="text-gray-600 leading-relaxed">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-20 md:py-28 bg-white">
        <div className="container mx-auto px-4 md:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Nos valeurs</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Les principes qui guident chacune de nos décisions et chaque ligne de code.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {values.map((value, index) => (
              <div
                key={index}
                className="bg-white rounded-2xl p-6 border-2 border-gray-100 hover:border-brand-blue/30 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
              >
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-blue to-brand-cyan flex items-center justify-center mb-4">
                  <value.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{value.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-20 md:py-28 bg-gradient-to-br from-brand-blue via-brand-blue-dark to-brand-cyan text-white">
        <div className="container mx-auto px-4 md:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-8">Notre mission</h2>
            <p className="text-xl md:text-2xl text-white/90 leading-relaxed mb-8">
              Permettre à chaque organisme de formation de se concentrer sur ce qui compte vraiment :
              <span className="font-bold text-white"> former, accompagner, et faire grandir les compétences</span>.
            </p>
            <p className="text-lg text-white/80 mb-12">
              L'administratif ne devrait jamais être un frein à votre passion.
              Avec EduZen, libérez votre potentiel pédagogique.
            </p>

            <Link href="/auth/register">
              <Button
                size="lg"
                className="h-14 px-10 text-lg font-bold rounded-full bg-white text-brand-blue hover:bg-gray-100 shadow-xl"
              >
                Rejoindre l'aventure
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
})
