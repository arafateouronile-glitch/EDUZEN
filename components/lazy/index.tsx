/**
 * Lazy-loaded Components
 *
 * This module provides dynamic imports for heavy components to enable code splitting.
 * Using these lazy components reduces the initial bundle size significantly.
 *
 * @example
 * import { LazyDocumentEditor, LazyPremiumLineChart } from '@/components/lazy'
 *
 * // In your component:
 * <Suspense fallback={<LoadingSkeleton />}>
 *   <LazyDocumentEditor {...props} />
 * </Suspense>
 */

import dynamic from 'next/dynamic'
import { ComponentType, Suspense } from 'react'

// Loading fallback component
function LoadingFallback({ height = 200 }: { height?: number }) {
  return (
    <div
      className="animate-pulse bg-gray-100 rounded-lg flex items-center justify-center"
      style={{ minHeight: height }}
    >
      <div className="text-gray-400 text-sm">Chargement...</div>
    </div>
  )
}

// Chart loading fallback
function ChartLoadingFallback() {
  return (
    <div className="animate-pulse bg-gray-100 rounded-lg p-4" style={{ minHeight: 300 }}>
      <div className="h-4 bg-gray-200 rounded w-1/4 mb-4" />
      <div className="space-y-3">
        <div className="h-32 bg-gray-200 rounded" />
        <div className="flex gap-2">
          <div className="h-3 bg-gray-200 rounded w-1/6" />
          <div className="h-3 bg-gray-200 rounded w-1/6" />
          <div className="h-3 bg-gray-200 rounded w-1/6" />
        </div>
      </div>
    </div>
  )
}

// Editor loading fallback
function EditorLoadingFallback() {
  return (
    <div className="animate-pulse space-y-4" style={{ minHeight: 400 }}>
      {/* Toolbar skeleton */}
      <div className="flex gap-2 p-2 bg-gray-100 rounded-lg">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-8 w-8 bg-gray-200 rounded" />
        ))}
      </div>
      {/* Editor area skeleton */}
      <div className="bg-gray-100 rounded-lg p-4" style={{ minHeight: 300 }}>
        <div className="space-y-3">
          <div className="h-4 bg-gray-200 rounded w-3/4" />
          <div className="h-4 bg-gray-200 rounded w-1/2" />
          <div className="h-4 bg-gray-200 rounded w-5/6" />
          <div className="h-4 bg-gray-200 rounded w-2/3" />
        </div>
      </div>
    </div>
  )
}

// ============================================
// Document Editor Components (Heavy - TipTap + Yjs)
// ============================================

/**
 * Lazy-loaded Document Editor
 * Bundle impact: ~200KB+ (TipTap + extensions + Yjs)
 */
export const LazyDocumentEditor = dynamic(
  () => import('@/components/document-editor/DocumentEditor').then(mod => mod.default || mod),
  {
    loading: () => <EditorLoadingFallback />,
    ssr: false, // Editor requires browser APIs
  }
)

/**
 * Lazy-loaded Chart Editor (within document editor)
 */
export const LazyChartEditor = dynamic(
  () => import('@/components/document-editor/chart-editor').then(mod => mod.ChartEditor),
  {
    loading: () => <ChartLoadingFallback />,
    ssr: false,
  }
)

/**
 * Lazy-loaded Table Editor
 */
export const LazyTableEditor = dynamic(
  () => import('@/components/document-editor/table-editor').then(mod => mod.TableEditor),
  {
    loading: () => <LoadingFallback height={150} />,
    ssr: false,
  }
)

/**
 * Lazy-loaded Signature Field
 */
export const LazySignatureField = dynamic(
  () => import('@/components/document-editor/signature-field').then(mod => mod.SignatureField),
  {
    loading: () => <LoadingFallback height={100} />,
    ssr: false,
  }
)

/**
 * Lazy-loaded Media Library
 */
export const LazyMediaLibrary = dynamic(
  () => import('@/components/document-editor/media-library').then(mod => mod.MediaLibrary),
  {
    loading: () => <LoadingFallback height={300} />,
    ssr: false,
  }
)

/**
 * Lazy-loaded Shape Editor
 */
export const LazyShapeEditor = dynamic(
  () => import('@/components/document-editor/shape-editor').then(mod => mod.ShapeEditor),
  {
    loading: () => <LoadingFallback height={200} />,
    ssr: false,
  }
)

/**
 * Lazy-loaded Template Selector
 */
export const LazyTemplateSelector = dynamic(
  () => import('@/components/document-editor/template-selector').then(mod => mod.TemplateSelector),
  {
    loading: () => <LoadingFallback height={200} />,
    ssr: false,
  }
)

// ============================================
// Chart Components (Heavy - Recharts)
// ============================================

/**
 * Lazy-loaded Premium Line Chart
 * Bundle impact: ~150KB+ (Recharts)
 */
export const LazyPremiumLineChart = dynamic(
  () => import('@/components/charts/premium-line-chart').then(mod => mod.PremiumLineChart),
  {
    loading: () => <ChartLoadingFallback />,
    ssr: false,
  }
)

/**
 * Lazy-loaded Premium Bar Chart
 */
export const LazyPremiumBarChart = dynamic(
  () => import('@/components/charts/premium-bar-chart').then(mod => mod.PremiumBarChart),
  {
    loading: () => <ChartLoadingFallback />,
    ssr: false,
  }
)

/**
 * Lazy-loaded Premium Pie Chart
 */
export const LazyPremiumPieChart = dynamic(
  () => import('@/components/charts/premium-pie-chart').then(mod => mod.PremiumPieChart),
  {
    loading: () => <ChartLoadingFallback />,
    ssr: false,
  }
)

/**
 * Lazy-loaded Progress Chart (Dashboard)
 */
export const LazyProgressChart = dynamic(
  () => import('@/components/dashboard/progress-chart').then(mod => mod.ProgressChart),
  {
    loading: () => <ChartLoadingFallback />,
    ssr: false,
  }
)

// ============================================
// Calendar Components (Heavy - date libraries)
// ============================================

/**
 * Lazy-loaded Calendar View
 */
export const LazyCalendarView = dynamic(
  () => import('@/components/calendar/calendar-view').then(mod => mod.CalendarView),
  {
    loading: () => <LoadingFallback height={400} />,
    ssr: false,
  }
)

// ============================================
// Helper HOC for lazy loading with custom fallback
// ============================================

/**
 * Creates a lazy-loaded version of any component
 *
 * @example
 * const LazyMyComponent = createLazyComponent(
 *   () => import('@/components/MyComponent'),
 *   'MyComponent',
 *   { height: 200 }
 * )
 */
export function createLazyComponent<T extends ComponentType<any>>(
  importFn: () => Promise<{ [key: string]: T }>,
  exportName: string,
  fallbackOptions?: { height?: number }
): ComponentType<React.ComponentProps<T>> {
  return dynamic(
    () => importFn().then(mod => mod[exportName]),
    {
      loading: () => <LoadingFallback height={fallbackOptions?.height} />,
      ssr: false,
    }
  )
}

// Re-export loading components for custom use
export { LoadingFallback, ChartLoadingFallback, EditorLoadingFallback }
