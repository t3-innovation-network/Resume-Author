import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  Box,
  TextField,
  Typography,
  Switch,
  styled,
  alpha,
  Checkbox,
  FormControlLabel,
  FormGroup,
  Button,
  IconButton,
  Dialog,
  DialogContent,
  useTheme,
  useMediaQuery
} from '@mui/material'
import {
  SVGSectionIcon,
  SVGDownIcon,
  SVGAddFiles,
  SVGDeleteSection
} from '../../../assets/svgs'
import TextEditor from '../../TextEditor/Texteditor'
import { StyledButton } from './StyledButton'
import { useDispatch, useSelector } from 'react-redux'
import { updateSection } from '../../../redux/slices/resume'
import { RootState } from '../../../redux/store'
import { useDebouncedSectionUpdate } from '../../../hooks/useDebouncedSectionUpdate'
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline'
import CloseIcon from '@mui/icons-material/Close'
import CredentialOverlay from '../../CredentialsOverlay'
import AttachFileIcon from '@mui/icons-material/AttachFile'
import MinimalCredentialViewer from '../../MinimalCredentialViewer'
import VerifiedCredentialsList from '../../common/VerifiedCredentialsList'
import AttachedFilesList from '../../common/AttachedFilesList'

const PinkSwitch = styled(Switch)(({ theme }) => ({
  '& .MuiSwitch-switchBase.Mui-checked': {
    color: '#34C759',
    '&:hover': {
      backgroundColor: alpha('#34C759', theme.palette.action.hoverOpacity)
    }
  },
  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
    backgroundColor: '#34C759'
  }
}))

interface EducationProps {
  readonly onAddFiles?: (itemIndex?: number) => void
  readonly onDelete?: () => void
  readonly onAddCredential?: (text: string) => void
  readonly onFocus?: () => void
  readonly evidence?: string[][]
  readonly allFiles?: FileItem[]
  readonly onRemoveFile?: (
    sectionId: string,
    itemIndex: number,
    fileIndex: number
  ) => void
}

interface EducationItem {
  type: string
  programName: string
  institution: string
  duration: string
  currentlyEnrolled: boolean
  inProgress: boolean
  awardEarned: boolean
  description: string
  id: string
  verificationStatus: string
  credentialLink: string
  degree: string
  field: string
  startDate: string
  endDate: string
  selectedCredentials: SelectedCredential[]
  attachedFiles?: string[]
}

interface SelectedCredential {
  id: string
  url: string
  name: string
  vc?: any // full object
}

interface FileItem {
  id: string
  file: File
  name: string
  url: string
  uploaded: boolean
  fileExtension: string
  googleId?: string
}

// Helper to get credential name (copied verbatim from resumePreview)
function getCredentialName(claim: any): string {
  try {
    if (!claim || typeof claim !== 'object') {
      return 'Invalid Credential'
    }
    const credentialSubject = claim.credentialSubject
    if (!credentialSubject || typeof credentialSubject !== 'object') {
      return 'Unknown Credential'
    }
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
    if (credentialSubject.achievement && credentialSubject.achievement[0]?.name) {
      return credentialSubject.achievement[0].name
    }
    return 'Credential'
  } catch {
    return 'Credential'
  }
}

