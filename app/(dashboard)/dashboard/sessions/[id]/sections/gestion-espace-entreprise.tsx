'use client'

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { GlassCard } from '@/components/ui/glass-card'
import { Download, FileText, Mail, Building2, Users, Phone, MapPin, Briefcase, FileCheck, Info, ExternalLink } from 'lucide-react'
import { formatDate } from '@/lib/utils'
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
  grades?: any[]
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
        .select('student_id, entity_id, external_entities(id, name)')
        .in('student_id', enrolledStudentIds)
        .eq('is_current', true)
      if (error) throw error
      return (data || []) as Array<{
        student_id: string
        entity_id: string
        external_entities: { id: string; name: string } | null
      }>
    },
    enabled: enrolledStudentIds.length > 0,
  })

  // Grouper par entité : entityId -> { id, name, enrollments }
  const entitiesWithEnrollments = useMemo(() => {
    const byEntityId = new Map<string, { id: string; name: string; enrollments: EnrollmentWithRelations[] }>()
    const studentToEntity = new Map<string | null, { id: string; name: string }>()
    studentEntitiesWithEntity?.forEach((se) => {
      const ent = se.external_entities
      if (ent) studentToEntity.set(se.student_id, { id: se.entity_id, name: ent.name })
    })
    enrollments.forEach((enrollment) => {
      const studentId = enrollment.student_id
      const entity = studentId ? studentToEntity.get(studentId) : null
      const displayName = entity?.name ?? (enrollment.students as any)?.company ?? 'Non rattaché'
      const entityId = entity?.id ?? `name:${displayName}`
      if (!byEntityId.has(entityId)) {
        byEntityId.set(entityId, { id: entity?.id ?? '', name: displayName, enrollments: [] })
      }
      byEntityId.get(entityId)!.enrollments.push(enrollment)
    })
    return Array.from(byEntityId.values())
  }, [enrollments, studentEntitiesWithEntity])

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
                Les entreprises seront listées ici dès qu'elles seront associées aux apprenants inscrits.
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
                      <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                        <Users className="h-4 w-4" />
                        <span>
                          {entity.enrollments.length} apprenant{entity.enrollments.length > 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {entity.id ? (
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
    </motion.div>
  )
}
