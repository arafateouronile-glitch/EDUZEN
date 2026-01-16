import {
  FileText,
  Receipt,
  FileCheck,
  Calendar,
  ClipboardList,
  Award,
  GraduationCap,
  BookOpen,
  UserCheck,
  Shield,
  Scale,
  Book,
  CheckCircle,
} from 'lucide-react'
import type { DocumentType } from '@/lib/types/document-templates'

export function getDocumentTypeConfig(type: DocumentType) {
  const configs: Record<DocumentType, {
    name: string
    description: string
    icon: React.ElementType
    color: string
  }> = {
    convention: {
      name: 'Convention de formation',
      description: 'Contrat entre l\'établissement et l\'apprenant',
      icon: FileText,
      color: '#335ACF',
    },
    facture: {
      name: 'Facture',
      description: 'Document comptable de facturation',
      icon: Receipt,
      color: '#335ACF',
    },
    devis: {
      name: 'Devis',
      description: 'Estimation de prix avant formation',
      icon: FileCheck,
      color: '#34B9EE',
    },
    convocation: {
      name: 'Convocation',
      description: 'Invitation à une session ou examen',
      icon: Calendar,
      color: '#335ACF',
    },
    contrat: {
      name: 'Contrat de scolarité',
      description: 'Accord de scolarisation officiel',
      icon: ClipboardList,
      color: '#335ACF',
    },
    attestation_reussite: {
      name: 'Attestation de réussite',
      description: 'Certificat de réussite à une formation',
      icon: Award,
      color: '#335ACF',
    },
    certificat_scolarite: {
      name: 'Certificat de scolarité',
      description: 'Justificatif d\'inscription dans l\'établissement',
      icon: GraduationCap,
      color: '#335ACF',
    },
    releve_notes: {
      name: 'Relevé de notes',
      description: 'Bulletin de notes et appréciations',
      icon: BookOpen,
      color: '#34B9EE',
    },
    attestation_entree: {
      name: 'Attestation d\'entrée en formation',
      description: 'Certificat d\'inscription à une formation',
      icon: UserCheck,
      color: '#335ACF',
    },
    reglement_interieur: {
      name: 'Règlement intérieur',
      description: 'Règles et procédures de l\'établissement',
      icon: Shield,
      color: '#335ACF',
    },
    cgv: {
      name: 'Conditions Générales de Vente',
      description: 'CGV et conditions d\'utilisation',
      icon: Scale,
      color: '#34B9EE',
    },
    programme: {
      name: 'Programme de formation',
      description: 'Détails du contenu pédagogique',
      icon: Book,
      color: '#335ACF',
    },
    attestation_assiduite: {
      name: 'Attestation d\'assiduité',
      description: 'Justificatif de présence aux cours',
      icon: CheckCircle,
      color: '#335ACF',
    },
  }

  return configs[type]
}

