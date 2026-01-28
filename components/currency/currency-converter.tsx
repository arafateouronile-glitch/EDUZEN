'use client'

import { useState } from 'react'
import { useFormatting } from '@/lib/hooks/use-formatting'
import { currencyService } from '@/lib/services/currency.service'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeftRight, Loader2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { logger, sanitizeError } from '@/lib/utils/logger'

export function CurrencyConverter() {
  const t = useTranslations('payments')
  const { formatCurrency } = useFormatting()
  const [amount, setAmount] = useState<string>('')
  const [fromCurrency, setFromCurrency] = useState<string>('EUR')
  const [toCurrency, setToCurrency] = useState<string>('XOF')
  const [convertedAmount, setConvertedAmount] = useState<number | null>(null)
  const [isConverting, setIsConverting] = useState(false)

  const supportedCurrencies = currencyService.getSupportedCurrencies()

  const handleConvert = async () => {
    const numAmount = parseFloat(amount)
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error('Montant invalide')
      return
    }

    setIsConverting(true)
    try {
      const converted = await currencyService.convert(
        numAmount,
        fromCurrency,
        toCurrency
      )
      setConvertedAmount(converted)
    } catch (error) {
      logger.error('Error converting currency:', error)
      toast.error('Erreur lors de la conversion')
    } finally {
      setIsConverting(false)
    }
  }

  const handleSwap = () => {
    setFromCurrency(toCurrency)
    setToCurrency(fromCurrency)
    setConvertedAmount(null)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('currencyConverter') || 'Convertisseur de devises'}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label className="text-sm font-medium mb-2 block">
              {t('amount') || 'Montant'}
            </label>
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              min="0"
              step="0.01"
            />
          </div>
          <div className="flex-1">
            <label className="text-sm font-medium mb-2 block">
              {t('from') || 'De'}
            </label>
            <Select value={fromCurrency} onValueChange={setFromCurrency}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {supportedCurrencies.map((currency) => (
                  <SelectItem key={currency} value={currency}>
                    {currency} ({currencyService.getCurrencySymbol(currency)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={handleSwap}
            className="mt-6"
          >
            <ArrowLeftRight className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <label className="text-sm font-medium mb-2 block">
              {t('to') || 'Vers'}
            </label>
            <Select value={toCurrency} onValueChange={setToCurrency}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {supportedCurrencies.map((currency) => (
                  <SelectItem key={currency} value={currency}>
                    {currency} ({currencyService.getCurrencySymbol(currency)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button
          onClick={handleConvert}
          disabled={!amount || isConverting}
          className="w-full"
        >
          {isConverting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t('converting') || 'Conversion...'}
            </>
          ) : (
            t('convert') || 'Convertir'
          )}
        </Button>

        {convertedAmount !== null && (
          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">
              {t('convertedAmount') || 'Montant converti'}
            </p>
            <p className="text-2xl font-bold">
              {formatCurrency(convertedAmount, toCurrency)}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}



