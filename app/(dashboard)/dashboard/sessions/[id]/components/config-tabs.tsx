type ConfigTab = 'initialisation' | 'dates_prix' | 'apprenants' | 'programme' | 'intervenants'

interface ConfigTabsProps {
  activeTab: ConfigTab
  onTabChange: (tab: ConfigTab) => void
}

const configTabs = [
  { id: 'initialisation' as const, label: 'Initialisation' },
  { id: 'dates_prix' as const, label: 'Dates et prix' },
  { id: 'apprenants' as const, label: 'Apprenants' },
  { id: 'programme' as const, label: 'Programme' },
  { id: 'intervenants' as const, label: 'Intervenants' },
]

export function ConfigTabs({ activeTab, onTabChange }: ConfigTabsProps) {
  return (
    <div className="flex space-x-2 border-b pb-2">
      {configTabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === tab.id
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
























