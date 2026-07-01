import { initialState } from '../initialResumeState'

const RESUME_BASELINE_HASH_KEY = 'resumeEditBaselineHash'

export function computeResumeHash(resume: unknown): string {
  if (!resume || typeof resume !== 'object') return ''

  const r = resume as Record<string, unknown>
  const fieldsToCheck = {
    name: r.name ?? '',
    contact: r.contact ?? {},
    summary: r.summary ?? '',
    experience: r.experience ?? {},
    education: r.education ?? {},
    professionalAffiliations: r.professionalAffiliations ?? {},
    skills: r.skills ?? {}
  }

  return JSON.stringify(fieldsToCheck)
}

const emptyResumeHash = computeResumeHash(initialState.resume)

export function storeResumeBaselineHash(hash: string): void {
  sessionStorage.setItem(RESUME_BASELINE_HASH_KEY, hash)
}

export function getResumeBaselineHash(): string | null {
  return sessionStorage.getItem(RESUME_BASELINE_HASH_KEY)
}

export function clearResumeBaselineHash(): void {
  sessionStorage.removeItem(RESUME_BASELINE_HASH_KEY)
}

export function resumeHasEditorContent(resume: unknown): boolean {
  if (!resume) return false
  return computeResumeHash(resume) !== emptyResumeHash
}
