'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { submitEnrollmentForm } from './actions'
import type { FormField, DynamicSource } from '@/lib/types/enrollment-forms'
import {
  Loader2,
  CheckCircle2,
  AlertCircle,
  Upload,
  X,
  ChevronDown,
  RefreshCw,
  Calendar,
  MapPin,
  Mail,
  Phone,
  Clock,
} from 'lucide-react'
import Image from 'next/image'

interface LinkData {
  id: string
  token: string
  org_id: string
  template_id: string
  session_id?: string | null
  expires_at?: string | null
  max_uses?: number | null
  current_uses: number
  is_active: boolean
  enrollment_form_templates: {
    id: string
    name: string
    description?: string | null
    fields: FormField[]
  } | null
  sessions: {
    id: string
    name: string
    start_date: string
    end_date: string
    location: string | null
  } | null
  organizations: {
    id: string
    name: string
    logo_url: string | null
    email: string | null
    phone?: string | null
  } | null
}

type PageState = 'loading' | 'form' | 'submitting' | 'success' | 'error' | 'invalid'
type DynamicOption = { id: string; label: string; formation_id?: string | null; program_id?: string | null }
type DynamicOptionsMap = Record<string, DynamicOption[]>

// ── Field input component ────────────────────────────────────
function FormInput({
  field,
  value,
  onChange,
  dynamicOptions,
  selectedProgramId,
}: {
  field: FormField
  value: string | string[]
  onChange: (v: string | string[]) => void
  dynamicOptions?: DynamicOptionsMap
  selectedProgramId?: string
}) {
  const base = 'w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-[#335ACF]/30 focus:border-[#335ACF] transition-all duration-200'

  if (field.type === 'separator') {
    return (
      <div className="col-span-full pt-2 pb-1">
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-gray-400 text-xs font-semibold tracking-wider uppercase">
            {field.label}
          </span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>
      </div>
    )
  }

  if (field.type === 'textarea') {
    return (
      <textarea
        className={`${base} resize-none min-h-[100px]`}
        placeholder={field.placeholder || ''}
        value={value as string}
        onChange={e => onChange(e.target.value)}
        rows={4}
      />
    )
  }

  if (field.type === 'select') {
    const sourceKey = field.dynamic_source as string | undefined
    let dynOpts = sourceKey && dynamicOptions ? (dynamicOptions[sourceKey] ?? []) : null
    if (sourceKey === 'sessions' && dynOpts && selectedProgramId) {
      const filtered = dynOpts.filter(s => s.program_id === selectedProgramId)
      if (filtered.length > 0) dynOpts = filtered
    }

    const options = dynOpts
      ? dynOpts
      : (field.options ?? []).map(o => ({ id: o, label: o }))

    return (
      <div className="relative">
        <select
          className={`${base} appearance-none pr-10 cursor-pointer`}
          value={value as string}
          onChange={e => onChange(e.target.value)}
        >
          <option value="">Sélectionner...</option>
          {options.map(opt => (
            <option key={opt.id} value={opt.id}>{opt.label}</option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
      </div>
    )
  }

  if (field.type === 'radio') {
    return (
      <div className="space-y-2">
        {(field.options ?? []).map(opt => (
          <label key={opt.value ?? opt.label} className="flex items-center gap-3 cursor-pointer group">
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
              value === (opt.value ?? opt.label)
                ? 'border-[#335ACF] bg-[#335ACF]'
                : 'border-gray-300 group-hover:border-[#335ACF]/50'
            }`}>
              {value === (opt.value ?? opt.label) && (
                <div className="w-2 h-2 rounded-full bg-white" />
              )}
            </div>
            <span className="text-gray-700 text-sm">{opt.label}</span>
          </label>
        ))}
      </div>
    )
  }

  if (field.type === 'checkbox') {
    return (
      <div className="space-y-2">
        {(field.options ?? []).map(opt => {
          const arr = Array.isArray(value) ? value : []
          const checked = arr.includes(opt.value ?? opt.label)
          return (
            <label key={opt.value ?? opt.label} className="flex items-center gap-3 cursor-pointer group">
              <div
                className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors flex-shrink-0 ${
                  checked ? 'bg-[#335ACF] border-[#335ACF]' : 'border-gray-300 group-hover:border-[#335ACF]/50'
                }`}
                onClick={() => {
                  const v = opt.value ?? opt.label
                  onChange(checked ? arr.filter(x => x !== v) : [...arr, v])
                }}
              >
                {checked && <span className="text-white text-xs font-bold leading-none">✓</span>}
              </div>
              <span className="text-gray-700 text-sm">{opt.label}</span>
            </label>
          )
        })}
      </div>
    )
  }

  if (field.type === 'date') {
    return (
      <input
        type="date"
        className={base}
        value={value as string}
        onChange={e => onChange(e.target.value)}
      />
    )
  }

  if (field.type === 'phone') {
    return (
      <input
        type="tel"
        className={base}
        placeholder={field.placeholder || '+33 6 00 00 00 00'}
        value={value as string}
        onChange={e => onChange(e.target.value)}
      />
    )
  }

  return (
    <input
      type={field.type === 'email' ? 'email' : field.type === 'number' ? 'number' : 'text'}
      className={base}
      placeholder={field.placeholder || ''}
      value={value as string}
      onChange={e => onChange(e.target.value)}
    />
  )
}

