'use client'

interface CatalogStylesProps {
  primaryColor: string
}

export function CatalogStyles({ primaryColor }: CatalogStylesProps) {
  return (
    <style jsx global>{`
      :root {
        --catalog-primary: ${primaryColor};
      }
      .bg-brand-blue {
        background-color: ${primaryColor} !important;
      }
      .text-brand-blue {
        color: ${primaryColor} !important;
      }
      .border-brand-blue {
        border-color: ${primaryColor} !important;
      }
      button.bg-brand-blue,
      .bg-brand-blue button {
        background-color: ${primaryColor} !important;
      }
      button.bg-brand-blue:hover,
      .bg-brand-blue button:hover {
        opacity: 0.9;
      }
    `}</style>
  )
}



