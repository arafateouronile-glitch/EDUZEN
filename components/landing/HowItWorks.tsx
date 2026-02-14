'use client'

import { motion, useScroll, useTransform, useSpring, useInView } from '@/components/ui/motion'
import { useRef, useState, useEffect } from 'react'
import { UserPlus, Settings, Users, BarChart3, CheckCircle2, Zap, ArrowRight, Upload, FileText, Calendar, Bell } from 'lucide-react'
import { cn } from '@/lib/utils'

// Composants UI Abstraits pour les visuels
const UIWindow = ({ children, className }: { children: React.ReactNode, className?: string }) => (
  <div className={cn("relative w-full h-full bg-white rounded-xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] overflow-hidden border border-gray-100/50", className)}>
    <div className="absolute top-0 left-0 right-0 h-8 bg-gray-50/50 border-b border-gray-100 flex items-center px-3 gap-1.5 backdrop-blur-sm z-10">
      <div className="w-2.5 h-2.5 rounded-full bg-red-400/20 border border-red-400/30" />
      <div className="w-2.5 h-2.5 rounded-full bg-amber-400/20 border border-amber-400/30" />
      <div className="w-2.5 h-2.5 rounded-full bg-green-400/20 border border-green-400/30" />
    </div>
    <div className="pt-10 p-4 h-full">
      {children}
    </div>
  </div>
)

