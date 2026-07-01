import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import {
  Box,
  Button,
  Typography,
  LinearProgress,
  linearProgressClasses,
  styled,
  IconButton,
  TextField,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Drawer,
  AppBar,
  Toolbar
} from '@mui/material'
import MenuIcon from '@mui/icons-material/Menu'
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks'
import CloseIcon from '@mui/icons-material/Close'
import { useTheme } from '@mui/material/styles'
import useMediaQuery from '@mui/material/useMediaQuery'
import LeftSidebar from './ResumeEditor/LeftSidebar'
import RightSidebar from './ResumeEditor/RightSidebar'
import Section from './ResumeEditor/Section'
import { useSelector, useDispatch } from 'react-redux'
import { RootState, AppDispatch, store } from '../redux/store'
import { SVGEditName } from '../assets/svgs'
import useGoogleDrive from '../hooks/useGoogleDrive' // , { DriveFileMeta }
import { useNavigate, useLocation } from 'react-router-dom'
import {
  updateSection,
  setSelectedResume,
  setActiveSection,
  resetToInitialState
} from '../redux/slices/resume'
import OptionalSectionsManager from './ResumeEditor/OptionalSectionCard'
import { storeFileTokens } from '../firebase/storage'
import { getLocalStorage } from '../tools/cookie'
import { prepareResumeForVC } from '../tools/resumeAdapter'
import FileSelectorOverlay from './NewFileUpload/FileSelectorOverlay'
import { FileItem } from './NewFileUpload/FileList'
import { fetchUserResumes } from '../redux/slices/myresumes'
import { flushAllSectionUpdates } from '../utils/sectionUpdateFlush'
import {
  computeResumeHash,
  storeResumeBaselineHash,
  getResumeBaselineHash,
  clearResumeBaselineHash,
  resumeHasEditorContent
} from '../utils/resumeHash'
import {
  consumeStartNewResume,
  markEditorPreviewSession,
  matchesEditorPreviewSession,
  clearEditorPreviewSession,
  isPreviewRoute,
  markEditorActiveResume,
  matchesEditorActiveResume
} from '../utils/newResumeNavigation'
import { initialState } from '../initialResumeState'

const COLORS = {
  primary: '#3A35A2',
  primaryHover: '#322e8e',
  text: '#2E2E48',
  white: '#ffffff'
} as const

const ButtonStyles = {
  border: `2px solid ${COLORS.primary}`,
  borderRadius: '100px',
  textTransform: 'none' as const,
  fontWeight: 600,
  color: COLORS.primary,
  p: '5px 25px'
}

const BorderLinearProgress = styled(LinearProgress)(({ theme }) => ({
  height: '15px',
  borderRadius: '0px 30px 30px 0px',
  [`&.${linearProgressClasses.colorPrimary}`]: {
    backgroundColor: '#E1E2F6',
    ...theme.applyStyles('dark', {
      backgroundColor: theme.palette.grey[800]
    })
  },
  [`& .${linearProgressClasses.bar}`]: {
    borderRadius: 5,
    backgroundColor: '#614BC4',
    ...theme.applyStyles('dark', {
      backgroundColor: '#614BC4'
    })
  }
}))

// FINAL PATCH: Guarantee credentialLink is a JSON string if fullCredential is present in the signed object (all sections)
function forceCredentialJsonString(sectionArr: any[]): any[] {
  if (!Array.isArray(sectionArr)) return sectionArr
  return sectionArr.map(item => {
    if (
      item.credentialLink &&
      typeof item.credentialLink === 'string' &&
      !item.credentialLink.startsWith('{') &&
      item.fullCredential
    ) {
      return {
        ...item,
        credentialLink: JSON.stringify(item.fullCredential)
      }
    }
    return item
  })
}

function ensureAbsoluteIds(obj: any) {
  if (typeof obj !== 'object' || obj === null) return
  if (obj.id && typeof obj.id === 'string' && !obj.id.match(/^urn:|^https?:/)) {
    obj.id = 'urn:uuid:' + obj.id
  }
  if (
    obj['@id'] &&
    typeof obj['@id'] === 'string' &&
    !obj['@id'].match(/^urn:|^https?:/)
  ) {
    obj['@id'] = 'urn:uuid:' + obj['@id']
  }
  for (const key in obj) {
    if (typeof obj[key] === 'object') {
      ensureAbsoluteIds(obj[key])
    }
  }
}