export default function Education({
  onAddFiles,
  onDelete,
  onAddCredential,
  onFocus,
  evidence = [],
  allFiles = [],
  onRemoveFile
}: EducationProps) {
  const dispatch = useDispatch()
  const resume = useSelector((state: RootState) => state.resume.resume)
  const vcs = useSelector((state: any) => state.vcReducer.vcs)
  const initialLoadRef = useRef(true)
  const theme = useTheme()
  const isSmallMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const [showCredentialsOverlay, setShowCredentialsOverlay] = useState(false)
  const [activeSectionIndex, setActiveSectionIndex] = useState<number | null>(null)
  const [openCredDialog, setOpenCredDialog] = useState(false)
  const [dialogCredObj, setDialogCredObj] = useState<any>(null)

  const [educations, setEducations] = useState<EducationItem[]>([
    {
      type: 'Bachelors',
      programName: '',
      institution: '',
      duration: '1 year',
      currentlyEnrolled: false,
      inProgress: false,
      awardEarned: false,
      description: '',
      id: '',
      verificationStatus: 'unverified',
      credentialLink: '',
      degree: '',
      field: '',
      startDate: '',
      endDate: '',
      selectedCredentials: [],
      attachedFiles: []
    }
  ])

  const [expandedItems, setExpandedItems] = useState<Record<number, boolean>>({ 0: true })

  const [useDuration, setUseDuration] = useState<boolean[]>([false])
  const dispatchEducationUpdate = useCallback(
    (items: EducationItem[]) => {
      dispatch(
        updateSection({
          sectionId: 'education',
          content: { items }
        })
      )
    },
    [dispatch]
  )

  const { scheduleUpdate: debouncedReduxUpdate } = useDebouncedSectionUpdate(
    dispatchEducationUpdate,
    500
  )

  const calculateDuration = useCallback(
    (
      startDate: string,
      endDate: string | undefined,
      currentlyEnrolled: boolean
    ): string => {
      if (!startDate) return '1 year'

      const endObj = currentlyEnrolled || !endDate ? new Date() : new Date(endDate)
      const startObj = new Date(startDate)
      if (isNaN(startObj.getTime()) || isNaN(endObj.getTime())) {
        return '1 year'
      }

      let years = endObj.getFullYear() - startObj.getFullYear()
      let months = endObj.getMonth() - startObj.getMonth()
      if (months < 0) {
        years--
        months += 12
      }

      let str = ''
      if (years > 0) str += `${years} year${years !== 1 ? 's' : ''}`
      if (months > 0 || (years === 0 && months >= 0)) {
        if (str) str += ' '
        str += `${months} month${months !== 1 ? 's' : ''}`
      }
      return str || 'Less than a month'
    },
    []
  )

  useEffect(() => {
    const items =
      resume && resume.education && Array.isArray(resume.education.items)
        ? resume.education.items
        : []
    if (items.length > 0) {
      const typedItems = items.map((item: any) => ({
        type: item.type || 'Bachelors',
        programName: item.programName || '',
        institution: item.institution || '',
        duration: item.duration || '1 year',
        currentlyEnrolled: !!item.currentlyEnrolled,
        inProgress: !!item.inProgress,
        awardEarned: !!item.awardEarned,
        description: item.description || '',
        id: item.id || '',
        verificationStatus: item.verificationStatus || 'unverified',
        credentialLink: item.credentialLink || '',
        selectedCredentials: item.selectedCredentials || [],
        degree: item.degree || '',
        field: item.field || '',
        startDate: item.startDate || '',
        endDate: item.endDate || '',
        attachedFiles: item.attachedFiles || []
      })) as EducationItem[]

      const shouldUpdate =
        initialLoadRef.current || typedItems.length !== educations.length
      if (shouldUpdate) {
        initialLoadRef.current = false
        setEducations(typedItems)
        const localDurations = typedItems.map(edu => !edu.startDate)
        setUseDuration(localDurations)

        if (typedItems.length !== Object.keys(expandedItems).length) {
          const initialExpanded: Record<number, boolean> = {}
          typedItems.forEach((_, idx) => {
            initialExpanded[idx] =
              idx < Object.keys(expandedItems).length ? expandedItems[idx] : true
          })
          setExpandedItems(initialExpanded)
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resume])

  const handleEducationChange = useCallback(
    (index: number, field: keyof EducationItem, value: any) => {
      setEducations(prev => {
        const updated = [...prev]
        const ed = { ...updated[index], [field]: value }

        if (!useDuration[index]) {
          ed.duration = ''
        } else if (
          field === 'startDate' ||
          field === 'endDate' ||
          field === 'currentlyEnrolled'
        ) {
          ed.duration = calculateDuration(ed.startDate, ed.endDate, ed.currentlyEnrolled)
        }

        updated[index] = ed
        if (field !== 'description') {
          debouncedReduxUpdate(updated)
        }
        return updated
      })
    },
    [debouncedReduxUpdate, useDuration]
  )

  /** For the text editor => separate 1s debounce. **/
  const handleDescriptionChange = useCallback(
    (index: number, value: string) => {
      setEducations(prev => {
        const updated = [...prev]
        updated[index] = { ...updated[index], description: value }
        debouncedReduxUpdate(updated)
        return updated
      })
    },
    [debouncedReduxUpdate]
  )

  const handleAddAnotherItem = useCallback(() => {
    const emptyItem: EducationItem = {
      type: 'Masters',
      programName: '',
      institution: '',
      duration: '1 year',
      currentlyEnrolled: false,
      inProgress: false,
      awardEarned: false,
      description: '',
      id: '',
      verificationStatus: 'unverified',
      credentialLink: '',
      degree: '',
      field: '',
      startDate: '',
      endDate: '',
      selectedCredentials: [],
      attachedFiles: []
    }

    setEducations(prev => {
      const updated = [...prev, emptyItem]
      dispatch(
        updateSection({
          sectionId: 'education',
          content: { items: updated }
        })
      )
      return updated
    })

    setUseDuration(prev => [...prev, false])

    const newIndex = educations.length
    setExpandedItems(prev => ({
      ...prev,
      [newIndex]: true
    }))
  }, [educations.length, dispatch])

  const handleDeleteEducation = useCallback(
    (index: number) => {
      if (educations.length <= 1) {
        if (onDelete) onDelete()
        return
      }

      setEducations(prev => {
        const updated = prev.filter((_, i) => i !== index)
        dispatch(
          updateSection({
            sectionId: 'education',
            content: { items: updated }
          })
        )
        return updated
      })

      setUseDuration(prev => prev.filter((_, i) => i !== index))

      setExpandedItems(prev => {
        const newExp: Record<number, boolean> = {}
        educations
          .filter((_, i) => i !== index)
          .forEach((_, i) => {
            newExp[i] = prev[i + (i >= index ? 1 : 0)] || false
          })
        return newExp
      })
    },
    [educations, dispatch, onDelete]
  )

  const toggleExpanded = useCallback((index: number) => {
    setExpandedItems(prev => ({
      ...prev,
      [index]: !prev[index]
    }))
  }, [])

  const handleOpenCredentialsOverlay = useCallback((index: number) => {
    setActiveSectionIndex(index)
    setShowCredentialsOverlay(true)
  }, [])

  const handleCredentialSelect = useCallback(
    (selectedCredentialIDs: string[]) => {
      if (activeSectionIndex !== null && selectedCredentialIDs.length > 0) {
        const selectedCredentials = selectedCredentialIDs.map(id => {
          const credential = vcs.find((c: any) => (c?.originalItem?.id || c.id) === id)
          return {
            id: id,
            url: '',
            name:
              credential?.credentialSubject?.achievement?.[0]?.name ||
              `Credential ${id.substring(0, 5)}...`,
            vc: credential
          }
        })
        // Deduplicate by id
        const deduped: SelectedCredential[] = Array.from(
          new Map(selectedCredentials.map(c => [c.id, c])).values()
        )
        setEducations(prev => {
          const updated = [...prev]
          // Build credentialLink as a JSON stringified array
          const credLinks = deduped
            .map(cred => {
              let fileId = ''
              if (
                cred.vc?.originalItem?.id &&
                !cred.vc.originalItem.id.startsWith('urn:')
              ) {
                fileId = cred.vc.originalItem.id
              } else if (cred.vc?.id && !cred.vc.id.startsWith('urn:')) {
                fileId = cred.vc.id
              } else {
                fileId = cred.id
              }
              return fileId && cred.vc ? `${fileId},${JSON.stringify(cred.vc)}` : ''
            })
            .filter(Boolean)
          updated[activeSectionIndex] = {
            ...updated[activeSectionIndex],
            verificationStatus: 'verified',
            credentialLink: credLinks.length ? JSON.stringify(credLinks) : '',
            selectedCredentials: deduped
          }
          dispatch(
            updateSection({
              sectionId: 'education',
              content: { items: updated }
            })
          )
          return updated
        })
      }
      setShowCredentialsOverlay(false)
      setActiveSectionIndex(null)
    },
    [activeSectionIndex, dispatch, vcs]
  )

  const handleRemoveCredential = useCallback(
    (eduIndex: number, credIndex: number) => {
      setEducations(prev => {
        const updated = [...prev]
        const edu = { ...updated[eduIndex] }
        const newCreds = edu.selectedCredentials.filter((_, i) => i !== credIndex)
        // Deduplicate by id
        edu.selectedCredentials = Array.from(
          new Map(newCreds.map(c => [c.id, c])).values()
        )
        if (!edu.selectedCredentials.length) {
          edu.verificationStatus = 'unverified'
          edu.credentialLink = ''
        } else {
          edu.credentialLink = edu.selectedCredentials[0]?.vc
            ? JSON.stringify(edu.selectedCredentials[0].vc)
            : ''
        }
        updated[eduIndex] = edu
        dispatch(
          updateSection({
            sectionId: 'education',
            content: { items: updated }
          })
        )
        return updated
      })
    },
    [dispatch]
  )

  useEffect(() => {
    // Add event listener for opening credentials overlay
    const handleOpenCredentialsEvent = (event: CustomEvent) => {
      const { sectionId, itemIndex, selectedText } = event.detail
      if (sectionId === 'education') {
        setActiveSectionIndex(itemIndex)
        setShowCredentialsOverlay(true)
      }
    }

    window.addEventListener(
      'openCredentialsOverlay',
      handleOpenCredentialsEvent as EventListener
    )

    return () => {
      window.removeEventListener(
        'openCredentialsOverlay',
        handleOpenCredentialsEvent as EventListener
      )
    }
  }, [])

  useEffect(() => {
    // Call onFocus when the component mounts
    if (onFocus) {
      onFocus()
    }
  }, [onFocus])

  // Sync evidence (files) with education items
  useEffect(() => {
    if (evidence && allFiles) {
      setEducations(prev => {
        const updated = [...prev]
        let hasChanges = false

        evidence.forEach((itemFiles, index) => {
          if (updated[index] && itemFiles && itemFiles.length > 0) {
            // Convert file IDs to URLs
            const fileUrls = itemFiles.map(fileId => {
              const file = allFiles.find(f => f.id === fileId)
              if (file?.googleId) {
                return `https://drive.google.com/uc?export=view&id=${file.googleId}`
              } else if (file?.url) {
                return file.url
              }
              return fileId
            })

            if (
              JSON.stringify(updated[index].attachedFiles) !== JSON.stringify(fileUrls)
            ) {
              updated[index] = {
                ...updated[index],
                attachedFiles: fileUrls
              }
              hasChanges = true
            }
          }
        })

        if (hasChanges) {
          // Dispatch to Redux
          dispatch(
            updateSection({
              sectionId: 'education',
              content: { items: updated }
            })
          )
        }

        return hasChanges ? updated : prev
      })
    }
  }, [evidence, allFiles, dispatch])

  const handleRemoveFile = useCallback(
    (educationIndex: number, fileIndex: number) => {
      if (onRemoveFile) {
        onRemoveFile('Education', educationIndex, fileIndex)
      }
    },
    [onRemoveFile]
  )

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: '20px' }} onFocus={onFocus}>
      {educations.map((education, index) => (
        <Box
          key={`education-${index}`}
          sx={{
            backgroundColor: '#F1F1FB',
            px: '20px',
            py: '10px',
            display: 'flex',
            flexDirection: 'column',
            borderRadius: '4px',
            gap: 2
          }}
        >
          <Box
            display='flex'
            alignItems='center'
            justifyContent='space-between'
            onClick={() => toggleExpanded(index)}
            sx={{ cursor: 'pointer' }}
          >
            <Box display='flex' alignItems='center' gap={2} flexGrow={1}>
              <SVGSectionIcon />
              {!expandedItems[index] ? (
                <>
                  <Typography variant='body1'>Program:</Typography>
                  <Typography variant='body1' sx={{ fontWeight: 'medium' }}>
                    {education.programName || 'Untitled Program'}
                  </Typography>
                </>
              ) : (
                <Box display='flex' alignItems='center'>
                  <Typography variant='body1'>Program Details</Typography>
                </Box>
              )}
            </Box>
            <IconButton
              onClick={e => {
                e.stopPropagation()
                toggleExpanded(index)
              }}
              sx={{
                transform: expandedItems[index] ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.3s ease'
              }}
            >
              <SVGDownIcon />
            </IconButton>
          </Box>

          {expandedItems[index] && (
            <>
              <TextField
                sx={{ bgcolor: '#FFF' }}
                size='small'
                fullWidth
                placeholder='Type of Education (Masters, Bachelors, etc.)'
                value={education.type}
                onChange={e => handleEducationChange(index, 'type', e.target.value)}
                variant='outlined'
              />

              <Typography>Program or Course Name</Typography>
              <TextField
                sx={{ bgcolor: '#FFF' }}
                size='small'
                fullWidth
                placeholder='Enter program name'
                value={education.programName}
                onChange={e =>
                  handleEducationChange(index, 'programName', e.target.value)
                }
              />

              <Typography>Institution or Organization Name</Typography>
              <TextField
                sx={{ bgcolor: '#FFF' }}
                size='small'
                fullWidth
                placeholder='Enter institution name'
                value={education.institution}
                onChange={e =>
                  handleEducationChange(index, 'institution', e.target.value)
                }
              />

              <Box display='flex' alignItems='start' flexDirection='column'>
                <Typography variant='body1'>Dates</Typography>
                <Box display='flex' alignItems='center'>
                  <PinkSwitch
                    checked={!!useDuration[index]}
                    onChange={() => {
                      setUseDuration(prev => {
                        const newArr = [...prev]
                        newArr[index] = !newArr[index]

                        setEducations(prevEdu => {
                          const eduArr = [...prevEdu]
                          const item = { ...eduArr[index] }
                          if (newArr[index]) {
                            item.startDate = ''
                            item.endDate = ''
                          } else {
                            item.duration = ''
                          }
                          eduArr[index] = item
                          debouncedReduxUpdate(eduArr)
                          return eduArr
                        })
                        return newArr
                      })
                    }}
                    sx={{ color: '#34C759' }}
                  />
                  <Typography>Show duration instead of exact dates</Typography>
                </Box>
              </Box>

              {useDuration[index] ? (
                <TextField
                  sx={{ bgcolor: '#FFF' }}
                  size='small'
                  placeholder='Enter total duration (e.g., 4 years)'
                  value={education.duration}
                  onChange={e => handleEducationChange(index, 'duration', e.target.value)}
                  variant='outlined'
                  fullWidth
                />
              ) : (
                <Box display='flex' alignItems='center' gap={2}>
                  <TextField
                    sx={{
                      bgcolor: '#FFF',
                      width: '50%',
                      '& .MuiInputLabel-root': {
                        transform: 'translate(14px, -9px) scale(0.75)'
                      }
                    }}
                    size='small'
                    label='Start Date'
                    type='date'
                    value={education.startDate}
                    onChange={e =>
                      handleEducationChange(index, 'startDate', e.target.value)
                    }
                    InputLabelProps={{ shrink: true }}
                  />
                  {!education.currentlyEnrolled && (
                    <TextField
                      sx={{
                        bgcolor: '#FFF',
                        width: '50%',
                        '& .MuiInputLabel-root': {
                          transform: 'translate(14px, -9px) scale(0.75)'
                        }
                      }}
                      size='small'
                      label='End Date'
                      type='date'
                      value={education.endDate}
                      onChange={e =>
                        handleEducationChange(index, 'endDate', e.target.value)
                      }
                      InputLabelProps={{ shrink: true }}
                    />
                  )}
                </Box>
              )}

              <FormGroup row sx={{ gap: 2 }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={education.currentlyEnrolled}
                      onChange={e =>
                        handleEducationChange(
                          index,
                          'currentlyEnrolled',
                          e.target.checked
                        )
                      }
                    />
                  }
                  label='Currently enrolled here'
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={education.inProgress}
                      onChange={e =>
                        handleEducationChange(index, 'inProgress', e.target.checked)
                      }
                    />
                  }
                  label='In progress'
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={education.awardEarned}
                      onChange={e =>
                        handleEducationChange(index, 'awardEarned', e.target.checked)
                      }
                    />
                  }
                  label='Award earned'
                />
              </FormGroup>

              <Typography variant='body1'>
                Describe how this item relates to the job you want to get:
              </Typography>
              <TextEditor
                key={`editor-${index}`}
                value={education.description || ''}
                onChange={val => handleDescriptionChange(index, val)}
                onAddCredential={onAddCredential}
                onFocus={onFocus}
              />

              {Array.isArray(education.selectedCredentials) &&
                education.selectedCredentials.length > 0 && (
                  <VerifiedCredentialsList
                    credentials={education.selectedCredentials}
                    onRemove={credIndex => handleRemoveCredential(index, credIndex)}
                  />
                )}

              {Array.isArray(evidence?.[index]) && evidence[index].length > 0 && (
                <AttachedFilesList
                  files={evidence[index].map(fileId => {
                    const file = allFiles.find(f => f.id === fileId)
                    return (
                      file || {
                        id: fileId,
                        name: `File ${evidence[index].indexOf(fileId) + 1}`,
                        url: '',
                        uploaded: false,
                        fileExtension: '',
                        file: new File([], '')
                      }
                    )
                  })}
                  onRemove={fileIndex => handleRemoveFile(index, fileIndex)}
                />
              )}

              <Box
                sx={{
                  display: 'flex',
                  flexDirection: { xs: 'column', sm: 'row' },
                  justifyContent: { xs: 'stretch', sm: 'space-between' },
                  alignItems: { xs: 'stretch', sm: 'stretch' },
                  mt: 2,
                  gap: { xs: '10px', md: '15px' }
                }}
              >
                <StyledButton
                  startIcon={!isSmallMobile && <SVGAddFiles />}
                  onClick={() => onAddFiles && onAddFiles(index)}
                  sx={{
                    fontSize: { xs: '14px', md: '16px' },
                    padding: { xs: '8px 16px', md: '10px 20px' },
                    height: { xs: 'auto', sm: '56px' },
                    flex: { sm: 1 },
                    minHeight: { sm: '56px' },
                    whiteSpace: { sm: 'nowrap' }
                  }}
                >
                  Add file(s)
                </StyledButton>
                <StyledButton
                  startIcon={!isSmallMobile && <SVGAddFiles />}
                  onClick={() => handleOpenCredentialsOverlay(index)}
                  sx={{
                    fontSize: { xs: '14px', md: '16px' },
                    padding: { xs: '8px 16px', md: '10px 20px' },
                    height: { xs: 'auto', sm: '56px' },
                    flex: { sm: 1 },
                    minHeight: { sm: '56px' },
                    whiteSpace: { sm: 'nowrap' }
                  }}
                >
                  Add credential
                </StyledButton>
                <StyledButton
                  startIcon={!isSmallMobile && <SVGDeleteSection />}
                  onClick={() => handleDeleteEducation(index)}
                  sx={{
                    fontSize: { xs: '14px', md: '16px' },
                    padding: { xs: '8px 16px', md: '10px 20px' },
                    height: { xs: 'auto', sm: '56px' },
                    flex: { sm: 1 },
                    minHeight: { sm: '56px' },
                    whiteSpace: { sm: 'nowrap' }
                  }}
                >
                  Delete this item
                </StyledButton>
              </Box>
            </>
          )}
        </Box>
      ))}

      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          gap: '20px'
        }}
      >
        {/* Removed the broken Add credential button that was hardcoded to last item */}

        <Button
          variant='contained'
          color='primary'
          onClick={handleAddAnotherItem}
          sx={{
            borderRadius: '4px',
            width: '100%',
            textTransform: 'none',
            padding: '8px 44px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#F3F5F8',
            color: '#2E2E48',
            boxShadow: 'none',
            fontFamily: 'Nunito sans',
            fontSize: '14px',
            fontWeight: 500
          }}
        >
          <AddCircleOutlineIcon
            sx={{ marginRight: 1, width: '16px', height: '16px', color: '#2E2E48' }}
          />
          Add another item
        </Button>
      </Box>

      {showCredentialsOverlay && (
        <CredentialOverlay
          onClose={() => {
            setShowCredentialsOverlay(false)
            setActiveSectionIndex(null)
          }}
          onSelect={handleCredentialSelect}
          initialSelectedCredentials={
            activeSectionIndex !== null &&
            educations[activeSectionIndex] &&
            educations[activeSectionIndex].selectedCredentials
              ? educations[activeSectionIndex].selectedCredentials
              : []
          }
        />
      )}
    </Box>
  )
}
