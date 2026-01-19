'use client'

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { documentTemplateService } from '@/lib/services/document-template.service.client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { X } from 'lucide-react'
import type { DocumentTemplate } from '@/lib/types/document-templates'

interface VersionDiffProps {
  templateId: string
  version1Id: string
  version2Id: string
  onClose: () => void
}

export function VersionDiff({ templateId, version1Id, version2Id, onClose }: VersionDiffProps) {
  const [version1, setVersion1] = useState<DocumentTemplate | null>(null)
  const [version2, setVersion2] = useState<DocumentTemplate | null>(null)

  // Récupérer les versions
  // Note: Les versions sont identifiées par leur ID dans la table document_template_versions
  const { data: version1Data } = useQuery({
    queryKey: ['template-version', templateId, version1Id],
    queryFn: async () => {
      const version = await documentTemplateService.getTemplateVersionById(templateId, version1Id)
      // Si la version contient le template_data, le parser
      if (version && (version as any).template_data) {
        return (version as any).template_data as DocumentTemplate
      }
      return null
    },
    enabled: !!version1Id,
  })

  const { data: version2Data } = useQuery({
    queryKey: ['template-version', templateId, version2Id],
    queryFn: async () => {
      const version = await documentTemplateService.getTemplateVersionById(templateId, version2Id)
      // Si la version contient le template_data, le parser
      if (version && (version as any).template_data) {
        return (version as any).template_data as DocumentTemplate
      }
      return null
    },
    enabled: !!version2Id,
  })

  useEffect(() => {
    if (version1Data) setVersion1(version1Data as DocumentTemplate)
    if (version2Data) setVersion2(version2Data as DocumentTemplate)
  }, [version1Data, version2Data])

  const getContentText = (template: DocumentTemplate | null): string => {
    if (!template) return ''
    
    // Extraire le texte des éléments du header
    const headerText = template.header?.elements
      ?.map((el) => el.content || '')
      .filter(Boolean)
      .join(' ') || ''
    
    // Extraire le texte des éléments du body
    const bodyText = template.content?.elements
      ?.map((el) => el.content || '')
      .filter(Boolean)
      .join(' ') || ''
    
    // Extraire le texte des éléments du footer
    const footerText = template.footer?.elements
      ?.map((el) => el.content || '')
      .filter(Boolean)
      .join(' ') || ''
    
    return `${template.name} ${headerText} ${bodyText} ${footerText}`
      .replace(/\s+/g, ' ')
      .trim()
  }

  const content1 = getContentText(version1)
  const content2 = getContentText(version2)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-6xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle>Comparaison des versions</CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="font-semibold mb-2">Version 1</h3>
              <div className="p-4 bg-gray-50 rounded-lg border max-h-96 overflow-y-auto">
                <pre className="text-xs whitespace-pre-wrap font-mono">
                  {content1 || 'Aucun contenu'}
                </pre>
              </div>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Version 2</h3>
              <div className="p-4 bg-gray-50 rounded-lg border max-h-96 overflow-y-auto">
                <pre className="text-xs whitespace-pre-wrap font-mono">
                  {content2 || 'Aucun contenu'}
                </pre>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
