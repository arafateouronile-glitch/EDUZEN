import { Settings, FolderOpen, GraduationCap, CheckCircle } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'

type WorkflowStep = 'configuration' | 'gestion' | 'espace_apprenant' | 'suivi'

interface WorkflowStepDef {
  id: WorkflowStep
  label: string
  icon: LucideIcon
  color: 'purple' | 'teal' | 'blue' | 'yellow'
}

interface WorkflowProgressProps {
  activeStep: WorkflowStep
  onStepChange: (step: WorkflowStep) => void
}

const workflowSteps: WorkflowStepDef[] = [
  { id: 'configuration', label: 'Configuration', icon: Settings, color: 'purple' },
  { id: 'gestion', label: 'Gestion', icon: FolderOpen, color: 'teal' },
  { id: 'espace_apprenant', label: 'Espace Apprenant', icon: GraduationCap, color: 'blue' },
  { id: 'suivi', label: 'Suivi', icon: CheckCircle, color: 'yellow' },
]

export function WorkflowProgress({ activeStep, onStepChange }: WorkflowProgressProps) {
  const activeIndex = workflowSteps.findIndex((s) => s.id === activeStep)

  return (
    <div className="relative mb-8 pt-4">
      {/* Connecting Line */}
      <div className="absolute top-1/2 left-0 w-full h-1 bg-gray-100 -translate-y-1/2 rounded-full overflow-hidden">
        <motion.div 
          className="h-full bg-gradient-to-r from-brand-purple via-brand-blue to-brand-cyan"
          initial={{ width: 0 }}
          animate={{ width: `${(activeIndex / (workflowSteps.length - 1)) * 100}%` }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
        />
      </div>

      <div className="relative flex justify-between">
        {workflowSteps.map((step, index) => {
          const StepIcon = step.icon
          const isActive = activeStep === step.id
          const isCompleted = activeIndex > index
          const isUpcoming = activeIndex < index

          // Colors based on step type
          const activeColorClass =
            step.color === 'purple' ? 'text-purple-600 bg-purple-50 border-purple-200' :
            step.color === 'teal' ? 'text-teal-600 bg-teal-50 border-teal-200' :
            step.color === 'blue' ? 'text-blue-600 bg-blue-50 border-blue-200' :
            'text-amber-600 bg-amber-50 border-amber-200'
            
          const completedColorClass = 'text-white bg-green-500 border-green-500'

          return (
            <div key={step.id} className="flex flex-col items-center gap-2 group">
              <motion.button
                type="button"
                onClick={() => onStepChange(step.id)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={cn(
                  "relative z-10 flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all duration-300 shadow-sm",
                  isActive 
                    ? `ring-4 ring-offset-2 ring-opacity-30 ${activeColorClass} shadow-md scale-110` 
                    : isCompleted
                      ? completedColorClass
                      : "bg-white border-gray-200 text-gray-400 hover:border-gray-300 hover:text-gray-500"
                )}
              >
                {isCompleted ? (
                  <CheckCircle className="w-6 h-6" />
                ) : (
                  <StepIcon className="w-5 h-5" />
                )}
                
                {isActive && (
                  <motion.div
                    layoutId="active-glow"
                    className="absolute inset-0 rounded-full opacity-50 blur-md -z-10"
                    style={{ backgroundColor: 'currentColor' }}
                  />
                )}
              </motion.button>
              
              <span className={cn(
                "text-xs font-bold uppercase tracking-wider transition-colors duration-300",
                isActive ? "text-gray-900" : isCompleted ? "text-gray-600" : "text-gray-400"
              )}>
                {step.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

