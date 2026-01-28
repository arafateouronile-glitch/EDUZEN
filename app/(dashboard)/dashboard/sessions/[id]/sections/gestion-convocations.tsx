'use client'

import { useState } from 'react'
import { CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { GlassCard } from '@/components/ui/glass-card'
import { Download, Mail, UserPlus, X, FileText, CheckCircle, AlertCircle, Trash2, Clock, Send, Eye } from 'lucide-react'
import { formatDate, formatCurrency, cn } from '@/lib/utils'
import { useDocumentGeneration } from '../hooks/use-document-generation'
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
import type { 
  SessionWithRelations, 
  EnrollmentWithRelations,
  FormationWithRelations,
  StudentWithRelations
} from '@/lib/types/query-types'
import type { TableRow } from '@/lib/types/supabase-helpers'
import { motion, AnimatePresence } from 'framer-motion'
import { Badge } from '@/components/ui/badge'
import Image from 'next/image'

type Program = TableRow<'programs'>
type Organization = TableRow<'organizations'>
type Enrollment = TableRow<'enrollments'>

interface GestionConvocationsProps {
  sessionId: string
  sessionData: SessionWithRelations | undefined
  formation: FormationWithRelations | null | undefined
  program: Program | null | undefined
  organization: Organization | undefined
  enrollments?: EnrollmentWithRelations[]
  students?: StudentWithRelations[]
  showEnrollmentForm: boolean
  enrollmentForm: {
    student_id: string
    enrollment_date: string
    status: Enrollment['status']
    payment_status: Enrollment['payment_status']
    total_amount: string
    paid_amount: string
  }
  onEnrollmentFormChange: (form: GestionConvocationsProps['enrollmentForm']) => void
  onCreateEnrollment: () => void
  createEnrollmentMutation: {
    isPending: boolean
    error: Error | null
  }
  cancelEnrollmentMutation: {
    mutate: (enrollmentId: string) => void
    isPending: boolean
    error: Error | null
  }
  onCloseEnrollmentForm: () => void
  onShowEnrollmentForm: () => void
  isGeneratingZip?: boolean
  zipGenerationProgress?: { current: number; total: number }
  lastZipGeneration?: Date | null
}

export function GestionConvocations({
  sessionId,
  sessionData,
  formation,
  program,
  organization,
  enrollments = [],
  students = [],
  showEnrollmentForm,
  enrollmentForm,
  onEnrollmentFormChange,
  onCreateEnrollment,
  createEnrollmentMutation,
  cancelEnrollmentMutation,
  onCloseEnrollmentForm,
  onShowEnrollmentForm,
  isGeneratingZip = false,
  zipGenerationProgress = { current: 0, total: 0 },
  lastZipGeneration = null,
}: GestionConvocationsProps) {
  const {
    handleGenerateConvocation,
    handleGenerateAllConvocationsZip,
    handleSendConvocationByEmail,
    handleSendConvocationByEmailWithCustomContent,
    handleSendAllConvocationsByEmail,
    prepareConvocationEmail,
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
      {/* Formulaire d'inscription */}
      <AnimatePresence>
        {showEnrollmentForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <GlassCard variant="default" className="p-6 border-brand-blue/20 shadow-lg shadow-brand-blue/5">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-brand-blue/10 rounded-lg text-brand-blue">
                    <UserPlus className="h-5 w-5" />
                  </div>
                  <h3 className="font-bold text-gray-900">Inscrire un apprenant</h3>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onCloseEnrollmentForm}
                  className="rounded-full hover:bg-gray-100"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  onCreateEnrollment()
                }}
                className="space-y-6"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700">Élève *</label>
                    <div className="relative">
                      <select
                        value={enrollmentForm.student_id}
                        onChange={(e) => onEnrollmentFormChange({ ...enrollmentForm, student_id: e.target.value })}
                        className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all appearance-none"
                        required
                      >
                        <option value="">Sélectionner un élève</option>
                        {students.map((student) => (
                          <option key={student.id} value={student.id}>
                            {student.first_name} {student.last_name} ({student.student_number})
                          </option>
                        ))}
                      </select>
                      <div className="absolute right-3 top-3 pointer-events-none text-gray-400">
                        <UserPlus className="h-4 w-4" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700">Date d'inscription *</label>
                    <input
                      type="date"
                      value={enrollmentForm.enrollment_date}
                      onChange={(e) => onEnrollmentFormChange({ ...enrollmentForm, enrollment_date: e.target.value })}
                      className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700">Statut *</label>
                    <select
                      value={enrollmentForm.status || 'pending'}
                      onChange={(e) => onEnrollmentFormChange({ ...enrollmentForm, status: e.target.value as Enrollment['status'] })}
                      className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all"
                    >
                      <option value="pending">En attente</option>
                      <option value="confirmed">Confirmée</option>
                      <option value="completed">Terminée</option>
                      <option value="cancelled">Annulée</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700">Statut de paiement *</label>
                    <select
                      value={enrollmentForm.payment_status || 'pending'}
                      onChange={(e) => onEnrollmentFormChange({ ...enrollmentForm, payment_status: e.target.value as Enrollment['payment_status'] })}
                      className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all"
                    >
                      <option value="pending">En attente</option>
                      <option value="partial">Partiel</option>
                      <option value="paid">Payé</option>
                      <option value="overdue">En retard</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700">Montant total</label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        value={enrollmentForm.total_amount}
                        onChange={(e) => onEnrollmentFormChange({ ...enrollmentForm, total_amount: e.target.value })}
                        className="w-full pl-4 pr-8 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all"
                        placeholder="0"
                      />
                      <span className="absolute right-3 top-2.5 text-gray-400 font-medium">€</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700">Montant payé</label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        value={enrollmentForm.paid_amount}
                        onChange={(e) => onEnrollmentFormChange({ ...enrollmentForm, paid_amount: e.target.value })}
                        className="w-full pl-4 pr-8 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all"
                        placeholder="0"
                      />
                      <span className="absolute right-3 top-2.5 text-gray-400 font-medium">€</span>
                    </div>
                  </div>
                </div>

                {createEnrollmentMutation.error && (
                  <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    {createEnrollmentMutation.error instanceof Error
                      ? createEnrollmentMutation.error.message
                      : 'Une erreur est survenue'}
                  </div>
                )}
                {cancelEnrollmentMutation.error && (
                  <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    {cancelEnrollmentMutation.error instanceof Error
                      ? cancelEnrollmentMutation.error.message
                      : 'Une erreur est survenue lors de l\'annulation'}
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onCloseEnrollmentForm}
                    className="rounded-xl border-gray-200"
                  >
                    Annuler
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createEnrollmentMutation.isPending}
                    className="bg-brand-blue hover:bg-brand-blue-dark text-white rounded-xl shadow-lg shadow-brand-blue/20"
                  >
                    {createEnrollmentMutation.isPending ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                        <span>Inscription...</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <UserPlus className="h-4 w-4" />
                        <span>Inscrire</span>
                      </div>
                    )}
                  </Button>
                </div>
              </form>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Génération et envoi des convocations */}
      <motion.div variants={itemVariants}>
        <GlassCard variant="premium" className="p-8 overflow-hidden relative">
          {/* Background decoration */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-brand-cyan/5 rounded-full blur-3xl -z-10" />
          
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-gradient-to-br from-brand-cyan to-brand-blue rounded-xl shadow-lg shadow-brand-cyan/20">
              <Mail className="h-6 w-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold text-gray-900">Génération et envoi des convocations</CardTitle>
              <p className="text-sm text-gray-500 font-medium">Gérez les convocations pour tous les apprenants inscrits</p>
            </div>
          </div>

          <div className="space-y-6">
            {/* Génération globale */}
            <motion.div 
              className="relative overflow-hidden rounded-2xl border border-cyan-100 bg-gradient-to-br from-cyan-50/80 to-blue-50/80 p-6 shadow-sm"
              whileHover={{ scale: 1.01 }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-white rounded-xl shadow-sm text-cyan-600">
                    <Mail className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-cyan-900 text-lg">Actions groupées</h4>
                    <p className="text-sm text-cyan-700 font-medium mt-1">
                      Générez ou envoyez toutes les convocations en une seule fois
                    </p>
                    {lastZipGeneration && (
                      <div className="flex items-center gap-2 mt-2 text-xs text-cyan-600 font-medium bg-cyan-100/50 px-2 py-1 rounded-md w-fit">
                        <Clock className="h-3 w-3" />
                        Dernière génération : {formatDate(lastZipGeneration.toISOString())}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="bg-white border-cyan-200 text-cyan-700 hover:bg-cyan-50 hover:text-cyan-800"
                    onClick={() => handleGenerateAllConvocationsZip(enrollments)}
                    disabled={isGeneratingZip || enrollments.length === 0}
                  >
                    {isGeneratingZip ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-cyan-600 border-t-transparent" />
                        <span>Génération...</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Download className="h-4 w-4" />
                        <span>ZIP Convocations</span>
                      </div>
                    )}
                  </Button>
                  <Button
                    className="bg-cyan-600 hover:bg-cyan-700 text-white shadow-lg shadow-cyan-200 hover:shadow-cyan-300 transition-all duration-300"
                    onClick={() => handleSendAllConvocationsByEmail(enrollments)}
                    disabled={enrollments.length === 0}
                  >
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      <span>Envoyer à tous</span>
                    </div>
                  </Button>
                </div>
              </div>

              {isGeneratingZip && (
                <div className="mt-6 space-y-2">
                  <div className="flex justify-between text-xs font-bold text-cyan-800 uppercase tracking-wide">
                    <span>Progression</span>
                    <span>{Math.round((zipGenerationProgress.current / zipGenerationProgress.total) * 100)}%</span>
                  </div>
                  <div className="w-full bg-cyan-200/50 rounded-full h-2 overflow-hidden">
                    <motion.div
                      className="bg-cyan-600 h-full rounded-full"
                      initial={{ width: 0 }}
                      animate={{ 
                        width: `${zipGenerationProgress.total > 0
                          ? (zipGenerationProgress.current / zipGenerationProgress.total) * 100
                          : 0}%` 
                      }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                  <p className="text-xs text-cyan-600 text-center font-medium">
                    Traitement de la convocation {zipGenerationProgress.current} sur {zipGenerationProgress.total}
                  </p>
                </div>
              )}
            </motion.div>

            {/* Liste des apprenants */}
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                <h4 className="font-bold text-gray-900 uppercase tracking-wide text-sm flex items-center gap-2">
                  <UserPlus className="h-4 w-4 text-brand-blue" />
                  Apprenants inscrits ({enrollments.length})
                </h4>
                {!showEnrollmentForm && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={onShowEnrollmentForm}
                    className="text-brand-blue hover:text-brand-blue-dark hover:bg-brand-blue/10 font-medium"
                  >
                    <UserPlus className="mr-2 h-4 w-4" />
                    Ajouter
                  </Button>
                )}
              </div>

              {enrollments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-4 border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50/50">
                  <div className="p-4 bg-white rounded-full shadow-sm mb-4">
                    <UserPlus className="h-8 w-8 text-gray-400" />
                  </div>
                  <p className="text-gray-900 font-bold text-lg mb-1">Aucun apprenant inscrit</p>
                  <p className="text-gray-500 text-sm text-center max-w-sm mb-6">
                    Inscrivez des apprenants pour générer et envoyer leurs convocations.
                  </p>
                  <Button
                    onClick={onShowEnrollmentForm}
                    className="bg-brand-blue hover:bg-brand-blue-dark text-white shadow-lg shadow-brand-blue/20"
                  >
                    <UserPlus className="mr-2 h-4 w-4" />
                    Inscrire un apprenant
                  </Button>
                </div>
              ) : (
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
                        <div className="flex items-center gap-4 flex-1">
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
                              <div className="w-full h-full rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center ring-2 ring-white shadow-sm">
                                <span className="text-sm font-bold text-gray-600">
                                  {student.first_name?.[0]}{student.last_name?.[0]}
                                </span>
                              </div>
                            )}
                            <div className={`absolute -bottom-1 -right-1 border-2 border-white w-4 h-4 rounded-full ${
                              enrollment.status === 'confirmed' ? 'bg-green-500' :
                              enrollment.status === 'completed' ? 'bg-blue-500' :
                              enrollment.status === 'cancelled' ? 'bg-red-500' : 'bg-gray-400'
                            }`} />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-gray-900">{student.first_name} {student.last_name}</p>
                              {student.email && (
                                <span className="text-xs text-gray-400 font-normal hidden sm:inline-block">• {student.email}</span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="secondary" className={cn(
                                "text-[10px] px-1.5 py-0 h-5 border",
                                enrollment.status === 'confirmed' ? 'bg-green-50 text-green-700 border-green-200' :
                                enrollment.status === 'completed' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                enrollment.status === 'cancelled' ? 'bg-red-50 text-red-700 border-red-200' :
                                'bg-gray-50 text-gray-700 border-gray-200'
                              )}>
                                {enrollment.status === 'confirmed' ? 'Confirmé' :
                                 enrollment.status === 'completed' ? 'Terminé' :
                                 enrollment.status === 'cancelled' ? 'Annulé' : 'En attente'}
                              </Badge>
                              <Badge variant="secondary" className={cn(
                                "text-[10px] px-1.5 py-0 h-5 border",
                                enrollment.payment_status === 'paid' ? 'bg-green-50 text-green-700 border-green-200' :
                                enrollment.payment_status === 'partial' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                enrollment.payment_status === 'overdue' ? 'bg-red-50 text-red-700 border-red-200' :
                                'bg-gray-50 text-gray-700 border-gray-200'
                              )}>
                                {enrollment.payment_status === 'paid' ? 'Payé' :
                                 enrollment.payment_status === 'partial' ? 'Partiel' :
                                 enrollment.payment_status === 'overdue' ? 'En retard' : 'En attente'}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          {enrollment.status !== 'cancelled' && (
                            <>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => handleGenerateConvocation(enrollment)}
                                className="h-9 w-9 p-0 rounded-full hover:bg-brand-blue/10 hover:text-brand-blue transition-colors"
                                title="Télécharger la convocation"
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  const emailData = prepareConvocationEmail(enrollment)
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
                            </>
                          )}
                          {enrollment.status !== 'cancelled' && enrollment.status !== 'completed' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                if (confirm(`Êtes-vous sûr de vouloir annuler l'inscription de ${student.first_name} ${student.last_name} ?`)) {
                                  cancelEnrollmentMutation.mutate(enrollment.id)
                                }
                              }}
                              disabled={cancelEnrollmentMutation.isPending}
                              className="h-9 w-9 p-0 rounded-full hover:bg-red-50 hover:text-red-600 transition-colors"
                              title="Annuler l'inscription"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              )}
            </div>
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
                Personnalisez le message avant l'envoi de la convocation à l'apprenant.
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
                    La convocation sera automatiquement jointe au format PDF.
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
                  
                  await handleSendConvocationByEmailWithCustomContent(
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
    </motion.div>
  )
}
