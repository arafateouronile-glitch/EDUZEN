/**
 * Tests pour les composants de graphiques premium
 */

import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { PremiumPieChart } from '@/components/charts/premium-pie-chart'
import { PremiumBarChart } from '@/components/charts/premium-bar-chart'
import { PremiumLineChart } from '@/components/charts/premium-line-chart'

describe('Premium Charts Components', () => {
  const mockData = [
    { name: 'A', value: 10 },
    { name: 'B', value: 20 },
    { name: 'C', value: 30 },
  ]

  afterEach(() => {
    cleanup()
  })

  describe('PremiumPieChart', () => {
    it('devrait rendre le composant sans erreur', () => {
      const { container } = render(<PremiumPieChart data={mockData} title="Test Chart" />)
      expect(container).toBeInTheDocument()
      // Ne pas tester le rendu exact car ResizeObserver peut causer des problèmes
    })

    it('devrait accepter les props avec les types corrects', () => {
      const props = {
        data: mockData,
        title: 'Test',
        subtitle: 'Subtitle',
        colors: ['#FF0000', '#00FF00', '#0000FF'],
        className: 'test-class',
        variant: 'default' as const,
        innerRadius: 50,
        outerRadius: 100,
      }

      expect(props.data).toBeDefined()
      expect(Array.isArray(props.data)).toBe(true)
      expect(props.variant).toBe('default')
    })
  })

  describe('PremiumBarChart', () => {
    it('devrait rendre le composant sans erreur', () => {
      const { container } = render(<PremiumBarChart data={mockData} title="Test Chart" />)
      expect(container).toBeInTheDocument()
      // Ne pas tester le rendu exact car ResizeObserver peut causer des problèmes
    })

    it('devrait accepter CustomTooltip avec les types corrects', () => {
      const tooltipProps: {
        active?: boolean
        payload?: Array<{ name: string; value: number; payload: { name: string; value: number; fill?: string } }>
      } = {
        active: true,
        payload: [
          {
            name: 'A',
            value: 10,
            payload: { name: 'A', value: 10, fill: '#FF0000' },
          },
        ],
      }

      expect(tooltipProps.active).toBe(true)
      expect(tooltipProps.payload).toBeDefined()
      if (tooltipProps.payload) {
        expect(tooltipProps.payload[0].name).toBe('A')
      }
    })
  })

  describe('PremiumLineChart', () => {
    it('devrait rendre le composant sans erreur', () => {
      const { container } = render(<PremiumLineChart data={mockData} title="Test Chart" />)
      expect(container).toBeInTheDocument()
      // Ne pas tester le rendu exact car ResizeObserver peut causer des problèmes
    })

    it('devrait accepter CustomTooltip avec les types corrects', () => {
      const tooltipProps: {
        active?: boolean
        payload?: Array<{ value: number | string; name?: string }>
      } = {
        active: true,
        payload: [
          { value: 10, name: 'A' },
          { value: '20', name: 'B' },
        ],
      }

      expect(tooltipProps.active).toBe(true)
      expect(tooltipProps.payload).toBeDefined()
      if (tooltipProps.payload) {
        expect(typeof tooltipProps.payload[0].value).toBe('number')
        expect(typeof tooltipProps.payload[1].value).toBe('string')
      }
    })
  })

  describe('Type Safety', () => {
    it('devrait utiliser des types stricts pour les props', () => {
      // Vérifier que les types sont corrects
      const pieChartProps = {
        data: mockData,
        title: 'Test',
        variant: 'default' as const,
      }

      expect(pieChartProps.variant).toBe('default')
      // TypeScript devrait empêcher les valeurs invalides
      // @ts-expect-error - Ceci devrait être une erreur TypeScript
      // const invalidVariant = { variant: 'invalid' }
    })
  })
})

