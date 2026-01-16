/**
 * Générateur de layouts prédéfinis pour header et footer
 */

import type { HeaderConfig, FooterConfig, TemplateElement } from '@/lib/types/document-templates'

/**
 * Génère un layout header prédéfini
 */
export function generateHeaderLayout(
  layout: HeaderConfig['layout'],
  variables: {
    schoolName?: string
    schoolAddress?: string
    schoolPhone?: string
    schoolEmail?: string
    schoolLogo?: string
  } = {}
): Partial<HeaderConfig> {
  const elements: TemplateElement[] = []

  switch (layout) {
    case 'logo_left_info_right':
      elements.push(
        {
          id: 'logo',
          type: 'image',
          position: { x: 20, y: 20 },
          size: { width: 80, height: 80 },
          source: '{ecole_logo}',
          alignment: 'left',
        },
        {
          id: 'school_name',
          type: 'text',
          position: { x: 120, y: 30 },
          content: '{ecole_nom}',
          style: {
            fontSize: 20,
            fontWeight: 'bold',
            color: '#000000',
          },
        },
        {
          id: 'school_contact',
          type: 'text',
          position: { x: 120, y: 60 },
          content: '{ecole_adresse} | {ecole_telephone} | {ecole_email}',
          style: {
            fontSize: 10,
            color: '#4D4D4D',
          },
        }
      )
      return {
        height: 100,
        backgroundColor: {
          type: 'solid',
          color: '#FFFFFF',
        },
        elements,
        layout: 'logo_left_info_right',
      }

    case 'logo_centered':
      elements.push(
        {
          id: 'logo',
          type: 'image',
          position: { x: 0, y: 10 },
          size: { width: 60, height: 60 },
          source: '{ecole_logo}',
          alignment: 'center',
        },
        {
          id: 'school_name',
          type: 'text',
          position: { x: 0, y: 80 },
          content: '{ecole_nom}',
          style: {
            fontSize: 18,
            fontWeight: 'bold',
            color: '#000000',
            textAlign: 'center',
          },
        }
      )
      return {
        height: 120,
        backgroundColor: {
          type: 'solid',
          color: '#FFFFFF',
        },
        elements,
        layout: 'logo_centered',
      }

    case 'banner_gradient':
      elements.push(
        {
          id: 'logo',
          type: 'image',
          position: { x: 20, y: 10 },
          size: { width: 60, height: 60 },
          source: '{ecole_logo}',
          alignment: 'left',
        },
        {
          id: 'school_name',
          type: 'text',
          position: { x: 100, y: 20 },
          content: '{ecole_nom}',
          style: {
            fontSize: 22,
            fontWeight: 'bold',
            color: '#FFFFFF',
          },
        },
        {
          id: 'school_contact',
          type: 'text',
          position: { x: 100, y: 50 },
          content: '{ecole_adresse} | {ecole_telephone} | {ecole_email}',
          style: {
            fontSize: 10,
            color: '#FFFFFF',
            opacity: 0.9,
          },
        }
      )
      return {
        height: 100,
        backgroundColor: {
          type: 'gradient',
          from: '#335ACF',
          to: '#34B9EE',
          direction: 'horizontal',
        },
        elements,
        layout: 'banner_gradient',
      }

    case 'minimal':
      elements.push(
        {
          id: 'logo',
          type: 'image',
          position: { x: 20, y: 20 },
          size: { width: 50, height: 50 },
          source: '{ecole_logo}',
          alignment: 'left',
        },
        {
          id: 'school_name',
          type: 'text',
          position: { x: 80, y: 30 },
          content: '{ecole_nom}',
          style: {
            fontSize: 16,
            fontWeight: 'bold',
            color: '#000000',
          },
        }
      )
      return {
        height: 80,
        backgroundColor: {
          type: 'solid',
          color: '#FFFFFF',
        },
        elements,
        layout: 'minimal',
      }

    case 'professional':
      elements.push(
        {
          id: 'logo',
          type: 'image',
          position: { x: 20, y: 15 },
          size: { width: 70, height: 70 },
          source: '{ecole_logo}',
          alignment: 'left',
        },
        {
          id: 'school_name',
          type: 'text',
          position: { x: 110, y: 25 },
          content: '{ecole_nom}',
          style: {
            fontSize: 20,
            fontWeight: 'bold',
            color: '#000000',
          },
        },
        {
          id: 'school_slogan',
          type: 'text',
          position: { x: 110, y: 55 },
          content: '{ecole_slogan}',
          style: {
            fontSize: 11,
            fontStyle: 'italic',
            color: '#666666',
          },
        }
      )
      return {
        height: 100,
        backgroundColor: {
          type: 'solid',
          color: '#FFFFFF',
        },
        border: {
          bottom: {
            enabled: true,
            color: '#335ACF',
            width: 2,
            style: 'solid',
          },
        },
        elements,
        layout: 'professional',
      }

    default:
      return {
        height: 100,
        backgroundColor: {
          type: 'solid',
          color: '#FFFFFF',
        },
        elements: [],
        layout: 'custom',
      }
  }
}

/**
 * Génère un layout footer prédéfini
 */
