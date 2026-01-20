'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { CalendarIcon, Sparkles, Copy, Check, Wand2 } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { toast } from 'sonner'
import type { CreatePromoCodeInput, PromoDiscountType } from '@/types/super-admin.types'

const promoCodeSchema = z.object({
  code: z
    .string()
    .min(3, 'Le code doit contenir au moins 3 caractères')
    .max(20, 'Le code ne peut pas dépasser 20 caractères')
    .regex(/^[A-Z0-9_-]+$/, 'Le code ne peut contenir que des lettres majuscules, chiffres, tirets et underscores'),
  description: z.string().optional(),
  discount_type: z.enum(['percentage', 'fixed_amount', 'trial_extension']),
  discount_value: z.number().min(0, 'La valeur doit être positive'),
  valid_from: z.date(),
  valid_until: z.date().optional().nullable(),
  max_uses: z.number().int().min(1).optional().nullable(),
  max_uses_per_user: z.number().int().min(1).default(1),
  min_subscription_amount: z.number().min(0).optional().nullable(),
  first_subscription_only: z.boolean().default(false),
})

type PromoCodeFormData = z.infer<typeof promoCodeSchema>

interface PromoCodeFormProps {
  onSubmit: (data: CreatePromoCodeInput) => Promise<void>
  onCancel: () => void
  initialData?: Partial<PromoCodeFormData>
  isEditing?: boolean
}

export function PromoCodeForm({
  onSubmit,
  onCancel,
  initialData,
  isEditing = false,
}: PromoCodeFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [copied, setCopied] = useState(false)

  const form = useForm<PromoCodeFormData>({
    resolver: zodResolver(promoCodeSchema),
    defaultValues: {
      code: initialData?.code || '',
      description: initialData?.description || '',
      discount_type: initialData?.discount_type || 'percentage',
      discount_value: initialData?.discount_value || 10,
      valid_from: initialData?.valid_from || new Date(),
      valid_until: initialData?.valid_until || null,
      max_uses: initialData?.max_uses || null,
      max_uses_per_user: initialData?.max_uses_per_user || 1,
      min_subscription_amount: initialData?.min_subscription_amount || null,
      first_subscription_only: initialData?.first_subscription_only || false,
    },
  })

  const discountType = form.watch('discount_type')

  const handleSubmit = async (data: PromoCodeFormData) => {
    setIsSubmitting(true)
    try {
      await onSubmit({
        code: data.code,
        description: data.description,
        discount_type: data.discount_type,
        discount_value: data.discount_value,
        valid_from: data.valid_from.toISOString(),
        valid_until: data.valid_until?.toISOString(),
        max_uses: data.max_uses || undefined,
        max_uses_per_user: data.max_uses_per_user,
        min_subscription_amount: data.min_subscription_amount || undefined,
        first_subscription_only: data.first_subscription_only,
      })
      toast.success(isEditing ? 'Code promo modifié' : 'Code promo créé')
    } catch (error) {
      toast.error('Une erreur est survenue')
    } finally {
      setIsSubmitting(false)
    }
  }

  const generateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let code = ''
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    form.setValue('code', code)
  }

  const copyCode = () => {
    const code = form.getValues('code')
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast.success('Code copié!')
  }

  const getDiscountPreview = () => {
    const value = form.watch('discount_value')
    const type = form.watch('discount_type')

    switch (type) {
      case 'percentage':
        return `-${value}%`
      case 'fixed_amount':
        return `-${value}€`
      case 'trial_extension':
        return `+${value} jours d'essai`
      default:
        return ''
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* Code Preview */}
        <Card className="bg-gradient-to-br from-brand-blue/5 to-brand-cyan/5 border-brand-blue/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Aperçu du code</p>
                <div className="flex items-center gap-3">
                  <span className="text-3xl font-bold font-mono tracking-wider">
                    {form.watch('code') || 'VOTRECODE'}
                  </span>
                  <Badge className="text-lg px-3 py-1" variant="secondary">
                    {getDiscountPreview()}
                  </Badge>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={generateCode}
                  title="Générer un code aléatoire"
                >
                  <Wand2 className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={copyCode}
                  disabled={!form.watch('code')}
                  title="Copier le code"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Form */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Left Column */}
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Code promotionnel *</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="SUMMER2024"
                      className="font-mono uppercase"
                      onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                    />
                  </FormControl>
                  <FormDescription>
                    Lettres majuscules, chiffres, tirets et underscores uniquement
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Promotion d'été - 20% de réduction..."
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 grid-cols-2">
              <FormField
                control={form.control}
                name="discount_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type de réduction *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="percentage">Pourcentage (%)</SelectItem>
                        <SelectItem value="fixed_amount">Montant fixe (€)</SelectItem>
                        <SelectItem value="trial_extension">Extension essai (jours)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="discount_value"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valeur *</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          className="pr-10"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                          {discountType === 'percentage'
                            ? '%'
                            : discountType === 'fixed_amount'
                            ? '€'
                            : 'j'}
                        </span>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-4">
            <div className="grid gap-4 grid-cols-2">
              <FormField
                control={form.control}
                name="valid_from"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Date de début *</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              'justify-start text-left font-normal',
                              !field.value && 'text-muted-foreground'
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value
                              ? format(field.value, 'dd MMM yyyy', { locale: fr })
                              : 'Sélectionner'}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          locale={fr}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="valid_until"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Date de fin</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              'justify-start text-left font-normal',
                              !field.value && 'text-muted-foreground'
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value
                              ? format(field.value, 'dd MMM yyyy', { locale: fr })
                              : 'Illimitée'}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value || undefined}
                          onSelect={field.onChange}
                          locale={fr}
                          disabled={(date) => date < new Date()}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormDescription>Laissez vide pour illimité</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 grid-cols-2">
              <FormField
                control={form.control}
                name="max_uses"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Utilisations max (total)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="Illimité"
                        {...field}
                        value={field.value ?? ''}
                        onChange={(e) =>
                          field.onChange(e.target.value ? parseInt(e.target.value) : null)
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="max_uses_per_user"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Utilisations max / user</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="min_subscription_amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Montant minimum d'abonnement (€)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="Aucun minimum"
                      {...field}
                      value={field.value ?? ''}
                      onChange={(e) =>
                        field.onChange(e.target.value ? parseFloat(e.target.value) : null)
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="first_subscription_only"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Premier abonnement uniquement</FormLabel>
                    <FormDescription>
                      Le code ne sera utilisable que pour un premier abonnement
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Actions */}
        <Separator />
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onCancel}>
            Annuler
          </Button>
          <Button type="submit" disabled={isSubmitting} className="gap-2">
            <Sparkles className="h-4 w-4" />
            {isSubmitting
              ? 'Enregistrement...'
              : isEditing
              ? 'Modifier le code'
              : 'Créer le code'}
          </Button>
        </div>
      </form>
    </Form>
  )
}
