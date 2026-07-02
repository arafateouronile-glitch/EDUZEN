'use client'

import { useEffect, useRef, useCallback } from 'react'
import type { ScormVersion, ScormSession, ScormSessionPayload } from '@/lib/types/scorm.types'

interface ScormPlayerProps {
  lessonId: string
  entryPoint: string
  scormVersion: ScormVersion
  studentId: string
  organizationId: string
  initialSession?: ScormSession | null
  onComplete?: () => void
}

declare global {
  interface Window {
    API?: unknown
    API_1484_11?: unknown
  }
}

export function ScormPlayer({
  lessonId,
  entryPoint,
  scormVersion,
  studentId,
  organizationId,
  initialSession,
  onComplete,
}: ScormPlayerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const sessionDataRef = useRef<Partial<ScormSessionPayload>>({})
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const apiRef = useRef<unknown>(null)

  const saveSession = useCallback(async (final = false) => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current)
      saveTimerRef.current = null
    }

    const payload: ScormSessionPayload = {
      lesson_id: lessonId,
      student_id: studentId,
      organization_id: organizationId,
      scorm_version: scormVersion,
      ...sessionDataRef.current,
    }

    if (final && payload.lesson_status &&
      ['passed', 'completed'].includes(payload.lesson_status)) {
      payload.completed_at = new Date().toISOString()
    }
    if (final && payload.completion_status === 'completed') {
      payload.completed_at = new Date().toISOString()
    }

    try {
      await fetch('/api/elearning/scorm/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (
        payload.lesson_status === 'passed' ||
        payload.lesson_status === 'completed' ||
        payload.completion_status === 'completed' ||
        payload.success_status === 'passed'
      ) {
        onComplete?.()
      }
    } catch {
      // silently fail — la progression sera retentée au prochain commit
    }
  }, [lessonId, studentId, organizationId, scormVersion, onComplete])

  const debouncedSave = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => saveSession(false), 2000)
  }, [saveSession])

  useEffect(() => {
    // Pré-remplir avec la session existante si disponible
    if (initialSession) {
      sessionDataRef.current = {
        lesson_status: initialSession.lesson_status,
        completion_status: initialSession.completion_status,
        success_status: initialSession.success_status,
        score_raw: initialSession.score_raw ?? undefined,
        score_min: initialSession.score_min ?? undefined,
        score_max: initialSession.score_max ?? undefined,
        score_scaled: initialSession.score_scaled ?? undefined,
        total_time: initialSession.total_time ?? undefined,
        suspend_data: initialSession.suspend_data ?? undefined,
        location: initialSession.location ?? undefined,
      }
    }
  }, [initialSession])

  useEffect(() => {
    let mounted = true

    const initScormApi = async () => {
      const { Scorm12API, Scorm2004API } = await import('scorm-again')

      if (!mounted) return

      const settings = {
        autocommit: false,
        autocommitSeconds: 30,
        logLevel: 1,
        ...(initialSession?.suspend_data
          ? { initialData: buildInitialData(initialSession, scormVersion) }
          : {}),
      }

      const api = scormVersion === '2004'
        ? new Scorm2004API(settings)
        : new Scorm12API(settings)

      apiRef.current = api

      if (scormVersion === '2004') {
        window.API_1484_11 = api

        api.on('SetValue.cmi.completion_status', (_: string, value: string) => {
          sessionDataRef.current.completion_status = value as ScormSessionPayload['completion_status']
          debouncedSave()
        })
        api.on('SetValue.cmi.success_status', (_: string, value: string) => {
          sessionDataRef.current.success_status = value as ScormSessionPayload['success_status']
          debouncedSave()
        })
        api.on('SetValue.cmi.score.scaled', (_: string, value: string) => {
          sessionDataRef.current.score_scaled = parseFloat(value) || null
          debouncedSave()
        })
        api.on('SetValue.cmi.score.raw', (_: string, value: string) => {
          sessionDataRef.current.score_raw = parseFloat(value) || null
          debouncedSave()
        })
        api.on('SetValue.cmi.location', (_: string, value: string) => {
          sessionDataRef.current.location = value
        })
        api.on('SetValue.cmi.suspend_data', (_: string, value: string) => {
          sessionDataRef.current.suspend_data = value
        })
        api.on('Commit', () => saveSession(false))
        api.on('Terminate', () => saveSession(true))
      } else {
        window.API = api

        api.on('SetValue.cmi.core.lesson_status', (_: string, value: string) => {
          sessionDataRef.current.lesson_status = value as ScormSessionPayload['lesson_status']
          debouncedSave()
        })
        api.on('SetValue.cmi.core.score.raw', (_: string, value: string) => {
          sessionDataRef.current.score_raw = parseFloat(value) || null
          debouncedSave()
        })
        api.on('SetValue.cmi.core.score.min', (_: string, value: string) => {
          sessionDataRef.current.score_min = parseFloat(value) || null
        })
        api.on('SetValue.cmi.core.score.max', (_: string, value: string) => {
          sessionDataRef.current.score_max = parseFloat(value) || null
        })
        api.on('SetValue.cmi.core.lesson_location', (_: string, value: string) => {
          sessionDataRef.current.location = value
        })
        api.on('SetValue.cmi.suspend_data', (_: string, value: string) => {
          sessionDataRef.current.suspend_data = value
        })
        api.on('LMSCommit', () => saveSession(false))
        api.on('LMSFinish', () => saveSession(true))
      }
    }

    initScormApi()

    const handleBeforeUnload = () => saveSession(true)
    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      mounted = false
      window.removeEventListener('beforeunload', handleBeforeUnload)
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      // Nettoyer l'API globale
      delete window.API
      delete window.API_1484_11
    }
  }, [lessonId, scormVersion, initialSession, debouncedSave, saveSession])

  const src = `/api/elearning/scorm/content/${lessonId}/${entryPoint}`

  return (
    <div className="w-full h-full min-h-[600px] bg-black">
      <iframe
        ref={iframeRef}
        src={src}
        className="w-full h-full border-0"
        style={{ minHeight: 600 }}
        allow="fullscreen"
        title="Contenu SCORM"
      />
    </div>
  )
}

function buildInitialData(
  session: ScormSession,
  version: ScormVersion
): Record<string, string> {
  if (version === '2004') {
    return {
      'cmi.completion_status': session.completion_status || 'incomplete',
      'cmi.success_status': session.success_status || 'unknown',
      'cmi.location': session.location || '',
      'cmi.suspend_data': session.suspend_data || '',
      'cmi.score.scaled': session.score_scaled?.toString() || '',
    }
  }
  return {
    'cmi.core.lesson_status': session.lesson_status || 'incomplete',
    'cmi.core.lesson_location': session.location || '',
    'cmi.suspend_data': session.suspend_data || '',
    'cmi.core.score.raw': session.score_raw?.toString() || '',
  }
}
