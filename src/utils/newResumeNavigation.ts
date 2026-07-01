import { clearResumeBaselineHash } from './resumeHash'

const START_NEW_RESUME_KEY = 'startNewResume'
const EDITOR_PREVIEW_SESSION_KEY = 'editorPreviewSession'
const EDITOR_ACTIVE_RESUME_KEY = 'editorActiveResumeId'

export function markStartNewResume(): void {
  sessionStorage.setItem(START_NEW_RESUME_KEY, '1')
  sessionStorage.removeItem(EDITOR_PREVIEW_SESSION_KEY)
  sessionStorage.removeItem(EDITOR_ACTIVE_RESUME_KEY)
}

export function consumeStartNewResume(): boolean {
  if (sessionStorage.getItem(START_NEW_RESUME_KEY) === '1') {
    sessionStorage.removeItem(START_NEW_RESUME_KEY)
    return true
  }
  return false
}

export function markEditorPreviewSession(resumeId: string | null): void {
  sessionStorage.setItem(EDITOR_PREVIEW_SESSION_KEY, resumeId ?? 'unsaved')
}

export function matchesEditorPreviewSession(resumeId: string | null): boolean {
  const sessionId = sessionStorage.getItem(EDITOR_PREVIEW_SESSION_KEY)
  if (!sessionId) return false
  return sessionId === (resumeId ?? 'unsaved')
}

export function clearEditorPreviewSession(): void {
  sessionStorage.removeItem(EDITOR_PREVIEW_SESSION_KEY)
}

export function isPreviewRoute(path: string): boolean {
  const normalized = path.split('?')[0]
  return normalized === '/resume/view' || normalized.startsWith('/resume/view/')
}

export function markOpenExistingResume(): void {
  clearEditorPreviewSession()
  clearResumeBaselineHash()
  sessionStorage.removeItem(EDITOR_ACTIVE_RESUME_KEY)
}

export function markEditorActiveResume(resumeId: string): void {
  sessionStorage.setItem(EDITOR_ACTIVE_RESUME_KEY, resumeId)
}

export function matchesEditorActiveResume(resumeId: string): boolean {
  return sessionStorage.getItem(EDITOR_ACTIVE_RESUME_KEY) === resumeId
}
