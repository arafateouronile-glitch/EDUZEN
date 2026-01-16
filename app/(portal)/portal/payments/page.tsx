'use client'

import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/lib/hooks/use-auth'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle, Clock, AlertCircle, CreditCard } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import Link from 'next/link'
import type { InvoiceWithRelations, PaymentWithRelations } from '@/lib/types/query-types'

export default function PaymentsPage() {
  const { user } = useAuth()
  const supabase = createClient()

  // Récupérer les factures
  const { data: invoices } = useQuery({
    queryKey: ['portal-invoices', user?.id],
    queryFn: async () => {
      if (!user?.id) return []

      let studentIds: string[] = []

      if (user?.role === 'parent') {
        // Récupérer les enfants
        const { data: guardians } = await supabase
          .from('guardians')
          .select('id')
          .eq('user_id', user.id)

        if (!guardians || guardians.length === 0) return []

        const { data: studentGuardians } = await supabase
          .from('student_guardians')
          .select('student_id')
          .in('guardian_id', guardians.map((g) => g.id))

        if (!studentGuardians || studentGuardians.length === 0) return []
        studentIds = studentGuardians.map((sg) => sg.student_id)
      } else if (user?.role === 'student') {
        const { data: student } = await supabase
          .from('students')
          .select('id')
          .eq('id', user.id)
          .single()

        if (student) studentIds = [student.id]
      }

      if (studentIds.length === 0) return []

      const { data } = await supabase
        .from('invoices')
        .select('*, students(first_name, last_name)')
        .in('student_id', studentIds)
        .order('issue_date', { ascending: false })

      return data || []
    },
    enabled: !!user?.id,
  })

  // Récupérer les paiements
  const { data: payments } = useQuery({
    queryKey: ['portal-payments', user?.id],
    queryFn: async () => {
      if (!user?.id) return []

      let studentIds: string[] = []

      if (user?.role === 'parent') {
        const { data: guardians } = await supabase
          .from('guardians')
          .select('id')
          .eq('user_id', user.id)

        if (!guardians || guardians.length === 0) return []

        const { data: studentGuardians } = await supabase
          .from('student_guardians')
          .select('student_id')
          .in('guardian_id', guardians.map((g) => g.id))

        if (!studentGuardians || studentGuardians.length === 0) return []
        studentIds = studentGuardians.map((sg) => sg.student_id)
      } else if (user?.role === 'student') {
        studentIds = [user.id]
      }

      if (studentIds.length === 0) return []

      const { data } = await supabase
        .from('payments')
        .select('*, invoices(invoice_number), students(first_name, last_name)')
        .in('student_id', studentIds)
        .eq('status', 'completed')
        .order('paid_at', { ascending: false })
        .limit(10)

      return data || []
    },
    enabled: !!user?.id,
  })

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="h-5 w-5 text-success-primary" />
      case 'sent':
      case 'partial':
        return <Clock className="h-5 w-5 text-warning-primary" />
      case 'overdue':
        return <AlertCircle className="h-5 w-5 text-red-600" />
      default:
        return null
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'paid':
        return 'Payée'
      case 'sent':
        return 'En attente'
      case 'partial':
        return 'Partielle'
      case 'overdue':
        return 'En retard'
      default:
        return status
    }
  }

  // Filtrer uniquement les factures (pas les devis) pour les calculs financiers
  const invoicesOnly = invoices?.filter((inv: any) => 
    (inv as any).document_type === 'invoice' || !(inv as any).document_type
  ) || []

  const unpaidInvoices = invoicesOnly.filter((inv: any) => 
    ['sent', 'partial', 'overdue'].includes(inv.status)
  ) || []

  const paidInvoices = invoicesOnly.filter((inv: any) => inv.status === 'paid') || []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Paiements</h1>
        <p className="mt-2 text-sm text-gray-600">
          Gérez vos factures et paiements
        </p>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Factures en attente
            </CardTitle>
            <AlertCircle className="h-5 w-5 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {unpaidInvoices.length}
            </div>
            {unpaidInvoices.length > 0 && (
              <p className="text-sm text-muted-foreground mt-1">
                Total: {formatCurrency(
                  unpaidInvoices.reduce((sum, inv) => sum + Number(inv.total_amount) - Number(inv.paid_amount || 0), 0),
                  unpaidInvoices[0]?.currency || 'XOF'
                )}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Factures payées
            </CardTitle>
            <CheckCircle className="h-5 w-5 text-success-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success-primary">
              {paidInvoices.length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Factures en attente */}
      {unpaidInvoices.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Factures en attente de paiement</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {unpaidInvoices.map((invoice: any) => {
                const remaining = Number(invoice.total_amount) - Number(invoice.paid_amount || 0)
                return (
                  <div
                    key={invoice.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center space-x-4">
                      {getStatusIcon(invoice.status)}
                      <div>
                        <p className="font-semibold">{invoice.invoice_number}</p>
                        <p className="text-sm text-muted-foreground">
                          {invoice.students?.first_name} {invoice.students?.last_name}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Échéance: {formatDate(invoice.due_date)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <p className="font-semibold text-lg">
                          {formatCurrency(remaining, invoice.currency)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          sur {formatCurrency(Number(invoice.total_amount), invoice.currency)}
                        </p>
                      </div>
                      <Link href={`/portal/payments/${invoice.id}`}>
                        <Button>
                          <CreditCard className="mr-2 h-4 w-4" />
                          Payer
                        </Button>
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Historique des paiements */}
      {payments && payments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Historique des paiements</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {payments.map((payment: any) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div>
                    <p className="font-semibold">
                      {payment.invoices?.invoice_number || 'Paiement'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {payment.students?.first_name} {payment.students?.last_name}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDate(payment.paid_at || payment.created_at)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-success-primary">
                      {formatCurrency(Number(payment.amount), payment.currency)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {payment.payment_method === 'mobile_money' ? 'Mobile Money' : 
                       payment.payment_method === 'cash' ? 'Espèces' :
                       payment.payment_method === 'card' ? 'Carte' : payment.payment_method}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {(!invoices || invoices.length === 0) && (
        <Card>
          <CardContent className="text-center py-12 text-muted-foreground">
            <CreditCard className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p>Aucune facture disponible</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

