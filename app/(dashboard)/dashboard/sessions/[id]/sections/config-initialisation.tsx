'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import type { SessionFormData } from '../hooks/use-session-detail'
import type { TableRow } from '@/lib/types/supabase-helpers'
import { Info, Briefcase, User, Users, Clock, Sparkles, Building2, Globe2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

type User = TableRow<'users'>

interface ConfigInitialisationProps {
  formData: SessionFormData
  onFormDataChange: (data: SessionFormData) => void
  users?: User[]
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] } }
}

export function ConfigInitialisation({
  formData,
  onFormDataChange,
  users = [],
}: ConfigInitialisationProps) {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-5"
    >
      {/* Section 1: Identité de la session */}
      <motion.div variants={itemVariants}>
        <Card className="relative border-0 shadow-lg shadow-slate-200/50 bg-white overflow-hidden rounded-2xl">
          {/* Decorative gradient bar */}
          <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-brand-blue via-brand-blue to-brand-cyan rounded-l-2xl" />
          {/* Background decoration */}
          <div className="absolute top-0 right-0 w-72 h-72 bg-gradient-to-br from-brand-blue/[0.03] to-transparent rounded-full blur-3xl -mr-36 -mt-36 pointer-events-none" />

          <CardHeader className="pb-2 pt-6 px-7">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-blue to-brand-blue-dark flex items-center justify-center shadow-lg shadow-brand-blue/25">
                <Info className="w-5 h-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg font-display font-bold tracking-tight text-gray-900">
                  Identité de la session
                </CardTitle>
                <CardDescription className="text-sm text-gray-500 mt-0.5">
                  Les informations de base pour identifier cette session
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5 pt-2 px-7 pb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-2.5">
              <Label htmlFor="session-name" className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                Nom de la session <span className="text-red-500">*</span>
              </Label>
              <Input
                id="session-name"
                value={formData.name}
                onChange={(e) => onFormDataChange({ ...formData, name: e.target.value })}
                placeholder="Ex: Formation SST - Janvier 2026"
                className="h-12 bg-slate-50/50 border-slate-200 rounded-xl focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10 focus:bg-white transition-all placeholder:text-gray-400"
              />
            </div>
            <div className="space-y-2.5">
              <Label htmlFor="internal-code" className="text-sm font-semibold text-gray-700">
                Code interne
              </Label>
              <Input
                id="internal-code"
                value={formData.code}
                onChange={(e) => onFormDataChange({ ...formData, code: e.target.value })}
                placeholder="Ex: AF8169200811"
                className="h-12 bg-slate-50/50 border-slate-200 rounded-xl focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10 focus:bg-white transition-all font-mono placeholder:font-sans placeholder:text-gray-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-2.5">
              <Label htmlFor="session-type" className="text-sm font-semibold text-gray-700">
                Type de session
              </Label>
              <Select
                value={formData.type}
                onValueChange={(value) => onFormDataChange({ ...formData, type: value })}
              >
                <SelectTrigger id="session-type" className="h-12 bg-slate-50/50 border-slate-200 rounded-xl hover:bg-slate-100/50 transition-colors">
                  <SelectValue placeholder="Sélectionner un type" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="formation_professionnelle">Formation professionnelle</SelectItem>
                  <SelectItem value="stage">Stage</SelectItem>
                  <SelectItem value="cours">Cours</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2.5">
              <Label htmlFor="timezone" className="text-sm font-semibold text-gray-700">
                Fuseau horaire
              </Label>
              <Select
                value={formData.timezone}
                onValueChange={(value) => onFormDataChange({ ...formData, timezone: value })}
              >
                <SelectTrigger id="timezone" className="h-12 bg-slate-50/50 border-slate-200 rounded-xl hover:bg-slate-100/50 transition-colors">
                  <div className="flex items-center gap-2">
                    <Globe2 className="w-4 h-4 text-gray-400" />
                    <SelectValue placeholder="Sélectionner un fuseau" />
                  </div>
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="Europe/Paris">Europe/Paris (UTC+1)</SelectItem>
                  <SelectItem value="Africa/Dakar">Africa/Dakar (UTC+0)</SelectItem>
                  <SelectItem value="Africa/Abidjan">Africa/Abidjan (UTC+0)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
      </motion.div>

      {/* Section 2: Gestion et Responsabilité */}
      <motion.div variants={itemVariants}>
        <Card className="relative border-0 shadow-lg shadow-slate-200/50 bg-white overflow-visible rounded-2xl">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-brand-cyan via-brand-cyan to-emerald-400 rounded-l-2xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-brand-cyan/[0.03] to-transparent rounded-full blur-3xl -ml-32 -mb-32 pointer-events-none" />

          <CardHeader className="pb-2 pt-6 px-7">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-cyan to-emerald-500 flex items-center justify-center shadow-lg shadow-brand-cyan/25">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg font-display font-bold tracking-tight text-gray-900">
                  Gestionnaires
                </CardTitle>
                <CardDescription className="text-sm text-gray-500 mt-0.5">
                  Responsables pédagogiques et administratifs
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5 pt-2 px-7 pb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2.5">
                <Label htmlFor="manager1" className="text-sm font-semibold text-gray-700">
                  Gestionnaire principal
                </Label>
                <Select
                  value={formData.manager1_id}
                  onValueChange={(value) => onFormDataChange({ ...formData, manager1_id: value })}
                >
                  <SelectTrigger id="manager1" className="h-12 bg-slate-50/50 border-slate-200 rounded-xl hover:bg-slate-100/50 transition-colors">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-brand-cyan/10 flex items-center justify-center">
                        <User className="w-3.5 h-3.5 text-brand-cyan" />
                      </div>
                      <SelectValue placeholder="Sélectionner un gestionnaire" />
                    </div>
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {users
                      .filter((u) => u.role === 'admin' || u.role === 'secretary')
                      .map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.full_name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2.5">
                <Label htmlFor="manager2" className="text-sm font-semibold text-gray-700">
                  Gestionnaire secondaire
                </Label>
                <Select
                  value={formData.manager2_id}
                  onValueChange={(value) => onFormDataChange({ ...formData, manager2_id: value })}
                >
                  <SelectTrigger id="manager2" className="h-12 bg-slate-50/50 border-slate-200 rounded-xl hover:bg-slate-100/50 transition-colors">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center">
                        <User className="w-3.5 h-3.5 text-gray-400" />
                      </div>
                      <SelectValue placeholder="Optionnel" />
                    </div>
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {users
                      .filter((u) => u.role === 'admin' || u.role === 'secretary')
                      .map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.full_name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Section 3: Modalités */}
      <motion.div variants={itemVariants}>
        <Card className="relative border-0 shadow-lg shadow-slate-200/50 bg-white overflow-visible rounded-2xl">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-violet-500 via-purple-500 to-fuchsia-500 rounded-l-2xl pointer-events-none" />
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-violet-500/[0.03] to-transparent rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />

          <CardHeader className="pb-2 pt-6 px-7">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/25">
                <Briefcase className="w-5 h-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg font-display font-bold tracking-tight text-gray-900">
                  Modalités d'organisation
                </CardTitle>
                <CardDescription className="text-sm text-gray-500 mt-0.5">
                  Contexte et mode d'organisation de la session
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-2 px-7 pb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <motion.div
                whileHover={{ scale: 1.01, y: -2 }}
                transition={{ duration: 0.2 }}
                className={cn(
                  "relative flex flex-row items-start gap-4 rounded-2xl border-2 p-5 transition-all cursor-pointer group",
                  formData.inter_entreprise
                    ? "border-brand-blue bg-brand-blue/[0.02] shadow-md shadow-brand-blue/10"
                    : "border-slate-100 bg-slate-50/30 hover:border-slate-200 hover:bg-white"
                )}
                onClick={() => onFormDataChange({ ...formData, inter_entreprise: !formData.inter_entreprise })}
              >
                {formData.inter_entreprise && (
                  <div className="absolute top-3 right-3">
                    <div className="w-2 h-2 rounded-full bg-brand-blue animate-pulse" />
                  </div>
                )}
                <Switch
                  checked={formData.inter_entreprise}
                  onCheckedChange={(checked) => onFormDataChange({ ...formData, inter_entreprise: checked })}
                  className="mt-0.5"
                />
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Building2 className={cn(
                      "w-4 h-4 transition-colors",
                      formData.inter_entreprise ? "text-brand-blue" : "text-gray-400"
                    )} />
                    <Label className="text-base font-bold text-gray-900 cursor-pointer">Inter-entreprises</Label>
                  </div>
                  <p className="text-sm text-gray-500 leading-relaxed">
                    Session ouverte aux apprenants de plusieurs entreprises différentes.
                  </p>
                </div>
              </motion.div>

              <motion.div
                whileHover={{ scale: 1.01, y: -2 }}
                transition={{ duration: 0.2 }}
                className={cn(
                  "relative flex flex-row items-start gap-4 rounded-2xl border-2 p-5 transition-all cursor-pointer group",
                  formData.sous_traitance
                    ? "border-violet-500 bg-violet-500/[0.02] shadow-md shadow-violet-500/10"
                    : "border-slate-100 bg-slate-50/30 hover:border-slate-200 hover:bg-white"
                )}
                onClick={() => onFormDataChange({ ...formData, sous_traitance: !formData.sous_traitance })}
              >
                {formData.sous_traitance && (
                  <div className="absolute top-3 right-3">
                    <div className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
                  </div>
                )}
                <Switch
                  checked={formData.sous_traitance}
                  onCheckedChange={(checked) => onFormDataChange({ ...formData, sous_traitance: checked })}
                  className="mt-0.5"
                />
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Sparkles className={cn(
                      "w-4 h-4 transition-colors",
                      formData.sous_traitance ? "text-violet-500" : "text-gray-400"
                    )} />
                    <Label className="text-base font-bold text-gray-900 cursor-pointer">Sous-traitance</Label>
                  </div>
                  <p className="text-sm text-gray-500 leading-relaxed">
                    Session réalisée pour le compte d'un autre organisme de formation.
                  </p>
                </div>
              </motion.div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}
