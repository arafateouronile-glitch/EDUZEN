'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, XCircle, AlertCircle, Clock, Database, Server, Activity, Users, FileText, DollarSign } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import { motion } from '@/components/ui/motion'
import { performanceMonitor } from '@/lib/utils/performance-monitor'
import { useEffect, useState } from 'react'

export default function HealthDashboardPage() {
  const supabase = createClient()
  const [performanceStats, setPerformanceStats] = useState<Record<string, any>>({})

  // Récupérer les statistiques de performance
  useEffect(() => {
    const stats: Record<string, any> = {}
    const metricGroups = performanceMonitor.getMetricsByGroup()
    
    for (const [name, metrics] of Object.entries(metricGroups)) {
      const stat = performanceMonitor.getStats(name)
      if (stat) {
        stats[name] = stat
      }
    }
    
    setPerformanceStats(stats)
    
    // Rafraîchir toutes les 30 secondes
    const interval = setInterval(() => {
      const updatedStats: Record<string, any> = {}
      const updatedGroups = performanceMonitor.getMetricsByGroup()
      
      for (const [name, metrics] of Object.entries(updatedGroups)) {
        const stat = performanceMonitor.getStats(name)
        if (stat) {
          updatedStats[name] = stat
        }
      }
      
      setPerformanceStats(updatedStats)
    }, 30000)
    
    return () => clearInterval(interval)
  }, [])

  // Vérifier la connexion à la base de données
  const { data: dbHealth, isLoading: dbLoading } = useQuery({
    queryKey: ['health-db'],
    queryFn: async () => {
      const startTime = Date.now()
      try {
        const { data, error } = await supabase
          .from('organizations')
          .select('id')
          .limit(1)

        const responseTime = Date.now() - startTime

        return {
          status: error ? 'error' : 'healthy',
          responseTime,
          error: error?.message,
          timestamp: new Date().toISOString(),
        }
      } catch (error) {
        return {
          status: 'error',
          responseTime: Date.now() - startTime,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        }
      }
    },
    refetchInterval: 30000, // Rafraîchir toutes les 30 secondes
  })

  // Statistiques générales
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['health-stats'],
    queryFn: async () => {
      const [
        orgsResult,
        usersResult,
        studentsResult,
        documentsResult,
        paymentsResult,
      ] = await Promise.all([
        supabase.from('organizations').select('id', { count: 'exact', head: true }),
        supabase.from('users').select('id', { count: 'exact', head: true }),
        supabase.from('students').select('id', { count: 'exact', head: true }),
        supabase.from('documents').select('id', { count: 'exact', head: true }),
        supabase
          .from('payments')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'completed'),
      ])

      return {
        organizations: orgsResult.count || 0,
        users: usersResult.count || 0,
        students: studentsResult.count || 0,
        documents: documentsResult.count || 0,
        completedPayments: paymentsResult.count || 0,
        timestamp: new Date().toISOString(),
      }
    },
    refetchInterval: 60000, // Rafraîchir toutes les minutes
  })

  // Vérifier les performances des requêtes
  const { data: performance, isLoading: perfLoading } = useQuery({
    queryKey: ['health-performance'],
    queryFn: async () => {
      const queries = [
        { name: 'Organizations', query: supabase.from('organizations').select('id').limit(10) },
        { name: 'Users', query: supabase.from('users').select('id').limit(10) },
        { name: 'Students', query: supabase.from('students').select('id').limit(10) },
        { name: 'Sessions', query: supabase.from('sessions').select('id').limit(10) },
      ]

      const results = await Promise.all(
        queries.map(async ({ name, query }) => {
          const startTime = Date.now()
          try {
            const { error } = await query
            const responseTime = Date.now() - startTime
            return {
              name,
              status: error ? 'error' : 'success',
              responseTime,
              error: error?.message,
            }
          } catch (error) {
            return {
              name,
              status: 'error',
              responseTime: Date.now() - startTime,
              error: error instanceof Error ? error.message : 'Unknown error',
            }
          }
        })
      )

      return results
    },
    refetchInterval: 120000, // Rafraîchir toutes les 2 minutes
  })

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'success':
        return <CheckCircle2 className="h-5 w-5 text-emerald-500" />
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />
      default:
        return <AlertCircle className="h-5 w-5 text-yellow-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'success':
        return <Badge className="bg-emerald-100 text-emerald-700">Healthy</Badge>
      case 'error':
        return <Badge className="bg-red-100 text-red-700">Error</Badge>
      default:
        return <Badge className="bg-yellow-100 text-yellow-700">Warning</Badge>
    }
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard de Santé</h1>
        <p className="text-muted-foreground mt-2">
          Surveillance de l'état de l'application et des performances
        </p>
      </div>

      {/* Statut de la base de données */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Connexion Base de Données
          </CardTitle>
          <CardDescription>État de la connexion à Supabase</CardDescription>
        </CardHeader>
        <CardContent>
          {dbLoading ? (
            <Skeleton className="h-20 w-full" />
          ) : dbHealth ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {getStatusIcon(dbHealth.status)}
                <div>
                  <div className="font-medium">Base de données</div>
                  <div className="text-sm text-muted-foreground">
                    Temps de réponse: {dbHealth.responseTime}ms
                  </div>
                  {dbHealth.error && (
                    <div className="text-sm text-red-600 mt-1">{dbHealth.error}</div>
                  )}
                </div>
              </div>
              {getStatusBadge(dbHealth.status)}
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Statistiques générales */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Statistiques Générales
          </CardTitle>
          <CardDescription>Données agrégées de l'application</CardDescription>
        </CardHeader>
        <CardContent>
          {statsLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : stats ? (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-lg bg-blue-50 border border-blue-100"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Server className="h-4 w-4 text-blue-600" />
                  <p className="text-sm text-blue-600 font-medium">Organisations</p>
                </div>
                <p className="text-2xl font-bold text-blue-900">{stats.organizations}</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="p-4 rounded-lg bg-purple-50 border border-purple-100"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Users className="h-4 w-4 text-purple-600" />
                  <p className="text-sm text-purple-600 font-medium">Utilisateurs</p>
                </div>
                <p className="text-2xl font-bold text-purple-900">{stats.users}</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="p-4 rounded-lg bg-green-50 border border-green-100"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Users className="h-4 w-4 text-green-600" />
                  <p className="text-sm text-green-600 font-medium">Étudiants</p>
                </div>
                <p className="text-2xl font-bold text-green-900">{stats.students}</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="p-4 rounded-lg bg-orange-50 border border-orange-100"
              >
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="h-4 w-4 text-orange-600" />
                  <p className="text-sm text-orange-600 font-medium">Documents</p>
                </div>
                <p className="text-2xl font-bold text-orange-900">{stats.documents}</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="p-4 rounded-lg bg-emerald-50 border border-emerald-100"
              >
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="h-4 w-4 text-emerald-600" />
                  <p className="text-sm text-emerald-600 font-medium">Paiements</p>
                </div>
                <p className="text-2xl font-bold text-emerald-900">{stats.completedPayments}</p>
              </motion.div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Performances des requêtes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Performances des Requêtes
          </CardTitle>
          <CardDescription>Temps de réponse par table</CardDescription>
        </CardHeader>
        <CardContent>
          {perfLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : performance ? (
            <div className="space-y-3">
              {performance.map((perf, index) => (
                <motion.div
                  key={perf.name}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center justify-between p-4 rounded-lg border"
                >
                  <div className="flex items-center gap-3">
                    {getStatusIcon(perf.status)}
                    <div>
                      <p className="font-medium">{perf.name}</p>
                      {perf.error && (
                        <p className="text-sm text-red-600">{perf.error}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Temps de réponse</p>
                      <p
                        className={`font-bold ${
                          perf.responseTime > 1000
                            ? 'text-red-600'
                            : perf.responseTime > 500
                            ? 'text-yellow-600'
                            : 'text-emerald-600'
                        }`}
                      >
                        {perf.responseTime}ms
                      </p>
                    </div>
                    {getStatusBadge(perf.status)}
                  </div>
                </motion.div>
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Métriques de performance */}
      {Object.keys(performanceStats).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Métriques de Performance
            </CardTitle>
            <CardDescription>Statistiques des temps d'exécution</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(performanceStats).map(([name, stat]) => (
                <motion.div
                  key={name}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 rounded-lg border bg-gray-50"
                >
                  <div className="flex items-center justify-between mb-3">
                    <p className="font-medium">{name}</p>
                    <Badge className="bg-blue-100 text-blue-700">
                      {stat.count} mesures
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Moyenne</p>
                      <p className="font-bold text-blue-600">{Math.round(stat.avg)}ms</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Médiane</p>
                      <p className="font-bold">{Math.round(stat.median)}ms</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">P95</p>
                      <p className="font-bold text-yellow-600">{Math.round(stat.p95)}ms</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">P99</p>
                      <p className="font-bold text-red-600">{Math.round(stat.p99)}ms</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Informations système */}
      <Card>
        <CardHeader>
          <CardTitle>Informations Système</CardTitle>
          <CardDescription>Détails de l'environnement et configuration</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Environnement</p>
              <p className="font-medium">
                <Badge className={process.env.NODE_ENV === 'production' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}>
                  {process.env.NODE_ENV || 'development'}
                </Badge>
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Dernière mise à jour</p>
              <p className="font-medium">
                {stats?.timestamp ? formatDate(stats.timestamp) : 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Sentry</p>
              <p className="font-medium">
                {process.env.NEXT_PUBLIC_SENTRY_DSN ? (
                  <Badge className="bg-green-100 text-green-700">Activé</Badge>
                ) : (
                  <Badge className="bg-gray-100 text-gray-700">Désactivé</Badge>
                )}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Analytics</p>
              <p className="font-medium">
                {process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN || process.env.NEXT_PUBLIC_GA_ID ? (
                  <Badge className="bg-green-100 text-green-700">Activé</Badge>
                ) : (
                  <Badge className="bg-gray-100 text-gray-700">Désactivé</Badge>
                )}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Version</p>
              <p className="font-medium">1.0.0</p>
            </div>
            <div>
              <p className="text-muted-foreground">Base de données</p>
              <p className="font-medium">
                {dbHealth?.status === 'healthy' ? (
                  <Badge className="bg-green-100 text-green-700">Connectée</Badge>
                ) : (
                  <Badge className="bg-red-100 text-red-700">Erreur</Badge>
                )}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

