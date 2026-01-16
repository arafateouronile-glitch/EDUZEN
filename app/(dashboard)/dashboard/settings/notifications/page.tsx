'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/lib/hooks/use-auth'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { GlassCard } from '@/components/ui/glass-card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/toast'
import { RoleGuard, ADMIN_ROLES } from '@/components/auth/role-guard'
import { motion } from '@/components/ui/motion'
import { 
  Bell, 
  Mail, 
  MessageSquare, 
  Phone, 
  Clock, 
  Save, 
  RefreshCw,
  Crown,
  CheckCircle2,
  AlertTriangle,
  Settings,
  Send,
  CalendarCheck
} from 'lucide-react'
import Link from 'next/link'

type NotificationSettings = {
  reminder_enabled: boolean
  reminder_hours_before: number
  email_enabled: boolean
  whatsapp_enabled: boolean
  sms_enabled: boolean
  whatsapp?: {
    account_sid?: string
    auth_token?: string
    from_number?: string
  }
}

export default function NotificationsSettingsPage() {
  const { user } = useAuth()
  const supabase = createClient()
  const queryClient = useQueryClient()
  const { addToast } = useToast()
  const [isSaving, setIsSaving] = useState(false)

  const [settings, setSettings] = useState<NotificationSettings>({
    reminder_enabled: true,
    reminder_hours_before: 24,
    email_enabled: true,
    whatsapp_enabled: false,
    sms_enabled: false,
  })

  const [whatsappConfig, setWhatsappConfig] = useState({
    account_sid: '',
    auth_token: '',
    from_number: '',
  })

  // Récupérer les paramètres de l'organisation
  const { data: organization, isLoading } = useQuery({
    queryKey: ['organization-settings', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return null
      const { data, error } = await supabase
        .from('organizations')
        .select('id, name, settings, subscription_tier')
        .eq('id', user.organization_id)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!user?.organization_id,
  })

  const isPremium = ['premium', 'enterprise'].includes(organization?.subscription_tier || '')

  // Charger les paramètres existants
  useEffect(() => {
    if (organization?.settings) {
      const orgSettings = organization.settings as any
      const notifications = orgSettings.notifications || {}
      
      setSettings({
        reminder_enabled: notifications.reminder_enabled !== false,
        reminder_hours_before: notifications.reminder_hours_before || 24,
        email_enabled: notifications.email_enabled !== false,
        whatsapp_enabled: notifications.whatsapp_enabled || false,
        sms_enabled: notifications.sms_enabled || false,
      })

      if (orgSettings.whatsapp) {
        setWhatsappConfig({
          account_sid: orgSettings.whatsapp.account_sid || '',
          auth_token: orgSettings.whatsapp.auth_token ? '••••••••' : '',
          from_number: orgSettings.whatsapp.from_number || '',
        })
      }
    }
  }, [organization])

  // Mutation pour sauvegarder
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!user?.organization_id) throw new Error('Organization non trouvée')

      const currentSettings = (organization?.settings as any) || {}
      
      const newSettings = {
        ...currentSettings,
        notifications: {
          ...settings,
        },
      }

      // Ajouter la config WhatsApp si remplie
      if (whatsappConfig.account_sid && whatsappConfig.auth_token !== '••••••••') {
        newSettings.whatsapp = {
          account_sid: whatsappConfig.account_sid,
          auth_token: whatsappConfig.auth_token,
          from_number: whatsappConfig.from_number,
        }
      } else if (whatsappConfig.account_sid && whatsappConfig.auth_token === '••••••••') {
        // Garder l'ancien token si non modifié
        newSettings.whatsapp = {
          ...currentSettings.whatsapp,
          account_sid: whatsappConfig.account_sid,
          from_number: whatsappConfig.from_number,
        }
      }

      const { error } = await supabase
        .from('organizations')
        .update({ settings: newSettings })
        .eq('id', user.organization_id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-settings'] })
      addToast({
        type: 'success',
        title: 'Succès',
        description: 'Paramètres de notifications sauvegardés',
      })
    },
    onError: (error) => {
      addToast({
        type: 'error',
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Erreur lors de la sauvegarde',
      })
    },
  })

  const handleSave = () => {
    setIsSaving(true)
    saveMutation.mutate(undefined, {
      onSettled: () => setIsSaving(false),
    })
  }

  // Récupérer les notifications récentes
  const { data: recentNotifications } = useQuery({
    queryKey: ['recent-notifications', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return []
      const { data } = await supabase
        .from('scheduled_notifications')
        .select('*')
        .eq('organization_id', user.organization_id)
        .order('created_at', { ascending: false })
        .limit(10)
      return data || []
    },
    enabled: !!user?.organization_id,
  })

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
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="h-8 w-8 animate-spin text-brand-blue" />
      </div>
    )
  }

  return (
    <RoleGuard allowedRoles={ADMIN_ROLES}>
      <motion.div
        className="container mx-auto py-8 px-4 max-w-4xl space-y-8"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Header */}
        <motion.div variants={itemVariants}>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-brand-blue/10 rounded-xl">
              <Bell className="h-8 w-8 text-brand-blue" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                Notifications automatiques
              </h1>
              <p className="text-gray-500">
                Configurez les rappels et notifications pour vos enseignants et apprenants
              </p>
            </div>
          </div>
        </motion.div>

        {/* Bannière Premium */}
        {!isPremium && (
          <motion.div variants={itemVariants}>
            <GlassCard className="p-6 bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-amber-100 rounded-xl">
                  <Crown className="h-6 w-6 text-amber-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-amber-900 mb-1">
                    Fonctionnalité Premium
                  </h3>
                  <p className="text-amber-700 text-sm mb-3">
                    Les notifications WhatsApp sont disponibles uniquement avec un abonnement Premium ou Enterprise.
                    Les rappels par email restent disponibles pour tous.
                  </p>
                  <Button size="sm" className="bg-amber-600 hover:bg-amber-700">
                    <Crown className="h-4 w-4 mr-2" />
                    Passer à Premium
                  </Button>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Paramètres généraux */}
          <motion.div variants={itemVariants}>
            <GlassCard className="p-6">
              <div className="flex items-center gap-2 mb-6">
                <CalendarCheck className="h-5 w-5 text-brand-blue" />
                <h2 className="text-lg font-bold text-gray-900">Rappels de sessions</h2>
              </div>

              <div className="space-y-6">
                {/* Activer les rappels */}
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base font-medium">Rappels automatiques</Label>
                    <p className="text-sm text-gray-500">
                      Envoyer des rappels avant chaque session
                    </p>
                  </div>
                  <Switch
                    checked={settings.reminder_enabled}
                    onCheckedChange={(checked) => 
                      setSettings({ ...settings, reminder_enabled: checked })
                    }
                  />
                </div>

                {/* Délai avant rappel */}
                <div>
                  <Label htmlFor="reminder_hours">Délai avant la session</Label>
                  <div className="flex items-center gap-2 mt-2">
                    <Input
                      id="reminder_hours"
                      type="number"
                      min={1}
                      max={72}
                      value={settings.reminder_hours_before}
                      onChange={(e) => 
                        setSettings({ 
                          ...settings, 
                          reminder_hours_before: parseInt(e.target.value) || 24 
                        })
                      }
                      className="w-24"
                      disabled={!settings.reminder_enabled}
                    />
                    <span className="text-gray-500">heures avant</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    Par défaut : 24h (la veille)
                  </p>
                </div>

                {/* Canaux de notification */}
                <div className="space-y-4 pt-4 border-t">
                  <Label className="text-base font-medium">Canaux de notification</Label>
                  
                  {/* Email */}
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Mail className="h-5 w-5 text-blue-600" />
                      <div>
                        <span className="font-medium">Email</span>
                        <Badge variant="outline" className="ml-2 text-xs">Inclus</Badge>
                      </div>
                    </div>
                    <Switch
                      checked={settings.email_enabled}
                      onCheckedChange={(checked) => 
                        setSettings({ ...settings, email_enabled: checked })
                      }
                      disabled={!settings.reminder_enabled}
                    />
                  </div>

                  {/* WhatsApp */}
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <MessageSquare className="h-5 w-5 text-green-600" />
                      <div>
                        <span className="font-medium">WhatsApp</span>
                        <Badge className="ml-2 text-xs bg-amber-100 text-amber-700">Premium</Badge>
                      </div>
                    </div>
                    <Switch
                      checked={settings.whatsapp_enabled}
                      onCheckedChange={(checked) => 
                        setSettings({ ...settings, whatsapp_enabled: checked })
                      }
                      disabled={!isPremium || !settings.reminder_enabled}
                    />
                  </div>

                  {/* SMS */}
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg opacity-50">
                    <div className="flex items-center gap-3">
                      <Phone className="h-5 w-5 text-purple-600" />
                      <div>
                        <span className="font-medium">SMS</span>
                        <Badge variant="outline" className="ml-2 text-xs">Bientôt</Badge>
                      </div>
                    </div>
                    <Switch
                      checked={false}
                      disabled
                    />
                  </div>
                </div>
              </div>
            </GlassCard>
          </motion.div>

          {/* Configuration WhatsApp */}
          <motion.div variants={itemVariants}>
            <GlassCard className={`p-6 ${!isPremium ? 'opacity-60' : ''}`}>
              <div className="flex items-center gap-2 mb-6">
                <MessageSquare className="h-5 w-5 text-green-600" />
                <h2 className="text-lg font-bold text-gray-900">Configuration WhatsApp</h2>
                {!isPremium && (
                  <Badge className="bg-amber-100 text-amber-700">Premium requis</Badge>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="account_sid">Account SID (Twilio)</Label>
                  <Input
                    id="account_sid"
                    type="text"
                    value={whatsappConfig.account_sid}
                    onChange={(e) => 
                      setWhatsappConfig({ ...whatsappConfig, account_sid: e.target.value })
                    }
                    placeholder="AC..."
                    disabled={!isPremium}
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="auth_token">Auth Token</Label>
                  <Input
                    id="auth_token"
                    type="password"
                    value={whatsappConfig.auth_token}
                    onChange={(e) => 
                      setWhatsappConfig({ ...whatsappConfig, auth_token: e.target.value })
                    }
                    placeholder="••••••••"
                    disabled={!isPremium}
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="from_number">Numéro WhatsApp</Label>
                  <Input
                    id="from_number"
                    type="text"
                    value={whatsappConfig.from_number}
                    onChange={(e) => 
                      setWhatsappConfig({ ...whatsappConfig, from_number: e.target.value })
                    }
                    placeholder="+14155238886"
                    disabled={!isPremium}
                    className="mt-2"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Numéro WhatsApp Business configuré dans Twilio
                  </p>
                </div>

                <div className="pt-4 border-t">
                  <p className="text-sm text-gray-600 mb-3">
                    Pour configurer WhatsApp, vous avez besoin d'un compte{' '}
                    <a 
                      href="https://www.twilio.com/whatsapp" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-brand-blue hover:underline"
                    >
                      Twilio WhatsApp Business
                    </a>
                  </p>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        </div>

        {/* Notifications récentes */}
        <motion.div variants={itemVariants}>
          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Send className="h-5 w-5 text-brand-blue" />
                <h2 className="text-lg font-bold text-gray-900">Notifications récentes</h2>
              </div>
              <Badge variant="outline">
                {recentNotifications?.length || 0} notifications
              </Badge>
            </div>

            {recentNotifications && recentNotifications.length > 0 ? (
              <div className="space-y-3">
                {recentNotifications.map((notif: any) => (
                  <div 
                    key={notif.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      {notif.type === 'email' ? (
                        <Mail className="h-4 w-4 text-blue-600" />
                      ) : notif.type === 'whatsapp' ? (
                        <MessageSquare className="h-4 w-4 text-green-600" />
                      ) : (
                        <Phone className="h-4 w-4 text-purple-600" />
                      )}
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {(notif.metadata as any)?.recipient_name || 'Destinataire'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {notif.subject || notif.message?.substring(0, 50)}...
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {notif.status === 'sent' ? (
                        <Badge className="bg-green-100 text-green-700">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Envoyé
                        </Badge>
                      ) : notif.status === 'failed' ? (
                        <Badge className="bg-red-100 text-red-700">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Échoué
                        </Badge>
                      ) : (
                        <Badge className="bg-amber-100 text-amber-700">
                          <Clock className="h-3 w-3 mr-1" />
                          En attente
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Bell className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">Aucune notification envoyée</p>
              </div>
            )}
          </GlassCard>
        </motion.div>

        {/* Bouton de sauvegarde */}
        <motion.div variants={itemVariants} className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={isSaving}
            size="lg"
            className="shadow-lg shadow-brand-blue/25"
          >
            {isSaving ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Sauvegarde...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Sauvegarder les paramètres
              </>
            )}
          </Button>
        </motion.div>
      </motion.div>
    </RoleGuard>
  )
}

