'use client'

import React from 'react'
import { NodeViewWrapper } from '@tiptap/react'
import type { NodeViewProps } from '@tiptap/react'
import { X } from 'lucide-react'

/**
 * Composant React pour afficher une variable dans l'éditeur TipTap
 * Rendu comme un badge bleu/violet non-éditable
 */
export default function VariableNodeView({ node, deleteNode, selected }: NodeViewProps) {
  const { label, value } = node.attrs

  return (
    <NodeViewWrapper
      as="span"
      className="variable-node-wrapper"
      // Empêcher l'édition du contenu
      contentEditable={false}
      // Permettre la sélection du node
      data-drag-handle
    >
      <span
        className={`
          inline-flex items-center gap-1 px-2 py-0.5 mx-0.5
          rounded-md text-sm font-medium
          bg-blue-100 text-blue-800 border border-blue-300
          select-none cursor-default
          transition-all duration-150
          ${selected ? 'ring-2 ring-blue-500 ring-offset-1 bg-blue-200' : ''}
          hover:bg-blue-200
        `}
        title={`Variable: ${value}`}
      >
        {/* Icône de variable */}
        <span className="text-blue-500 text-xs">{'{'}</span>
        
        {/* Label de la variable */}
        <span className="whitespace-nowrap">{label}</span>
        
        {/* Icône de fermeture */}
        <span className="text-blue-500 text-xs">{'}'}</span>
        
        {/* Bouton de suppression (visible au survol) */}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            deleteNode()
          }}
          className="
            ml-0.5 p-0.5 rounded-full
            opacity-0 hover:opacity-100 focus:opacity-100
            hover:bg-blue-300 transition-opacity
            group-hover:opacity-70
          "
          title="Supprimer cette variable"
        >
          <X className="w-3 h-3" />
        </button>
      </span>
    </NodeViewWrapper>
  )
}