const ResumeEditor: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const dispatch = useDispatch<AppDispatch>()
  const [sectionOrder, setSectionOrder] = useState<string[]>([
    'Professional Summary',
    'Work Experience',
    'Education',
    'Professional Affiliations',
    'Skills and Abilities'
  ])
  const [isEditingName, setIsEditingName] = useState(false)
  const [resumeName, setResumeName] = useState('Untitled')
  const [isDraftSaving, setIsDraftSaving] = useState(false)
  const [isSigningSaving, setIsSigningSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [showExitDialog, setShowExitDialog] = useState(false)
  const [exitDestination, setExitDestination] = useState<string | null>(null)
  const [isDirty, setIsDirty] = useState(false)
  const [fileSelectorOpen, setFileSelectorOpen] = useState(false)
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null)
  const [sectionEvidence, setSectionEvidence] = useState<Record<string, string[][]>>({})
  const [files, setFiles] = useState<FileItem[]>([])
  const [allFiles, setAllFiles] = useState<FileItem[]>([])
  const [activeItemIndex, setActiveItemIndex] = useState<number | undefined>(undefined)
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const [isLeftDrawerOpen, setIsLeftDrawerOpen] = useState(false)
  const [isRightDrawerOpen, setIsRightDrawerOpen] = useState(false)

  // Responsive constants
  const SPACING = {
    mobile: { px: 2, py: 1 },
    desktop: { px: 3, py: 1.5 }
  } as const

  const DRAWER_WIDTH = {
    mobile: '90%',
    tablet: 420
  } as const

  // Reference to store the original resume state for comparison
  const originalResumeRef = useRef<string | null>(null)

  // Get resumeId from URL parameters
  const queryParams = new URLSearchParams(location.search)
  const resumeId = queryParams.get('id')

  const activeSection = useSelector((state: RootState) => state.resume.activeSection)
  const resume = useSelector((state: RootState) => state?.resume.resume)
  const resumeIsDirty = useSelector((state: RootState) => state.resume.isDirty)
  const { instances, isInitialized } = useGoogleDrive()
  const { accessToken } = useSelector((state: RootState) => state.auth)
  const refreshToken = getLocalStorage('refresh_token')

  // Memoize the resume hash computation
  const currentResumeHash = useMemo(() => computeResumeHash(resume), [resume])

  // Memoize button spacing based on screen size
  const buttonSpacing = useMemo(
    () => (isMobile ? SPACING.mobile : SPACING.desktop),
    [isMobile, SPACING.mobile, SPACING.desktop]
  )

  // Memoize drawer handlers
  const handleLeftDrawerToggle = useCallback(() => {
    setIsLeftDrawerOpen(prev => !prev)
  }, [])

  const handleRightDrawerToggle = useCallback(() => {
    setIsRightDrawerOpen(prev => !prev)
  }, [])

  const closeLeftDrawer = useCallback(() => setIsLeftDrawerOpen(false), [])
  const closeRightDrawer = useCallback(() => setIsRightDrawerOpen(false), [])

  const syncResumeNameFromData = useCallback((resumeData: { name?: string; contact?: { fullName?: string } }) => {
    try {
      const name =
        resumeData.contact?.fullName ?? resumeData.name ?? 'Untitled Resume'
      setResumeName(name)
    } catch {
      setResumeName('Untitled Resume')
    }
  }, [])

  // Only reset when the user explicitly starts a new resume (not when returning from preview)
  useEffect(() => {
    if (!resumeId && isInitialized) {
      const startNewFromNavigation =
        (location.state as { startNewResume?: boolean } | null)?.startNewResume ===
          true || consumeStartNewResume()

      if (startNewFromNavigation) {
        dispatch(resetToInitialState())
        sessionStorage.removeItem('lastEditedResumeId')
        clearEditorPreviewSession()
        clearResumeBaselineHash()

        const keys = Object.keys(localStorage)
        keys
          .filter(key => key.startsWith('resume_draft_'))
          .forEach(key => localStorage.removeItem(key))

        originalResumeRef.current = null
        setIsDirty(false)
        setResumeName('Untitled')

        const emptyHash = computeResumeHash(initialState.resume)
        storeResumeBaselineHash(emptyHash)
        originalResumeRef.current = emptyHash

        window.history.replaceState({}, '', '/resume/new')
      }
    }
  }, [resumeId, isInitialized, dispatch, location.state])

  // Restore dirty baseline from session when the editor remounts (e.g. back from preview)
  useEffect(() => {
    const baseline = getResumeBaselineHash()
    if (baseline) {
      originalResumeRef.current = baseline
    }
  }, [])

  // First visit to an unsaved new resume without a stored baseline
  useEffect(() => {
    if (!resume || resumeId || getResumeBaselineHash()) return
    const hash = computeResumeHash(resume)
    storeResumeBaselineHash(hash)
    originalResumeRef.current = hash
  }, [resume, resumeId])

  // Load resume data from Google Drive
  useEffect(() => {
    if (resumeId && isInitialized) {
      const resumeFromSession = store.getState().resume.resume

      const canUseReduxWithoutFetch =
        resumeFromSession &&
        resumeHasEditorContent(resumeFromSession) &&
        (matchesEditorPreviewSession(resumeId) ||
          matchesEditorActiveResume(resumeId))

      if (canUseReduxWithoutFetch) {
        syncResumeNameFromData(resumeFromSession)
        return
      }

      clearEditorPreviewSession()

      const fetchResumeData = async () => {
        setIsLoading(true)

        try {
          // Check if this is a temporary import (starts with "temp-")
          if (resumeId.startsWith('temp-')) {
            // Load from localStorage instead of Google Drive
            const draftKey = `resume_draft_${resumeId}`
            const savedDraft = localStorage.getItem(draftKey)

            if (savedDraft) {
              const resumeData = JSON.parse(savedDraft)

              // Dispatch to Redux
              dispatch(setSelectedResume(resumeData))

              const hash = computeResumeHash(resumeData)
              storeResumeBaselineHash(hash)
              originalResumeRef.current = hash
              markEditorActiveResume(resumeId)

              syncResumeNameFromData(resumeData)

              console.log(
                'Resume loaded successfully from localStorage (temporary import)'
              )
            } else {
              console.error('Temporary resume data not found in localStorage')
              // Redirect back to upload page if data is missing
              navigate('/resume/upload')
            }
          } else {
            // Load from Google Drive as usual
            const fileData = await instances.storage?.retrieve(resumeId)

            if (fileData) {
              const resumeData = fileData.data ?? fileData

              // Dispatch to Redux
              dispatch(setSelectedResume(resumeData))

              const hash = computeResumeHash(resumeData)
              storeResumeBaselineHash(hash)
              originalResumeRef.current = hash
              markEditorActiveResume(resumeId)

              syncResumeNameFromData(resumeData)
            } else {
              console.error('Retrieved resume data is empty')
            }
          }
        } catch (error) {
          console.error('Error retrieving resume data:', error)
        } finally {
          setIsLoading(false)
        }
      }

      fetchResumeData()
    }
  }, [resumeId, isInitialized, dispatch, instances.storage, navigate, syncResumeNameFromData])

  // Check if resume has been modified using hash comparison and Redux dirty flag
  useEffect(() => {
    if (resumeIsDirty) {
      setIsDirty(true)
      return
    }

    const baseline = getResumeBaselineHash() ?? originalResumeRef.current
    if (resume && baseline) {
      const newDirtyState = currentResumeHash !== baseline
      setIsDirty(prev => (prev !== newDirtyState ? newDirtyState : prev))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentResumeHash, resumeIsDirty])

  // Handle browser's built-in beforeunload dialog for page reloads
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (isDirty) {
        const message = 'You have unsaved changes. Are you sure you want to leave?'
        event.preventDefault()
        event.returnValue = message
        return message
      }
    }

    if (isDirty) {
      window.addEventListener('beforeunload', handleBeforeUnload)

      if (resumeId) {
        sessionStorage.setItem('lastEditedResumeId', resumeId)
      }
    } else {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDirty, resumeId]) // Intentionally omitting resume to prevent loops

  useEffect(() => {
    if (!resumeId) {
      const storedResumeId = sessionStorage.getItem('lastEditedResumeId')
      if (storedResumeId) {
        navigate(`/resume/new?id=${storedResumeId}`)
        sessionStorage.removeItem('lastEditedResumeId')
      }
    }
  }, [resumeId, navigate])

  // Handle navigation with exit confirmation (preview is in-session — no save required)
  const handleNavigate = (path: string) => {
    flushAllSectionUpdates()
    if (isDirty && !isPreviewRoute(path)) {
      setShowExitDialog(true)
      setExitDestination(path)
    } else {
      navigate(path)
    }
  }

  // Handle browser navigation events
  useEffect(() => {
    window.history.pushState(
      { editor: true },
      '',
      window.location.pathname + window.location.search
    )

    // Handle browser back/forward button
    const handlePopState = (event: PopStateEvent) => {
      if (isDirty) {
        // Stop the navigation event
        event.preventDefault()

        // Show our custom dialog
        setShowExitDialog(true)
        setExitDestination('/myresumes') // Default destination for back button

        window.history.pushState(
          { editor: true },
          '',
          window.location.pathname + window.location.search
        )

        return false
      } else {
        // If not dirty, allow navigation
        navigate('/myresumes')
      }
    }

    // Listen for navigation events
    window.addEventListener('popstate', handlePopState)

    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [isDirty, navigate])

  useEffect(() => {
    // Intercept link clicks for custom dialog
    const handleLinkClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const link = target.closest('a')

      // If a link was clicked and it's an internal link
      if (
        link &&
        link.href &&
        link.href.startsWith(window.location.origin) &&
        !link.hasAttribute('target')
      ) {
        // Check if we have unsaved changes
        if (isDirty) {
          const destination = link?.getAttribute('href') ?? '/'
          if (isPreviewRoute(destination)) {
            return
          }
          e.preventDefault()
          setExitDestination(destination)
          setShowExitDialog(true)
        }
      }
    }

    document.addEventListener('click', handleLinkClick)

    return () => {
      document.removeEventListener('click', handleLinkClick)
    }
  }, [isDirty])

  // Handle discarding changes and exiting
  const handleDiscardAndExit = () => {
    // If we have a destination, navigate there
    if (exitDestination) {
      navigate(exitDestination)
    } else {
      // Default to myresumes
      navigate('/myresumes')
    }
    setShowExitDialog(false)
    setExitDestination(null)
  }

  // Handle saving changes and then exiting
  const handleSaveAndExit = async () => {
    try {
      setIsDraftSaving(true)
      flushAllSectionUpdates()
      const currentResume = store.getState().resume.resume

      if (exitDestination && isPreviewRoute(exitDestination)) {
        setShowExitDialog(false)
        navigate(exitDestination)
        setExitDestination(null)
        return
      }

      if (currentResume && instances?.resumeManager) {
        const saveData: {
          resume: typeof currentResume
          type: 'unsigned'
          id?: string
        } = {
          resume: currentResume,
          type: 'unsigned',
          ...(resumeId && !resumeId.startsWith('temp-') ? { id: resumeId } : {})
        }

        await instances.resumeManager.saveResume(saveData)

        originalResumeRef.current = computeResumeHash(currentResume)
        storeResumeBaselineHash(originalResumeRef.current)
        setIsDirty(false)

        setShowExitDialog(false)

        setTimeout(() => {
          if (exitDestination) {
            navigate(exitDestination)
          } else {
            navigate('/myresumes')
          }
          setExitDestination(null)
        }, 100)

        return
      }
    } catch (error) {
      console.error('Error saving resume before exit:', error)
    } finally {
      setIsDraftSaving(false)
      if (exitDestination && !isPreviewRoute(exitDestination)) {
        setShowExitDialog(false)
        setExitDestination(null)
      }
    }
  }

  // Cancel exit
  const handleCancelExit = () => {
    setShowExitDialog(false)
    setExitDestination(null)
  }

  const requiredSections = [
    'Professional Summary',
    'Work Experience',
    'Education',
    'Professional Affiliations',
    'Skills and Abilities'
  ]

  const handleAddSection = (sectionId: string) => {
    setSectionOrder(prev => [...prev, sectionId])
  }

  const handleRemoveSection = (sectionId: string) => {
    if (!requiredSections.includes(sectionId)) {
      setSectionOrder(prev => prev.filter(id => id !== sectionId))
    }
  }

  const handleAddFiles = (sectionId: string, itemIndex?: number) => {
    console.log('handleAddFiles called:', {
      sectionId,
      itemIndex,
      currentFiles: files,
      allFiles
    })
    setActiveSectionId(sectionId)
    setActiveItemIndex(itemIndex)
    setFileSelectorOpen(true)
  }

  const handleFilesSelected = (newFiles: FileItem[]) => {
    setFiles(newFiles)
  }

  const handleFileDelete = (event: React.MouseEvent, id: string) => {
    setFiles(prev => prev.filter(file => file.id !== id))
  }

  const handleAddCredential = useCallback(
    (text: string) => {
      if (!activeSection) {
        console.error('No active section found')
        return
      }

      // Find the section component that's currently active
      const sectionComponents = {
        'Work Experience': 'experience',
        Education: 'education',
        'Skills and Abilities': 'skills',
        'Professional Affiliations': 'professionalAffiliations',
        'Volunteer Work': 'volunteerWork',
        Projects: 'projects',
        'Certifications and Licenses': 'certifications'
      } as const

      const sectionId = sectionComponents[activeSection as keyof typeof sectionComponents]
      if (!sectionId) {
        console.error('Invalid section:', activeSection)
        return
      }

      // Get the current section items
      const section = resume?.[sectionId as keyof typeof resume]
      if (!section || typeof section !== 'object' || !('items' in section)) {
        console.error('Invalid section structure')
        return
      }

      const sectionItems = section.items
      if (!Array.isArray(sectionItems)) {
        console.error('Invalid section items')
        return
      }

      // Find the item that contains the selected text
      const itemIndex = sectionItems.findIndex(
        item =>
          item.description?.includes(text) ||
          item.name?.includes(text) ||
          item.title?.includes(text)
      )

      if (itemIndex === -1) {
        console.error('Could not find item containing selected text')
        return
      }

      // Open the credentials overlay for the found item
      const event = new CustomEvent('openCredentialsOverlay', {
        detail: {
          sectionId,
          itemIndex,
          selectedText: text
        }
      })
      window.dispatchEvent(event)
    },
    [activeSection, resume]
  )
  const handleFileNameChange = (id: string, newName: string) => {
    setFiles(prev =>
      prev.map(file => (file.id === id ? { ...file, name: newName } : file))
    )
  }

  const handleEvidenceSelected = (selectedFileIds: string[], itemIndex?: number) => {
    const targetItemIndex = itemIndex ?? activeItemIndex
    console.log('handleEvidenceSelected called:', {
      selectedFileIds,
      itemIndex: targetItemIndex,
      activeSectionId
    })

    if (activeSectionId !== null && typeof targetItemIndex === 'number') {
      setSectionEvidence(prev => {
        const prevArr: string[][] =
          Array.isArray(prev[activeSectionId]) && Array.isArray(prev[activeSectionId][0])
            ? [...(prev[activeSectionId] as string[][])]
            : Array.from({ length: targetItemIndex + 1 }, () => [])
        prevArr[targetItemIndex] = [...selectedFileIds]

        const newEvidence = {
          ...prev,
          [activeSectionId]: prevArr
        }

        return newEvidence
      })
    }
    setFileSelectorOpen(false)
    setActiveSectionId(null)
    setActiveItemIndex(undefined)
  }

  const handleRemoveFile = (sectionId: string, itemIndex: number, fileIndex: number) => {
    setSectionEvidence(prev => {
      const section = prev[sectionId] || []
      const newSection = [...section]

      if (newSection[itemIndex]) {
        const newItem = [...newSection[itemIndex]]
        newItem.splice(fileIndex, 1)
        newSection[itemIndex] = newItem
      }

      const newEvidence = {
        ...prev,
        [sectionId]: newSection
      }

      return newEvidence
    })
  }

  const handlePreview = () => {
    flushAllSectionUpdates()
    markEditorPreviewSession(resumeId)
    navigate(resumeId ? `/resume/view?id=${resumeId}` : '/resume/view')
  }

  const handleSaveDraft = async () => {
    try {
      setIsDraftSaving(true)
      flushAllSectionUpdates()
      const currentResume = store.getState().resume.resume
      const preparedResume = await prepareResumeForVC(
        currentResume,
        sectionEvidence,
        allFiles
      )
      console.log('Saving draft with evidence:', {
        sectionEvidence,
        evidenceInPreparedResume: preparedResume?.evidence
      })

      // Save to Google Drive
      // IMPORTANT: Include the resumeId if we have one to update the existing file
      const resumeToSave = preparedResume || currentResume

      // Log whether we're updating or creating
      if (resumeId && !resumeId.startsWith('temp-')) {
      } else {
      }

      const saveData: any = {
        resume: resumeToSave,
        type: 'unsigned',
        // Pass the ID if we have one to update the existing file
        ...(resumeId && !resumeId.startsWith('temp-') ? { id: resumeId } : {})
      }

      const savedResume = await instances?.resumeManager?.saveResume(saveData)

      console.log('Save result:', {
        requestedId: resumeId,
        savedId: savedResume?.id,
        isNewFile: savedResume?.id !== resumeId
      })

      // Update our original reference
      if (savedResume) {
        // IMPORTANT: Update Redux state with the saved resume data
        // This ensures the UI reflects the credential links that were replaced with JSON
        // The savedResume might have the data nested, so check both possibilities
        const resumeDataToStore = savedResume.data || resumeToSave
        dispatch(setSelectedResume(resumeDataToStore))

        const newHash = computeResumeHash(resumeDataToStore)
        storeResumeBaselineHash(newHash)
        originalResumeRef.current = newHash
        setIsDirty(false)

        if (savedResume.id) {
          markEditorActiveResume(savedResume.id)
        }

        // If this was a temporary import OR the saved resume has a different ID, update the URL
        if (
          (resumeId && resumeId.startsWith('temp-')) ||
          (savedResume.id && savedResume.id !== resumeId)
        ) {
          // Clean up the temporary localStorage entry if it exists
          if (resumeId && resumeId.startsWith('temp-')) {
            const draftKey = `resume_draft_${resumeId}`
            localStorage.removeItem(draftKey)
          }

          // Update the URL to use the real Google Drive ID
          if (savedResume.id) {
            const newUrl = `/resume/new?id=${savedResume.id}`
            window.history.replaceState({}, '', newUrl)
            console.log('Updated URL to use correct resume ID:', savedResume.id)
          }
        }
      }
      dispatch(fetchUserResumes() as any)
    } catch (error) {
      console.error('Error saving draft:', error)
    } finally {
      setIsDraftSaving(false)
    }
  }

  const handleSignAndSave = async () => {
    if (!instances?.resumeVC || !instances?.resumeManager) {
      console.error('Required services not available')
      return
    }

    // Set up a timer to ensure loading finishes after 3 seconds
    setIsSigningSaving(true)
    const loadingTimer = setTimeout(() => {
      setIsSigningSaving(false)
    }, 3000)

    try {
      flushAllSectionUpdates()
      const currentResume = store.getState().resume.resume

      // Generate key pair
      const keyPair = await instances.resumeVC.generateKeyPair()
      if (!keyPair) {
        throw new Error('Failed to generate key pair')
      }

      // Create DID document
      const didDoc = await instances.resumeVC.createDID({
        keyPair
      })
      if (!didDoc) {
        throw new Error('Failed to create DID document')
      }

      if (!currentResume) {
        console.error('Resume is null, cannot prepare for VC')
        return
      }

      // Prepare resume for signing

      const preparedResume = await prepareResumeForVC(
        currentResume,
        sectionEvidence,
        allFiles
      )

      // PATCH: Ensure processed employmentHistory is used in credentialSubject
      if (
        preparedResume.credentialSubject &&
        preparedResume.employmentHistory &&
        Array.isArray(preparedResume.employmentHistory)
      ) {
        preparedResume.credentialSubject.employmentHistory =
          preparedResume.employmentHistory
      }

      // FINAL PATCH: Guarantee credentialLink is a JSON string if fullCredential is present in the prepared data (all sections)
      if (preparedResume.credentialSubject) {
        preparedResume.credentialSubject.employmentHistory = forceCredentialJsonString(
          preparedResume.credentialSubject.employmentHistory
        )
        preparedResume.credentialSubject.educationAndLearning = forceCredentialJsonString(
          preparedResume.credentialSubject.educationAndLearning
        )
        preparedResume.credentialSubject.certifications = forceCredentialJsonString(
          preparedResume.credentialSubject.certifications
        )
        preparedResume.credentialSubject.skills = forceCredentialJsonString(
          preparedResume.credentialSubject.skills
        )
        preparedResume.credentialSubject.projects = forceCredentialJsonString(
          preparedResume.credentialSubject.projects
        )
        preparedResume.credentialSubject.professionalAffiliations =
          forceCredentialJsonString(
            preparedResume.credentialSubject.professionalAffiliations
          )
        preparedResume.credentialSubject.volunteerWork = forceCredentialJsonString(
          preparedResume.credentialSubject.volunteerWork
        )
      }

      // Ensure all id/@id fields are absolute URIs before signing
      ensureAbsoluteIds(preparedResume)

      // Sign resume
      const signedResume = await instances.resumeVC.sign({
        formData: preparedResume,
        issuerDid: didDoc.id,
        keyPair
      })
      if (!signedResume) {
        throw new Error('Failed to sign resume')
      }

      // FINAL PATCH: Guarantee credentialLink is a JSON string if fullCredential is present in the signed object
      if (
        signedResume.credentialSubject &&
        Array.isArray(signedResume.credentialSubject.employmentHistory)
      ) {
        signedResume.credentialSubject.employmentHistory =
          signedResume.credentialSubject.employmentHistory.map((exp: any) => {
            if (
              exp.credentialLink &&
              (typeof exp.credentialLink !== 'string' ||
                (typeof exp.credentialLink === 'string' &&
                  !exp.credentialLink.startsWith('{')))
            ) {
              if (exp.fullCredential) {
                return {
                  ...exp,
                  credentialLink: JSON.stringify(exp.fullCredential)
                }
              }
            }
            return exp
          })
      }

      // FINAL PATCH: Guarantee credentialLink is a JSON string if fullCredential is present in the signed object (all sections)
      if (signedResume.credentialSubject) {
        signedResume.credentialSubject.employmentHistory = forceCredentialJsonString(
          signedResume.credentialSubject.employmentHistory
        )
        signedResume.credentialSubject.educationAndLearning = forceCredentialJsonString(
          signedResume.credentialSubject.educationAndLearning
        )
        signedResume.credentialSubject.certifications = forceCredentialJsonString(
          signedResume.credentialSubject.certifications
        )
        signedResume.credentialSubject.skills = forceCredentialJsonString(
          signedResume.credentialSubject.skills
        )
        signedResume.credentialSubject.projects = forceCredentialJsonString(
          signedResume.credentialSubject.projects
        )
        signedResume.credentialSubject.professionalAffiliations =
          forceCredentialJsonString(
            signedResume.credentialSubject.professionalAffiliations
          )
        signedResume.credentialSubject.volunteerWork = forceCredentialJsonString(
          signedResume.credentialSubject.volunteerWork
        )
      }

      // Save the signed resume
      // Note: For signed resumes, we always create a new file (no ID passed)
      // This preserves the unsigned draft and creates a separate signed version
      const file = await instances.resumeManager.saveResume({
        resume: signedResume,
        type: 'sign'
      })
      if (!file?.id) {
        throw new Error('Failed to save resume')
      }

      // Store tokens
      await storeFileTokens({
        googleFileId: file.id,
        tokens: {
          accessToken: accessToken ?? '',
          refreshToken: refreshToken ?? ''
        }
      })

      // Update our reference to mark as not dirty
      originalResumeRef.current = computeResumeHash(currentResume)
      storeResumeBaselineHash(originalResumeRef.current)
      setIsDirty(false)

      // If this was a temporary import, clean up localStorage and update URL
      if (resumeId && resumeId.startsWith('temp-')) {
        // Clean up the temporary localStorage entry
        const draftKey = `resume_draft_${resumeId}`
        localStorage.removeItem(draftKey)

        // Update the URL to use the real Google Drive ID
        if (file.id) {
          const newUrl = `/resume/new?id=${file.id}`
          window.history.replaceState({}, '', newUrl)
        }
      }
      dispatch(fetchUserResumes() as any)

      // Navigate to view the signed resume
      // The file.id contains the Google Drive ID of the newly signed resume
      navigate(`/resume/view/${file.id}`)
    } catch (error) {
      console.error('Error signing and saving:', error)
    } finally {
      // If error occurs before 3 seconds, clear the timer
      // and manually set loading state to false
      if (loadingTimer) {
        clearTimeout(loadingTimer)
        setIsSigningSaving(false)
      }
    }
    // Note: No finally block needed as the timeout handles the loading state
  }

  const handleEditNameClick = () => {
    setIsEditingName(true)
    // Initialize with current resume name if available
    if (resume && resume.name) {
      setResumeName(resume.name)
    }
  }

  const handleNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setResumeName(event.target.value)
  }

  const handleNameSave = () => {
    if (!resume) return

    dispatch(updateSection({ sectionId: 'name', content: resumeName }))
    setResumeName(resumeName)
    setIsEditingName(false)
  }

  const handleNameKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleNameSave()
    } else if (event.key === 'Escape') {
      setIsEditingName(false)
      // Reset to original value
      if (resume && resume.name) {
        setResumeName(resume.name)
      } else {
        setResumeName('Untitled')
      }
    }
  }

  const handleSectionFocus = useCallback(
    (sectionId: string) => {
      dispatch(setActiveSection(sectionId))
    },
    [dispatch]
  )
  const getSectionEvidence = (sectionId: string, itemCount: number): string[][] => {
    const section = sectionEvidence[sectionId] || []
    if (Array.isArray(section) && Array.isArray(section[0])) return section as string[][]
    if (Array.isArray(section) && typeof section[0] === 'string') {
      const arr: string[][] = []
      for (let i = 0; i < itemCount; i++) {
        if (Array.isArray(section[i])) arr.push(section[i] as string[])
        else if (section[i]) arr.push([section[i] as unknown as string])
        else arr.push([])
      }
      return arr
    }
    return Array.from({ length: itemCount }, () => [])
  }

  const handleAllFilesUpdate = useCallback((combinedFiles: FileItem[]) => {
    setAllFiles(combinedFiles)
  }, [])

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        mx: 'auto',
        mt: { xs: 0, md: 3 },
        pr: { xs: 0, md: 6 },
        pl: { xs: 0, md: 6 }
      }}
    >
      {/* Mobile Header AppBar */}
      {isMobile && (
        <AppBar
          position='sticky'
          elevation={0}
          sx={{ bgcolor: COLORS.white, color: COLORS.text }}
        >
          <Toolbar sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <IconButton
                onClick={handleLeftDrawerToggle}
                size='small'
                aria-label='Open menu'
              >
                <MenuIcon />
                <Typography sx={{ fontWeight: 700, fontSize: '1.1rem' }}>
                  details
                </Typography>
              </IconButton>
            </Box>
            <IconButton
              onClick={handleRightDrawerToggle}
              size='small'
              aria-label='Open library'
            >
              <Typography sx={{ fontWeight: 700, fontSize: '1.1rem' }}>Creds</Typography>
              <LibraryBooksIcon />
            </IconButton>
          </Toolbar>
        </AppBar>
      )}
      {/* Debug indicator - only in development */}
      {process.env.NODE_ENV === 'development' && (
        <Box
          sx={{
            position: 'fixed',
            bottom: '10px',
            right: '10px',
            padding: '4px 8px',
            borderRadius: '4px',
            backgroundColor: isDirty
              ? 'rgba(244, 67, 54, 0.8)'
              : 'rgba(76, 175, 80, 0.8)',
            color: 'white',
            fontSize: '12px',
            fontWeight: 'bold',
            zIndex: 9000,
            boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
          }}
        >
          {isDirty ? 'Unsaved Changes' : 'Saved'}
        </Box>
      )}

      {isLoading ? (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100vh'
          }}
        >
          <CircularProgress />
          <Typography sx={{ ml: 2 }}>Loading resume data...</Typography>
        </Box>
      ) : (
        <>
          {/* Header */}
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              padding: { xs: '0 16px', md: '0 20px' },
              mt: { xs: 2, md: 0 }
            }}
          >
            {/* Resume Name */}
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: 1
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {isEditingName ? (
                  <TextField
                    autoFocus
                    value={resumeName}
                    onChange={handleNameChange}
                    onBlur={handleNameSave}
                    onKeyPress={handleNameKeyPress}
                    variant='standard'
                    sx={{ fontWeight: 'bold' }}
                  />
                ) : (
                  <>
                    <Typography
                      sx={{
                        fontWeight: 700,
                        fontSize: '1.25rem',
                        color: '#2E2E48'
                      }}
                    >
                      {resumeName}
                    </Typography>
                    <IconButton onClick={handleEditNameClick} size='small'>
                      <SVGEditName />
                    </IconButton>
                  </>
                )}
              </Box>
            </Box>

            {/* Action Buttons */}
            <Box
              sx={{
                display: 'flex',
                flexDirection: { xs: 'column', md: 'row' },
                justifyContent: 'space-between',
                alignItems: { xs: 'stretch', md: 'center' },
                mb: 2,
                mt: { xs: 1, md: 0 },
                gap: { xs: 2, md: 0 }
              }}
            >
              <Typography
                sx={{
                  color: COLORS.text,
                  fontFamily: 'Nunito Sans',
                  fontSize: { xs: '14px', md: '16px' },
                  fontStyle: 'normal',
                  fontWeight: 500,
                  lineHeight: 'normal',
                  letterSpacing: '0.16px',
                  mb: { xs: 1, md: 0 }
                }}
              >
                Name your resume with your first and last name so recruiters can easily
                locate your resume.
              </Typography>
              <Box
                sx={{
                  display: 'flex',
                  gap: { xs: 1, md: 2 },
                  flexWrap: 'wrap',
                  justifyContent: { xs: 'center', md: 'flex-start' }
                }}
              >
                <Button
                  onClick={handlePreview}
                  sx={{
                    ...ButtonStyles,
                    backgroundColor: COLORS.primary,
                    color: COLORS.white,
                    fontSize: { xs: '14px', md: '16px' },
                    px: buttonSpacing.px,
                    py: buttonSpacing.py,
                    '&:hover': { backgroundColor: COLORS.primaryHover }
                  }}
                >
                  Preview
                </Button>
                <Button
                  onClick={handleSaveDraft}
                  disabled={isDraftSaving}
                  sx={{
                    ...ButtonStyles,
                    backgroundColor: COLORS.white,
                    fontSize: { xs: '14px', md: '16px' },
                    px: buttonSpacing.px,
                    py: buttonSpacing.py,
                    '&:hover': { backgroundColor: '#f5f5f5' }
                  }}
                  startIcon={
                    isDraftSaving && <CircularProgress size={20} color='inherit' />
                  }
                >
                  {isDraftSaving ? 'Saving...' : 'Save Draft'}
                </Button>
                <Button
                  onClick={handleSignAndSave}
                  disabled={isSigningSaving}
                  sx={{
                    ...ButtonStyles,
                    backgroundColor: COLORS.white,
                    fontSize: { xs: '14px', md: '16px' },
                    px: buttonSpacing.px,
                    py: buttonSpacing.py,
                    '&:hover': { backgroundColor: '#f5f5f5' }
                  }}
                  startIcon={
                    isSigningSaving && <CircularProgress size={20} color='inherit' />
                  }
                >
                  {isSigningSaving ? 'Signing...' : 'Sign And Save'}
                </Button>
              </Box>
            </Box>
          </Box>
          {/* Rest of the component */}
          <BorderLinearProgress variant='determinate' value={100} />
          <Typography
            sx={{
              color: '#2E2E48',
              fontFamily: 'DM Sans',
              fontSize: '16px',
              fontStyle: 'normal',
              fontWeight: 500,
              lineHeight: 'normal',
              letterSpacing: '0.16px',
              mt: '20px'
            }}
          >
            Any section left blank will not appear on your resume.
          </Typography>
          <Box
            sx={{
              display: 'flex',
              gap: { xs: 0, md: 4 },
              mt: 2,
              flexDirection: { xs: 'column', md: 'row' }
            }}
          >
            {/* Left Sidebar on desktop */}
            {!isMobile && <LeftSidebar />}

            {/* Main Content */}
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                flex: 1,
                maxWidth: '100%',
                mx: 'auto',
                width: '100%'
              }}
            >
              {sectionOrder.map(sectionId => {
                let itemCount = 1
                if (resume && typeof resume === 'object' && sectionId in resume) {
                  const section = (resume as any)[sectionId]
                  if (sectionHasItems(section)) {
                    itemCount = section.items.length
                  }
                }
                return (
                  <Section
                    key={sectionId}
                    sectionId={sectionId}
                    onDelete={() => handleRemoveSection(sectionId)}
                    onAddFiles={itemIndex => handleAddFiles(sectionId, itemIndex)}
                    onAddCredential={handleAddCredential}
                    isRemovable={!requiredSections.includes(sectionId)}
                    onFocus={() => handleSectionFocus(sectionId)}
                    evidence={getSectionEvidence(sectionId, itemCount)}
                    allFiles={allFiles}
                    onRemoveFile={handleRemoveFile}
                  />
                )
              })}

              {/* Optional sections manager */}
              <OptionalSectionsManager
                activeSections={sectionOrder}
                onAddSection={handleAddSection}
              />
            </Box>

            {/* Right Sidebar on desktop */}
            {!isMobile && (
              <RightSidebar
                files={files}
                onFilesSelected={handleFilesSelected}
                onFileDelete={handleFileDelete}
                onFileNameChange={handleFileNameChange}
                onAllFilesUpdate={handleAllFilesUpdate}
              />
            )}
          </Box>
        </>
      )}

      {/* Exit Confirmation Dialog */}
      <Dialog
        open={showExitDialog}
        onClose={handleCancelExit}
        aria-labelledby='alert-dialog-title'
        aria-describedby='alert-dialog-description'
        // Prevent closing by clicking outside or escape key
        disableEscapeKeyDown
        // Styling for the Dialog component
        PaperProps={{
          sx: {
            borderRadius: '12px',
            minWidth: '450px',
            maxWidth: '600px',
            margin: '16px',
            boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.15)'
          }
        }}
        // Style to ensure dialog appears above everything
        sx={{
          zIndex: 9999,
          '& .MuiBackdrop-root': {
            backgroundColor: 'rgba(0, 0, 0, 0.6)'
          }
        }}
      >
        <DialogTitle
          id='alert-dialog-title'
          sx={{
            pb: 1,
            fontWeight: 'bold',
            fontSize: '1.4rem',
            color: '#3A35A2'
          }}
        >
          Unsaved Changes
        </DialogTitle>
        <DialogContent>
          <DialogContentText
            id='alert-dialog-description'
            sx={{
              color: '#2E2E48',
              fontSize: '1rem',
              mb: 1
            }}
          >
            You have unsaved changes to your resume. If you exit now, these changes will
            be lost. Would you like to save your changes before exiting?
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button
            onClick={handleCancelExit}
            sx={{
              color: '#4F46E5',
              textTransform: 'none',
              fontWeight: 500,
              fontSize: '0.95rem'
            }}
          >
            Continue Editing
          </Button>
          <Button
            onClick={handleDiscardAndExit}
            sx={{
              color: '#F43F5E',
              textTransform: 'none',
              fontWeight: 500,
              fontSize: '0.95rem'
            }}
          >
            Exit Without Saving
          </Button>
          <Button
            onClick={handleSaveAndExit}
            variant='contained'
            disableElevation
            sx={{
              bgcolor: '#4F46E5',
              textTransform: 'none',
              fontWeight: 500,
              fontSize: '0.95rem',
              borderRadius: '8px',
              padding: '8px 16px',
              '&:hover': { bgcolor: '#4338CA' }
            }}
            disabled={isDraftSaving}
            startIcon={
              isDraftSaving ? <CircularProgress size={16} color='inherit' /> : null
            }
          >
            {isDraftSaving ? 'Saving...' : 'Save and Exit'}
          </Button>
        </DialogActions>
      </Dialog>
      <FileSelectorOverlay
        open={fileSelectorOpen}
        onClose={() => {
          setFileSelectorOpen(false)
          setActiveSectionId(null)
          setActiveItemIndex(undefined)
        }}
        onSelect={selectedFileIds =>
          handleEvidenceSelected(selectedFileIds, activeItemIndex)
        }
        files={allFiles}
        initialSelectedFiles={
          activeSectionId && typeof activeItemIndex === 'number'
            ? (sectionEvidence[activeSectionId]?.[activeItemIndex] || []).map(id => ({
                id
              }))
            : []
        }
      />
      {/* Left Drawer for mobile */}
      <Drawer
        anchor='left'
        open={isLeftDrawerOpen}
        onClose={closeLeftDrawer}
        PaperProps={{ sx: { width: { xs: DRAWER_WIDTH.mobile, sm: 400 } } }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            p: 2
          }}
        >
          <Typography sx={{ fontWeight: 700 }}>Contact & Sections</Typography>
          <IconButton onClick={closeLeftDrawer} aria-label='Close menu'>
            <CloseIcon />
          </IconButton>
        </Box>
        <Box sx={{ p: 2 }}>
          <LeftSidebar />
        </Box>
      </Drawer>

      {/* Right Drawer for mobile */}
      <Drawer
        anchor='right'
        open={isRightDrawerOpen}
        onClose={closeRightDrawer}
        PaperProps={{
          sx: { width: { xs: DRAWER_WIDTH.mobile, sm: DRAWER_WIDTH.tablet } }
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            p: 2
          }}
        >
          <Typography sx={{ fontWeight: 700 }}>Library & Files</Typography>
          <IconButton onClick={closeRightDrawer} aria-label='Close library'>
            <CloseIcon />
          </IconButton>
        </Box>
        <Box sx={{ p: 2 }}>
          <RightSidebar
            files={files}
            onFilesSelected={handleFilesSelected}
            onFileDelete={handleFileDelete}
            onFileNameChange={handleFileNameChange}
            onAllFilesUpdate={handleAllFilesUpdate}
          />
        </Box>
      </Drawer>
    </Box>
  )
}

export default ResumeEditor

function sectionHasItems(section: any): section is { items: any[] } {
  return section && Array.isArray(section.items)
}
