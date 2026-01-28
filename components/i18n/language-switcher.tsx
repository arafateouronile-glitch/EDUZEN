'use client'

import { useState, useEffect } from 'react'
import { useLocale } from 'next-intl'
import { useRouter, usePathname } from '@/i18n/navigation'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Globe } from 'lucide-react'

const languages = [
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
]

export function LanguageSwitcher() {
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()
  const [isChanging, setIsChanging] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Éviter l'erreur d'hydratation en ne rendant le DropdownMenu qu'après le montage côté client
  useEffect(() => {
    setMounted(true)
  }, [])

  const currentLanguage = languages.find((lang) => lang.code === locale) || languages[0]

  const handleLanguageChange = (newLocale: string) => {
    if (newLocale === locale || isChanging) return
    
    setIsChanging(true)
    // Utiliser le router de next-intl qui gère automatiquement le changement de locale
    router.replace(pathname, { locale: newLocale })
    
    // Réinitialiser l'état après un court délai
    setTimeout(() => {
      setIsChanging(false)
    }, 500)
  }

  // Rendre un bouton simple pendant le SSR pour éviter l'erreur d'hydratation
  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className="gap-2"
        disabled
      >
        <Globe className="h-4 w-4" />
        <span className="hidden sm:inline">{currentLanguage.flag} {currentLanguage.label}</span>
        <span className="sm:hidden">{currentLanguage.flag}</span>
      </Button>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-2"
          disabled={isChanging}
        >
          <Globe className="h-4 w-4" />
          <span className="hidden sm:inline">{currentLanguage.flag} {currentLanguage.label}</span>
          <span className="sm:hidden">{currentLanguage.flag}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {languages.map((language) => (
          <DropdownMenuItem
            key={language.code}
            onClick={() => handleLanguageChange(language.code)}
            disabled={language.code === locale || isChanging}
            className="cursor-pointer"
          >
            <span className="mr-2">{language.flag}</span>
            {language.label}
            {language.code === locale && (
              <span className="ml-auto text-xs text-muted-foreground">✓</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

