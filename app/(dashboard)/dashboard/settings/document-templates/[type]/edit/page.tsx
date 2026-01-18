'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/lib/hooks/use-auth'
import { documentTemplateService } from '@/lib/services/document-template.service'
import type { DocumentType, DocumentTemplate } from '@/lib/types/document-templates'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { ArrowLeft, Save, Eye, Copy, RotateCcw, History, Loader2, Moon, Sun, Keyboard, Clock, Users, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'
import { useToast } from '@/components/ui/toast'
import { HeaderEditor } from './components/header-editor'
import { BodyEditor } from './components/body-editor'
import { FooterEditor } from './components/footer-editor'
import { VersionHistory } from './components/version-history'
import { SkeletonLoader } from './components/skeleton-loader'
import { KeyboardShortcutsSettings } from './components/keyboard-shortcuts-settings'
import { ScheduledGenerationSettings } from './components/scheduled-generation-settings'
import { TemplateCollaboration } from './components/template-collaboration'
import { WorkflowValidation } from './components/workflow-validation'
import { VariablesSidebar } from './components/variables-sidebar'
import { DocumentSettings } from './components/document-settings'
import { DocxTemplateUploader } from '@/components/document-templates/DocxTemplateUploader'
import { getDocumentTypeConfig } from './utils/document-type-config'
import { getDefaultTemplateContent } from '@/lib/utils/document-template-defaults'
import { cn } from '@/lib/utils'

export default function DocumentTemplateEditPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const { addToast } = useToast()
  const queryClient = useQueryClient()

  const documentType = params.type as DocumentType
  const docConfig = getDocumentTypeConfig(documentType)
  const templateIdParam = searchParams.get('template_id')

  const [accordionValue, setAccordionValue] = useState<string>('body')
  const [template, setTemplate] = useState<DocumentTemplate | null>(null)
  const [hasChanges, setHasChanges] = useState(false)
  const [isAutoSaving, setIsAutoSaving] = useState(false)
  const [darkMode, setDarkMode] = useState(false)
  const [showShortcutsSettings, setShowShortcutsSettings] = useState(false)
  const [showScheduledGeneration, setShowScheduledGeneration] = useState(false)
  const [showCollaboration, setShowCollaboration] = useState(false)
  const [showWorkflowValidation, setShowWorkflowValidation] = useState(false)
  const [activeEditorRef, setActiveEditorRef] = useState<{ insertVariable: (variable: string) => void } | null>(null)
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  // Callback mémorisé pour éviter les re-renders infinis
  const handleEditorRefReady = useCallback((ref: { insertVariable: (variable: string) => void }) => {
    setActiveEditorRef(ref)
  }, [])

  // Charger la préférence de mode sombre depuis localStorage
  useEffect(() => {
    const savedDarkMode = localStorage.getItem('editor-dark-mode') === 'true'
    setDarkMode(savedDarkMode)
    if (savedDarkMode) {
      document.documentElement.classList.add('dark')
    }
  }, [])

  // Toggle du mode sombre
  const toggleDarkMode = () => {
    const newDarkMode = !darkMode
    setDarkMode(newDarkMode)
    localStorage.setItem('editor-dark-mode', String(newDarkMode))
    if (newDarkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  // Charger ou créer le template
  const { data: existingTemplate, isLoading } = useQuery({
    queryKey: ['document-template', user?.organization_id, documentType, templateIdParam],
    queryFn: async () => {
      if (!user?.organization_id) return null
      
      // Si un template_id est fourni, charger ce template spécifique
      if (templateIdParam) {
        try {
          const specificTemplate = await documentTemplateService.getTemplateById(templateIdParam)
          // Vérifier que le template correspond au type de document
          if (specificTemplate.type === documentType) {
            return specificTemplate
          }
        } catch (error) {
          console.error('Erreur lors du chargement du template spécifique:', error)
          // Continuer avec le chargement du template par défaut
        }
      }
      
      // Essayer de charger le template par défaut
      const defaultTemplate = await documentTemplateService.getDefaultTemplate(
        user.organization_id,
        documentType
      )
      
      // Si aucun template, vérifier s'il existe déjà un template de ce type
      const allTemplates = await documentTemplateService.getAllTemplates(
        user.organization_id,
        { type: documentType }
      )
      
      // Si aucun template n'existe, créer un template par défaut avec contenu
      if (!defaultTemplate && allTemplates.length === 0) {
        try {
          // Récupérer le contenu par défaut pour ce type de document
          const defaultContent = getDefaultTemplateContent(documentType)
          
          const newTemplate = await documentTemplateService.createTemplate({
            organization_id: user.organization_id,
            type: documentType,
            name: defaultContent.name,
            header: {
              enabled: true,
              height: 100,
              elements: [],
              repeatOnAllPages: true,
              content: defaultContent.headerContent,
            },
            content: {
              pageSize: 'A4',
              margins: { top: 20, right: 20, bottom: 20, left: 20 },
              elements: [],
              html: defaultContent.bodyContent,
            },
            font_size: 10,
            footer: {
              enabled: true,
              height: 60,
              elements: [],
              repeatOnAllPages: true,
              pagination: {
                enabled: true,
                format: 'Page {numero_page} / {total_pages}',
                position: 'center',
              },
              content: defaultContent.footerContent,
            },
            header_enabled: true,
            header_height: 100,
            footer_enabled: true,
            footer_height: 60,
            is_default: true, // Créer comme template par défaut
          })
          
          return newTemplate
        } catch (error: any) {
          // Si erreur de conflit, réessayer de charger le template
          if (error.code === '23505' || error.message?.includes('duplicate')) {
            const retryTemplate = await documentTemplateService.getDefaultTemplate(
              user.organization_id,
              documentType
            )
            if (retryTemplate) return retryTemplate
            
            // Si toujours aucun template, retourner le premier trouvé
            if (allTemplates.length > 0) {
              return allTemplates[0]
            }
          }
          throw error
        }
      }
      
      // Si aucun template par défaut mais qu'il existe d'autres templates, utiliser le premier
      if (!defaultTemplate && allTemplates.length > 0) {
        const firstTemplate = allTemplates[0]
        // Vérifier si le template a du contenu significatif (au moins 50 caractères), sinon initialiser avec le contenu par défaut
        const html = (firstTemplate.content as any)?.html
        const elementsContent = firstTemplate.content?.elements?.[0]?.content
        const currentContent = html || elementsContent || ''
        const trimmedContent = currentContent.trim()
        const hasContent = trimmedContent && trimmedContent.length >= 50
        
        console.log('[Page] Template existant trouvé:', {
          templateId: firstTemplate.id,
          hasHtml: !!html,
          htmlLength: html?.length || 0,
          hasElementsContent: !!elementsContent,
          elementsContentLength: elementsContent?.length || 0,
          trimmedLength: trimmedContent.length,
          hasContent,
        })
        
        if (!hasContent) {
          console.log('[Page] Template vide, initialisation avec le contenu par défaut...')
          const defaultContent = getDefaultTemplateContent(documentType)
          // Mettre à jour le template avec le contenu par défaut
          try {
            const updatedTemplate = await documentTemplateService.updateTemplate({
              id: firstTemplate.id,
              content: {
                ...firstTemplate.content,
                html: defaultContent.bodyContent,
                elements: [
                  {
                    id: 'main-content',
                    type: 'text',
                    position: { x: 0, y: 0 },
                    content: defaultContent.bodyContent,
                  },
                ],
              },
            header: {
                ...(firstTemplate.header as any),
              content: defaultContent.headerContent,
            },
            footer: {
                ...(firstTemplate.footer as any),
              content: defaultContent.footerContent,
            },
            })
            console.log('[Page] Template mis à jour avec succès')
            return updatedTemplate
      } catch (error) {
            console.error('[Page] Erreur lors de la mise à jour du template:', error)
            return firstTemplate
          }
        }
        return firstTemplate
      }
      
      // Si le template par défaut existe, vérifier s'il doit être mis à jour avec le nouveau contenu par défaut
      if (defaultTemplate) {
        const html = (defaultTemplate.content as any)?.html
        const elementsContent = defaultTemplate.content?.elements?.[0]?.content
        const currentContent = html || elementsContent || ''
        const trimmedContent = currentContent.trim()
        const hasContent = trimmedContent && trimmedContent.length >= 50
        
        // Récupérer le contenu par défaut actuel pour comparer
        const defaultContent = getDefaultTemplateContent(documentType)
        const defaultBodyContent = defaultContent.bodyContent.trim()
        
        // Vérifier si le contenu actuel correspond à l'ancien contenu par défaut
        // Si le template est le template par défaut et que son contenu ne correspond pas au nouveau contenu par défaut,
        // on peut proposer une mise à jour (mais on ne le fait pas automatiquement pour éviter de perdre des modifications)
        const isDefaultTemplate = defaultTemplate.is_default === true
        
        console.log('[Page] Template par défaut trouvé:', {
          templateId: defaultTemplate.id,
          isDefault: isDefaultTemplate,
          hasHtml: !!html,
          htmlLength: html?.length || 0,
          hasElementsContent: !!elementsContent,
          elementsContentLength: elementsContent?.length || 0,
          trimmedLength: trimmedContent.length,
          hasContent,
          defaultContentLength: defaultBodyContent.length,
        })
        
        // Si le template est vide, l'initialiser avec le contenu par défaut
        if (!hasContent) {
          console.log('[Page] Template par défaut vide, initialisation avec le contenu par défaut...')
          try {
            const updatedTemplate = await documentTemplateService.updateTemplate({
              id: defaultTemplate.id,
            content: {
                ...defaultTemplate.content,
              html: defaultContent.bodyContent,
                elements: [
                  {
                    id: 'main-content',
                    type: 'text',
                    position: { x: 0, y: 0 },
                    content: defaultContent.bodyContent,
                  },
                ],
              },
              header: {
                ...(defaultTemplate.header as any),
                content: defaultContent.headerContent,
              },
              footer: {
                ...(defaultTemplate.footer as any),
              content: defaultContent.footerContent,
            },
            })
            console.log('[Page] Template par défaut mis à jour avec succès')
            return updatedTemplate
          } catch (error) {
            console.error('[Page] Erreur lors de la mise à jour du template par défaut:', error)
            return defaultTemplate
          }
        }
      }
      
      return defaultTemplate
    },
    enabled: !!user?.organization_id && !!documentType,
  })

  // Référence pour comparer le template sauvegardé avec le template local
  const savedTemplateRef = useRef<DocumentTemplate | null>(null)

  useEffect(() => {
    if (existingTemplate) {
      // Ne mettre à jour le template que s'il n'y a pas de changements non sauvegardés
      // et que le template n'est pas en cours d'auto-sauvegarde
      if (!hasChanges && !isAutoSaving) {
        // Vérifier si le template a vraiment changé par rapport à celui sauvegardé
        if (savedTemplateRef.current && JSON.stringify(existingTemplate) === JSON.stringify(savedTemplateRef.current)) {
          return
        }
        setTemplate(existingTemplate)
        savedTemplateRef.current = existingTemplate
      }
    }
  }, [existingTemplate, hasChanges, isAutoSaving])

  // Initialiser savedTemplateRef quand le template est chargé pour la première fois
  useEffect(() => {
    if (existingTemplate && !savedTemplateRef.current) {
      savedTemplateRef.current = existingTemplate
      console.log('[Page] savedTemplateRef initialisé avec le template existant')
    }
  }, [existingTemplate])

  // Mutation pour sauvegarder
  const saveMutation = useMutation({
    mutationFn: async (updatedTemplate: DocumentTemplate) => {
      const { id, ...templateData } = updatedTemplate
      return documentTemplateService.updateTemplate({
        id,
        ...templateData,
      })
    },
    onSuccess: (savedTemplate) => {
      // Mettre à jour la référence du template sauvegardé
      savedTemplateRef.current = savedTemplate || template
      queryClient.invalidateQueries({ queryKey: ['document-template'] })
      queryClient.invalidateQueries({ queryKey: ['document-templates'] })
      setHasChanges(false)
      addToast({
        type: 'success',
        title: 'Modèle enregistré',
        description: 'Le modèle a été enregistré avec succès.',
      })
    },
    onError: (error) => {
      addToast({
        type: 'error',
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Une erreur est survenue lors de l\'enregistrement.',
      })
    },
  })

  // Fonction pour réinitialiser le template avec le contenu par défaut
  const handleResetToDefault = async () => {
    if (!template || !user?.organization_id) return
    
    if (!confirm('Êtes-vous sûr de vouloir réinitialiser ce template avec le contenu par défaut ? Toutes les modifications non sauvegardées seront perdues.')) {
      return
    }
    
    try {
      const defaultContent = getDefaultTemplateContent(documentType)
      
      const updatedTemplate: DocumentTemplate = {
        ...template,
        name: defaultContent.name,
        content: {
          ...template.content,
          html: defaultContent.bodyContent,
          elements: [
            {
              id: 'main-content',
              type: 'text',
              position: { x: 0, y: 0 },
              content: defaultContent.bodyContent,
            },
          ],
        },
        header: {
          ...(template.header as any),
          content: defaultContent.headerContent,
        },
        footer: {
          ...(template.footer as any),
          content: defaultContent.footerContent,
        },
      }
      
      await saveMutation.mutateAsync(updatedTemplate)
      setTemplate(updatedTemplate)
      setHasChanges(false)
      
      addToast({
        type: 'success',
        title: 'Template réinitialisé',
        description: 'Le template a été réinitialisé avec le contenu par défaut.',
      })
    } catch (error) {
      console.error('Erreur lors de la réinitialisation:', error)
      addToast({
        type: 'error',
        title: 'Erreur',
        description: 'Une erreur est survenue lors de la réinitialisation du template.',
      })
    }
  }

  const handleSave = () => {
    if (!template) return
    saveMutation.mutate(template)
  }

  const handlePreview = () => {
    router.push(`/dashboard/settings/document-templates/${documentType}/preview`)
  }

  // Auto-sauvegarde avec debounce
  useEffect(() => {
    if (!template || !hasChanges || isAutoSaving) return

    // Nettoyer le timeout précédent s'il existe
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current)
    }

    // Débounce de 3 secondes pour l'auto-sauvegarde
    autoSaveTimeoutRef.current = setTimeout(async () => {
      setIsAutoSaving(true)
      try {
        // Capturer l'état actuel du template avant la sauvegarde
        const templateToSave = template
        
        await documentTemplateService.updateTemplate({
          id: template.id,
          ...template,
        })
        
        // Mettre à jour la référence du template sauvegardé
        savedTemplateRef.current = { ...template }
        
        // Vérifier si le template local a changé depuis la sauvegarde
        setTimeout(() => {
          const hasNewChanges = JSON.stringify(template) !== JSON.stringify(templateToSave)
          
          if (!hasNewChanges) {
            setHasChanges(false)
            savedTemplateRef.current = { ...templateToSave }
            // Invalider les queries avec un délai pour éviter les boucles
            setTimeout(() => {
              queryClient.invalidateQueries({ queryKey: ['document-template', user?.organization_id, documentType] })
            }, 500)
          }
        }, 200)
        
        // Ne pas afficher de toast pour l'auto-sauvegarde pour éviter le spam
      } catch (error) {
        console.error('Erreur lors de l\'auto-sauvegarde:', error)
        // En cas d'erreur, on garde hasChanges à true pour permettre une sauvegarde manuelle
      } finally {
        setIsAutoSaving(false)
        autoSaveTimeoutRef.current = null
      }
    }, 3000) // 3 secondes de délai (augmenté de 2 à 3 secondes)

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current)
        autoSaveTimeoutRef.current = null
      }
    }
  }, [template, hasChanges, user?.organization_id, documentType, queryClient])

  const handleTemplateChange = (updates: Partial<DocumentTemplate>) => {
    if (!template) return
    
    // Éviter les mises à jour inutiles si les valeurs sont identiques
    const hasRealChanges = Object.keys(updates).some(key => {
      const newValue = (updates as any)[key]
      const oldValue = (template as any)[key]
      return JSON.stringify(newValue) !== JSON.stringify(oldValue)
    })
    
    if (!hasRealChanges) {
      return // Pas de changement réel, ne pas déclencher de mise à jour
    }
    
    setTemplate({ ...template, ...updates })
    setHasChanges(true)
  }

  // Raccourcis clavier personnalisables
  useEffect(() => {
    const {
      loadCustomShortcuts,
      getShortcutConfig,
      matchesShortcut,
      DEFAULT_SHORTCUTS,
    } = require('@/lib/utils/keyboard-shortcuts')

    // Charger les raccourcis personnalisés
    const customShortcuts = loadCustomShortcuts()

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignorer si on est en train de saisir dans un input
      if (
        (e.target as HTMLElement)?.tagName === 'INPUT' ||
        (e.target as HTMLElement)?.tagName === 'TEXTAREA' ||
        (e.target as HTMLElement)?.isContentEditable
      ) {
        return
      }

      // Vérifier chaque raccourci
      Object.keys(DEFAULT_SHORTCUTS).forEach((shortcutId) => {
        const config = customShortcuts[shortcutId]
          ? customShortcuts[shortcutId]
          : getShortcutConfig(shortcutId)

        if (matchesShortcut(e, config)) {
          e.preventDefault()

          switch (shortcutId) {
            case 'save':
              if (template && hasChanges) {
                handleSave()
              }
              break
            case 'preview':
              router.push(`/dashboard/settings/document-templates/${documentType}/preview`)
              break
            case 'cycleTabs':
              const sections = ['header', 'body', 'footer', 'versions']
              const currentIndex = sections.indexOf(accordionValue)
              const nextIndex = (currentIndex + 1) % sections.length
              setAccordionValue(sections[nextIndex])
              break
            case 'toggleDarkMode':
              toggleDarkMode()
              break
            // Les autres raccourcis peuvent être ajoutés ici
          }
        }
      })
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [template, hasChanges, accordionValue, documentType, router])

  if (isLoading || !template) {
    return <SkeletonLoader />
  }

  return (
    <div className={cn("h-screen flex flex-col", darkMode && "dark")}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-bg-gray-200 pb-4 px-6 pt-4 flex-shrink-0">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/settings/document-templates">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
              <docConfig.icon className="h-6 w-6" style={{ color: docConfig.color }} />
              {docConfig.name}
            </h1>
            <p className="text-sm text-text-tertiary mt-1">Éditeur de modèle de document</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setAccordionValue('versions')}
            className={accordionValue === 'versions' ? 'bg-brand-blue-ghost border-brand-blue' : ''}
          >
            <History className="h-4 w-4 mr-2" />
            Versions
          </Button>
          <Button variant="outline" onClick={handlePreview}>
            <Eye className="h-4 w-4 mr-2" />
            Prévisualiser
          </Button>
                {isAutoSaving && (
                  <div className="flex items-center gap-2 text-sm text-text-tertiary">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="hidden sm:inline">Auto-sauvegarde...</span>
                  </div>
                )}
                <Button
                  variant="outline"
                  size="icon"
                  onClick={toggleDarkMode}
                  title={darkMode ? 'Mode clair' : 'Mode sombre'}
                >
                  {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setShowShortcutsSettings(true)}
                  title="Raccourcis clavier"
                >
                  <Keyboard className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleResetToDefault}
                  title="Réinitialiser avec le contenu par défaut"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setShowScheduledGeneration(true)}
                  title="Génération programmée"
                >
                  <Clock className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setShowCollaboration(true)}
                  title="Collaboration"
                >
                  <Users className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setShowWorkflowValidation(true)}
                  title="Workflow de validation"
                >
                  <CheckCircle2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="default"
                  onClick={handleSave}
                  disabled={!hasChanges || saveMutation.isPending}
                  className="hidden sm:flex"
                  title={!hasChanges ? 'Aucune modification à enregistrer' : 'Enregistrer les modifications'}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {saveMutation.isPending ? 'Enregistrement...' : 'Enregistrer'}
                </Button>
                <Button
                  variant="default"
                  size="icon"
                  onClick={handleSave}
                  disabled={!hasChanges || saveMutation.isPending}
                  className="sm:hidden"
                  title={!hasChanges ? 'Aucune modification à enregistrer' : 'Enregistrer les modifications'}
                >
                  <Save className="h-4 w-4" />
                </Button>
                {/* Debug: Afficher l'état de hasChanges en développement */}
                {process.env.NODE_ENV === 'development' && (
                  <div className="text-xs text-gray-500 hidden sm:block">
                    hasChanges: {hasChanges ? 'true' : 'false'}
                  </div>
                )}
        </div>
      </div>

      {/* Contenu principal avec sidebar */}
      <div className="flex-1 flex overflow-hidden">
        {/* Zone des accordéons avec défilement vertical */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <Accordion 
            type="single" 
            collapsible 
            value={accordionValue} 
            onValueChange={(value) => value && setAccordionValue(value)}
            className="w-full space-y-4"
          >
            <AccordionItem value="header" className="border rounded-lg">
              <AccordionTrigger className="px-6 py-4 hover:no-underline">
                <div className="flex items-center gap-3">
                  <span className="text-xl">🔝</span>
                  <span className="text-lg font-semibold">En-tête</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-0">
                <div className="px-6 pb-4">
                  <HeaderEditor
                    template={template}
                    onTemplateChange={handleTemplateChange}
                    onEditorRefReady={handleEditorRefReady}
                    isActive={accordionValue === 'header'}
                  />
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="body" className="border rounded-lg">
              <AccordionTrigger className="px-6 py-4 hover:no-underline">
                <div className="flex items-center gap-3">
                  <span className="text-xl">📄</span>
                  <span className="text-lg font-semibold">Contenu du document</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-0">
                <div className="px-6 pb-4">
                  <BodyEditor
                    template={template}
                    onTemplateChange={handleTemplateChange}
                    onEditorRefReady={handleEditorRefReady}
                    isActive={accordionValue === 'body'}
                  />
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="footer" className="border rounded-lg">
              <AccordionTrigger className="px-6 py-4 hover:no-underline">
                <div className="flex items-center gap-3">
                  <span className="text-xl">🔻</span>
                  <span className="text-lg font-semibold">Pied de page</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-0">
                <div className="px-6 pb-4">
                  <FooterEditor
                    template={template}
                    onTemplateChange={handleTemplateChange}
                    onEditorRefReady={handleEditorRefReady}
                    isActive={accordionValue === 'footer'}
                  />
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="versions" className="border rounded-lg">
              <AccordionTrigger className="px-6 py-4 hover:no-underline">
                <div className="flex items-center gap-3">
                  <History className="h-5 w-5" />
                  <span className="text-lg font-semibold">Versions</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-0">
                <div className="px-6 pb-4">
                  <VersionHistory
                    templateId={template.id}
                    onVersionRestore={() => {
                      // Recharger le template après restauration
                      queryClient.invalidateQueries({ 
                        queryKey: ['document-template', user?.organization_id, documentType] 
                      })
                      setAccordionValue('body')
                      setHasChanges(false)
                    }}
                  />
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="docx-template" className="border rounded-lg">
              <AccordionTrigger className="px-6 py-4 hover:no-underline">
                <div className="flex items-center gap-3">
                  <span className="text-xl">📝</span>
                  <span className="text-lg font-semibold">Template Word (DOCX)</span>
                  {template.docx_template_url && (
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
                      Configuré
                    </span>
                  )}
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-0">
                <div className="px-6 pb-4">
                  <DocxTemplateUploader
                    templateId={template.id}
                    currentDocxUrl={template.docx_template_url}
                    onUploadSuccess={(url) => {
                      handleTemplateChange({ docx_template_url: url })
                      addToast({
                        type: 'success',
                        title: 'Template DOCX uploadé',
                        description: 'Le template Word sera utilisé pour la génération de documents Word.',
                      })
                    }}
                    onRemoveSuccess={() => {
                      handleTemplateChange({ docx_template_url: null })
                      addToast({
                        type: 'info',
                        title: 'Template DOCX supprimé',
                        description: 'La génération Word utilisera désormais la conversion HTML.',
                      })
                    }}
                  />
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>

        {/* Sidebar fixe à droite avec les balises */}
        <div className="w-80 border-l border-gray-200 flex-shrink-0 overflow-y-auto bg-white flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <DocumentSettings
              template={template}
              onTemplateChange={handleTemplateChange}
            />
          </div>
          <div className="flex-1 overflow-y-auto">
            <VariablesSidebar 
              onVariableSelect={(variable) => {
                if (activeEditorRef) {
                  activeEditorRef.insertVariable(variable)
                }
              }} 
              className="h-full border-0 rounded-none"
            />
          </div>
        </div>
      </div>

      {/* Modal des raccourcis clavier */}
      {showShortcutsSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <KeyboardShortcutsSettings
            onClose={() => setShowShortcutsSettings(false)}
          />
        </div>
      )}

      {/* Modal de génération programmée */}
      {showScheduledGeneration && template && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <ScheduledGenerationSettings
            template={template}
            onClose={() => setShowScheduledGeneration(false)}
          />
        </div>
      )}

      {/* Modal de collaboration */}
      {showCollaboration && template && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <TemplateCollaboration
            template={template}
            onClose={() => setShowCollaboration(false)}
          />
        </div>
      )}

      {/* Modal de workflow de validation */}
      {showWorkflowValidation && template && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <WorkflowValidation
            template={template}
            onClose={() => setShowWorkflowValidation(false)}
          />
        </div>
      )}
    </div>
  )
}