const steps = [
  {
    number: '01',
    icon: UserPlus,
    title: 'Créez votre compte',
    description: 'Inscription gratuite en 2 minutes. Aucune carte bancaire requise pour l\'essai de 14 jours.',
    details: ['Essai gratuit 14 jours', 'Sans engagement', 'Configuration guidée'],
    image: (
      <UIWindow>
        <div className="flex flex-col items-center justify-center h-full gap-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-blue to-brand-cyan shadow-lg shadow-brand-blue/20 flex items-center justify-center mb-2">
            <span className="text-white font-bold text-2xl italic">E</span>
          </div>
          <div className="w-full max-w-[240px] space-y-3">
            <div className="h-10 w-full bg-gray-50 border border-gray-100 rounded-lg flex items-center px-3 text-xs text-gray-400">
              john.doe@formation.com
            </div>
            <div className="h-10 w-full bg-gray-50 border border-gray-100 rounded-lg flex items-center px-3 text-xs text-gray-400">
              ••••••••••••
            </div>
            <div className="h-10 w-full bg-brand-blue rounded-lg shadow-lg shadow-brand-blue/20 flex items-center justify-center text-white text-sm font-medium">
              Commencer gratuitement
            </div>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-gray-400">
            <CheckCircle2 className="w-3 h-3 text-green-500" />
            <span>Pas de CB requise</span>
          </div>
        </div>
      </UIWindow>
    )
  },
  {
    number: '02',
    icon: Settings,
    title: 'Configurez votre organisme',
    description: 'Importez vos formations, formateurs et stagiaires existants. Notre assistant vous guide pas à pas.',
    details: ['Import Excel/CSV', 'Templates prêts à l\'emploi', 'Support dédié'],
    image: (
      <UIWindow>
        <div className="flex flex-col h-full gap-4">
          <div className="flex items-center justify-between border-b border-gray-50 pb-2">
            <span className="text-xs font-semibold text-gray-700">Import des données</span>
            <span className="text-[10px] text-brand-blue bg-brand-blue/5 px-2 py-0.5 rounded-full">Assistant</span>
          </div>
          
          <div className="space-y-3">
            {[
              { name: 'Base_Stagiaires_2024.csv', size: '245 KB', status: 'completed' },
              { name: 'Catalogue_Formations.xlsx', size: '1.2 MB', status: 'uploading' }
            ].map((file, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 bg-gray-50/50">
                <div className="w-8 h-8 rounded-lg bg-white border border-gray-100 flex items-center justify-center">
                  <FileText className="w-4 h-4 text-brand-blue" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-gray-900 truncate">{file.name}</div>
                  <div className="text-[10px] text-gray-400">{file.size}</div>
                </div>
                {file.status === 'completed' ? (
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                ) : (
                  <div className="w-4 h-4 rounded-full border-2 border-brand-blue border-t-transparent animate-spin" />
                )}
              </div>
            ))}
          </div>

          <div className="mt-auto bg-brand-cyan/5 rounded-lg p-3 border border-brand-cyan/10">
            <div className="flex gap-2">
              <div className="w-1 h-1 rounded-full bg-brand-cyan mt-1.5" />
              <p className="text-[10px] text-gray-600 leading-relaxed">
                <span className="font-semibold text-brand-cyan-darker">Conseil :</span> Utilisez nos modèles d'import pour gagner du temps lors de la configuration initiale.
              </p>
            </div>
          </div>
        </div>
      </UIWindow>
    )
  },
  {
    number: '03',
    icon: Users,
    title: 'Gérez vos sessions',
    description: 'Inscriptions, émargements, documents... Tout est automatisé et conforme Qualiopi.',
    details: ['Émargement QR Code', 'Documents automatiques', 'Conformité garantie'],
    image: (
      <UIWindow>
        <div className="flex flex-col h-full gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              <span className="text-xs font-semibold text-gray-900">Session en cours</span>
            </div>
            <div className="flex -space-x-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="w-6 h-6 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center text-[8px] font-bold text-gray-500">
                  {String.fromCharCode(64 + i)}
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            {[
              { name: 'Sophie Martin', time: '09:02', status: 'signed' },
              { name: 'Thomas Dubois', time: '08:58', status: 'signed' },
              { name: 'Léa Bernard', time: '--:--', status: 'pending' },
            ].map((student, i) => (
              <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-white border border-gray-100 shadow-sm">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${student.status === 'signed' ? 'bg-green-500' : 'bg-orange-300'}`} />
                  <span className="text-xs font-medium text-gray-700">{student.name}</span>
                </div>
                {student.status === 'signed' ? (
                  <span className="text-[10px] text-green-600 font-mono bg-green-50 px-1.5 py-0.5 rounded">
                    {student.time}
                  </span>
                ) : (
                  <span className="text-[10px] text-orange-400 font-medium">En attente</span>
                )}
              </div>
            ))}
          </div>

          <div className="mt-auto flex items-center gap-2 p-2 bg-gray-900 rounded-lg text-white shadow-lg shadow-gray-200">
            <div className="w-8 h-8 rounded bg-white/10 flex items-center justify-center">
              <Upload className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <div className="text-[10px] font-medium opacity-80">Documents générés</div>
              <div className="text-xs font-bold">Prêt pour envoi</div>
            </div>
            <ArrowRight className="w-4 h-4 opacity-50" />
          </div>
        </div>
      </UIWindow>
    )
  },
  {
    number: '04',
    icon: BarChart3,
    title: 'Pilotez votre activité',
    description: 'Suivez vos KPIs en temps réel, facturez automatiquement et développez votre chiffre d\'affaires.',
    details: ['Dashboard temps réel', 'Facturation CPF', 'Analytics avancés'],
    image: (
      <UIWindow>
        <div className="flex flex-col h-full gap-5">
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-brand-blue/5 rounded-xl border border-brand-blue/10">
              <div className="text-[10px] text-brand-blue-darker font-medium uppercase tracking-wider mb-1">CA Mensuel</div>
              <div className="text-xl font-bold text-gray-900">42,5k €</div>
              <div className="text-[10px] text-green-600 font-medium flex items-center gap-0.5 mt-1">
                <span className="w-0 h-0 border-l-[3px] border-l-transparent border-r-[3px] border-r-transparent border-b-[4px] border-b-green-500" />
                +12% vs N-1
              </div>
            </div>
            <div className="p-3 bg-purple-50 rounded-xl border border-purple-100">
              <div className="text-[10px] text-purple-700 font-medium uppercase tracking-wider mb-1">Factures</div>
              <div className="text-xl font-bold text-gray-900">8 En attente</div>
              <div className="text-[10px] text-purple-600 font-medium mt-1">
                3 relances auto
              </div>
            </div>
          </div>

          <div className="flex-1 bg-white rounded-xl border border-gray-100 p-3 shadow-sm relative overflow-hidden">
            <div className="flex items-end justify-between h-full gap-2 px-1">
              {[40, 65, 45, 80, 55, 90, 70].map((h, i) => (
                <div key={i} className="w-full bg-gray-100 rounded-t-md relative group">
                  <div 
                    className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-brand-blue to-brand-cyan rounded-t-md transition-all duration-500"
                    style={{ height: `${h}%` }}
                  />
                  {/* Tooltip on hover */}
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white text-[9px] px-1.5 py-0.5 rounded">
                    {h}k
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </UIWindow>
    )
  },
]

export function HowItWorks() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [activeStep, setActiveStep] = useState(0)
  
  // Optimisation: Détection du step actif
  useEffect(() => {
    const handleScroll = () => {
      const stepElements = document.querySelectorAll('.step-text-section')
      stepElements.forEach((el, index) => {
        const rect = el.getBoundingClientRect()
        // Point de déclenchement au tiers de l'écran pour une meilleure réactivité
        if (rect.top >= 0 && rect.top <= window.innerHeight * 0.4) {
          setActiveStep(index)
        }
      })
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <section id="comment-ca-marche" className="relative py-24 md:py-32 overflow-hidden bg-white">
      {/* Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[20%] right-[-10%] w-[600px] h-[600px] bg-brand-blue/5 rounded-full blur-[100px]" />
        <div className="absolute bottom-[20%] left-[-10%] w-[600px] h-[600px] bg-brand-cyan/5 rounded-full blur-[100px]" />
      </div>

      <div className="container mx-auto px-4 md:px-6 relative z-10" ref={containerRef}>
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-20 md:mb-32">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-blue/5 border border-brand-blue/10 mb-6"
          >
            <Zap className="w-4 h-4 text-brand-blue" />
            <span className="text-xs font-bold tracking-widest uppercase text-brand-blue">
              Simple et Rapide
            </span>
          </motion.div>
          
          <h2 className="text-4xl md:text-6xl font-black text-gray-900 mb-6 tracking-tight leading-[1.1] font-display">
            Démarrez en <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-blue to-brand-cyan">quelques minutes</span>
          </h2>
          
          <p className="text-xl text-gray-500 font-light max-w-2xl mx-auto">
            Une interface intuitive conçue pour vous faire gagner du temps dès le premier jour.
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-12 lg:gap-24 items-start">
          
          {/* Left Column: Sticky Visual (Desktop) */}
          <div className="hidden lg:block lg:w-1/2 sticky top-32">
            <div className="relative w-full aspect-square max-h-[500px]">
              {/* Card Container */}
              <div className="relative w-full h-full bg-gray-50/50 backdrop-blur-xl rounded-[2.5rem] border border-white/50 shadow-2xl overflow-hidden p-8">
                <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-white/10" />
                
                {/* Visuals Transitions */}
                {steps.map((step, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, scale: 0.9, y: 20, rotateX: -10 }}
                    animate={{ 
                      opacity: activeStep === index ? 1 : 0,
                      scale: activeStep === index ? 1 : 0.9,
                      y: activeStep === index ? 0 : 20,
                      rotateX: activeStep === index ? 0 : -10,
                      zIndex: activeStep === index ? 10 : 0
                    }}
                    transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                    className="absolute inset-8"
                    style={{ perspective: 1000 }}
                  >
                    {step.image}
                  </motion.div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Scrolling Text */}
          <div className="lg:w-1/2 flex flex-col pt-8 lg:pt-0">
            {steps.map((step, index) => (
              <div 
                key={index} 
                className={cn(
                  "step-text-section relative pl-12 lg:pl-16 min-h-[60vh] flex flex-col justify-center py-12 transition-all duration-500",
                  activeStep === index ? "opacity-100" : "opacity-30 blur-[1px]"
                )}
              >
                {/* Connecting Line */}
                <div className="absolute left-4 top-0 bottom-0 w-[2px] bg-gray-100">
                  <motion.div 
                    className="absolute top-0 w-full bg-brand-blue"
                    initial={{ height: "0%" }}
                    animate={{ height: activeStep > index ? "100%" : activeStep === index ? "50%" : "0%" }}
                    transition={{ duration: 0.5 }}
                  />
                </div>

                {/* Number Circle */}
                <div className={cn(
                  "absolute left-0 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold z-10 transition-colors duration-500 bg-white",
                  activeStep === index || activeStep > index
                    ? "border-brand-blue text-brand-blue"
                    : "border-gray-200 text-gray-300"
                )}>
                  {step.number}
                </div>

                <div className="relative">
                  <h3 className={cn(
                    "text-3xl md:text-4xl font-bold font-display mb-4 transition-colors duration-300",
                    activeStep === index ? "text-gray-900" : "text-gray-400"
                  )}>
                    {step.title}
                  </h3>
                  
                  <p className="text-xl text-gray-500 leading-relaxed mb-8 font-light">
                    {step.description}
                  </p>

                  <ul className="space-y-4">
                    {step.details.map((detail, i) => (
                      <motion.li 
                        key={i} 
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: activeStep === index ? 1 : 0, x: activeStep === index ? 0 : -10 }}
                        transition={{ delay: 0.1 + (i * 0.1) }}
                        className="flex items-center gap-3"
                      >
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-brand-blue/10 flex items-center justify-center">
                          <CheckCircle2 className="w-3.5 h-3.5 text-brand-blue" />
                        </div>
                        <span className="text-gray-700 font-medium">{detail}</span>
                      </motion.li>
                    ))}
                  </ul>

                  {/* Mobile Image Fallback (Visible only on mobile) */}
                  <div className="lg:hidden mt-8 h-[300px] w-full bg-gray-50 rounded-2xl border border-gray-100 overflow-hidden shadow-lg">
                    <div className="relative w-full h-full p-6">
                      {step.image}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

        </div>

      </div>
    </section>
  )
}
