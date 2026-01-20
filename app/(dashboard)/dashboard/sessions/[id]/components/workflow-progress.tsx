import { Settings, FolderOpen, GraduationCap, CheckCircle } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

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
  return (
    <div className="flex items-center justify-between border-b pb-4">
      {workflowSteps.map((step, index) => {
        const StepIcon = step.icon
        const isActive = activeStep === step.id
        const isCompleted = workflowSteps.findIndex(s => s.id === activeStep) > index

        return (
          <button
            key={step.id}
            type="button"
            onClick={() => onStepChange(step.id)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
              isActive
                ? step.color === 'purple'
                  ? 'bg-purple-100 text-purple-800'
                  : step.color === 'teal'
                  ? 'bg-teal-100 text-teal-800'
                  : step.color === 'blue'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-warning-bg text-warning-primary'
                : isCompleted
                ? 'bg-gray-100 text-gray-600'
                : 'bg-white text-gray-400 hover:bg-gray-50'
            }`}
          >
            <StepIcon className="h-5 w-5" />
            <span className="font-medium">{step.label}</span>
          </button>
        )
      })}
    </div>
  )
}