// ── File dropzone ─────────────────────────────────────────────
function FileDropzone({
  field,
  file,
  onFile,
}: {
  field: FormField
  file: { name: string; size: number } | null
  onFile: (f: File | null) => void
}) {
  const [dragging, setDragging] = useState(false)

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) onFile(f)
  }

  return (
    <div
      className={`relative border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer ${
        dragging
          ? 'border-[#335ACF] bg-[#335ACF]/5'
          : file
          ? 'border-green-300 bg-green-50'
          : 'border-gray-200 hover:border-[#335ACF]/40 hover:bg-gray-50'
      }`}
      onDragOver={e => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => document.getElementById(`file-${field.id}`)?.click()}
    >
      <input
        id={`file-${field.id}`}
        type="file"
        className="sr-only"
        accept={field.accept}
        onChange={e => onFile(e.target.files?.[0] ?? null)}
      />
      {file ? (
        <div className="flex items-center justify-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-green-500" />
          <div className="text-left">
            <p className="text-sm font-medium text-gray-800">{file.name}</p>
            <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(0)} Ko</p>
          </div>
          <button
            type="button"
            onClick={e => { e.stopPropagation(); onFile(null) }}
            className="ml-2 p-1 rounded-full hover:bg-gray-200 text-gray-400"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <Upload className="w-8 h-8 text-gray-300 mx-auto" />
          <p className="text-sm text-gray-500">
            Glissez un fichier ici ou <span className="text-[#335ACF] font-medium">parcourir</span>
          </p>
          {field.accept && (
            <p className="text-xs text-gray-400">{field.accept}</p>
          )}
          {field.max_size_mb && (
            <p className="text-xs text-gray-400">Max {field.max_size_mb} Mo</p>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main page ────────────────────────────────────────────────
export default function PublicEnrollmentForm() {
  const params = useParams()
  const token = params?.token as string

  const [pageState, setPageState] = useState<PageState>('loading')
  const [linkData, setLinkData] = useState<LinkData | null>(null)
  const [dynamicOptions, setDynamicOptions] = useState<DynamicOptionsMap>({})
  const [errorMessage, setErrorMessage] = useState('')
  const [formValues, setFormValues] = useState<Record<string, string | string[]>>({})
  const [fileValues, setFileValues] = useState<Record<string, File | null>>({})
  const [rgpdChecked, setRgpdChecked] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => { loadForm() }, [token]) // eslint-disable-line react-hooks/exhaustive-deps

  const loadForm = async () => {
    setPageState('loading')
    try {
      const res = await fetch(`/api/enrollment-forms/public/${token}`)
      if (!res.ok) {
        const data = await res.json()
        setErrorMessage(data.error ?? 'Lien invalide')
        setPageState('invalid')
        return
      }
      const data = await res.json()
      setLinkData(data.link)
      setDynamicOptions(data.dynamicOptions ?? {})
      setPageState('form')
    } catch {
      setErrorMessage('Erreur de chargement')
      setPageState('invalid')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!rgpdChecked) return
    setSubmitting(true)
    setPageState('submitting')
    try {
      const filesPayload: Record<string, { name: string; type: string; base64: string; size: number }> = {}
      for (const [fieldId, file] of Object.entries(fileValues)) {
        if (!file) continue
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result as string)
          reader.onerror = reject
          reader.readAsDataURL(file)
        })
        filesPayload[fieldId] = { name: file.name, type: file.type, base64, size: file.size }
      }
      const result = await submitEnrollmentForm(token, formValues, filesPayload)
      if (result.success) {
        setPageState('success')
      } else {
        setErrorMessage(result.error ?? 'Erreur lors de la soumission')
        setPageState('error')
      }
    } catch {
      setErrorMessage("Une erreur inattendue s'est produite")
      setPageState('error')
    } finally {
      setSubmitting(false)
    }
  }

  const fields = (linkData?.enrollment_form_templates?.fields ?? [])
    .slice()
    .sort((a, b) => a.order - b.order)

  const programFieldId = fields.find(f => f.maps_to === 'enrollment.program_id')?.id
  const selectedProgramId = programFieldId ? (formValues[programFieldId] as string | undefined) : undefined

  const org = linkData?.organizations
  const session = linkData?.sessions
  const formName = linkData?.enrollment_form_templates?.name ?? "Formulaire d'inscription"
  const formDesc = linkData?.enrollment_form_templates?.description

  // ── Loading ──────────────────────────────────────────────
  if (pageState === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-[#335ACF]" />
      </div>
    )
  }

  // ── Invalid ──────────────────────────────────────────────
  if (pageState === 'invalid') {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
        <div className="max-w-md w-full text-center bg-white rounded-2xl shadow-sm border border-gray-100 p-10">
          <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-gray-900 text-xl font-semibold mb-2">Formulaire indisponible</h1>
          <p className="text-gray-500">{errorMessage}</p>
        </div>
      </div>
    )
  }

  // ── Success ──────────────────────────────────────────────
  if (pageState === 'success') {
    const email = typeof formValues['email'] === 'string' ? formValues['email'] : ''
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
        <div className="max-w-md w-full text-center">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10">
            {org?.logo_url && (
              <Image src={org.logo_url} alt={org.name} width={64} height={64}
                className="mx-auto rounded-xl object-contain mb-6" />
            )}
            <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-8 h-8 text-green-500" />
            </div>
            <h1 className="text-gray-900 text-2xl font-bold mb-2" style={{ fontFamily: 'Syne, Arial, sans-serif' }}>
              Inscription envoyée !
            </h1>
            {session && (
              <p className="text-gray-600 mb-1">Formation : <span className="font-medium text-gray-900">{session.name}</span></p>
            )}
            {email && (
              <p className="text-gray-500 text-sm mt-3">
                Un email de confirmation vous a été envoyé à <span className="text-[#335ACF] font-medium">{email}</span>
              </p>
            )}
            <div className="mt-6 pt-6 border-t border-gray-100">
              <p className="text-gray-400 text-sm">{org?.name ?? ''}</p>
            </div>
          </div>
          <p className="text-gray-400 text-xs mt-4">Propulsé par EduZen</p>
        </div>
      </div>
    )
  }

  // ── Error ────────────────────────────────────────────────
  if (pageState === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
        <div className="max-w-md w-full text-center bg-white rounded-2xl shadow-sm border border-gray-100 p-10">
          <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-gray-900 text-xl font-semibold mb-2">Une erreur s&apos;est produite</h1>
          <p className="text-gray-500 mb-6">{errorMessage}</p>
          <button
            onClick={() => setPageState('form')}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors text-sm font-medium"
          >
            <RefreshCw className="w-4 h-4" />
            Réessayer
          </button>
        </div>
      </div>
    )
  }

  // ── Form ─────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col lg:flex-row">

      {/* ── Left panel — branding ── */}
      <div
        className="lg:w-[380px] lg:min-h-screen flex-shrink-0 relative flex flex-col"
        style={{ background: 'linear-gradient(160deg, #15263f 0%, #1e3a5f 60%, #0f1e33 100%)' }}
      >
        {/* Decorative circles */}
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-[0.04]"
          style={{ background: '#34B9EE', transform: 'translate(30%, -30%)' }} />
        <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full opacity-[0.06]"
          style={{ background: '#335ACF', transform: 'translate(-30%, 30%)' }} />

        <div className="relative z-10 flex flex-col h-full p-8 lg:p-10">
          {/* Logo + org name */}
          <div className="mb-8">
            {org?.logo_url ? (
              <Image
                src={org.logo_url}
                alt={org?.name ?? ''}
                width={72}
                height={72}
                className="rounded-xl object-contain mb-4"
              />
            ) : (
              <div className="w-16 h-16 rounded-xl bg-white/10 flex items-center justify-center mb-4">
                <span className="text-white text-2xl font-bold">
                  {org?.name?.[0] ?? 'O'}
                </span>
              </div>
            )}
            <h2 className="text-white text-xl font-bold leading-tight" style={{ fontFamily: 'Syne, Arial, sans-serif' }}>
              {org?.name}
            </h2>
          </div>

          {/* Separator */}
          <div className="h-px bg-white/10 mb-8" />

          {/* Form title */}
          <div className="mb-8">
            <p className="text-[#34B9EE] text-xs font-semibold uppercase tracking-wider mb-2">Formulaire</p>
            <h1 className="text-white text-2xl font-bold leading-snug" style={{ fontFamily: 'Syne, Arial, sans-serif' }}>
              {formName}
            </h1>
            {formDesc && (
              <p className="text-white/50 text-sm mt-2 leading-relaxed">{formDesc}</p>
            )}
          </div>

          {/* Session info */}
          {session && (
            <div className="rounded-xl p-4 mb-6" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <p className="text-[#34B9EE] text-xs font-semibold uppercase tracking-wider mb-3">Session</p>
              <p className="text-white font-semibold text-base mb-3">{session.name}</p>
              {session.start_date && (
                <div className="flex items-center gap-2 text-white/60 text-sm mb-2">
                  <Calendar className="w-4 h-4 flex-shrink-0 text-[#34B9EE]/70" />
                  <span>
                    Du {new Date(session.start_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                    {session.end_date && ` au ${new Date(session.end_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`}
                  </span>
                </div>
              )}
              {session.location && (
                <div className="flex items-center gap-2 text-white/60 text-sm">
                  <MapPin className="w-4 h-4 flex-shrink-0 text-[#34B9EE]/70" />
                  <span>{session.location}</span>
                </div>
              )}
            </div>
          )}

          {/* Spacer */}
          <div className="flex-1" />

          {/* Contact info */}
          {(org?.email || org?.phone) && (
            <div className="space-y-2">
              <p className="text-white/30 text-xs uppercase tracking-wider font-semibold mb-3">Contact</p>
              {org.email && (
                <div className="flex items-center gap-2 text-white/50 text-sm">
                  <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate">{org.email}</span>
                </div>
              )}
              {org.phone && (
                <div className="flex items-center gap-2 text-white/50 text-sm">
                  <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{org.phone}</span>
                </div>
              )}
            </div>
          )}

          <p className="text-white/20 text-xs mt-8 hidden lg:block">Propulsé par EduZen</p>
        </div>
      </div>

      {/* ── Right panel — form ── */}
      <div className="flex-1 flex flex-col py-10 px-4 sm:px-8 lg:px-12 overflow-y-auto">
        <div className="max-w-xl w-full mx-auto">

          {/* Mobile: org name */}
          <div className="lg:hidden flex items-center gap-3 mb-6">
            {org?.logo_url && (
              <Image src={org.logo_url} alt={org?.name ?? ''} width={40} height={40}
                className="rounded-lg object-contain" />
            )}
            <div>
              <p className="text-gray-500 text-xs">{org?.name}</p>
              <p className="font-semibold text-gray-900 text-sm">{formName}</p>
            </div>
          </div>

          {/* Form header */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Syne, Arial, sans-serif' }}>
              Votre inscription
            </h2>
            <p className="text-gray-500 text-sm mt-1">
              Tous les champs marqués <span className="text-[#335ACF] font-medium">*</span> sont obligatoires.
            </p>
          </div>

          {/* Form card */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Honeypot */}
              <input type="text" name="__hp_website" className="sr-only" tabIndex={-1} autoComplete="off"
                value={formValues['__hp_website'] as string ?? ''}
                onChange={e => setFormValues(prev => ({ ...prev, '__hp_website': e.target.value }))}
              />

              {fields.map(field => (
                <div key={field.id} className={field.type === 'separator' ? '' : 'space-y-1.5'}>
                  {field.type !== 'separator' && (
                    <label className="block text-sm font-medium text-gray-700">
                      {field.label}
                      {field.required && <span className="text-[#335ACF] ml-1">*</span>}
                    </label>
                  )}
                  {field.description && field.type !== 'separator' && (
                    <p className="text-gray-400 text-xs">{field.description}</p>
                  )}
                  {field.type === 'file' ? (
                    <FileDropzone
                      field={field}
                      file={fileValues[field.id] ? { name: fileValues[field.id]!.name, size: fileValues[field.id]!.size } : null}
                      onFile={f => setFileValues(prev => ({ ...prev, [field.id]: f }))}
                    />
                  ) : (
                    <FormInput
                      field={field}
                      value={formValues[field.id] ?? (field.type === 'checkbox' ? [] : '')}
                      onChange={v => {
                        setFormValues(prev => {
                          const next = { ...prev, [field.id]: v }
                          if (field.maps_to === 'enrollment.program_id') {
                            const sessionField = fields.find(f => f.maps_to === 'enrollment.session_id')
                            if (sessionField) next[sessionField.id] = ''
                          }
                          return next
                        })
                      }}
                      dynamicOptions={dynamicOptions}
                      selectedProgramId={selectedProgramId}
                    />
                  )}
                </div>
              ))}

              {/* RGPD */}
              <div className="pt-3 border-t border-gray-100">
                <label className="flex items-start gap-3 cursor-pointer">
                  <button
                    type="button"
                    onClick={() => setRgpdChecked(!rgpdChecked)}
                    className={`w-5 h-5 rounded-md border-2 flex-shrink-0 flex items-center justify-center mt-0.5 transition-colors ${
                      rgpdChecked
                        ? 'bg-[#335ACF] border-[#335ACF]'
                        : 'border-gray-300 hover:border-[#335ACF]/50'
                    }`}
                  >
                    {rgpdChecked && <span className="text-white text-xs font-bold leading-none">✓</span>}
                  </button>
                  <span className="text-gray-600 text-sm leading-relaxed">
                    J&apos;accepte que mes données soient traitées dans le cadre de cette formation
                    conformément à la politique de confidentialité de{' '}
                    <span className="font-medium text-gray-900">{org?.name ?? 'cet organisme'}</span>.{' '}
                    <span className="text-[#335ACF]">*</span>
                  </span>
                </label>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={!rgpdChecked || submitting || pageState === 'submitting'}
                className="w-full py-3.5 rounded-xl font-semibold text-white text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
                style={{
                  background: 'linear-gradient(135deg, #335ACF, #34B9EE)',
                  boxShadow: rgpdChecked ? '0 4px 20px rgba(51,90,207,0.3)' : 'none',
                }}
              >
                {(submitting || pageState === 'submitting') && <Loader2 className="w-4 h-4 animate-spin" />}
                {submitting || pageState === 'submitting' ? 'Envoi en cours...' : 'Envoyer mon inscription'}
              </button>
            </form>
          </div>

          <p className="text-gray-400 text-xs text-center mt-6 lg:hidden">Propulsé par EduZen</p>
        </div>
      </div>
    </div>
  )
}
