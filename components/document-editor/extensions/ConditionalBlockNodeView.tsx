'use client'

import React, { useState, useCallback } from 'react'
import { NodeViewWrapper, NodeViewContent } from '@tiptap/react'
import type { NodeViewProps } from '@tiptap/react'
import { 
  GitBranch, 
  X, 
  ChevronDown, 
  ChevronRight,
  Settings,
  Trash2,
  Copy,
  Plus,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Types pour les opérateurs de condition
type ConditionOperator = 'exists' | 'not_exists' | 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than'

const operatorLabels: Record<ConditionOperator, string> = {
  exists: 'existe',
  not_exists: 'n\'existe pas',
  equals: 'est égal à',
  not_equals: 'est différent de',
  contains: 'contient',
  greater_than: 'est supérieur à',
  less_than: 'est inférieur à',
}

// Variables disponibles pour les conditions
const availableVariables = [
  { id: 'eleve_nom', label: 'Nom de l\'élève' },
  { id: 'eleve_prenom', label: 'Prénom de l\'élève' },
  { id: 'formation_nom', label: 'Nom de la formation' },
  { id: 'montant_ttc', label: 'Montant TTC' },
  { id: 'mode_paiement', label: 'Mode de paiement' },
  { id: 'session_lieu', label: 'Lieu de session' },
  { id: 'ecole_siret', label: 'SIRET' },
]

/**
 * Composant React pour afficher un bloc conditionnel dans l'éditeur TipTap
 */
export default function ConditionalBlockNodeView({ 
  node, 
  updateAttributes, 
  deleteNode,
  selected,
  editor,
}: NodeViewProps) {
  const { condition, type, variableId, operator, compareValue } = node.attrs
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isConfigOpen, setIsConfigOpen] = useState(false)
  const [localCondition, setLocalCondition] = useState(condition || '')
  const [localVariableId, setLocalVariableId] = useState(variableId || '')
  const [localOperator, setLocalOperator] = useState<ConditionOperator>(operator || 'exists')
  const [localCompareValue, setLocalCompareValue] = useState(compareValue || '')

  // Couleurs selon le type de bloc
  const blockColors = {
    if: {
      border: 'border-teal-400',
      bg: 'bg-teal-50',
      header: 'bg-teal-100',
      text: 'text-teal-700',
      icon: 'text-teal-600',
      label: 'SI',
    },
    elseif: {
      border: 'border-amber-400',
      bg: 'bg-amber-50',
      header: 'bg-amber-100',
      text: 'text-amber-700',
      icon: 'text-amber-600',
      label: 'SINON SI',
    },
    else: {
      border: 'border-blue-400',
      bg: 'bg-blue-50',
      header: 'bg-blue-100',
      text: 'text-blue-700',
      icon: 'text-blue-600',
      label: 'SINON',
    },
  }

  const colors = blockColors[type as keyof typeof blockColors] || blockColors.if

  // Génère le texte de la condition lisible
  const getConditionText = useCallback(() => {
    if (type === 'else') return ''
    
    if (localVariableId) {
      const variable = availableVariables.find(v => v.id === localVariableId)
      const variableLabel = variable?.label || localVariableId
      const operatorLabel = operatorLabels[localOperator]
      
      if (['exists', 'not_exists'].includes(localOperator)) {
        return `${variableLabel} ${operatorLabel}`
      }
      return `${variableLabel} ${operatorLabel} "${localCompareValue}"`
    }
    
    return localCondition || 'Définir la condition...'
  }, [type, localVariableId, localOperator, localCompareValue, localCondition])

  // Sauvegarde les modifications
  const saveCondition = useCallback(() => {
    updateAttributes({
      condition: localCondition,
      variableId: localVariableId,
      operator: localOperator,
      compareValue: localCompareValue,
    })
    setIsConfigOpen(false)
  }, [updateAttributes, localCondition, localVariableId, localOperator, localCompareValue])

  // Duplique le bloc
  const duplicateBlock = useCallback(() => {
    const { state, dispatch } = editor.view
    const { tr } = state
    const pos = editor.view.posAtDOM(editor.view.dom, 0)
    
    // Insérer une copie du bloc après le bloc actuel
    editor.chain().focus().insertConditionalBlock({
      condition: localCondition,
      type: type as 'if' | 'else' | 'elseif',
    }).run()
  }, [editor, localCondition, type])

  return (
    <NodeViewWrapper
      className={cn(
        'conditional-block my-4 rounded-lg border-2 overflow-hidden',
        colors.border,
        colors.bg,
        selected && 'ring-2 ring-offset-2 ring-teal-500'
      )}
      data-type="conditional-block"
    >
      {/* Header du bloc - Non éditable */}
      <div 
        className={cn(
          'flex items-center justify-between px-3 py-2',
          colors.header
        )}
        contentEditable={false}
      >
        <div className="flex items-center gap-2">
          {/* Bouton collapse */}
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={cn(
              'p-1 rounded hover:bg-white/50 transition-colors',
              colors.icon
            )}
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>

          {/* Icône et label */}
          <GitBranch className={cn('w-4 h-4', colors.icon)} />
          <span className={cn('font-semibold text-sm', colors.text)}>
            {colors.label}
          </span>

          {/* Condition */}
          {type !== 'else' && (
            <>
              <span className={cn('text-sm', colors.text)}>:</span>
              <button
                type="button"
                onClick={() => setIsConfigOpen(!isConfigOpen)}
                className={cn(
                  'text-sm px-2 py-0.5 rounded border border-dashed',
                  'hover:bg-white/50 transition-colors',
                  colors.border,
                  colors.text,
                  !localVariableId && !localCondition && 'italic opacity-70'
                )}
              >
                {getConditionText()}
              </button>
            </>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          {type !== 'else' && (
            <button
              type="button"
              onClick={() => setIsConfigOpen(!isConfigOpen)}
              title="Configurer la condition"
              className={cn(
                'p-1.5 rounded hover:bg-white/50 transition-colors',
                colors.icon
              )}
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={duplicateBlock}
            title="Dupliquer le bloc"
            className={cn(
              'p-1.5 rounded hover:bg-white/50 transition-colors',
              colors.icon
            )}
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={deleteNode}
            title="Supprimer le bloc"
            className="p-1.5 rounded hover:bg-red-100 text-red-500 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Panel de configuration de la condition */}
      {isConfigOpen && type !== 'else' && (
        <div 
          className="px-4 py-3 bg-white border-b border-gray-200"
          contentEditable={false}
        >
          <div className="space-y-3">
            {/* Sélection de variable */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Variable
              </label>
              <select
                value={localVariableId}
                onChange={(e) => setLocalVariableId(e.target.value)}
                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              >
                <option value="">-- Sélectionner une variable --</option>
                {availableVariables.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Sélection de l'opérateur */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Opérateur
              </label>
              <select
                value={localOperator}
                onChange={(e) => setLocalOperator(e.target.value as ConditionOperator)}
                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              >
                {Object.entries(operatorLabels).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {/* Valeur de comparaison (si nécessaire) */}
            {!['exists', 'not_exists'].includes(localOperator) && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Valeur
                </label>
                <input
                  type="text"
                  value={localCompareValue}
                  onChange={(e) => setLocalCompareValue(e.target.value)}
                  placeholder="Entrez la valeur..."
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                />
              </div>
            )}

            {/* Condition personnalisée (alternative) */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Ou condition personnalisée
              </label>
              <input
                type="text"
                value={localCondition}
                onChange={(e) => setLocalCondition(e.target.value)}
                placeholder="Ex: montant > 1000"
                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              />
            </div>

            {/* Boutons */}
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsConfigOpen(false)}
                className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={saveCondition}
                className="px-3 py-1.5 text-sm bg-teal-600 text-white hover:bg-teal-700 rounded-md transition-colors"
              >
                Appliquer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Contenu du bloc - Éditable */}
      {!isCollapsed && (
        <div className="p-4">
          <NodeViewContent className="prose prose-sm max-w-none min-h-[40px]" />
        </div>
      )}

      {/* Indicateur de contenu masqué */}
      {isCollapsed && (
        <div 
          className="px-4 py-2 text-xs text-gray-400 italic"
          contentEditable={false}
        >
          Contenu masqué...
        </div>
      )}
    </NodeViewWrapper>
  )
}



