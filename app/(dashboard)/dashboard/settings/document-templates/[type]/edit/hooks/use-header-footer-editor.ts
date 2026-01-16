'use client'

import { useState, useCallback } from 'react'
import type { DocumentTemplate, HeaderConfig, FooterConfig, TemplateElement } from '@/lib/types/document-templates'

interface UseHeaderFooterEditorReturn {
  // Header
  headerConfig: HeaderConfig
  updateHeader: (updates: Partial<HeaderConfig>) => void
  addHeaderElement: (element: TemplateElement) => void
  updateHeaderElement: (elementId: string, updates: Partial<TemplateElement>) => void
  removeHeaderElement: (elementId: string) => void
  reorderHeaderElements: (elementId: string, newIndex: number) => void
  
  // Footer
  footerConfig: FooterConfig
  updateFooter: (updates: Partial<FooterConfig>) => void
  addFooterElement: (element: TemplateElement) => void
  updateFooterElement: (elementId: string, updates: Partial<TemplateElement>) => void
  removeFooterElement: (elementId: string) => void
  reorderFooterElements: (elementId: string, newIndex: number) => void
  
  // Utilities
  applyLayout: (type: 'header' | 'footer', layout: string) => void
  resetToDefault: (type: 'header' | 'footer') => void
}

export function useHeaderFooterEditor(
  template: DocumentTemplate,
  onTemplateChange: (updates: Partial<DocumentTemplate>) => void
): UseHeaderFooterEditorReturn {
  const header = template.header || {
    enabled: true,
    height: 100,
    elements: [],
    repeatOnAllPages: true,
  }

  const footer = template.footer || {
    enabled: true,
    height: 60,
    elements: [],
    repeatOnAllPages: true,
    pagination: {
      enabled: true,
      format: 'Page {numero_page} / {total_pages}',
      position: 'center',
    },
  }

  // Header functions
  const updateHeader = useCallback(
    (updates: Partial<HeaderConfig>) => {
      onTemplateChange({
        header: { ...header, ...updates },
        header_enabled: updates.enabled !== undefined ? updates.enabled : template.header_enabled,
        header_height: updates.height !== undefined ? updates.height : template.header_height,
      })
    },
    [template, header, onTemplateChange]
  )

  const addHeaderElement = useCallback(
    (element: TemplateElement) => {
      updateHeader({ elements: [...header.elements, element] })
    },
    [header, updateHeader]
  )

  const updateHeaderElement = useCallback(
    (elementId: string, updates: Partial<TemplateElement>) => {
      updateHeader({
        elements: header.elements.map((el) => (el.id === elementId ? { ...el, ...updates } : el)),
      })
    },
    [header, updateHeader]
  )

  const removeHeaderElement = useCallback(
    (elementId: string) => {
      updateHeader({
        elements: header.elements.filter((el) => el.id !== elementId),
      })
    },
    [header, updateHeader]
  )

  const reorderHeaderElements = useCallback(
    (elementId: string, newIndex: number) => {
      const oldIndex = header.elements.findIndex((el) => el.id === elementId)
      if (oldIndex === -1) return

      const newElements = [...header.elements]
      const [movedElement] = newElements.splice(oldIndex, 1)
      newElements.splice(newIndex, 0, movedElement)
      updateHeader({ elements: newElements })
    },
    [header, updateHeader]
  )

  // Footer functions
  const updateFooter = useCallback(
    (updates: Partial<FooterConfig>) => {
      onTemplateChange({
        footer: { ...footer, ...updates },
        footer_enabled: updates.enabled !== undefined ? updates.enabled : template.footer_enabled,
        footer_height: updates.height !== undefined ? updates.height : template.footer_height,
      })
    },
    [template, footer, onTemplateChange]
  )

  const addFooterElement = useCallback(
    (element: TemplateElement) => {
      updateFooter({ elements: [...footer.elements, element] })
    },
    [footer, updateFooter]
  )

  const updateFooterElement = useCallback(
    (elementId: string, updates: Partial<TemplateElement>) => {
      updateFooter({
        elements: footer.elements.map((el) => (el.id === elementId ? { ...el, ...updates } : el)),
      })
    },
    [footer, updateFooter]
  )

  const removeFooterElement = useCallback(
    (elementId: string) => {
      updateFooter({
        elements: footer.elements.filter((el) => el.id !== elementId),
      })
    },
    [footer, updateFooter]
  )

  const reorderFooterElements = useCallback(
    (elementId: string, newIndex: number) => {
      const oldIndex = footer.elements.findIndex((el) => el.id === elementId)
      if (oldIndex === -1) return

      const newElements = [...footer.elements]
      const [movedElement] = newElements.splice(oldIndex, 1)
      newElements.splice(newIndex, 0, movedElement)
      updateFooter({ elements: newElements })
    },
    [footer, updateFooter]
  )

  // Layout application
  const applyLayout = useCallback(
    (type: 'header' | 'footer', layout: string) => {
      // TODO: Implémenter l'application des layouts prédéfinis
      // Pour l'instant, on met juste à jour le layout
      if (type === 'header') {
        updateHeader({ layout: layout as any })
      } else {
        updateFooter({ layout: layout as any })
      }
    },
    [updateHeader, updateFooter]
  )

  // Reset to default
  const resetToDefault = useCallback(
    (type: 'header' | 'footer') => {
      if (type === 'header') {
        updateHeader({
          enabled: true,
          height: 100,
          elements: [],
          repeatOnAllPages: true,
        })
      } else {
        updateFooter({
          enabled: true,
          height: 60,
          elements: [],
          repeatOnAllPages: true,
          pagination: {
            enabled: true,
            format: 'Page {numero_page} / {total_pages}',
            position: 'center',
          },
        })
      }
    },
    [updateHeader, updateFooter]
  )

  return {
    // Header
    headerConfig: header,
    updateHeader,
    addHeaderElement,
    updateHeaderElement,
    removeHeaderElement,
    reorderHeaderElements,
    
    // Footer
    footerConfig: footer,
    updateFooter,
    addFooterElement,
    updateFooterElement,
    removeFooterElement,
    reorderFooterElements,
    
    // Utilities
    applyLayout,
    resetToDefault,
  }
}























