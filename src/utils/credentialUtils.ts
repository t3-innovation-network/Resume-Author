// Centralized credential handling utilities

export interface SelectedCredential {
  id: string
  url: string
  name: string
  vc: any
  fileId?: string
}

// Get credential name from various credential formats
export function getCredentialName(vc: any): string {
  try {
    if (!vc || typeof vc !== 'object') {
      return ''
    }

    const credentialSubject = vc.credentialSubject
    if (!credentialSubject || typeof credentialSubject !== 'object') {
      return typeof vc.name === 'string' ? vc.name : ''
    }
    
    // Check various credential types
    if (credentialSubject.employeeName) {
      return `Performance Review: ${credentialSubject.employeeJobTitle || 'Unknown Position'}`
    }
    if (credentialSubject.volunteerWork) {
      return `Volunteer: ${credentialSubject.volunteerWork}`
    }
    if (credentialSubject.role) {
      return `Employment: ${credentialSubject.role}`
    }
    if (credentialSubject.credentialName) {
      return credentialSubject.credentialName
    }
    if (credentialSubject.skill?.[0]?.name) {
      return credentialSubject.skill[0].name
    }
    if (credentialSubject.name) {
      return credentialSubject.name
    }
    if (Array.isArray(credentialSubject.achievement) && credentialSubject.achievement[0]?.name) {
      return credentialSubject.achievement[0].name
    }
    if (
      credentialSubject.achievement &&
      typeof credentialSubject.achievement === 'object' &&
      !Array.isArray(credentialSubject.achievement) &&
      credentialSubject.achievement.name
    ) {
      return credentialSubject.achievement.name
    }
    if (typeof vc.name === 'string' && vc.name.trim()) {
      return vc.name
    }

    return ''
  } catch (error) {
    console.error('Error getting credential name:', error)
    return 'Credential'
  }
}

// Parse stored credentialLink string to array of credentials
export function parseStoredCredentials(credentialLink: string | undefined): SelectedCredential[] {
  if (!credentialLink || credentialLink.trim() === '') return []
  
  try {
    const parsed = JSON.parse(credentialLink)
    if (!Array.isArray(parsed)) return []
    
    const credentials: SelectedCredential[] = []
    
    for (const item of parsed) {
      if (typeof item !== 'string') continue
      
      const commaIdx = item.indexOf(',')
      if (commaIdx === -1) continue
      
      const fileId = item.substring(0, commaIdx)
      const vcJson = item.substring(commaIdx + 1)
      
      try {
        const vc = JSON.parse(vcJson)
        const credential: SelectedCredential = {
          id: vc?.originalItem?.id || vc?.id || fileId,
          url: '',
          name: getCredentialName(vc),
          vc: vc,
          fileId: fileId
        }
        credentials.push(credential)
      } catch (e) {
        console.error('Error parsing individual credential:', e)
        continue
      }
    }
    
    return credentials
  } catch (e) {
    console.error('Error parsing credential link:', e)
    return []
  }
}

// Convert credentials array to storage format
export function credentialsToStorageFormat(credentials: SelectedCredential[]): string {
  const credLinks = credentials
    .map(cred => {
      const fileId = cred.fileId || cred.id
      if (!fileId || !cred.vc) return ''
      
      try {
        return `${fileId},${JSON.stringify(cred.vc)}`
      } catch (e) {
        console.error('Error stringifying credential:', e)
        return ''
      }
    })
    .filter(Boolean)
  
  return JSON.stringify(credLinks)
}

// Generate unique IDs for items
export function generateUniqueId(prefix: string = 'item'): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substr(2, 9)
  return `${prefix}-${timestamp}-${random}`
}

// Deduplicate credentials by ID
export function deduplicateCredentials(credentials: SelectedCredential[]): SelectedCredential[] {
  const seen = new Map<string, SelectedCredential>()
  
  for (const cred of credentials) {
    if (!seen.has(cred.id)) {
      seen.set(cred.id, cred)
    }
  }
  
  return Array.from(seen.values())
}

// Check if credential is verified
export function isCredentialVerified(vc: any): boolean {
  return vc?.credentialStatus === 'verified' || 
         vc?.credentialStatus?.status === 'verified'
}
