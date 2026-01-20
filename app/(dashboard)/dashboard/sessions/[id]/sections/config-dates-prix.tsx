'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Trash, Calendar, Clock, MapPin, Package, Pencil } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import type { SessionFormData, SlotConfig } from '../hooks/use-session-detail'
import type { TableRow } from '@/lib/types/supabase-helpers'
import { sessionSlotService } from '@/lib/services/session-slot.service'
import { useToast } from '@/components/ui/toast'

type SessionSlot = TableRow<'session_slots'>

type SessionModule = { id: string; session_id: string; name: string; amount: number; currency: string; display_order: number }

interface ConfigDatesPrixProps {
  sessionId: string
  formData: SessionFormData
  onFormDataChange: (data: SessionFormData) => void
  slotConfig: SlotConfig
  onSlotConfigChange: (config: SlotConfig) => void
  sessionSlots?: SessionSlot[]
  onSlotsRefetch: () => void
  formation?: { name?: string; price?: number; currency?: string } | null
  program?: { name?: string } | null
  sessionModules?: SessionModule[]
  onModulesRefetch: () => void
}

export function ConfigDatesPrix({
  sessionId,
  formData,
  onFormDataChange,
  slotConfig,
  onSlotConfigChange,
  sessionSlots = [],
  onSlotsRefetch,
  formation,
  program,
  sessionModules = [],
  onModulesRefetch,
}: ConfigDatesPrixProps) {
  const { addToast } = useToast()
  const [isGenerating, setIsGenerating] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [newName, setNewName] = useState('')
  const [newAmount, setNewAmount] = useState('')
  const supabase = createClient()

  const defaultModuleName = program?.name || formation?.name || 'Module'
  const defaultModuleAmount = formation?.price != null ? String(formation.price) : '0'
  const hasSuggested = sessionModules.length === 0 && (program || formation)

  const handleAddModule = async (name: string, amount: string) => {
    const n = name.trim()
    const a = parseFloat(amount) || 0
    if (!n) {
      addToast({ type: 'error', title: 'Erreur', description: 'Le nom du module est requis.' })
      return
    }
    try {
      await supabase.from('session_modules' as any).insert({
        session_id: sessionId,
        name: n,
        amount: a,
        currency: formation?.currency || 'EUR',
        display_order: sessionModules.length,
      })
      onModulesRefetch()
      setNewName('')
      setNewAmount('')
      addToast({ type: 'success', title: 'Module ajouté', description: 'Le module a été ajouté.' })
    } catch (e) {
      addToast({ type: 'error', title: 'Erreur', description: (e as Error).message })
    }
  }

  const handleUpdateModule = async (id: string, name: string, amount: number) => {
    try {
      await supabase.from('session_modules' as any).update({ name: name.trim(), amount }).eq('id', id)
      onModulesRefetch()
      setEditingId(null)
      addToast({ type: 'success', title: 'Module mis à jour' })
    } catch (e) {
      addToast({ type: 'error', title: 'Erreur', description: (e as Error).message })
    }
  }

  const handleDeleteModule = async (id: string) => {
    if (!confirm('Supprimer ce module ?')) return
    try {
      await supabase.from('session_modules' as any).delete().eq('id', id)
      onModulesRefetch()
      addToast({ type: 'success', title: 'Module supprimé' })
    } catch (e) {
      addToast({ type: 'error', title: 'Erreur', description: (e as Error).message })
    }
  }

  const handleGenerateSlots = async () => {
    if (!formData.start_date || !formData.end_date) {
      addToast({
        type: 'error',
        title: 'Erreur',
        description: 'Les dates de début et de fin sont requises',
      })
      return
    }

    setIsGenerating(true)
    try {
      await sessionSlotService.generateSlots({
        sessionId,
        startDate: formData.start_date,
        endDate: formData.end_date,
        timeSlotType: slotConfig.timeSlotType === 'full_day' ? 'both' : slotConfig.timeSlotType,
        morningStart: slotConfig.morningStart,
        morningEnd: slotConfig.morningEnd,
        afternoonStart: slotConfig.afternoonStart,
        afternoonEnd: slotConfig.afternoonEnd,
        location: formData.location || undefined,
        teacherId: formData.teacher_id || undefined,
        capacityMax: formData.capacity_max ? parseInt(formData.capacity_max) : undefined,
      })
      onSlotsRefetch()
      addToast({
        type: 'success',
        title: 'Séances générées',
        description: 'Les séances ont été générées avec succès.',
      })
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Une erreur est survenue lors de la génération des séances.',
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const handleDeleteSlot = async (slotId: string) => {
    if (!confirm('Voulez-vous supprimer cette séance ?')) return

    try {
      await sessionSlotService.delete(slotId)
      onSlotsRefetch()
      addToast({
        type: 'success',
        title: 'Séance supprimée',
        description: 'La séance a été supprimée avec succès.',
      })
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Erreur',
        description: 'Une erreur est survenue lors de la suppression de la séance.',
      })
    }
  }

  const handleDeleteAllSlots = async () => {
    if (!confirm('Voulez-vous supprimer toutes les séances ?')) return

    try {
      await sessionSlotService.deleteBySessionId(sessionId)
      onSlotsRefetch()
      addToast({
        type: 'success',
        title: 'Séances supprimées',
        description: 'Toutes les séances ont été supprimées.',
      })
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Erreur',
        description: 'Une erreur est survenue lors de la suppression des séances.',
      })
    }
  }

  const handleCreateSlot = async () => {
    const dateInput = document.getElementById('manual-slot-date') as HTMLInputElement
    const timeSlotSelect = document.getElementById('manual-slot-time-slot') as HTMLSelectElement
    const startInput = document.getElementById('manual-slot-start') as HTMLInputElement
    const endInput = document.getElementById('manual-slot-end') as HTMLInputElement

    if (!dateInput?.value || !startInput?.value || !endInput?.value) {
      addToast({
        type: 'error',
        title: 'Erreur',
        description: 'Veuillez remplir tous les champs.',
      })
      return
    }

    try {
      await sessionSlotService.create({
        session_id: sessionId,
        date: dateInput.value,
        time_slot: timeSlotSelect.value as 'morning' | 'afternoon' | 'full_day',
        start_time: startInput.value,
        end_time: endInput.value,
        location: formData.location || null,
        teacher_id: formData.teacher_id || null,
        capacity_max: formData.capacity_max ? parseInt(formData.capacity_max) : null,
      })
      onSlotsRefetch()
      
      // Réinitialiser les champs
      dateInput.value = ''
      startInput.value = ''
      endInput.value = ''

      addToast({
        type: 'success',
        title: 'Séance ajoutée',
        description: 'La séance a été ajoutée avec succès.',
      })
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Erreur',
        description: 'Une erreur est survenue lors de l\'ajout de la séance.',
      })
    }
  }

  return (
    <div className="space-y-6">
      {/* Configuration des dates et informations générales */}
      <Card>
        <CardHeader>
          <CardTitle>Dates et informations générales</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Date de début *</label>
              <input
                type="date"
                value={formData.start_date}
                onChange={(e) => onFormDataChange({ ...formData, start_date: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Date de fin *</label>
              <input
                type="date"
                value={formData.end_date}
                onChange={(e) => onFormDataChange({ ...formData, end_date: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Lieu/Salle</label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => onFormDataChange({ ...formData, location: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="Ex: Salle A1"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Capacité maximale</label>
            <input
              type="number"
              value={formData.capacity_max}
              onChange={(e) => onFormDataChange({ ...formData, capacity_max: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="Ex: 25"
            />
          </div>
        </CardContent>
      </Card>

      {/* Modules et prix (pour le devis) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Modules et prix
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Définissez les modules (lignes) qui apparaîtront sur le devis avec leurs prix. Par défaut : un module reprenant le programme et le prix de la formation.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {hasSuggested && (
            <div className="p-4 bg-muted/50 rounded-xl border border-dashed">
              <p className="text-sm font-medium mb-3">Module par défaut (à partir du programme)</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                <div>
                  <label className="block text-xs font-medium mb-1">Nom</label>
                  <Input
                    value={newName || defaultModuleName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Nom du module"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Prix ({formation?.currency || 'EUR'})</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={newAmount || defaultModuleAmount}
                    onChange={(e) => setNewAmount(e.target.value)}
                    placeholder="0"
                  />
                </div>
                <Button
                  onClick={() => handleAddModule(newName || defaultModuleName, newAmount || defaultModuleAmount)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter ce module
                </Button>
              </div>
            </div>
          )}

          {sessionModules.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Modules configurés</p>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {sessionModules.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center gap-3 p-3 border rounded-lg bg-background"
                  >
                    {editingId === m.id ? (
                      <>
                        <Input
                          className="flex-1"
                          value={newName}
                          onChange={(e) => setNewName(e.target.value)}
                          placeholder="Nom"
                        />
                        <Input
                          type="number"
                          step="0.01"
                          className="w-28"
                          value={newAmount}
                          onChange={(e) => setNewAmount(e.target.value)}
                        />
                        <Button size="sm" onClick={() => handleUpdateModule(m.id, newName, parseFloat(newAmount) || 0)}>Enregistrer</Button>
                        <Button size="sm" variant="ghost" onClick={() => { setEditingId(null); setNewName(''); setNewAmount(''); }}>Annuler</Button>
                      </>
                    ) : (
                      <>
                        <span className="flex-1 font-medium">{m.name}</span>
                        <span className="text-muted-foreground">{Number(m.amount).toFixed(2)} {m.currency}</span>
                        <Button variant="ghost" size="icon" onClick={() => { setEditingId(m.id); setNewName(m.name); setNewAmount(String(m.amount)) }}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteModule(m.id)}>
                          <Trash className="h-4 w-4 text-destructive" />
                        </Button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {sessionModules.length > 0 && (
            <div className="p-3 border rounded-lg bg-muted/30">
              <p className="text-xs font-medium mb-2">Ajouter un autre module</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                <div>
                  <label className="block text-xs font-medium mb-1">Nom</label>
                  <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nom du module" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Prix</label>
                  <Input type="number" step="0.01" value={newAmount} onChange={(e) => setNewAmount(e.target.value)} placeholder="0" />
                </div>
                <Button onClick={() => handleAddModule(newName, newAmount)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Configuration des séances */}
      <Card>
        <CardHeader>
          <CardTitle>Configuration des séances</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Type de séances *</label>
            <select
              value={slotConfig.timeSlotType}
              onChange={(e) => onSlotConfigChange({ ...slotConfig, timeSlotType: e.target.value as SlotConfig['timeSlotType'] })}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="both">Matin et après-midi</option>
              <option value="morning">Matin seulement</option>
              <option value="afternoon">Après-midi seulement</option>
              <option value="full_day">Journée complète</option>
            </select>
          </div>

          {(slotConfig.timeSlotType === 'morning' || slotConfig.timeSlotType === 'both') && (
            <div className="grid grid-cols-2 gap-4 p-4 bg-blue-50 rounded-lg">
              <div>
                <label className="block text-sm font-medium mb-2">Début matin</label>
                <input
                  type="time"
                  value={slotConfig.morningStart}
                  onChange={(e) => onSlotConfigChange({ ...slotConfig, morningStart: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Fin matin</label>
                <input
                  type="time"
                  value={slotConfig.morningEnd}
                  onChange={(e) => onSlotConfigChange({ ...slotConfig, morningEnd: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
            </div>
          )}

          {(slotConfig.timeSlotType === 'afternoon' || slotConfig.timeSlotType === 'both') && (
            <div className="grid grid-cols-2 gap-4 p-4 bg-orange-50 rounded-lg">
              <div>
                <label className="block text-sm font-medium mb-2">Début après-midi</label>
                <input
                  type="time"
                  value={slotConfig.afternoonStart}
                  onChange={(e) => onSlotConfigChange({ ...slotConfig, afternoonStart: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Fin après-midi</label>
                <input
                  type="time"
                  value={slotConfig.afternoonEnd}
                  onChange={(e) => onSlotConfigChange({ ...slotConfig, afternoonEnd: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
            </div>
          )}

          {slotConfig.timeSlotType === 'full_day' && (
            <div className="grid grid-cols-2 gap-4 p-4 bg-brand-blue-ghost rounded-lg">
              <div>
                <label className="block text-sm font-medium mb-2">Début journée</label>
                <input
                  type="time"
                  value={slotConfig.morningStart}
                  onChange={(e) => onSlotConfigChange({ ...slotConfig, morningStart: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Fin journée</label>
                <input
                  type="time"
                  value={slotConfig.afternoonEnd}
                  onChange={(e) => onSlotConfigChange({ ...slotConfig, afternoonEnd: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
            </div>
          )}

          <Button
            onClick={handleGenerateSlots}
            disabled={!formData.start_date || !formData.end_date || isGenerating}
            className="w-full"
          >
            <Plus className="mr-2 h-4 w-4" />
            {isGenerating ? 'Génération...' : 'Générer les séances automatiquement'}
          </Button>

          {!formData.start_date || !formData.end_date ? (
            <p className="text-xs text-muted-foreground text-center">
              Veuillez d'abord définir les dates de début et de fin de la session
            </p>
          ) : null}
        </CardContent>
      </Card>

      {/* Liste des séances générées */}
      {sessionSlots.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Séances générées ({sessionSlots.length})</span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDeleteAllSlots}
              >
                <Trash className="mr-2 h-4 w-4" />
                Tout supprimer
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {sessionSlots.map((slot) => (
                <div
                  key={slot.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{formatDate(slot.date)}</span>
                      <span className={`px-2 py-1 rounded text-xs ${
                        slot.time_slot === 'morning' ? 'bg-blue-100 text-blue-800' :
                        slot.time_slot === 'afternoon' ? 'bg-orange-100 text-orange-800' :
                        'bg-brand-blue-ghost text-brand-blue'
                      }`}>
                        {slot.time_slot === 'morning' ? 'Matin' :
                         slot.time_slot === 'afternoon' ? 'Après-midi' : 'Journée complète'}
                      </span>
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        {slot.start_time} - {slot.end_time}
                      </span>
                      {slot.location && (
                        <>
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">{slot.location}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteSlot(slot.id)}
                  >
                    <Trash className="h-4 w-4 text-red-600" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Ajouter une séance manuelle */}
      <Card>
        <CardHeader>
          <CardTitle>Ajouter une séance manuelle</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Date</label>
              <input
                type="date"
                id="manual-slot-date"
                min={formData.start_date}
                max={formData.end_date}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Créneau</label>
              <select
                id="manual-slot-time-slot"
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="morning">Matin</option>
                <option value="afternoon">Après-midi</option>
                <option value="full_day">Journée complète</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Heure début</label>
              <input
                type="time"
                id="manual-slot-start"
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Heure fin</label>
              <input
                type="time"
                id="manual-slot-end"
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          </div>
          <Button
            className="w-full mt-4"
            onClick={handleCreateSlot}
            disabled={!formData.start_date || !formData.end_date}
          >
            <Plus className="mr-2 h-4 w-4" />
            Ajouter la séance
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

