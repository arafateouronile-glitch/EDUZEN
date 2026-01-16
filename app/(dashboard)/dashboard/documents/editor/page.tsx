import dynamic from 'next/dynamic'

// Import dynamique pour éviter les erreurs SSR avec TipTap
const DocumentEditor = dynamic(
  () => import('@/components/document-editor/DocumentEditor'),
  { 
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="text-gray-500">Chargement de l'éditeur...</div>
      </div>
    ),
  }
)

export default function DocumentEditorPage() {
  return <DocumentEditor />
}