export function generateFooterLayout(
  layout: FooterConfig['layout'],
  variables: {
    schoolName?: string
    schoolPhone?: string
    schoolEmail?: string
    schoolWebsite?: string
  } = {}
): Partial<FooterConfig> {
  const elements: TemplateElement[] = []

  switch (layout) {
    case 'simple':
      elements.push(
        {
          id: 'school_name_center',
          type: 'text',
          position: { x: 0, y: 20 },
          content: '{ecole_nom}',
          style: {
            fontSize: 9,
            color: '#4D4D4D',
            textAlign: 'center',
          },
        },
        {
          id: 'pagination_right',
          type: 'text',
          position: { x: 450, y: 20 },
          content: 'Page {numero_page} / {total_pages}',
          style: {
            fontSize: 8,
            color: '#666666',
            textAlign: 'right',
          },
        }
      )
      return {
        height: 50,
        backgroundColor: '#F9FAFB',
        pagination: {
          enabled: true,
          format: 'Page {numero_page} / {total_pages}',
          position: 'right',
        },
        elements,
        layout: 'simple',
      }

    case 'complete':
      elements.push(
        {
          id: 'contact_left',
          type: 'text',
          position: { x: 20, y: 15 },
          content: '{ecole_telephone} | {ecole_email}',
          style: {
            fontSize: 8,
            color: '#4D4D4D',
            textAlign: 'left',
          },
        },
        {
          id: 'pagination_center',
          type: 'text',
          position: { x: 0, y: 15 },
          content: 'Page {numero_page} / {total_pages}',
          style: {
            fontSize: 9,
            color: '#4D4D4D',
            textAlign: 'center',
          },
        },
        {
          id: 'website_right',
          type: 'text',
          position: { x: 450, y: 15 },
          content: '{ecole_site_web}',
          style: {
            fontSize: 8,
            color: '#34B9EE',
            textAlign: 'right',
            textDecoration: 'underline',
          },
        },
        {
          id: 'generation_date',
          type: 'text',
          position: { x: 20, y: 30 },
          content: 'Document généré le {date_generation}',
          style: {
            fontSize: 7,
            color: '#999999',
            fontStyle: 'italic',
          },
        }
      )
      return {
        height: 60,
        backgroundColor: '#F9FAFB',
        border: {
          top: {
            enabled: true,
            color: '#E5E7EB',
            width: 1,
            style: 'solid',
          },
        },
        pagination: {
          enabled: true,
          format: 'Page {numero_page} / {total_pages}',
          position: 'center',
        },
        elements,
        layout: 'complete',
      }

    case 'minimal':
      return {
        height: 40,
        backgroundColor: '#FFFFFF',
        pagination: {
          enabled: true,
          format: 'Page {numero_page} / {total_pages}',
          position: 'center',
        },
        elements: [],
        layout: 'minimal',
      }

    case 'professional':
      elements.push(
        {
          id: 'separator',
          type: 'line',
          position: { x: 0, y: 0 },
          style: {
            color: '#E5E7EB',
            border: {
              enabled: true,
              color: '#E5E7EB',
              width: 1,
            },
          },
        },
        {
          id: 'legal',
          type: 'text',
          position: { x: 20, y: 10 },
          content: 'Document confidentiel - Tous droits réservés',
          style: {
            fontSize: 7,
            color: '#999999',
            textAlign: 'left',
          },
        },
        {
          id: 'contact',
          type: 'text',
          position: { x: 20, y: 25 },
          content: '{ecole_telephone} | {ecole_email}',
          style: {
            fontSize: 8,
            color: '#4D4D4D',
            textAlign: 'left',
          },
        },
        {
          id: 'pagination',
          type: 'text',
          position: { x: 0, y: 20 },
          content: 'Page {numero_page} / {total_pages}',
          style: {
            fontSize: 8,
            color: '#4D4D4D',
            textAlign: 'center',
          },
        }
      )
      return {
        height: 50,
        backgroundColor: '#FFFFFF',
        border: {
          top: {
            enabled: true,
            color: '#E5E7EB',
            width: 1,
            style: 'solid',
          },
        },
        pagination: {
          enabled: true,
          format: 'Page {numero_page} / {total_pages}',
          position: 'center',
        },
        elements,
        layout: 'professional',
      }

    case 'modern':
      elements.push(
        {
          id: 'qrcode',
          type: 'qrcode',
          position: { x: 20, y: 10 },
          size: { width: 30, height: 30 },
          qrData: '{ecole_site_web}',
        },
        {
          id: 'contact',
          type: 'text',
          position: { x: 60, y: 15 },
          content: '{ecole_telephone} | {ecole_email}',
          style: {
            fontSize: 8,
            color: '#4D4D4D',
          },
        },
        {
          id: 'pagination',
          type: 'text',
          position: { x: 0, y: 15 },
          content: 'Page {numero_page} / {total_pages}',
          style: {
            fontSize: 8,
            color: '#4D4D4D',
            textAlign: 'center',
          },
        },
        {
          id: 'website',
          type: 'text',
          position: { x: 420, y: 15 },
          content: '{ecole_site_web}',
          style: {
            fontSize: 8,
            color: '#34B9EE',
            textAlign: 'right',
          },
        }
      )
      return {
        height: 50,
        backgroundColor: '#F9FAFB',
        border: {
          top: {
            enabled: true,
            color: '#E5E7EB',
            width: 1,
            style: 'dashed',
          },
        },
        pagination: {
          enabled: true,
          format: 'Page {numero_page} / {total_pages}',
          position: 'center',
        },
        elements,
        layout: 'modern',
      }

    default:
      return {
        height: 60,
        backgroundColor: '#F9FAFB',
        pagination: {
          enabled: true,
          format: 'Page {numero_page} / {total_pages}',
          position: 'center',
        },
        elements: [],
        layout: 'custom',
      }
  }
}























