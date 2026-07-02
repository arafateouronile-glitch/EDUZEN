export type ScormVersion = '1.2' | '2004'

export type ScormLessonStatus =
  | 'not attempted'
  | 'incomplete'
  | 'completed'
  | 'passed'
  | 'failed'
  | 'browsed'

export type ScormCompletionStatus = 'completed' | 'incomplete' | 'unknown'

export type ScormSuccessStatus = 'passed' | 'failed' | 'unknown'

export interface ScormManifestData {
  version: ScormVersion
  title: string
  description?: string
  entryPoint: string
  identifier?: string
}

export interface ScormPackage {
  id: string
  lesson_id: string
  organization_id: string
  scorm_version: ScormVersion
  title: string | null
  description: string | null
  entry_point: string
  storage_path: string
  package_size_bytes: number | null
  created_at: string
  updated_at: string
}

export interface ScormSession {
  id: string
  lesson_id: string
  student_id: string
  organization_id: string
  scorm_version: ScormVersion
  lesson_status: ScormLessonStatus
  completion_status: ScormCompletionStatus
  success_status: ScormSuccessStatus
  score_raw: number | null
  score_min: number | null
  score_max: number | null
  score_scaled: number | null
  total_time: string | null
  suspend_data: string | null
  location: string | null
  attempt_count: number
  started_at: string
  last_accessed_at: string
  completed_at: string | null
  created_at: string
  updated_at: string
}

export interface ScormSessionPayload {
  lesson_id: string
  student_id: string
  organization_id: string
  scorm_version: ScormVersion
  lesson_status?: ScormLessonStatus
  completion_status?: ScormCompletionStatus
  success_status?: ScormSuccessStatus
  score_raw?: number | null
  score_min?: number | null
  score_max?: number | null
  score_scaled?: number | null
  total_time?: string | null
  suspend_data?: string | null
  location?: string | null
  completed_at?: string | null
}

export interface ScormRuntimeData {
  [key: string]: string
}
