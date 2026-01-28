'use client'

import { motion } from 'framer-motion'
import { 
  Settings, 
  Calendar, 
  Users, 
  BookOpen, 
  UserCheck, 
  FileText, 
  Mail, 
  ClipboardCheck, 
  Euro, 
  Building2, 
  Cog, 
  GraduationCap, 
  BarChart2,
  CheckCircle2,
  Lock
} from 'lucide-react'
import { cn } from '@/lib/utils'

type WorkflowStep = 'configuration' | 'gestion' | 'espace_apprenant' | 'suivi'
type ConfigTab = 'initialisation' | 'dates_prix' | 'apprenants' | 'programme' | 'intervenants'
type GestionTab = 'conventions' | 'convocations' | 'evaluations' | 'finances' | 'espace_entreprise' | 'automatisation'

interface SessionSidebarProps {
  activeStep: WorkflowStep
  setActiveStep: (step: WorkflowStep) => void
  activeTab: ConfigTab
  setActiveTab: (tab: ConfigTab) => void
  activeGestionTab: GestionTab
  setActiveGestionTab: (tab: GestionTab) => void
  className?: string
}

export function SessionSidebar({
  activeStep,
  setActiveStep,
  activeTab,
  setActiveTab,
  activeGestionTab,
  setActiveGestionTab,
  className
}: SessionSidebarProps) {

  const menuItems = [
    {
      id: 'configuration',
      label: 'Configuration',
      icon: Settings,
      description: 'Paramétrez votre session',
      items: [
        { id: 'initialisation', label: 'Initialisation', icon: Cog },
        { id: 'dates_prix', label: 'Dates et prix', icon: Calendar },
        { id: 'apprenants', label: 'Apprenants', icon: Users },
        { id: 'programme', label: 'Programme', icon: BookOpen },
        { id: 'intervenants', label: 'Intervenants', icon: UserCheck },
      ]
    },
    {
      id: 'gestion',
      label: 'Gestion',
      icon: FolderOpen,
      description: 'Pilotez l\'activité quotidienne',
      items: [
        { id: 'conventions', label: 'Conventions', icon: FileText },
        { id: 'convocations', label: 'Convocations', icon: Mail },
        { id: 'evaluations', label: 'Évaluations', icon: ClipboardCheck },
        { id: 'finances', label: 'Finances', icon: Euro },
        { id: 'espace_entreprise', label: 'Espace Entreprise', icon: Building2 },
        { id: 'automatisation', label: 'Automatisation', icon: Cog }, 
      ]
    },
    {
      id: 'espace_apprenant',
      label: 'Espace Apprenant',
      icon: GraduationCap,
      description: 'Vue côté étudiant',
      items: [] 
    },
    {
      id: 'suivi',
      label: 'Suivi',
      icon: BarChart2,
      description: 'Analysez les performances',
      items: [] 
    }
  ]

  const handleMainClick = (stepId: string) => {
    setActiveStep(stepId as WorkflowStep)
    if (stepId === 'configuration') setActiveTab('initialisation')
    if (stepId === 'gestion') setActiveGestionTab('conventions')
  }

  const handleSubClick = (stepId: string, subId: string) => {
    setActiveStep(stepId as WorkflowStep)
    if (stepId === 'configuration') setActiveTab(subId as ConfigTab)
    if (stepId === 'gestion') setActiveGestionTab(subId as GestionTab)
  }

  // Determine active index for progress logic
  const activeIndex = menuItems.findIndex(item => item.id === activeStep)

  return (
    <nav className={cn("w-full relative py-2", className)}>
      {/* Continuous Timeline Line with dynamic gradient */}
      <div className="absolute left-[2.25rem] top-4 bottom-10 w-0.5 bg-gray-100 -z-10" />
      <motion.div 
        className="absolute left-[2.25rem] top-4 w-0.5 bg-gradient-to-b from-brand-blue via-brand-cyan to-brand-purple -z-10"
        initial={{ height: "0%" }}
        animate={{ height: `${(activeIndex / (menuItems.length - 1)) * 100}%` }}
        transition={{ duration: 0.5, ease: "easeInOut" }}
      />

      <div className="space-y-8">
        {menuItems.map((section, index) => {
          const isActiveSection = activeStep === section.id
          const isCompleted = index < activeIndex
          const Icon = isCompleted ? CheckCircle2 : section.icon
          
          return (
            <div key={section.id} className="relative group perspective-1000">
              
              {/* Main Step Button */}
              <div className="flex items-start gap-4">
                {/* Timeline Node */}
                <div className="relative pt-1">
                   <motion.div
                     className={cn(
                       "w-8 h-8 rounded-full flex items-center justify-center border-2 z-20 transition-all duration-300 relative bg-white",
                       isActiveSection 
                         ? "border-brand-blue shadow-[0_0_20px_rgba(59,130,246,0.3)] scale-110" 
                         : isCompleted 
                           ? "border-brand-cyan bg-brand-cyan text-white border-transparent"
                           : "border-gray-200 group-hover:border-brand-blue/30"
                     )}
                     animate={isActiveSection ? { 
                       boxShadow: ["0 0 0px rgba(59,130,246,0)", "0 0 20px rgba(59,130,246,0.5)", "0 0 0px rgba(59,130,246,0)"] 
                     } : {}}
                     transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                   >
                     <Icon className={cn(
                       "w-4 h-4 transition-colors",
                       isActiveSection ? "text-brand-blue" : isCompleted ? "text-white" : "text-gray-400 group-hover:text-gray-600"
                     )} />
                     
                     {isActiveSection && (
                       <motion.div
                         className="absolute inset-0 rounded-full border-2 border-brand-blue"
                         animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
                         transition={{ duration: 1.5, repeat: Infinity }}
                       />
                     )}
                   </motion.div>
                </div>

                {/* Content Block */}
                <div className="flex-1 space-y-2">
                   <motion.button
                    onClick={() => handleMainClick(section.id)}
                    whileHover={{ x: 5, backgroundColor: isActiveSection ? "rgba(255, 255, 255, 0.95)" : "rgba(255, 255, 255, 0.5)" }}
                    whileTap={{ scale: 0.98 }}
                    className={cn(
                      "w-full text-left px-5 py-4 rounded-2xl transition-all duration-300 border backdrop-blur-md relative overflow-hidden group/card",
                      isActiveSection
                        ? "bg-white/90 border-brand-blue/20 shadow-xl shadow-brand-blue/10"
                        : "bg-white/40 border-transparent hover:bg-white/60 hover:shadow-sm text-gray-500"
                    )}
                   >
                     {/* Decorative background gradient for active item */}
                     {isActiveSection && (
                       <>
                         <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-brand-blue/10 to-brand-cyan/10 rounded-full blur-2xl -mr-10 -mt-10 -z-10" />
                         <motion.div 
                            className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-brand-blue to-brand-cyan"
                            initial={{ width: 0 }}
                            animate={{ width: "100%" }}
                            transition={{ duration: 0.8, ease: "circOut" }}
                         />
                       </>
                     )}

                     <div className="flex justify-between items-center">
                       <div>
                         <span className={cn(
                           "text-base font-bold tracking-tight block transition-colors",
                           isActiveSection ? "text-brand-blue" : isCompleted ? "text-gray-700" : "text-gray-500"
                         )}>
                           {section.label}
                         </span>
                         <span className={cn(
                           "text-xs font-medium mt-1 block transition-colors",
                           isActiveSection ? "text-brand-blue/70" : "text-gray-400"
                         )}>
                           {section.description}
                         </span>
                       </div>
                       
                       {isActiveSection && (
                         <motion.div
                           initial={{ opacity: 0, scale: 0 }}
                           animate={{ opacity: 1, scale: 1 }}
                           className="w-2 h-2 rounded-full bg-brand-blue shadow-[0_0_10px_rgba(59,130,246,0.6)]"
                         />
                       )}
                     </div>
                   </motion.button>

                   {/* Sub-items */}
                   {section.items.length > 0 && isActiveSection && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3, ease: "circOut" }}
                      className="space-y-1 pl-4 pt-2"
                    >
                      {section.items.map((item, i) => {
                        const isActiveItem = 
                          (section.id === 'configuration' && activeTab === item.id) ||
                          (section.id === 'gestion' && activeGestionTab === item.id)
                        
                        return (
                          <motion.button
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.05 }}
                            key={item.id}
                            onClick={(e) => {
                              e.stopPropagation()
                              handleSubClick(section.id, item.id)
                            }}
                            className={cn(
                              "w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all text-sm group/item relative",
                              isActiveItem 
                                ? "bg-white shadow-sm border border-gray-100 text-gray-900 font-medium" 
                                : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"
                            )}
                          >
                            <span className={cn(
                              "flex items-center justify-center w-6 h-6 rounded-lg transition-colors",
                              isActiveItem ? "bg-brand-blue/10 text-brand-blue" : "bg-gray-100 text-gray-400 group-hover/item:text-gray-500"
                            )}>
                              <item.icon className="w-3.5 h-3.5" />
                            </span>
                            
                            <span>{item.label}</span>
                            
                            {isActiveItem && (
                              <motion.div
                                layoutId="active-indicator-sub"
                                className="absolute right-3 w-1.5 h-1.5 rounded-full bg-brand-blue"
                              />
                            )}
                          </motion.button>
                        )
                      })}
                    </motion.div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </nav>
  )
}

// Helper icon
function FolderOpen(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m6 14 1.45-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.55 6a2 2 0 0 1-1.94 1.5H4a2 2 0 0 1-2-2V5c0-1.1.9-2 2-2h3.93a2 2 0 0 1 1.66.9l.82 1.2a2 2 0 0 0 1.66.9H18a2 2 0 0 1 2 2v2" />
    </svg>
  )
}
