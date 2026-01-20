'use client'

import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { useLearnerContext } from '@/lib/contexts/learner-context'
import { createLearnerClient } from '@/lib/supabase/learner-client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle, Clock, AlertCircle, CreditCard, Download, Eye, FileText, DollarSign } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import Link from 'next/link'
import { motion } from '@/components/ui/motion'
import { GlassCard } from '@/components/ui/glass-card'
import { logger, maskId, sanitizeError } from '@/lib/utils/logger'

export default function LearnerPaymentsPage() {
  const { student: studentData, studentId } = useLearnerContext()
  const supabase = useMemo(() => (studentId ? createLearnerClient(studentId) : null), [studentId])

  // Récupérer les factures
  const { data: invoices, isLoading: isLoadingInvoices } = useQuery({
    queryKey: ['learner-invoices', studentId],
    queryFn: async () => {
      if (!studentId) return []
      if (!supabase) return []
      
      try {
        const { data, error } = await supabase
          .from('invoices')
          .select('*')
          .eq('student_id', studentId)
          .order('issue_date', { ascending: false })
        
        if (error) {
          logger.warn('Error fetching invoices', {
            studentId: maskId(studentId),
            error: sanitizeError(error),
          })
          return []
        }

        return data || []
      } catch (error: any) {
        logger.error('Unexpected error fetching invoices', error, {
          studentId: maskId(studentId),
          error: sanitizeError(error),
        })
        return []
      }
    },
    enabled: !!studentId && !!supabase,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  })

  // Récupérer les paiements
  const { data: payments, isLoading: isLoadingPayments } = useQuery({
    queryKey: ['learner-payments', studentId],
    queryFn: async () => {
      if (!studentId) return []
      if (!supabase) return []
      
      try {
        // Récupérer les paiements liés aux factures de l'étudiant
        const { data: invoicesData, error: invoicesError } = await supabase
          .from('invoices')
          .select('id')
          .eq('student_id', studentId)
        
        if (invoicesError) {
          logger.warn('Error fetching invoices for payments', {
            studentId: maskId(studentId),
            error: sanitizeError(invoicesError),
          })
          return []
        }
        
        if (!invoicesData || invoicesData.length === 0) return []
        
        const invoiceIds = invoicesData.map(inv => inv.id)
        
        const { data, error } = await supabase
          .from('payments')
          .select('*')
          .in('invoice_id', invoiceIds)
          .order('paid_at', { ascending: false })
        
        if (error) {
          logger.warn('Error fetching payments', {
            studentId: maskId(studentId),
            error: sanitizeError(error),
          })
          return []
        }

        return data || []
      } catch (error: any) {
        logger.error('Unexpected error fetching payments', error, {
          studentId: maskId(studentId),
          error: sanitizeError(error),
        })
        return []
      }
    },
    enabled: !!studentId && !!supabase,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  })

  const isLoading = isLoadingInvoices || isLoadingPayments

  // Calculer les totaux
  const totalInvoices = invoices?.reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0) || 0
  const totalPaid = payments?.reduce((sum, pay) => {
    if (pay.status === 'completed') {
      return sum + Number(pay.amount || 0)
    }
    return sum
  }, 0) || 0
  const totalPending = totalInvoices - totalPaid

  // Factures impayées
  const unpaidInvoices = invoices?.filter(inv => {
    const invoicePayments = payments?.filter(p => p.invoice_id === inv.id) || []
    const paidAmount = invoicePayments
      .filter(p => p.status === 'completed')
      .reduce((sum, p) => sum + Number(p.amount || 0), 0)
    return paidAmount < Number(inv.total_amount || 0)
  }) || []

  const getInvoiceStatus = (invoice: any) => {
    const invoicePayments = payments?.filter(p => p.invoice_id === invoice.id) || []
    const paidAmount = invoicePayments
      .filter(p => p.status === 'completed')
      .reduce((sum, p) => sum + Number(p.amount || 0), 0)
    const totalAmount = Number(invoice.total_amount || 0)
    
    if (paidAmount >= totalAmount) {
      return { status: 'paid', label: 'Payée', icon: CheckCircle, color: 'text-brand-cyan' }
    } else if (paidAmount > 0) {
      return { status: 'partial', label: 'Partiellement payée', icon: Clock, color: 'text-brand-cyan-dark' }
    } else {
      return { status: 'unpaid', label: 'Impayée', icon: AlertCircle, color: 'text-gray-600' }
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-blue mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement des paiements...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 pb-24 lg:pb-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Paiements</h1>
        <p className="text-gray-600">Gérez vos factures et paiements</p>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <GlassCard>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Total factures</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalInvoices)}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </GlassCard>

        <GlassCard>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Total payé</p>
                <p className="text-2xl font-bold text-brand-cyan">{formatCurrency(totalPaid)}</p>
              </div>
              <div className="p-3 bg-brand-cyan-pale rounded-full">
                <CheckCircle className="h-6 w-6 text-brand-cyan" />
              </div>
            </div>
          </CardContent>
        </GlassCard>

        <GlassCard>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">En attente</p>
                <p className="text-2xl font-bold text-gray-600">{formatCurrency(totalPending)}</p>
              </div>
              <div className="p-3 bg-gray-100 rounded-full">
                <AlertCircle className="h-6 w-6 text-gray-600" />
              </div>
            </div>
          </CardContent>
        </GlassCard>
      </div>

      {/* Factures impayées */}
      {unpaidInvoices.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Factures en attente</h2>
          <div className="grid gap-4">
            {unpaidInvoices.map((invoice: any, index: number) => {
              const statusInfo = getInvoiceStatus(invoice)
              const StatusIcon = statusInfo.icon
              
              return (
                <motion.div
                  key={invoice.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <GlassCard>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <StatusIcon className={`h-5 w-5 ${statusInfo.color}`} />
                            <h3 className="font-semibold text-gray-900">Facture #{invoice.invoice_number || invoice.id.slice(0, 8)}</h3>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusInfo.color} bg-opacity-10`}>
                              {statusInfo.label}
                            </span>
                          </div>
                          <div className="space-y-1 text-sm text-gray-600">
                            <p>Date d'émission : {invoice.issue_date ? formatDate(invoice.issue_date) : 'N/A'}</p>
                            {invoice.due_date && (
                              <p>Échéance : {formatDate(invoice.due_date)}</p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-gray-900 mb-2">{formatCurrency(invoice.total_amount || 0)}</p>
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4 mr-2" />
                            Voir détails
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </GlassCard>
                </motion.div>
              )
            })}
          </div>
        </div>
      )}

      {/* Toutes les factures */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Historique des factures</h2>
        {invoices && invoices.length > 0 ? (
          <div className="space-y-4">
            {invoices.map((invoice: any, index: number) => {
              const statusInfo = getInvoiceStatus(invoice)
              const StatusIcon = statusInfo.icon
              
              return (
                <motion.div
                  key={invoice.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <GlassCard>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`p-2 rounded-lg ${statusInfo.color.replace('text-', 'bg-').replace('-600', '-100')}`}>
                            <StatusIcon className={`h-5 w-5 ${statusInfo.color}`} />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">Facture #{invoice.invoice_number || invoice.id.slice(0, 8)}</h3>
                            <p className="text-sm text-gray-600">{invoice.issue_date ? formatDate(invoice.issue_date) : 'N/A'}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-lg font-bold text-gray-900">{formatCurrency(invoice.total_amount || 0)}</p>
                            <p className="text-xs text-gray-500">{statusInfo.label}</p>
                          </div>
                          <Button variant="outline" size="sm">
                            <Download className="h-4 w-4 mr-2" />
                            Télécharger
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </GlassCard>
                </motion.div>
              )
            })}
          </div>
        ) : (
          <GlassCard>
            <CardContent className="py-12 text-center">
              <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Aucune facture disponible</p>
            </CardContent>
          </GlassCard>
        )}
      </div>
    </div>
  )
}



