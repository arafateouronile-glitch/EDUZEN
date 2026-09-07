'use client'

import { useMemo, useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { GlassCard } from '@/components/ui/glass-card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/toast'
import { Download, FileText, Mail, Building2, Users, Phone, MapPin, Briefcase, FileCheck, Info, ExternalLink, Send, Loader2 } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { emailService } from '@/lib/services/email.service'
import { APP_URLS } from '@/lib/config/app-config'
import { useDocumentGeneration } from '../hooks/use-document-generation'
import type { 
  SessionWithRelations, 
  EnrollmentWithRelations,
  FormationWithRelations
} from '@/lib/types/query-types'
import type { TableRow } from '@/lib/types/supabase-helpers'
import { motion } from 'framer-motion'
import { Badge } from '@/components/ui/badge'

type Program = TableRow<'programs'>
type Organization = TableRow<'organizations'>

interface GestionEspaceEntrepriseProps {
  sessionData: SessionWithRelations | undefined
  formation: FormationWithRelations | null | undefined
  program: Program | null | undefined
  organization: Organization | undefined
  enrollments?: EnrollmentWithRelations[]
  grades?: unknown[]
  attendanceStats?: {
    total: number
    present: number
    absent: number
    late: number
    excused: number
    byStudent: Record<string, { present: number; total: number }>
  } | null
}

export function GestionEspaceEntreprise({
  sessionData,
  formation,
  program,
  organization,
  enrollments = [],
  grades = [],
  attendanceStats = null,
}: GestionEspaceEntrepriseProps) {
  const supabase = createClient()
  const { addToast } = useToast()
  const [sendLinkEntity, setSendLinkEntity] = useState<{ id: string; name: string; contactName: string } | null>(null)
  const [linkRecipient, setLinkRecipient] = useState('')
  const {
    handleGenerateSessionReport,
    handleGenerateCertificate,
  } = useDocumentGeneration({
    sessionData,
    formation,
    program,
    organization,
    enrollments,
    grades,
    attendanceStats,
  })

  const enrolledStudentIds = useMemo(
    () => enrollments.map((e) => e.student_id).filter((id): id is string => !!id),
    [enrollments]
  )

  // Entités (entreprises) des apprenants inscrits (student_entities + external_entities)
  const { data: studentEntitiesWithEntity } = useQuery({
    queryKey: ['session-entity-students', enrolledStudentIds],
    queryFn: async () => {
      if (enrolledStudentIds.length === 0) return []
      const { data, error } = await supabase
        .from('student_entities')
        .select('student_id, entity_id, external_entities(id, name, contact_email, email, contact_first_name, contact_last_name)')
        .in('student_id', enrolledStudentIds)
        .eq('is_current', true)
      if (error) throw error
      return (data || []) as Array<{
        student_id: string
        entity_id: string
        external_entities: {
          id: string
          name: string
          contact_email: string | null
          email: string | null
          contact_first_name: string | null
          contact_last_name: string | null
        } | null
      }>
    },
    enabled: enrolledStudentIds.length > 0,
  })

  // Entités ayant réservé un effectif prévisionnel sur cette session, sans apprenants nominatifs
  const { data: sessionEntityReservations } = useQuery({
    queryKey: ['session-entity-reservations', sessionData?.id],
    queryFn: async () => {
      if (!sessionData?.id) return []
      const { data, error } = await supabase
        .from('session_entity_reservations')
        .select('entity_id, expected_count, external_entities(id, name, contact_email, email, contact_first_name, contact_last_name)')
        .eq('session_id', sessionData.id)
      if (error) throw error
      return (data || []) as Array<{
        entity_id: string
        expected_count: number
        external_entities: {
          id: string
          name: string
          contact_email: string | null
          email: string | null
          contact_first_name: string | null
          contact_last_name: string | null
        } | null
      }>
    },
    enabled: !!sessionData?.id,
  })

  // Grouper par entité : entityId -> { id, name, contactEmail, contactName, expectedCount, enrollments }
  const entitiesWithEnrollments = useMemo(() => {
    type EntityGroup = {
      id: string
      name: string
      contactEmail: string
      contactName: string
      expectedCount: number
      enrollments: EnrollmentWithRelations[]
    }
    const byEntityId = new Map<string, EntityGroup>()
    const studentToEntity = new Map<string | null, Omit<EntityGroup, 'enrollments' | 'expectedCount'>>()
    studentEntitiesWithEntity?.forEach((se) => {
      const ent = se.external_entities
      if (ent) studentToEntity.set(se.student_id, {
        id: se.entity_id,
        name: ent.name,
        contactEmail: ent.contact_email || ent.email || '',
        contactName: [ent.contact_first_name, ent.contact_last_name].filter(Boolean).join(' '),
      })
    })
    enrollments.forEach((enrollment) => {
      const studentId = enrollment.student_id
      const entity = studentId ? studentToEntity.get(studentId) : null
      const displayName = entity?.name ?? (enrollment.students as { company?: string })?.company ?? 'Non rattaché'
      const entityId = entity?.id ?? `name:${displayName}`
      if (!byEntityId.has(entityId)) {
        byEntityId.set(entityId, {
          id: entity?.id ?? '',
          name: displayName,
          contactEmail: entity?.contactEmail ?? '',
          contactName: entity?.contactName ?? '',
          expectedCount: 0,
          enrollments: [],
        })
      }
      byEntityId.get(entityId)!.enrollments.push(enrollment)
    })
    // Fusionner les réservations d'effectif prévisionnel (entités sans apprenants nominatifs)
    sessionEntityReservations?.forEach((res) => {
      const ent = res.external_entities
      if (!ent) return
      const existing = byEntityId.get(ent.id)
      if (existing) {
        existing.expectedCount = res.expected_count
      } else {
        byEntityId.set(ent.id, {
          id: ent.id,
          name: ent.name,
          contactEmail: ent.contact_email || ent.email || '',
          contactName: [ent.contact_first_name, ent.contact_last_name].filter(Boolean).join(' '),
          expectedCount: res.expected_count,
          enrollments: [],
        })
      }
    })
    return Array.from(byEntityId.values())
  }, [enrollments, studentEntitiesWithEntity, sessionEntityReservations])

  // Envoyer le lien d'accès à l'espace entreprise au contact de l'entité
  const sendLinkMutation = useMutation({
    mutationFn: async ({ to, entity }: { to: string; entity: { id: string; name: string; contactName: string } }) => {
      const portalUrl = `${APP_URLS.getBaseUrl()}/enterprise?entity=${entity.id}`
      const greeting = entity.contactName ? `Bonjour ${entity.contactName},` : 'Bonjour,'
      await emailService.sendEmail({
        to,
        subject: `Votre espace entreprise — ${entity.name}`,
        html: `
          <p>${greeting}</p>
          <p>Vous pouvez désormais suivre en ligne les formations de vos collaborateurs :
          sessions, apprenants inscrits, devis et factures.</p>
          <p style="margin:24px 0;">
            <a href="${portalUrl}" style="background:#274472;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600;">
              Accéder à mon espace entreprise
            </a>
          </p>
          <p style="font-size:13px;color:#666;">Ou copiez ce lien dans votre navigateur :<br />${portalUrl}</p>
        `,
        text: `${greeting}\n\nAccédez à votre espace entreprise (sessions, apprenants, devis et factures) : ${portalUrl}`,
      })
    },
    onSuccess: () => {
      setSendLinkEntity(null)
      addToast({
        title: 'Lien envoyé',
        description: `L'accès à l'espace entreprise a été envoyé à ${linkRecipient}`,
        type: 'success',
      })
    },
    onError: (error: unknown) => {
      addToast({
        title: 'Erreur',
        description: error instanceof Error ? error.message : "L'envoi de l'email a échoué",
        type: 'error',
      })
    },
  })

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
      {/* Informations sur les entreprises participantes */}
      <motion.div variants={itemVariants}>
        <GlassCard variant="premium" className="p-8 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-brand-blue/5 rounded-full blur-3xl -z-10" />
          
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-gradient-to-br from-brand-blue to-brand-cyan rounded-xl shadow-lg shadow-brand-blue/20">
              <Building2 className="h-6 w-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold text-gray-900">Entreprises participantes</CardTitle>
              <p className="text-sm text-gray-500 font-medium">Gérez les relations avec les entreprises partenaires</p>
            </div>
          </div>

          {entitiesWithEnrollments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50/50">
              <div className="p-4 bg-white rounded-full shadow-sm mb-4">
                <Building2 className="h-8 w-8 text-gray-400" />
              </div>
              <p className="text-gray-900 font-bold text-lg mb-1">Aucune entreprise identifiée</p>
              <p className="text-gray-500 text-sm text-center max-w-sm">
                Les entreprises seront listées ici dès qu'elles seront associées aux apprenants inscrits
                ou qu'un effectif prévisionnel sera réservé pour elles.
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {entitiesWithEnrollments.map((entity, index) => (
                <motion.div 
                  key={entity.id || entity.name}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="group flex items-center justify-between p-5 bg-white border border-gray-100 rounded-xl hover:border-brand-blue/30 hover:shadow-md transition-all duration-300"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center border border-gray-100 group-hover:bg-brand-blue/5 group-hover:border-brand-blue/20 transition-colors">
                      <Briefcase className="h-6 w-6 text-gray-400 group-hover:text-brand-blue transition-colors" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 text-lg">{entity.name}</p>
                      <div className="flex flex-wrap items-center gap-2 mt-1 text-sm text-gray-500">
                        <Users className="h-4 w-4" />
                        {entity.enrollments.length > 0 ? (
                          <span>
                            {entity.enrollments.length} apprenant{entity.enrollments.length > 1 ? 's' : ''} inscrit{entity.enrollments.length > 1 ? 's' : ''}
                            {entity.expectedCount > 0 && ` · ${entity.expectedCount} prévu${entity.expectedCount > 1 ? 's' : ''}`}
                          </span>
                        ) : (
                          <span>
                            {entity.expectedCount} apprenant{entity.expectedCount > 1 ? 's' : ''} prévu{entity.expectedCount > 1 ? 's' : ''}
                          </span>
                        )}
                        {entity.enrollments.length === 0 && entity.expectedCount > 0 && (
                          <Badge
                            variant="outline"
                            className="text-[10px] font-semibold border-brand-blue/20 text-brand-blue bg-brand-blue/5"
                          >
                            Effectif prévisionnel
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {entity.id ? (
                      <>
                        <Link href={`/dashboard/entities/${entity.id}/students`}>
                          <Button
                            variant="outline"
                            size="sm"
                            className="rounded-lg border-gray-200 hover:bg-gray-50 hover:text-brand-blue gap-2"
                          >
                            <Building2 className="h-4 w-4" />
                            Voir l&apos;entité
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Button>
                        </Link>
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-lg border-gray-200 hover:bg-gray-50 hover:text-brand-blue gap-2"
                          onClick={() => {
                            setLinkRecipient(entity.contactEmail || '')
                            setSendLinkEntity({ id: entity.id, name: entity.name, contactName: entity.contactName })
                          }}
                        >
                          <Send className="h-4 w-4" />
                          Envoyer le lien
                        </Button>
                      </>
                    ) : null}
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="rounded-lg border-gray-200 hover:bg-gray-50 hover:text-brand-blue opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                    >
                      <FileText className="mr-2 h-4 w-4" />
                      Documents
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="rounded-lg border-gray-200 hover:bg-gray-50 hover:text-brand-blue opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                    >
                      <Mail className="mr-2 h-4 w-4" />
                      Contacter
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </GlassCard>
      </motion.div>

      {/* Documents pour les entreprises */}
      <motion.div variants={itemVariants}>
        <GlassCard variant="premium" className="p-8 overflow-hidden relative">
          <div className="absolute top-0 left-0 w-64 h-64 bg-brand-cyan/5 rounded-full blur-3xl -z-10" />
          
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-gradient-to-br from-brand-cyan to-brand-blue rounded-xl shadow-lg shadow-brand-cyan/20">
              <FileCheck className="h-6 w-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold text-gray-900">Documents et rapports</CardTitle>
              <p className="text-sm text-gray-500 font-medium">Générez les documents de fin de formation</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <motion.div 
              className="group p-5 bg-white border border-gray-100 rounded-xl hover:border-brand-blue/30 hover:shadow-lg transition-all duration-300 cursor-pointer"
              whileHover={{ y: -4 }}
              onClick={() => handleGenerateSessionReport(enrollments)}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-blue-50 rounded-lg group-hover:bg-blue-100 transition-colors">
                  <FileText className="h-6 w-6 text-blue-600" />
                </div>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity text-brand-blue">
                  <Download className="h-5 w-5" />
                </div>
              </div>
              <h4 className="font-bold text-gray-900 mb-1">Rapport de session</h4>
              <p className="text-sm text-gray-500">Rapport détaillé incluant présences, notes et statistiques de la session.</p>
            </motion.div>

            <motion.div 
              className="group p-5 bg-white border border-gray-100 rounded-xl hover:border-brand-blue/30 hover:shadow-lg transition-all duration-300 cursor-pointer"
              whileHover={{ y: -4 }}
              onClick={() => {
                // NOTE: Fonctionnalité prévue - Génération groupée de certificats
                // Permettra de générer plusieurs certificats en une seule opération pour tous les stagiaires
                alert('Fonctionnalité à venir : Génération des attestations')
              }}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-purple-50 rounded-lg group-hover:bg-purple-100 transition-colors">
                  <FileCheck className="h-6 w-6 text-purple-600" />
                </div>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity text-brand-blue">
                  <Download className="h-5 w-5" />
                </div>
              </div>
              <h4 className="font-bold text-gray-900 mb-1">Attestations de formation</h4>
              <p className="text-sm text-gray-500">Générer les attestations de fin de formation pour tous les apprenants.</p>
            </motion.div>
          </div>
        </GlassCard>
      </motion.div>

      {/* Informations de contact */}
      <motion.div variants={itemVariants}>
        <GlassCard variant="subtle" className="p-6 border-l-4 border-l-brand-blue">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-brand-blue/10 rounded-lg mt-1">
              <Info className="h-5 w-5 text-brand-blue" />
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-gray-900 mb-4">Contact et support</h4>
              {organization && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Organisation</p>
                    <p className="font-medium text-gray-900">{organization.name}</p>
                  </div>
                  {(organization.email || organization.phone) && (
                    <div>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Coordonnées</p>
                      <div className="space-y-1">
                        {organization.email && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Mail className="h-3 w-3" /> {organization.email}
                          </div>
                        )}
                        {organization.phone && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Phone className="h-3 w-3" /> {organization.phone}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  {organization.address && (
                    <div>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Adresse</p>
                      <div className="flex items-start gap-2 text-sm text-gray-600">
                        <MapPin className="h-3 w-3 mt-0.5 flex-shrink-0" />
                        <span>{organization.address}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </GlassCard>
      </motion.div>

      {/* Dialog : envoyer le lien de l'espace entreprise */}
      <Dialog open={!!sendLinkEntity} onOpenChange={(open) => { if (!open) setSendLinkEntity(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Envoyer le lien de l&apos;espace entreprise</DialogTitle>
            <DialogDescription>
              {sendLinkEntity?.name} recevra un email avec un lien d&apos;accès direct à son espace
              entreprise (sessions, apprenants, devis et factures).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="entity-link-recipient">Email du destinataire</Label>
              <Input
                id="entity-link-recipient"
                type="email"
                value={linkRecipient}
                onChange={(e) => setLinkRecipient(e.target.value)}
                placeholder="contact@entreprise.fr"
                className="mt-1"
              />
              {sendLinkEntity && !linkRecipient && (
                <p className="mt-1 text-xs text-amber-600">
                  Aucun email de contact enregistré pour cette entité — saisissez une adresse.
                </p>
              )}
            </div>
            {sendLinkEntity && (
              <div className="rounded-lg border bg-gray-50 p-3 text-sm text-gray-600 break-all">
                <span className="font-medium text-gray-700">Lien envoyé :</span>
                <br />
                {`${APP_URLS.getBaseUrl()}/enterprise?entity=${sendLinkEntity.id}`}
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2 border-t pt-4">
            <Button variant="outline" onClick={() => setSendLinkEntity(null)}>
              Annuler
            </Button>
            <Button
              onClick={() => {
                if (sendLinkEntity) {
                  sendLinkMutation.mutate({ to: linkRecipient.trim(), entity: sendLinkEntity })
                }
              }}
              disabled={sendLinkMutation.isPending || !linkRecipient.trim()}
            >
              {sendLinkMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Envoi...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Envoyer
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}
