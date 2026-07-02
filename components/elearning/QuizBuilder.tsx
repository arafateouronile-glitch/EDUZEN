'use client'

import { useState, useCallback } from 'react'
import {
  Plus, Trash2, GripVertical, CheckCircle2, Circle,
  Settings, ChevronDown, ChevronUp, AlertCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { QuizContent, QuizQuestion, QuizSettings, QuestionType } from '@/lib/types/quiz.types'
import { DEFAULT_QUIZ_SETTINGS } from '@/lib/types/quiz.types'

interface QuizBuilderProps {
  content: QuizContent | null
  onChange: (content: QuizContent) => void
  onSave: () => void
  isSaving: boolean
  isDirty: boolean
}

function newQuestion(type: QuestionType): QuizQuestion {
  const id = crypto.randomUUID()
  if (type === 'true_false') {
    return { id, type, question: '', points: 1, correct: true, explanation: '' }
  }
  return {
    id, type, question: '', points: 1, explanation: '',
    options: [
      { id: crypto.randomUUID(), text: '', correct: true },
      { id: crypto.randomUUID(), text: '', correct: false },
    ],
  }
}

function parseContent(raw: QuizContent | null): QuizContent {
  return {
    settings: { ...DEFAULT_QUIZ_SETTINGS, ...(raw?.settings ?? {}) },
    questions: raw?.questions ?? [],
  }
}

export function QuizBuilder({ content, onChange, onSave, isSaving, isDirty }: QuizBuilderProps) {
  const quiz = parseContent(content)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const update = useCallback((partial: Partial<QuizContent>) => {
    onChange({ ...quiz, ...partial })
  }, [quiz, onChange])

  const updateSettings = (s: Partial<QuizSettings>) => {
    update({ settings: { ...quiz.settings, ...s } })
  }

  const addQuestion = (type: QuestionType) => {
    const q = newQuestion(type)
    update({ questions: [...quiz.questions, q] })
    setExpandedId(q.id)
  }

  const removeQuestion = (id: string) => {
    update({ questions: quiz.questions.filter(q => q.id !== id) })
    if (expandedId === id) setExpandedId(null)
  }

  const updateQuestion = (id: string, patch: Partial<QuizQuestion>) => {
    update({
      questions: quiz.questions.map(q => q.id === id ? { ...q, ...patch } : q),
    })
  }

  const updateOption = (qId: string, optId: string, text: string) => {
    update({
      questions: quiz.questions.map(q => {
        if (q.id !== qId || !q.options) return q
        return { ...q, options: q.options.map(o => o.id === optId ? { ...o, text } : o) }
      }),
    })
  }

  const setCorrectOption = (qId: string, optId: string) => {
    update({
      questions: quiz.questions.map(q => {
        if (q.id !== qId || !q.options) return q
        return { ...q, options: q.options.map(o => ({ ...o, correct: o.id === optId })) }
      }),
    })
  }

  const addOption = (qId: string) => {
    update({
      questions: quiz.questions.map(q => {
        if (q.id !== qId || !q.options) return q
        return { ...q, options: [...q.options, { id: crypto.randomUUID(), text: '', correct: false }] }
      }),
    })
  }

  const removeOption = (qId: string, optId: string) => {
    update({
      questions: quiz.questions.map(q => {
        if (q.id !== qId || !q.options || q.options.length <= 2) return q
        const filtered = q.options.filter(o => o.id !== optId)
        const hasCorrect = filtered.some(o => o.correct)
        if (!hasCorrect && filtered.length > 0) filtered[0].correct = true
        return { ...q, options: filtered }
      }),
    })
  }

  const totalPoints = quiz.questions.reduce((s, q) => s + (q.points || 1), 0)

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <p className="text-xs text-gray-500">
              {quiz.questions.length} question{quiz.questions.length !== 1 ? 's' : ''} · {totalPoints} pt{totalPoints !== 1 ? 's' : ''} · Seuil {quiz.settings.pass_threshold}%
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSettingsOpen(v => !v)}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-100"
          >
            <Settings className="h-3.5 w-3.5" />
            Paramètres
            {settingsOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
          {isDirty && (
            <button
              type="button"
              onClick={onSave}
              disabled={isSaving}
              className="text-xs bg-brand-blue text-white px-4 py-1.5 rounded-lg hover:bg-brand-blue/90 disabled:opacity-50"
            >
              {isSaving ? 'Sauvegarde…' : 'Sauvegarder'}
            </button>
          )}
        </div>
      </div>

      {/* Settings panel */}
      {settingsOpen && (
        <div className="bg-blue-50 border-b border-blue-100 px-6 py-4">
          <div className="grid grid-cols-2 gap-4 max-w-xl">
            <label className="block">
              <span className="text-xs font-medium text-gray-600">Seuil de réussite (%)</span>
              <input
                type="number" min={0} max={100}
                value={quiz.settings.pass_threshold}
                onChange={e => updateSettings({ pass_threshold: Number(e.target.value) })}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-gray-600">Tentatives max (0 = illimité)</span>
              <input
                type="number" min={0}
                value={quiz.settings.max_attempts}
                onChange={e => updateSettings({ max_attempts: Number(e.target.value) })}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
              />
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={quiz.settings.show_correct_answers}
                onChange={e => updateSettings({ show_correct_answers: e.target.checked })}
                className="rounded border-gray-300 text-brand-blue focus:ring-brand-blue/30"
              />
              <span className="text-sm text-gray-700">Montrer les corrections après</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={quiz.settings.shuffle_questions}
                onChange={e => updateSettings({ shuffle_questions: e.target.checked })}
                className="rounded border-gray-300 text-brand-blue focus:ring-brand-blue/30"
              />
              <span className="text-sm text-gray-700">Mélanger les questions</span>
            </label>
          </div>
        </div>
      )}

      {/* Questions */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
        {quiz.questions.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <AlertCircle className="h-10 w-10 mb-3 opacity-40" />
            <p className="text-sm">Aucune question. Ajoutez-en une ci-dessous.</p>
          </div>
        )}

        {quiz.questions.map((q, idx) => (
          <div key={q.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {/* Question header */}
            <div
              className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50"
              onClick={() => setExpandedId(expandedId === q.id ? null : q.id)}
            >
              <GripVertical className="h-4 w-4 text-gray-300 flex-shrink-0" />
              <span className="text-xs font-semibold text-gray-400 w-6">{idx + 1}</span>
              <span className={cn(
                'text-xs px-2 py-0.5 rounded-full font-medium',
                q.type === 'true_false' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
              )}>
                {q.type === 'true_false' ? 'Vrai/Faux' : 'QCM'}
              </span>
              <p className="flex-1 text-sm text-gray-800 truncate">
                {q.question || <span className="text-gray-400 italic">Question vide…</span>}
              </p>
              <span className="text-xs text-gray-400">{q.points} pt{q.points !== 1 ? 's' : ''}</span>
              <button
                type="button"
                onClick={e => { e.stopPropagation(); removeQuestion(q.id) }}
                className="p-1 text-gray-300 hover:text-red-500 transition-colors"
              >
                <Trash2 className="h-4 w-4" />
              </button>
              {expandedId === q.id ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
            </div>

            {/* Question body */}
            {expandedId === q.id && (
              <div className="border-t border-gray-100 px-4 py-4 space-y-4">
                {/* Question text */}
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Intitulé de la question</label>
                  <textarea
                    value={q.question}
                    onChange={e => updateQuestion(q.id, { question: e.target.value })}
                    rows={2}
                    placeholder="Saisissez votre question…"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30 resize-none"
                  />
                </div>

                {/* True/False */}
                {q.type === 'true_false' && (
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-2 block">Bonne réponse</label>
                    <div className="flex gap-3">
                      {([true, false] as const).map(val => (
                        <button
                          key={String(val)}
                          type="button"
                          onClick={() => updateQuestion(q.id, { correct: val })}
                          className={cn(
                            'flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors',
                            q.correct === val
                              ? 'border-green-500 bg-green-50 text-green-700'
                              : 'border-gray-200 text-gray-600 hover:border-gray-300'
                          )}
                        >
                          {q.correct === val ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
                          {val ? 'Vrai' : 'Faux'}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* MCQ options */}
                {q.type === 'mcq' && q.options && (
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-2 block">Options (cliquer le cercle pour marquer la bonne réponse)</label>
                    <div className="space-y-2">
                      {q.options.map(opt => (
                        <div key={opt.id} className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setCorrectOption(q.id, opt.id)}
                            className={cn(
                              'flex-shrink-0 transition-colors',
                              opt.correct ? 'text-green-500' : 'text-gray-300 hover:text-gray-400'
                            )}
                          >
                            {opt.correct ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
                          </button>
                          <input
                            type="text"
                            value={opt.text}
                            onChange={e => updateOption(q.id, opt.id, e.target.value)}
                            placeholder={`Option ${q.options!.indexOf(opt) + 1}…`}
                            className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
                          />
                          {q.options!.length > 2 && (
                            <button
                              type="button"
                              onClick={() => removeOption(q.id, opt.id)}
                              className="text-gray-300 hover:text-red-400"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      ))}
                      {q.options.length < 6 && (
                        <button
                          type="button"
                          onClick={() => addOption(q.id)}
                          className="flex items-center gap-1.5 text-xs text-brand-blue hover:underline mt-1"
                        >
                          <Plus className="h-3.5 w-3.5" /> Ajouter une option
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Points + Explanation */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1 block">Points</label>
                    <input
                      type="number" min={1}
                      value={q.points}
                      onChange={e => updateQuestion(q.id, { points: Number(e.target.value) || 1 })}
                      className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1 block">Explication (optionnel)</label>
                    <input
                      type="text"
                      value={q.explanation ?? ''}
                      onChange={e => updateQuestion(q.id, { explanation: e.target.value })}
                      placeholder="Affiché après correction…"
                      className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add question footer */}
      <div className="bg-white border-t border-gray-200 px-6 py-3 flex items-center gap-3">
        <span className="text-xs text-gray-500">Ajouter :</span>
        <button
          type="button"
          onClick={() => addQuestion('mcq')}
          className="flex items-center gap-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors"
        >
          <Plus className="h-3.5 w-3.5" /> QCM
        </button>
        <button
          type="button"
          onClick={() => addQuestion('true_false')}
          className="flex items-center gap-1.5 text-xs font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 px-3 py-1.5 rounded-lg transition-colors"
        >
          <Plus className="h-3.5 w-3.5" /> Vrai / Faux
        </button>
      </div>
    </div>
  )
}
