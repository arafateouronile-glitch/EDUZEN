'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'
import { useLearnerContext } from '@/lib/contexts/learner-context'
import { createLearnerClient } from '@/lib/supabase/learner-client'
import { GlassCard } from '@/components/ui/glass-card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/toast'
import { motion } from '@/components/ui/motion'
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Edit2,
  Save,
  X,
  Camera,
  Shield,
  Bell,
  Lock,
  Award,
  BookOpen,
  Clock,
} from 'lucide-react'
import { useState } from 'react'
import { formatDate } from '@/lib/utils'

export default function LearnerProfilePage() {
  const { student: studentData, studentId } = useLearnerContext()
  const supabase = useMemo(() => (studentId ? createLearnerClient(studentId) : null), [studentId])
  const queryClient = useQueryClient()
  const { addToast } = useToast()
  const [isEditing, setIsEditing] = useState(false)
  const isLoading = !studentData

  // Formulaire de modification
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    postal_code: '',
    country: '',
    date_of_birth: '',
    bio: '',
  })

  // Initialiser le formulaire
  useState(() => {
    if (studentData) {
      setFormData({
        first_name: studentData.first_name || '',
        last_name: studentData.last_name || '',
        email: studentData.email || '',
        phone: studentData.phone || '',
        address: studentData.address || '',
        city: studentData.city || '',
        postal_code: studentData.postal_code || '',
        country: studentData.country || '',
        date_of_birth: studentData.date_of_birth || '',
        bio: (studentData as any).bio || '',
      })
    }
  })

  // Récupérer les stats
  const { data: stats } = useQuery({
    queryKey: ['learner-profile-stats', studentData?.id],
    queryFn: async () => {
      if (!studentData?.id) return null
      
      if (!supabase) return { enrollments: 0, courses: 0, certificates: 0 }
      const [enrollments, courses, certificates] = await Promise.all([
        supabase
          .from('enrollments')
          .select('id, status')
          .eq('student_id', studentData.id),
        // Table course_enrollments n'existe peut-être pas
        Promise.resolve({ data: [], error: null }),
        supabase
          .from('course_certificates')
          .select('id')
          .eq('student_id', studentData.id),
      ])
      
      return {
        totalSessions: enrollments.data?.length || 0,
        completedSessions: enrollments.data?.filter((e: any) => e.status === 'completed').length || 0,
        totalCourses: courses.data?.length || 0,
        completedCourses: courses.data?.filter((e: any) => e.status === 'completed').length || 0,
        certificates: certificates.data?.length || 0,
      }
    },
    enabled: !!studentData?.id,
  })

  // Mutation pour mettre à jour le profil
  const updateProfileMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (!studentData?.id) throw new Error('Student not found')
      if (!supabase) throw new Error('Supabase client not available')
      
      const { error } = await supabase
        .from('students')
        .update({
          first_name: data.first_name,
          last_name: data.last_name,
          phone: data.phone,
          address: data.address,
          city: data.city,
          postal_code: data.postal_code,
          country: data.country,
          date_of_birth: data.date_of_birth || null,
          bio: data.bio,
        })
        .eq('id', studentData.id)
      
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['learner-profile'] })
      setIsEditing(false)
      addToast({
        type: 'success',
        title: 'Profil mis à jour',
        description: 'Vos informations ont été enregistrées.',
      })
    },
    onError: (error) => {
      addToast({
        type: 'error',
        title: 'Erreur',
        description: 'Impossible de mettre à jour le profil.',
      })
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    updateProfileMutation.mutate(formData)
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-48 bg-gray-100 rounded-2xl animate-pulse" />
        <div className="h-96 bg-gray-100 rounded-2xl animate-pulse" />
      </div>
    )
  }

  return (
    <motion.div
      className="space-y-6 pb-24 lg:pb-8"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header avec photo Premium */}
      <motion.div variants={itemVariants}>
        <GlassCard variant="premium" className="p-6 md:p-8 relative overflow-hidden">
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-brand-blue/5 via-indigo-50/30 to-purple-50/20" />

          {/* Floating orbs */}
          <motion.div
            animate={{ y: [0, -10, 0], x: [0, 5, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -top-10 -right-10 w-40 h-40 bg-brand-blue/10 rounded-full blur-3xl"
          />
          <motion.div
            animate={{ y: [0, 10, 0], x: [0, -5, 0] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            className="absolute -bottom-10 -left-10 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl"
          />

          <div className="relative flex flex-col md:flex-row items-center gap-6">
            {/* Photo avec ring animé */}
            <div className="relative">
              <motion.div
                className="absolute -inset-1 bg-gradient-to-r from-brand-blue via-indigo-500 to-purple-600 rounded-full opacity-75"
                animate={{ rotate: 360 }}
                transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
              />
              <div className="relative w-24 h-24 md:w-32 md:h-32 rounded-full bg-gradient-to-br from-brand-blue to-indigo-600 flex items-center justify-center text-white text-3xl md:text-4xl font-bold shadow-xl">
                {studentData?.photo_url ? (
                  <img
                    src={studentData.photo_url}
                    alt="Photo"
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <>
                    {studentData?.first_name?.[0]}{studentData?.last_name?.[0]}
                  </>
                )}
              </div>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                className="absolute bottom-0 right-0 p-2.5 bg-white rounded-full shadow-lg hover:bg-gray-50 transition-colors border border-gray-100"
              >
                <Camera className="h-4 w-4 text-brand-blue" />
              </motion.button>
            </div>

            {/* Infos */}
            <div className="text-center md:text-left flex-1">
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                {studentData?.first_name} {studentData?.last_name}
              </h1>
              <p className="text-gray-500 mt-1">
                N° {studentData?.student_number}
              </p>
              {studentData?.email && (
                <p className="text-gray-500 text-sm mt-2 flex items-center justify-center md:justify-start gap-2">
                  <Mail className="h-4 w-4" />
                  {studentData.email}
                </p>
              )}
            </div>

            {/* Actions */}
            <div>
              {!isEditing ? (
                <Button onClick={() => {
                  setFormData({
                    first_name: studentData?.first_name || '',
                    last_name: studentData?.last_name || '',
                    email: studentData?.email || '',
                    phone: studentData?.phone || '',
                    address: studentData?.address || '',
                    city: studentData?.city || '',
                    postal_code: studentData?.postal_code || '',
                    country: studentData?.country || '',
                    date_of_birth: studentData?.date_of_birth || '',
                    bio: (studentData as any).bio || '',
                  })
                  setIsEditing(true)
                }}>
                  <Edit2 className="h-4 w-4 mr-2" />
                  Modifier
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setIsEditing(false)}>
                    <X className="h-4 w-4 mr-2" />
                    Annuler
                  </Button>
                  <Button onClick={handleSubmit} disabled={updateProfileMutation.isPending}>
                    <Save className="h-4 w-4 mr-2" />
                    {updateProfileMutation.isPending ? 'Enregistrement...' : 'Enregistrer'}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </GlassCard>
      </motion.div>

      {/* Stats Premium */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <GlassCard variant="premium" hoverable glow className="p-4 text-center relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-brand-blue/5 to-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <motion.div className="relative" whileHover={{ scale: 1.05 }}>
            <div className="w-10 h-10 mx-auto mb-2 rounded-lg bg-gradient-to-br from-brand-blue/10 to-indigo-500/10 flex items-center justify-center">
              <BookOpen className="h-5 w-5 text-brand-blue" />
            </div>
            <div className="text-2xl font-bold bg-gradient-to-r from-brand-blue to-indigo-500 bg-clip-text text-transparent">{stats?.totalSessions || 0}</div>
            <p className="text-xs text-gray-500 mt-1">Sessions</p>
          </motion.div>
        </GlassCard>

        <GlassCard variant="premium" hoverable glow className="p-4 text-center relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <motion.div className="relative" whileHover={{ scale: 1.05 }}>
            <div className="w-10 h-10 mx-auto mb-2 rounded-lg bg-gradient-to-br from-purple-500/10 to-pink-500/10 flex items-center justify-center">
              <BookOpen className="h-5 w-5 text-purple-600" />
            </div>
            <div className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">{stats?.totalCourses || 0}</div>
            <p className="text-xs text-gray-500 mt-1">Cours</p>
          </motion.div>
        </GlassCard>

        <GlassCard variant="premium" hoverable glow className="p-4 text-center relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-yellow-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <motion.div className="relative" whileHover={{ scale: 1.05 }}>
            <div className="w-10 h-10 mx-auto mb-2 rounded-lg bg-gradient-to-br from-amber-500/10 to-yellow-500/10 flex items-center justify-center">
              <Award className="h-5 w-5 text-amber-600" />
            </div>
            <div className="text-2xl font-bold bg-gradient-to-r from-amber-600 to-yellow-500 bg-clip-text text-transparent">{stats?.certificates || 0}</div>
            <p className="text-xs text-gray-500 mt-1">Certificats</p>
          </motion.div>
        </GlassCard>

        <GlassCard variant="premium" hoverable glow className="p-4 text-center relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <motion.div className="relative" whileHover={{ scale: 1.05 }}>
            <div className="w-10 h-10 mx-auto mb-2 rounded-lg bg-gradient-to-br from-green-500/10 to-emerald-500/10 flex items-center justify-center">
              <Clock className="h-5 w-5 text-green-600" />
            </div>
            <div className="text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-500 bg-clip-text text-transparent">{stats?.completedSessions || 0}</div>
            <p className="text-xs text-gray-500 mt-1">Terminées</p>
          </motion.div>
        </GlassCard>

        <GlassCard variant="premium" hoverable glow className="p-4 text-center relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <motion.div className="relative" whileHover={{ scale: 1.05 }}>
            <div className="w-10 h-10 mx-auto mb-2 rounded-lg bg-gradient-to-br from-blue-500/10 to-cyan-500/10 flex items-center justify-center">
              <Calendar className="h-5 w-5 text-blue-600" />
            </div>
            <div className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
              {studentData?.created_at ? formatDate(studentData.created_at).split('/')[2] : '-'}
            </div>
            <p className="text-xs text-gray-500 mt-1">Membre depuis</p>
          </motion.div>
        </GlassCard>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Informations personnelles */}
        <motion.div variants={itemVariants} className="lg:col-span-2">
          <GlassCard className="p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
              <User className="h-5 w-5 text-brand-blue" />
              Informations personnelles
            </h2>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label>Prénom</Label>
                  <Input
                    value={isEditing ? formData.first_name : studentData?.first_name || ''}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    disabled={!isEditing}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Nom</Label>
                  <Input
                    value={isEditing ? formData.last_name : studentData?.last_name || ''}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    disabled={!isEditing}
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={studentData?.email || ''}
                    disabled
                    className="mt-1 bg-gray-50"
                  />
                  <p className="text-xs text-gray-500 mt-1">L'email ne peut pas être modifié</p>
                </div>
                <div>
                  <Label>Téléphone</Label>
                  <Input
                    value={isEditing ? formData.phone : studentData?.phone || ''}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    disabled={!isEditing}
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <Label>Date de naissance</Label>
                <Input
                  type="date"
                  value={isEditing ? formData.date_of_birth : studentData?.date_of_birth || ''}
                  onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                  disabled={!isEditing}
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Adresse</Label>
                <Input
                  value={isEditing ? formData.address : studentData?.address || ''}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  disabled={!isEditing}
                  className="mt-1"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <Label>Ville</Label>
                  <Input
                    value={isEditing ? formData.city : studentData?.city || ''}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    disabled={!isEditing}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Code postal</Label>
                  <Input
                    value={isEditing ? formData.postal_code : studentData?.postal_code || ''}
                    onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                    disabled={!isEditing}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Pays</Label>
                  <Input
                    value={isEditing ? formData.country : studentData?.country || ''}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    disabled={!isEditing}
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <Label>Bio / À propos</Label>
                <Textarea
                  value={isEditing ? formData.bio : (studentData as any)?.bio || ''}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  disabled={!isEditing}
                  className="mt-1"
                  rows={4}
                  placeholder="Parlez-nous de vous..."
                />
              </div>
            </form>
          </GlassCard>
        </motion.div>

        {/* Paramètres rapides */}
        <motion.div variants={itemVariants} className="space-y-4">
          <GlassCard className="p-6">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Shield className="h-5 w-5 text-brand-blue" />
              Sécurité
            </h3>
            <div className="space-y-3">
              <Button variant="outline" className="w-full justify-start">
                <Lock className="h-4 w-4 mr-2" />
                Changer le mot de passe
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Shield className="h-4 w-4 mr-2" />
                Authentification 2FA
              </Button>
            </div>
          </GlassCard>

          <GlassCard className="p-6">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Bell className="h-5 w-5 text-brand-blue" />
              Notifications
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Emails de rappel</span>
                <input type="checkbox" defaultChecked className="rounded" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Notifications push</span>
                <input type="checkbox" defaultChecked className="rounded" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Résumé hebdomadaire</span>
                <input type="checkbox" className="rounded" />
              </div>
            </div>
          </GlassCard>
        </motion.div>
      </div>
    </motion.div>
  )
}


