'use client'

import { memo, useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from '@/components/ui/motion'
import { Button } from '@/components/ui/button'
import {
  ArrowRight,
  Gift,
  Users,
  TrendingUp,
  CheckCircle2,
  Star,
  Sparkles,
  Euro,
  LinkIcon,
  BarChart3,
  ChevronDown,
  Lightbulb,
  GraduationCap,
  Briefcase,
  BookOpen,
  Share2,
  Wallet,
  Clock,
  Shield,
} from 'lucide-react'
import dynamic from 'next/dynamic'

const Footer = dynamic(
  () => import('@/components/landing/Footer').then((mod) => ({ default: mod.Footer })),
  { loading: () => <div className="min-h-[200px] bg-gray-900" /> }
)

const steps = [
  {
    number: '01',
    icon: LinkIcon,
    title: 'Inscrivez-vous',
    description:
      'Créez votre compte affilié en 2 minutes. Vous obtenez immédiatement votre lien de parrainage unique et accès à votre espace de suivi.',
  },
  {
    number: '02',
    icon: Share2,
    title: 'Partagez votre lien',
    description:
      'Recommandez EduZen à votre réseau : formateurs, consultants en formation, organismes. Via email, réseaux sociaux ou articles de blog.',
  },
  {
    number: '03',
    icon: Wallet,
    title: 'Touchez vos commissions',
    description:
      'Percevez 20 % de commission récurrente sur chaque abonnement souscrit. Aussi longtemps que votre filleul reste client EduZen.',
  },
]

const profiles = [
  {
    icon: GraduationCap,
    title: 'Formateurs indépendants',
    description:
      'Vous connaissez les enjeux des organismes de formation mieux que personne. Votre recommandation a du poids.',
  },
  {
    icon: Briefcase,
    title: 'Consultants en formation',
    description:
      'Vous accompagnez des OF au quotidien. EduZen peut transformer leur quotidien administratif.',
  },
  {
    icon: BookOpen,
    title: 'Blogueurs & influenceurs EdTech',
    description:
      'Vous avez une audience dans le secteur de la formation. Monétisez votre expertise avec nos commissions attractives.',
  },
  {
    icon: Lightbulb,
    title: 'Conseillers OPCO & experts Qualiopi',
    description:
      'Vous connaissez les problématiques de conformité. EduZen est la solution que vos clients attendent.',
  },
]

const earningsData = [
  { referrals: 2, plan: 'Starter', monthly: 32, yearly: 316 },
  { referrals: 5, plan: 'Pro', monthly: 169, yearly: 1690 },
  { referrals: 10, plan: 'Pro', monthly: 338, yearly: 3380 },
  { referrals: 20, plan: 'Enterprise', monthly: 1396, yearly: 13960 },
]

const faqs = [
  {
    question: 'Combien puis-je gagner ?',
    answer:
      'Vous touchez 20 % de commission récurrente sur chaque abonnement souscrit grâce à votre lien. Par exemple, 5 clients sur le plan Pro (169 €/mois) vous rapportent 169 €/mois, soit 2 028 €/an.',
  },
  {
    question: 'Quand et comment suis-je payé ?',
    answer:
      'Les commissions sont versées chaque mois via virement bancaire ou PayPal, dès lors que vous avez atteint le seuil minimum de 50 €. Les paiements sont effectués le 10 de chaque mois pour le mois précédent.',
  },
  {
    question: "Combien de temps dure le cookie d'attribution ?",
    answer:
      "Le cookie de tracking est valide 90 jours. Si un visiteur clique sur votre lien et s'abonne dans les 90 jours, la commission vous est attribuée.",
  },
  {
    question: "Y a-t-il un nombre minimum de filleuls requis ?",
    answer:
      "Non, il n'y a aucun minimum. Même un seul filleul vous rapporte des commissions récurrentes chaque mois.",
  },
  {
    question: 'Le programme est-il gratuit ?',
    answer:
      "Oui, totalement gratuit. Il n'y a aucun frais d'inscription ni engagement de votre part.",
  },
  {
    question: 'Puis-je suivre mes performances en temps réel ?',
    answer:
      "Oui, votre espace affilié vous donne accès à un tableau de bord complet : clics, inscriptions, conversions et commissions générées, tout en temps réel.",
  },
]

function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border border-gray-200 rounded-2xl overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-6 py-5 text-left hover:bg-gray-50 transition-colors"
        onClick={() => setOpen(!open)}
      >
        <span className="font-semibold text-gray-900 pr-4">{question}</span>
        <motion.div
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.3 }}
          className="flex-shrink-0"
        >
          <ChevronDown className="w-5 h-5 text-gray-500" />
        </motion.div>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <p className="px-6 pb-5 text-gray-600 leading-relaxed">{answer}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export const AffiliationContent = memo(function AffiliationContent() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="relative pt-40 pb-24 overflow-hidden bg-gradient-to-b from-white via-brand-blue/[0.03] to-white">
        {/* Background decoration */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] rounded-full bg-brand-cyan/5 blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] rounded-full bg-brand-blue/5 blur-3xl" />
        </div>

        <div className="container mx-auto px-4 md:px-6 lg:px-8 max-w-5xl relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-brand-blue/10 to-brand-cyan/10 border border-brand-cyan/20 rounded-full mb-8">
              <Sparkles className="w-4 h-4 text-brand-blue" />
              <span className="text-sm font-semibold text-brand-blue">Programme d&apos;affiliation — Gratuit & sans engagement</span>
            </div>

            <h1 className="text-5xl md:text-7xl font-black tracking-tightest leading-tight font-display text-gray-900 mb-6">
              Recommandez EduZen.
              <br />
              <span className="bg-gradient-to-r from-brand-blue to-brand-cyan bg-clip-text text-transparent">
                Touchez 20 % à vie.
              </span>
            </h1>

            <p className="text-xl md:text-2xl text-gray-600 max-w-2xl mx-auto mb-10 leading-relaxed">
              Partagez EduZen à votre réseau et percevez une commission récurrente chaque mois,
              aussi longtemps que vos filleuls restent abonnés.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/contact?subject=affiliation">
                <motion.div
                  whileHover={{ scale: 1.02, y: -1 }}
                  whileTap={{ scale: 0.98 }}
                  className="relative group"
                >
                  <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-brand-blue to-brand-cyan opacity-0 group-hover:opacity-30 blur-lg transition-opacity duration-500" />
                  <div className="relative flex items-center gap-2 px-8 py-4 rounded-full bg-gradient-to-r from-brand-blue to-brand-blue-dark text-white font-semibold shadow-lg shadow-brand-blue/25 group-hover:shadow-xl transition-all duration-500">
                    <Gift className="w-4 h-4" />
                    Devenir affilié gratuitement
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </motion.div>
              </Link>
              <a
                href="#comment-ca-marche"
                className="px-8 py-4 rounded-full border border-gray-200 text-gray-700 font-semibold hover:border-brand-blue/30 hover:text-brand-blue transition-all duration-300"
              >
                Voir comment ça marche
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="py-12 border-y border-gray-100 bg-gradient-to-r from-brand-blue/[0.02] via-white to-brand-cyan/[0.02]">
        <div className="container mx-auto px-4 md:px-6 max-w-4xl">
          <div className="grid grid-cols-3 gap-8">
            {[
              { value: '20 %', label: 'Commission récurrente', icon: Euro },
              { value: '90 jours', label: 'Durée du cookie', icon: Clock },
              { value: '0 €', label: "Frais d'inscription", icon: Shield },
            ].map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * i, duration: 0.5 }}
                className="flex flex-col items-center text-center"
              >
                <stat.icon className="w-6 h-6 text-brand-cyan mb-2" />
                <p className="text-3xl md:text-4xl font-black text-brand-blue">{stat.value}</p>
                <p className="text-sm text-gray-500 mt-1">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="comment-ca-marche" className="py-24 bg-white">
        <div className="container mx-auto px-4 md:px-6 max-w-5xl">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-brand-cyan uppercase tracking-widest mb-3">
              Fonctionnement
            </p>
            <h2 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tightest">
              Simple comme 1, 2, 3
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className="relative group"
              >
                {i < steps.length - 1 && (
                  <div className="hidden md:block absolute top-10 left-[calc(100%+8px)] w-[calc(100%-16px)] h-px bg-gradient-to-r from-brand-cyan/30 to-transparent" />
                )}
                <div className="bg-gray-50 rounded-2xl p-8 hover:bg-gradient-to-br hover:from-brand-blue/[0.03] hover:to-brand-cyan/[0.03] hover:border-brand-cyan/20 border border-transparent transition-all duration-300">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-blue to-brand-cyan flex items-center justify-center shadow-lg shadow-brand-blue/20 mb-6">
                    <step.icon className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-5xl font-black text-gray-100 absolute top-6 right-8 select-none">
                    {step.number}
                  </span>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">{step.title}</h3>
                  <p className="text-gray-600 leading-relaxed text-sm">{step.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Earnings calculator */}
      <section className="py-24 bg-gradient-to-b from-gray-50 to-white">
        <div className="container mx-auto px-4 md:px-6 max-w-4xl">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-brand-cyan uppercase tracking-widest mb-3">
              Vos revenus
            </p>
            <h2 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tightest">
              Combien pouvez-vous gagner ?
            </h2>
            <p className="text-lg text-gray-600 mt-4 max-w-xl mx-auto">
              Les commissions sont calculées sur 20 % du prix HT de chaque abonnement.
            </p>
          </div>

          <div className="overflow-hidden rounded-2xl border border-gray-200 shadow-xl">
            <table className="w-full">
              <thead>
                <tr className="bg-gradient-to-r from-brand-blue to-brand-blue-dark text-white">
                  <th className="px-6 py-4 text-left text-sm font-bold">Filleuls</th>
                  <th className="px-6 py-4 text-left text-sm font-bold">Plan moyen</th>
                  <th className="px-6 py-4 text-right text-sm font-bold">Commission/mois</th>
                  <th className="px-6 py-4 text-right text-sm font-bold">Commission/an</th>
                </tr>
              </thead>
              <tbody>
                {earningsData.map((row, i) => (
                  <motion.tr
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.08 }}
                    className={`border-t border-gray-100 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} hover:bg-brand-blue/[0.02] transition-colors`}
                  >
                    <td className="px-6 py-4 font-semibold text-gray-900">{row.referrals} clients</td>
                    <td className="px-6 py-4 text-gray-600">{row.plan}</td>
                    <td className="px-6 py-4 text-right font-bold text-brand-blue">{row.monthly} €</td>
                    <td className="px-6 py-4 text-right">
                      <span className="font-black text-lg text-brand-blue">{row.yearly.toLocaleString('fr-FR')} €</span>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-center text-sm text-gray-400 mt-4">
            * Estimations basées sur 20 % du tarif mensuel HT. Commissions récurrentes tant que le filleul est abonné.
          </p>
        </div>
      </section>

      {/* For who */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-4 md:px-6 max-w-5xl">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-brand-cyan uppercase tracking-widest mb-3">
              Programme ouvert à tous
            </p>
            <h2 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tightest">
              Fait pour vous, si vous êtes…
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {profiles.map((profile, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="group p-6 rounded-2xl border border-gray-100 hover:border-brand-cyan/30 hover:shadow-lg hover:shadow-brand-blue/5 transition-all duration-300"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-blue/10 to-brand-cyan/10 flex items-center justify-center mb-4 group-hover:from-brand-blue/20 group-hover:to-brand-cyan/20 transition-all duration-300">
                  <profile.icon className="w-5 h-5 text-brand-blue" />
                </div>
                <h3 className="font-bold text-gray-900 mb-2">{profile.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{profile.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-24 bg-gradient-to-b from-[#0B0F19] to-[#111827] text-white relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/3 w-[500px] h-[500px] rounded-full bg-brand-blue/10 blur-3xl" />
          <div className="absolute bottom-0 right-1/3 w-[400px] h-[400px] rounded-full bg-brand-cyan/10 blur-3xl" />
        </div>

        <div className="container mx-auto px-4 md:px-6 max-w-4xl relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black tracking-tightest mb-4">
              Pourquoi rejoindre notre programme ?
            </h2>
            <p className="text-lg text-gray-400">
              Un programme pensé pour être simple, transparent et vraiment rentable.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-6">
            {[
              {
                icon: TrendingUp,
                title: 'Commissions récurrentes',
                description: '20 % de commission sur chaque renouvellement d\'abonnement, pas seulement la première vente.',
              },
              {
                icon: BarChart3,
                title: 'Dashboard en temps réel',
                description: 'Suivez vos clics, conversions et commissions depuis votre espace affilié dédié.',
              },
              {
                icon: Users,
                title: 'Matériel marketing fourni',
                description: 'Bannières, textes, visuels… Tout le matériel dont vous avez besoin pour promouvoir EduZen efficacement.',
              },
              {
                icon: Star,
                title: 'Support dédié',
                description: 'Une équipe dédiée répond à vos questions et vous aide à maximiser vos résultats.',
              },
            ].map((benefit, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="flex gap-4 p-6 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/8 transition-colors"
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-blue/30 to-brand-cyan/30 flex items-center justify-center flex-shrink-0">
                  <benefit.icon className="w-5 h-5 text-brand-cyan" />
                </div>
                <div>
                  <h3 className="font-bold text-white mb-1">{benefit.title}</h3>
                  <p className="text-sm text-gray-400 leading-relaxed">{benefit.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-4 md:px-6 max-w-2xl">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-brand-cyan uppercase tracking-widest mb-3">
              Questions fréquentes
            </p>
            <h2 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tightest">
              Tout ce que vous devez savoir
            </h2>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06 }}
              >
                <FaqItem question={faq.question} answer={faq.answer} />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 bg-gradient-to-b from-gray-50 to-white">
        <div className="container mx-auto px-4 md:px-6 max-w-3xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-full mb-8">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <span className="text-sm font-semibold text-green-700">Programme 100 % gratuit • Aucun engagement</span>
            </div>

            <h2 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tightest mb-6">
              Prêt à générer des revenus passifs ?
            </h2>
            <p className="text-lg text-gray-600 mb-10 max-w-xl mx-auto">
              Rejoignez le programme d&apos;affiliation EduZen dès aujourd&apos;hui.
              Inscription en 2 minutes, commissions à vie.
            </p>

            <Link href="/contact?subject=affiliation">
              <motion.div
                whileHover={{ scale: 1.02, y: -1 }}
                whileTap={{ scale: 0.98 }}
                className="inline-flex relative group"
              >
                <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-brand-blue to-brand-cyan opacity-0 group-hover:opacity-30 blur-lg transition-opacity duration-500" />
                <div className="relative flex items-center gap-2 px-10 py-4 rounded-full bg-gradient-to-r from-brand-blue to-brand-blue-dark text-white font-semibold text-lg shadow-xl shadow-brand-blue/25 group-hover:shadow-2xl transition-all duration-500">
                  <Gift className="w-5 h-5" />
                  Rejoindre le programme
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </motion.div>
            </Link>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  )
})
