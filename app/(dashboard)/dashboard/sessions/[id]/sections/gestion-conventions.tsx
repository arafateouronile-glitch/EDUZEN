'use client'

import { useState, useEffect, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/lib/hooks/use-auth'
import { createClient } from '@/lib/supabase/client'
import { CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { GlassCard } from '@/components/ui/glass-card'
import { FileText, Download, Mail, AlertCircle, UserPlus, CheckCircle2, Clock, FileCheck, Sparkles, Send, Eye, PenTool } from 'lucide-react'
import { formatDate, cn } from '@/lib/utils'
import { useDocumentGeneration } from '../hooks/use-document-generation'
import { useToast } from '@/components/ui/toast'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { 
  SessionWithRelations, 
  EnrollmentWithRelations,
  FormationWithRelations
} from '@/lib/types/query-types'
import type { TableRow } from '@/lib/types/supabase-helpers'
import { motion, AnimatePresence } from 'framer-motion'
import { Badge } from '@/components/ui/badge'
import { logger, sanitizeError } from '@/lib/utils/logger'
import Image from 'next/image'
import { documentTemplateService } from '@/lib/services/document-template.service.client'
import { emailTemplateService } from '@/lib/services/email-template.service.client'
import type { DocumentTemplate } from '@/lib/types/document-templates'
import type { EmailTemplate } from '@/lib/services/email-template.service'

type Program = TableRow<'programs'>
type Organization = TableRow<'organizations'>

interface GestionConventionsProps {
  sessionData: SessionWithRelations | undefined
  formation: FormationWithRelations | null | undefined
  program: Program | null | undefined
  organization: Organization | undefined
  enrollments?: EnrollmentWithRelations[]
  isLoading?: boolean
  onShowEnrollmentForm: () => void
  onSwitchTab: (tab: 'convocations') => void
}

export function GestionConventions({
  sessionData,
  formation,
  program,
  organization,
  enrollments = [],
  isLoading = false,
  onShowEnrollmentForm,
  onSwitchTab,
}: GestionConventionsProps) {
  const { addToast } = useToast()
  const { user } = useAuth()
  const queryClient = useQueryClient()

  // Charger tous les modèles actifs (comme dans la page des modèles de documents)
  const { data: allTemplates } = useQuery({
    queryKey: ['document-templates', 'all', user?.organization_id],
    queryFn: async (): Promise<DocumentTemplate[]> => {
      if (!user?.organization_id) return []
      const list = await documentTemplateService.getAllTemplates(user.organization_id, { isActive: true })
      return list.filter((t): t is DocumentTemplate => t != null)
    },
    enabled: !!user?.organization_id,
  })

  // Filtrer les modèles de conventions
  const conventionTemplates = (allTemplates ?? []).filter((template: DocumentTemplate) => template.type === 'convention')

  // Filtrer les modèles de contrats
  const contractTemplates = (allTemplates ?? []).filter((template: DocumentTemplate) => template.type === 'contrat')

  const [selectedConventionTemplateId, setSelectedConventionTemplateId] = useState<string | undefined>()

  const {
    isGeneratingZip,
    zipGenerationProgress,
    lastZipGeneration,
    handleGenerateConvention,
    handleGenerateContract,
    handleGenerateAllConventionsZip,
    handleGenerateProgram,
    handleGenerateTerms,
    handleGeneratePrivacyPolicy,
    handleSendContractByEmail,
    handleSendContractByEmailWithCustomContent,
    handleSendAllContractsByEmail,
    prepareContractEmail,
    generatePdfBlobForSignatureRequest,
  } = useDocumentGeneration({
    sessionData,
    formation,
    program,
    organization,
    enrollments,
  })

  const [emailPreview, setEmailPreview] = useState<{
    to: string
    subject: string
    body: string
    studentName: string
    enrollment: EnrollmentWithRelations
  } | null>(null)
  
  const [editedEmail, setEditedEmail] = useState<{
    to: string
    subject: string
    body: string
  } | null>(null)

  const [signatureRequestDialog, setSignatureRequestDialog] = useState<{
    enrollment: EnrollmentWithRelations
    type: 'contract' | 'convention'
  } | null>(null)

  const [signatureRequestForm, setSignatureRequestForm] = useState<{
    recipientEmail: string
    recipientName: string
    subject: string
    message: string
  } | null>(null)

  const [isSendingSignatureRequest, setIsSendingSignatureRequest] = useState(false)

  // État pour le dialogue d'envoi en masse
  const [showBulkSendDialog, setShowBulkSendDialog] = useState(false)
  const [selectedEmailTemplateId, setSelectedEmailTemplateId] = useState<string>('')
  const [bulkEmailContent, setBulkEmailContent] = useState<{
    subject: string
    body: string
  }>({
    subject: '',
    body: '',
  })

  // Documents contrats de la session (pour afficher Signé / En attente / Non généré)
  const { data: sessionContractDocs } = useQuery({
    queryKey: ['session-contract-documents', sessionData?.id, user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id || !sessionData?.id) return []
      const supabase = createClient()
      const { data } = await supabase
        .from('documents')
        .select('id, student_id, metadata, status, signed_at')
        .eq('organization_id', user.organization_id)
        .eq('type', 'contract')
      const list = (data ?? []) as unknown as Array<{ id: string; student_id: string | null; metadata: Record<string, unknown> | null; status: string | null; signed_at?: string | null }>
      return list.filter((d) => (d.metadata as Record<string, unknown> | null)?.session_id === sessionData?.id)
    },
    enabled: !!sessionData?.id && !!user?.organization_id,
    refetchInterval: 10000,
  })

  // Demandes de signature signées (fallback si documents.status absent)
  const { data: signedRequestIds } = useQuery({
    queryKey: ['signature-requests-signed', sessionContractDocs?.map((d) => d.id)],
    queryFn: async () => {
      if (!sessionContractDocs?.length) return new Set<string>()
      const supabase = createClient()
      const { data } = await supabase
        .from('signature_requests')
        .select('document_id')
        .in('document_id', sessionContractDocs.map((d) => d.id))
        .eq('status', 'signed')
      return new Set((data || []).map((r: { document_id: string }) => r.document_id))
    },
    enabled: !!sessionContractDocs?.length,
    refetchInterval: 10000, // Rafraîchit toutes les 10s pour détecter les nouvelles signatures
  })

  const getContractStatusForEnrollment = useMemo(() => {
    const docs = sessionContractDocs || []
    const signedIds = signedRequestIds || new Set<string>()
    return (enrollment: EnrollmentWithRelations) => {
      const enrollmentDocs = docs.filter(
        (d) =>
          (d.metadata as Record<string, unknown> | null)?.enrollment_id === enrollment.id ||
          d.student_id === enrollment.student_id
      )
      if (!enrollmentDocs.length) return null
      // Signé si au moins un document de cet apprenant est signé (gère les envois multiples)
      const isSigned = enrollmentDocs.some(
        (d) => (d as { status?: string }).status === 'signed' || signedIds.has(d.id)
      )
      return isSigned ? 'signed' : 'pending'
    }
  }, [sessionContractDocs, signedRequestIds])

  // Récupérer les templates d'email pour les contrats/conventions
  const { data: emailTemplates } = useQuery<EmailTemplate[]>({
    queryKey: ['email-templates', 'document_generated', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return []
      return emailTemplateService.getByType(user.organization_id, 'document_generated')
    },
    enabled: !!user?.organization_id && showBulkSendDialog,
  })

  // Récupérer le template d'email par défaut
  const { data: defaultEmailTemplate } = useQuery<EmailTemplate | null>({
    queryKey: ['email-template-default', 'document_generated', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return null
      return emailTemplateService.getDefault(user.organization_id, 'document_generated')
    },
    enabled: !!user?.organization_id && showBulkSendDialog,
  })

  // Charger le template par défaut quand le dialogue s'ouvre
  useEffect(() => {
    if (showBulkSendDialog && defaultEmailTemplate && !selectedEmailTemplateId && !bulkEmailContent.subject) {
      setSelectedEmailTemplateId('default')
      setBulkEmailContent({
        subject: defaultEmailTemplate.subject || '',
        body: defaultEmailTemplate.body_html || '',
      })
    }
  }, [showBulkSendDialog, defaultEmailTemplate, selectedEmailTemplateId, bulkEmailContent.subject])

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }
    }
  }

  return (
    <motion.div 
      className="space-y-8"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Conventions et contrats */}
      <motion.div variants={itemVariants}>
        <GlassCard variant="premium" className="p-8 overflow-hidden relative">
          {/* Background decoration */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-brand-blue/5 rounded-full blur-3xl -z-10" />
          
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-gradient-to-br from-brand-blue to-brand-cyan rounded-xl shadow-lg shadow-brand-blue/20">
              <FileCheck className="h-6 w-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold text-gray-900">Conventions et contrats</CardTitle>
              <p className="text-sm text-gray-500 font-medium">Gérez les documents contractuels de vos apprenants</p>
            </div>
          </div>

          <div className="space-y-6">
            {enrollments.length > 0 && (
              <motion.div 
                className="relative overflow-hidden rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50/80 to-indigo-50/80 p-6 shadow-sm"
                whileHover={{ scale: 1.01 }}
                transition={{ duration: 0.2 }}
              >
                <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-white rounded-xl shadow-sm text-blue-600">
                      <Download className="h-6 w-6" />
                    </div>
                    <div>
                      <h4 className="font-bold text-blue-900 text-lg">Génération en masse</h4>
                      <p className="text-sm text-blue-700 font-medium mt-1">
                        Téléchargez toutes les conventions et contrats dans une archive ZIP
                      </p>
                      {lastZipGeneration && (
                        <div className="flex items-center gap-2 mt-2 text-xs text-blue-600 font-medium bg-blue-100/50 px-2 py-1 rounded-md w-fit">
                          <Clock className="h-3 w-3" />
                          Dernière génération : {formatDate(lastZipGeneration.toISOString())}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button
                      className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200 hover:shadow-blue-300 transition-all duration-300"
                      onClick={() => handleGenerateAllConventionsZip(enrollments, selectedConventionTemplateId)}
                      disabled={isGeneratingZip}
                    >
                      {isGeneratingZip ? (
                        <div className="flex items-center gap-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                          <span>Génération...</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Download className="h-4 w-4" />
                          <span>Générer l'archive ZIP</span>
                        </div>
                      )}
                    </Button>
                    <Button
                      className="bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-200 hover:shadow-green-300 transition-all duration-300"
                      onClick={() => setShowBulkSendDialog(true)}
                      disabled={isGeneratingZip}
                    >
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        <span>Envoyer par email</span>
                      </div>
                    </Button>
                  </div>
                </div>

                {isGeneratingZip && (
                  <div className="mt-6 space-y-2">
                    <div className="flex justify-between text-xs font-bold text-blue-800 uppercase tracking-wide">
                      <span>Progression</span>
                      <span>{Math.round((zipGenerationProgress.current / zipGenerationProgress.total) * 100)}%</span>
                    </div>
                    <div className="w-full bg-blue-200/50 rounded-full h-2 overflow-hidden">
                      <motion.div
                        className="bg-blue-600 h-full rounded-full"
                        initial={{ width: 0 }}
                        animate={{ 
                          width: `${zipGenerationProgress.total > 0
                            ? (zipGenerationProgress.current / zipGenerationProgress.total) * 100
                            : 0}%` 
                        }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                    <p className="text-xs text-blue-600 text-center font-medium">
                      Traitement du document {zipGenerationProgress.current} sur {zipGenerationProgress.total}
                    </p>
                  </div>
                )}
              </motion.div>
            )}

            <div className="space-y-3">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide flex items-center gap-2 pb-2 border-b border-gray-100">
                <FileText className="h-4 w-4 text-brand-blue" />
                Documents généraux
              </h3>
              
              {/* Convention générale */}
              <motion.div 
                className="group flex flex-col gap-3 p-4 bg-white border border-gray-100 rounded-xl hover:border-brand-blue/30 hover:shadow-md transition-all duration-300"
                whileHover={{ x: 4 }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-gray-50 rounded-lg group-hover:bg-brand-blue/5 transition-colors">
                      <FileText className="h-5 w-5 text-gray-400 group-hover:text-brand-blue transition-colors" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">Convention de formation</p>
                      <p className="text-sm text-gray-500">Modèle standard pour l'organisme</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleGenerateConvention(selectedConventionTemplateId)}
                      className="hover:bg-brand-blue/10 hover:text-brand-blue"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Télécharger
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-gray-700">Modèle (s'applique à la convention et aux contrats individuels)</Label>
                  <Select
                    value={selectedConventionTemplateId || ''}
                    onValueChange={(value) => setSelectedConventionTemplateId(value || undefined)}
                  >
                    <SelectTrigger className="w-full bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue">
                      <SelectValue placeholder="Modèle par défaut" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl z-[9999] max-h-[400px] overflow-y-auto w-full">
                      <SelectItem value="">Modèle par défaut</SelectItem>
                      {conventionTemplates && conventionTemplates.length > 0 ? (
                        conventionTemplates.map((template: DocumentTemplate) => (
                          <SelectItem key={template.id} value={template.id}>
                            {template.name}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="" {...({ disabled: true } as Record<string, unknown>)}>
                          Aucun modèle disponible
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </motion.div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide flex items-center gap-2 pb-2 border-b border-gray-100 pt-4">
                <UserPlus className="h-4 w-4 text-brand-blue" />
                Documents apprenants
              </h3>

              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-20 bg-gray-50 rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : enrollments.length > 0 ? (
                <div className="grid gap-3">
                  {enrollments.map((enrollment, index) => {
                    const student = enrollment.students
                    if (!student) return null

                    return (
                      <motion.div 
                        key={enrollment.id} 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="group flex items-center justify-between p-4 bg-white border border-gray-100 rounded-xl hover:border-brand-blue/30 hover:shadow-md transition-all duration-300"
                      >
                        <div className="flex items-center gap-4">
                          <div className="relative w-10 h-10">
                            {student.photo_url ? (
                              <Image
                                src={student.photo_url}
                                alt={`${student.first_name} ${student.last_name}`}
                                fill
                                sizes="40px"
                                className="rounded-full object-cover ring-2 ring-white shadow-sm"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center ring-2 ring-white shadow-sm">
                                <span className="text-sm font-bold text-gray-600">
                                  {student.first_name?.[0]}{student.last_name?.[0]}
                                </span>
                              </div>
                            )}
                            <div className="absolute -bottom-1 -right-1 bg-green-500 border-2 border-white w-4 h-4 rounded-full" />
                          </div>
                          <div>
                            <p className="font-bold text-gray-900">{student.first_name} {student.last_name}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5 bg-gray-100 text-gray-600 border-gray-200">
                                Contrat particulier
                              </Badge>
                              <span className="text-xs text-gray-400">•</span>
                              {getContractStatusForEnrollment(enrollment) === 'signed' ? (
                                <span className="text-xs font-medium text-green-600 flex items-center gap-1">
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                  Signé
                                </span>
                              ) : getContractStatusForEnrollment(enrollment) === 'pending' ? (
                                <span className="text-xs text-amber-600 flex items-center gap-1">
                                  <Clock className="h-3.5 w-3.5" />
                                  En attente de signature
                                </span>
                              ) : (
                                <span className="text-xs text-gray-500">Non généré</span>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleGenerateContract(enrollment, selectedConventionTemplateId)}
                            className="h-9 w-9 p-0 rounded-full hover:bg-brand-blue/10 hover:text-brand-blue transition-colors"
                            title="Télécharger le contrat"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const emailData = prepareContractEmail(enrollment)
                              if (emailData) {
                                setEmailPreview(emailData)
                                setEditedEmail({
                                  to: emailData.to,
                                  subject: emailData.subject,
                                  body: emailData.body,
                                })
                              }
                            }}
                            disabled={!student.email}
                            className="h-9 w-9 p-0 rounded-full hover:bg-brand-blue/10 hover:text-brand-blue transition-colors"
                            title="Envoyer par email"
                          >
                            <Mail className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSignatureRequestDialog({
                                enrollment,
                                type: 'contract',
                              })
                              setSignatureRequestForm({
                                recipientEmail: student.email || '',
                                recipientName: `${student.first_name} ${student.last_name}`,
                                subject: `Demande de signature : Contrat de formation - ${student.first_name} ${student.last_name}`,
                                message: `Bonjour ${student.first_name},\n\nVeuillez trouver ci-joint votre contrat de formation pour la session "${sessionData?.name || ''}".\n\nMerci de bien vouloir le signer en ligne.\n\nCordialement,\n${organization?.name || ''}`,
                              })
                            }}
                            disabled={!student.email}
                            className="h-9 w-9 p-0 rounded-full hover:bg-purple-100 hover:text-purple-600 transition-colors"
                            title="Envoyer en demande de signature"
                          >
                            <PenTool className="h-4 w-4" />
                          </Button>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 px-4 border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50/50">
                  <div className="p-4 bg-white rounded-full shadow-sm mb-4">
                    <UserPlus className="h-8 w-8 text-gray-400" />
                  </div>
                  <p className="text-gray-900 font-bold text-lg mb-1">Aucune inscription</p>
                  <p className="text-gray-500 text-sm text-center max-w-sm mb-6">
                    Commencez par inscrire des apprenants à cette session pour générer leurs contrats.
                  </p>
                  <Button
                    onClick={() => {
                      onSwitchTab('convocations')
                      onShowEnrollmentForm()
                    }}
                    className="bg-brand-blue hover:bg-brand-blue-dark text-white shadow-lg shadow-brand-blue/20"
                  >
                    <UserPlus className="mr-2 h-4 w-4" />
                    Inscrire un apprenant
                  </Button>
                </div>
              )}
            </div>
          </div>
        </GlassCard>
      </motion.div>

      {/* Autres documents contractuels */}
      <motion.div variants={itemVariants}>
        <GlassCard variant="premium" className="p-8 overflow-hidden relative">
          <div className="absolute top-0 left-0 w-64 h-64 bg-brand-cyan/5 rounded-full blur-3xl -z-10" />
          
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-xl shadow-lg shadow-purple-500/20">
              <FileText className="h-6 w-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold text-gray-900">Autres documents contractuels</CardTitle>
              <p className="text-sm text-gray-500 font-medium">Programme, CGV et documents légaux</p>
            </div>
          </div>

          <div className="space-y-4">
            {!program ? (
              <motion.div 
                className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-bold text-amber-900 text-sm">Programme manquant</h4>
                  <p className="text-sm text-amber-700 mt-1">
                    Cette session n'est pas associée à un programme. Impossible de générer le document de programme.
                  </p>
                </div>
              </motion.div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { 
                    title: 'Programme', 
                    desc: 'Détails de la formation', 
                    action: handleGenerateProgram,
                    icon: FileText,
                    color: 'text-purple-600',
                    bg: 'bg-purple-50',
                    hoverBg: 'group-hover:bg-purple-100'
                  },
                  { 
                    title: 'CGV', 
                    desc: 'Conditions générales', 
                    action: handleGenerateTerms,
                    icon: FileCheck,
                    color: 'text-blue-600',
                    bg: 'bg-blue-50',
                    hoverBg: 'group-hover:bg-blue-100'
                  },
                  { 
                    title: 'Confidentialité', 
                    desc: 'Politique RGPD', 
                    action: handleGeneratePrivacyPolicy,
                    icon: Sparkles,
                    color: 'text-emerald-600',
                    bg: 'bg-emerald-50',
                    hoverBg: 'group-hover:bg-emerald-100'
                  }
                ].map((doc, i) => (
                  <motion.div
                    key={doc.title}
                    className="group relative bg-white border border-gray-100 rounded-xl p-5 hover:border-brand-blue/30 hover:shadow-lg transition-all duration-300 cursor-pointer overflow-hidden"
                    whileHover={{ y: -4 }}
                    onClick={doc.action}
                  >
                    <div className={`absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity`}>
                      <doc.icon className={`h-24 w-24 ${doc.color}`} />
                    </div>
                    
                    <div className="relative z-10">
                      <div className={`w-10 h-10 ${doc.bg} ${doc.hoverBg} rounded-lg flex items-center justify-center mb-4 transition-colors`}>
                        <doc.icon className={`h-5 w-5 ${doc.color}`} />
                      </div>
                      <h4 className="font-bold text-gray-900 text-lg">{doc.title}</h4>
                      <p className="text-sm text-gray-500 font-medium mt-1">{doc.desc}</p>
                      
                      <div className="mt-4 flex items-center text-sm font-bold text-brand-blue opacity-0 group-hover:opacity-100 transition-opacity transform translate-y-2 group-hover:translate-y-0 duration-300">
                        Télécharger <Download className="h-3 w-3 ml-2" />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </GlassCard>
      </motion.div>

      {/* Modal d'aperçu d'email */}
      <Dialog open={!!emailPreview} onOpenChange={(open) => {
        if (!open) {
          setEmailPreview(null)
          setEditedEmail(null)
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 gap-0 bg-white/95 backdrop-blur-xl border-white/20 shadow-2xl">
          <div className="p-6 border-b border-gray-100">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl font-bold text-gray-900">
                <Mail className="h-5 w-5 text-brand-blue" />
                Aperçu de l'email
              </DialogTitle>
              <DialogDescription className="text-gray-500">
                Personnalisez le message avant l'envoi du contrat à l'apprenant.
              </DialogDescription>
            </DialogHeader>
          </div>
          
          <div className="p-6 space-y-6">
            {emailPreview && editedEmail && (
              <div className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="email-to" className="text-xs font-bold text-gray-500 uppercase tracking-wide">Destinataire</Label>
                  <div className="relative">
                    <Input
                      id="email-to"
                      type="email"
                      value={editedEmail.to}
                      onChange={(e) => setEditedEmail({ ...editedEmail, to: e.target.value })}
                      className="pl-10 bg-gray-50/50 border-gray-200 focus:ring-brand-blue/20 focus:border-brand-blue transition-all"
                      placeholder="email@example.com"
                    />
                    <Mail className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  </div>
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="email-subject" className="text-xs font-bold text-gray-500 uppercase tracking-wide">Sujet</Label>
                  <Input
                    id="email-subject"
                    type="text"
                    value={editedEmail.subject}
                    onChange={(e) => setEditedEmail({ ...editedEmail, subject: e.target.value })}
                    className="bg-gray-50/50 border-gray-200 focus:ring-brand-blue/20 focus:border-brand-blue transition-all font-medium"
                    placeholder="Sujet de l'email"
                  />
                </div>
                
                <div className="grid gap-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="email-body" className="text-xs font-bold text-gray-500 uppercase tracking-wide">Message</Label>
                    <span className="text-xs text-brand-blue font-medium flex items-center gap-1">
                      <Eye className="h-3 w-3" />
                      HTML activé
                    </span>
                  </div>
                  <Textarea
                    id="email-body"
                    value={editedEmail.body.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim()}
                    onChange={(e) => setEditedEmail({ ...editedEmail, body: e.target.value })}
                    className="min-h-[200px] font-mono text-sm bg-gray-50/50 border-gray-200 focus:ring-brand-blue/20 focus:border-brand-blue transition-all"
                    placeholder="Contenu de l'email"
                  />
                </div>
                
                <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-100 rounded-xl text-sm text-blue-700">
                  <div className="p-2 bg-white rounded-lg shadow-sm">
                    <FileText className="h-4 w-4 text-blue-600" />
                  </div>
                  <p className="font-medium">
                    Le contrat sera automatiquement joint au format PDF.
                  </p>
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter className="p-6 bg-gray-50/50 border-t border-gray-100">
            <Button
              variant="outline"
              onClick={() => {
                setEmailPreview(null)
                setEditedEmail(null)
              }}
              className="border-gray-200 hover:bg-gray-100 hover:text-gray-900"
            >
              Annuler
            </Button>
            <Button
              onClick={async () => {
                if (emailPreview && editedEmail) {
                  const modifiedEnrollment = {
                    ...emailPreview.enrollment,
                    students: {
                      ...emailPreview.enrollment.students,
                      email: editedEmail.to,
                    },
                  } as EnrollmentWithRelations
                  
                  await handleSendContractByEmailWithCustomContent(
                    modifiedEnrollment,
                    editedEmail.subject,
                    editedEmail.body
                  )
                  setEmailPreview(null)
                  setEditedEmail(null)
                }
              }}
              disabled={!editedEmail?.to || !editedEmail?.subject || !editedEmail?.body}
              className="bg-brand-blue hover:bg-brand-blue-dark text-white shadow-lg shadow-brand-blue/20"
            >
              <Send className="h-4 w-4 mr-2" />
              Envoyer maintenant
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de demande de signature */}
      <Dialog open={!!signatureRequestDialog} onOpenChange={(open) => {
        if (!open) {
          setSignatureRequestDialog(null)
          setSignatureRequestForm(null)
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 gap-0 bg-white/95 backdrop-blur-xl border-white/20 shadow-2xl">
          <div className="p-6 border-b border-gray-100">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl font-bold text-gray-900">
                <PenTool className="h-5 w-5 text-purple-600" />
                Envoyer en demande de signature
              </DialogTitle>
              <DialogDescription className="text-gray-500">
                Le document sera généré et envoyé au destinataire pour signature en ligne.
              </DialogDescription>
            </DialogHeader>
          </div>
          
          <div className="p-6 space-y-6">
            {signatureRequestForm && (
              <div className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="sig-recipient-email" className="text-xs font-bold text-gray-500 uppercase tracking-wide">Email du destinataire</Label>
                  <div className="relative">
                    <Input
                      id="sig-recipient-email"
                      type="email"
                      value={signatureRequestForm.recipientEmail}
                      onChange={(e) => setSignatureRequestForm({ ...signatureRequestForm, recipientEmail: e.target.value })}
                      className="pl-10 bg-gray-50/50 border-gray-200 focus:ring-purple-600/20 focus:border-purple-600 transition-all"
                      placeholder="email@example.com"
                    />
                    <Mail className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  </div>
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="sig-recipient-name" className="text-xs font-bold text-gray-500 uppercase tracking-wide">Nom du destinataire</Label>
                  <Input
                    id="sig-recipient-name"
                    type="text"
                    value={signatureRequestForm.recipientName}
                    onChange={(e) => setSignatureRequestForm({ ...signatureRequestForm, recipientName: e.target.value })}
                    className="bg-gray-50/50 border-gray-200 focus:ring-purple-600/20 focus:border-purple-600 transition-all font-medium"
                    placeholder="Nom complet"
                  />
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="sig-subject" className="text-xs font-bold text-gray-500 uppercase tracking-wide">Sujet</Label>
                  <Input
                    id="sig-subject"
                    type="text"
                    value={signatureRequestForm.subject}
                    onChange={(e) => setSignatureRequestForm({ ...signatureRequestForm, subject: e.target.value })}
                    className="bg-gray-50/50 border-gray-200 focus:ring-purple-600/20 focus:border-purple-600 transition-all font-medium"
                    placeholder="Sujet de l'email"
                  />
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="sig-message" className="text-xs font-bold text-gray-500 uppercase tracking-wide">Message</Label>
                  <Textarea
                    id="sig-message"
                    value={signatureRequestForm.message}
                    onChange={(e) => setSignatureRequestForm({ ...signatureRequestForm, message: e.target.value })}
                    className="min-h-[200px] font-mono text-sm bg-gray-50/50 border-gray-200 focus:ring-purple-600/20 focus:border-purple-600 transition-all"
                    placeholder="Message personnalisé"
                  />
                </div>
                
                <div className="flex items-center gap-3 p-3 bg-purple-50 border border-purple-100 rounded-xl text-sm text-purple-700">
                  <div className="p-2 bg-white rounded-lg shadow-sm">
                    <PenTool className="h-4 w-4 text-purple-600" />
                  </div>
                  <p className="font-medium">
                    Le destinataire recevra un email avec un lien sécurisé pour signer le document en ligne.
                  </p>
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter className="p-6 bg-gray-50/50 border-t border-gray-100">
            <Button
              variant="outline"
              onClick={() => {
                setSignatureRequestDialog(null)
                setSignatureRequestForm(null)
              }}
              className="border-gray-200 hover:bg-gray-100 hover:text-gray-900"
            >
              Annuler
            </Button>
            <Button
              onClick={async () => {
                if (!signatureRequestDialog || !signatureRequestForm || !sessionData) return
                
                setIsSendingSignatureRequest(true)
                try {
                  const { blob, documentTitle } = await generatePdfBlobForSignatureRequest({
                    type: signatureRequestDialog.type,
                    enrollment: signatureRequestDialog.type === 'contract' ? signatureRequestDialog.enrollment : undefined,
                    templateId: signatureRequestDialog.type === 'convention' ? selectedConventionTemplateId : undefined,
                  })
                  
                  const pdfBase64 = await new Promise<string>((resolve, reject) => {
                    const reader = new FileReader()
                    reader.onloadend = () => {
                      const base64 = (reader.result as string).split(',')[1]
                      resolve(base64 ?? '')
                    }
                    reader.onerror = reject
                    reader.readAsDataURL(blob)
                  })
                  
                  const response = await fetch('/api/signature-requests/send-from-contract', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      pdfBase64,
                      documentTitle,
                      type: signatureRequestDialog.type,
                      enrollmentId: signatureRequestDialog.enrollment.id,
                      sessionId: sessionData.id,
                      recipientEmail: signatureRequestForm.recipientEmail,
                      recipientName: signatureRequestForm.recipientName,
                      recipientId: signatureRequestDialog.enrollment.students?.id,
                      subject: signatureRequestForm.subject,
                      message: signatureRequestForm.message,
                      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                    }),
                  })

                  if (!response.ok) {
                    const error = await response.json()
                    throw new Error(error.error || 'Erreur lors de l\'envoi')
                  }

                  setSignatureRequestDialog(null)
                  setSignatureRequestForm(null)
                  queryClient.invalidateQueries({ queryKey: ['session-contract-documents', sessionData?.id, user?.organization_id] })
                  queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0] === 'signature-requests-signed' })
                  queryClient.invalidateQueries({ queryKey: ['session-enrollments', sessionData?.id] })
                  queryClient.invalidateQueries({ queryKey: ['session', sessionData?.id] })

                  addToast({
                    type: 'success',
                    title: 'Demande de signature envoyée',
                    description: 'Le document a été généré et envoyé au destinataire pour signature en ligne.',
                  })
                } catch (error) {
                  logger.error('Erreur:', error)
                  addToast({
                    type: 'error',
                    title: 'Erreur',
                    description: error instanceof Error ? error.message : 'Erreur lors de l\'envoi de la demande de signature',
                  })
                } finally {
                  setIsSendingSignatureRequest(false)
                }
              }}
              disabled={!signatureRequestForm?.recipientEmail || !signatureRequestForm?.recipientName || !signatureRequestForm?.subject || isSendingSignatureRequest}
              className="bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-200"
            >
              {isSendingSignatureRequest ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                  Envoi en cours...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Envoyer la demande
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialogue d'envoi en masse avec prévisualisation */}
      <Dialog open={showBulkSendDialog} onOpenChange={setShowBulkSendDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Mail className="h-5 w-5 text-green-600" />
              Envoi en masse des contrats par email
            </DialogTitle>
            <DialogDescription>
              Configurez le modèle d'email et prévisualisez le contenu avant l'envoi à tous les apprenants.
            </DialogDescription>
          </DialogHeader>
          
          <div className="p-6 space-y-6">
            {/* Sélection du template d'email */}
            <div className="space-y-3">
              <Label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                <Mail className="h-4 w-4 text-green-600" />
                Modèle d'email
              </Label>
              <Select
                value={selectedEmailTemplateId}
                onValueChange={(value) => {
                  setSelectedEmailTemplateId(value)
                  // Charger le contenu du template d'email
                  if (value === 'default' && defaultEmailTemplate) {
                    setBulkEmailContent({
                      subject: defaultEmailTemplate.subject || '',
                      body: defaultEmailTemplate.body_html || '',
                    })
                  } else {
                    const template = emailTemplates?.find(t => t.id === value)
                    if (template) {
                      setBulkEmailContent({
                        subject: template.subject || '',
                        body: template.body_html || '',
                      })
                    }
                  }
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Sélectionner un modèle d'email" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Modèle par défaut (système)</SelectItem>
                  {emailTemplates?.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name} {template.is_default && '(Par défaut)'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                Le modèle sélectionné sera utilisé comme base pour le contenu de l'email.
              </p>
            </div>

            {/* Édition du sujet */}
            <div className="space-y-2">
              <Label htmlFor="bulk-email-subject" className="text-sm font-bold text-gray-700">
                Sujet de l'email
              </Label>
              <Input
                id="bulk-email-subject"
                value={bulkEmailContent.subject}
                onChange={(e) => setBulkEmailContent({ ...bulkEmailContent, subject: e.target.value })}
                placeholder="Ex: Contrat de formation - Session de formation"
                className="bg-gray-50/50 border-gray-200 focus:ring-green-600/20 focus:border-green-600"
              />
            </div>

            {/* Édition du contenu */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="bulk-email-body" className="text-sm font-bold text-gray-700">
                  Contenu de l'email
                </Label>
                <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                  <Eye className="h-3 w-3" />
                  HTML activé
                </span>
              </div>
              <Textarea
                id="bulk-email-body"
                value={bulkEmailContent.body.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim()}
                onChange={(e) => setBulkEmailContent({ ...bulkEmailContent, body: e.target.value })}
                className="min-h-[250px] font-mono text-sm bg-gray-50/50 border-gray-200 focus:ring-green-600/20 focus:border-green-600"
                placeholder="Contenu de l'email..."
              />
              <p className="text-xs text-gray-500">
                Variables disponibles : {'{student_first_name}'}, {'{student_last_name}'}, {'{session_name}'}, {'{formation_name}'}, {'{session_start_date}'}, {'{session_end_date}'}, {'{session_location}'}
              </p>
            </div>

            {/* Prévisualisation */}
            <div className="space-y-2">
              <Label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                <Eye className="h-4 w-4 text-green-600" />
                Prévisualisation
              </Label>
              <div className="border border-gray-200 rounded-lg p-4 bg-white">
                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-1">À :</p>
                    <p className="text-sm text-gray-700">
                      {enrollments.filter(e => e.students?.email && e.status !== 'cancelled').length} apprenant(s)
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Sujet :</p>
                    <p className="text-sm font-medium text-gray-900">{bulkEmailContent.subject || '(Aucun sujet)'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Contenu :</p>
                    <div 
                      className="text-sm text-gray-700 whitespace-pre-wrap"
                      dangerouslySetInnerHTML={{ 
                        __html: bulkEmailContent.body 
                          ? bulkEmailContent.body
                              .replace(/{student_first_name}/g, 'Jean')
                              .replace(/{student_last_name}/g, 'Dupont')
                              .replace(/{session_name}/g, sessionData?.name || 'Session de formation')
                              .replace(/{formation_name}/g, formation?.name || 'Formation')
                              .replace(/{session_start_date}/g, sessionData?.start_date ? formatDate(sessionData.start_date) : 'Date de début')
                              .replace(/{session_end_date}/g, sessionData?.end_date ? formatDate(sessionData.end_date) : 'Date de fin')
                              .replace(/{session_location}/g, sessionData?.location || 'Lieu')
                          : '(Aucun contenu)'
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Informations */}
            <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-100 rounded-xl text-sm text-green-700">
              <div className="p-2 bg-white rounded-lg shadow-sm">
                <FileText className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="font-medium">
                  {enrollments.filter(e => e.students?.email && e.status !== 'cancelled').length} contrat(s) seront envoyé(s)
                </p>
                <p className="text-xs mt-1">
                  Les PDF seront générés automatiquement avec le modèle sélectionné et joints aux emails.
                </p>
              </div>
            </div>
          </div>
          
          <DialogFooter className="p-6 bg-gray-50/50 border-t border-gray-100">
            <Button
              variant="outline"
              onClick={() => {
                setShowBulkSendDialog(false)
                setSelectedEmailTemplateId('')
                setBulkEmailContent({ subject: '', body: '' })
              }}
              className="border-gray-200 hover:bg-gray-100 hover:text-gray-900"
            >
              Annuler
            </Button>
            <Button
              onClick={async () => {
                if (!bulkEmailContent.subject || !bulkEmailContent.body) {
                  return
                }
                
                // Appeler la fonction d'envoi en masse avec les paramètres
                await handleSendAllContractsByEmail(
                  enrollments,
                  bulkEmailContent.subject,
                  bulkEmailContent.body
                )
                
                setShowBulkSendDialog(false)
                setSelectedEmailTemplateId('')
                setBulkEmailContent({ subject: '', body: '' })
              }}
              disabled={!bulkEmailContent.subject || !bulkEmailContent.body}
              className="bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-200"
            >
              <Send className="h-4 w-4 mr-2" />
              Envoyer à tous ({enrollments.filter(e => e.students?.email && e.status !== 'cancelled').length})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}
