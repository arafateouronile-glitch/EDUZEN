import {
  Users, CalendarCheck, CalendarClock, AlertCircle, Clock, Sparkles,
  CalendarX, CreditCard, GraduationCap, UserX, FileWarning, Award,
  UserMinus, BellRing, Accessibility, UsersRound, PenLine, ClipboardCheck,
  BookMarked, CalendarDays, Building2, AlertTriangle, Send, CheckSquare,
  type LucideIcon,
} from 'lucide-react'
import type { SearchResult } from './search.service'

export interface SearchFilter {
  id: string
  label: string
  icon: LucideIcon
  color: string
  bgColor: string
  badgeColor: string
}

// Couleurs communes — charte brand-blue / brand-cyan
const chip = {
  color: 'text-brand-blue dark:text-brand-cyan',
  bgColor: 'bg-brand-cyan/10 hover:bg-brand-cyan/20 dark:bg-brand-cyan/10 dark:hover:bg-brand-cyan/20',
  badgeColor: 'bg-brand-cyan/15 text-brand-blue dark:bg-brand-cyan/20 dark:text-brand-cyan',
}

export const SEARCH_FILTERS: SearchFilter[] = [
  { id: 'enrolled_students',      label: 'Apprenants inscrits',        icon: Users,          ...chip },
  { id: 'active_sessions',        label: 'Sessions en cours',          icon: CalendarCheck,  ...chip },
  { id: 'upcoming_sessions',      label: 'Sessions à venir',           icon: CalendarClock,  ...chip },
  { id: 'overdue_payments',       label: 'Paiements en retard',        icon: AlertCircle,    ...chip },
  { id: 'pending_enrollments',    label: 'En attente de confirmation', icon: Clock,          ...chip },
  { id: 'new_students',           label: 'Nouveaux apprenants',        icon: Sparkles,       ...chip },
  { id: 'completed_sessions',     label: 'Sessions terminées',         icon: CalendarX,      ...chip },
  { id: 'partial_payments',       label: 'Paiements partiels',         icon: CreditCard,     ...chip },
  { id: 'cpf_enrollments',        label: 'Inscriptions CPF',           icon: GraduationCap,  ...chip },
  { id: 'recent_absences',        label: 'Absences récentes',          icon: UserX,          ...chip },
  { id: 'unpaid_invoices',        label: 'Factures impayées',          icon: FileWarning,    ...chip },
  { id: 'delivered_certificates', label: 'Certificats délivrés',       icon: Award,          ...chip },
  { id: 'unenrolled_students',    label: 'Apprenants sans session',    icon: UserMinus,      ...chip },
  { id: 'payment_reminders',      label: 'Relances envoyées',          icon: BellRing,       ...chip },
  { id: 'accessibility_needs',    label: 'Besoins d\'accessibilité',   icon: Accessibility,  ...chip },
  { id: 'empty_sessions',         label: 'Sessions sans apprenant',    icon: UsersRound,     ...chip },
  { id: 'pending_signatures',     label: 'En attente de signature',    icon: PenLine,        ...chip },
  { id: 'qualiopi_audits',        label: 'Audits Qualiopi',            icon: ClipboardCheck, ...chip },
  { id: 'active_formations',      label: 'Formations actives',         icon: BookMarked,     ...chip },
  { id: 'upcoming_events',        label: 'Événements à venir',         icon: CalendarDays,   ...chip },
  { id: 'student_companies',      label: 'Apprenants en entreprise',   icon: Building2,      ...chip },
  { id: 'anomaly_alerts',         label: 'Alertes anomalies',          icon: AlertTriangle,  ...chip },
  { id: 'sent_documents',         label: 'Documents envoyés',          icon: Send,           ...chip },
  { id: 'graded_submissions',     label: 'Devoirs à corriger',         icon: CheckSquare,    ...chip },
]

export type FilterResult = SearchResult & { filterId: string }
