'use client'

import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface KeyboardShortcutsSettingsProps {
  onClose: () => void
}

export function KeyboardShortcutsSettings({ onClose }: KeyboardShortcutsSettingsProps) {
  const shortcuts = [
    { keys: ['Ctrl', 'S'], description: 'Sauvegarder le template' },
    { keys: ['Ctrl', 'P'], description: 'Aperçu du document' },
    { keys: ['Ctrl', 'Z'], description: 'Annuler' },
    { keys: ['Ctrl', 'Y'], description: 'Refaire' },
    { keys: ['Ctrl', 'B'], description: 'Gras' },
    { keys: ['Ctrl', 'I'], description: 'Italique' },
    { keys: ['Ctrl', 'U'], description: 'Souligné' },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle>Raccourcis clavier</CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {shortcuts.map((shortcut, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <span className="text-sm text-muted-foreground">{shortcut.description}</span>
                <div className="flex gap-1">
                  {shortcut.keys.map((key, keyIndex) => (
                    <kbd
                      key={keyIndex}
                      className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg"
                    >
                      {key}
                    </kbd>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
