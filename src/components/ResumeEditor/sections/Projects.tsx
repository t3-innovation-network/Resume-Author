import React, { useState, useCallback, useEffect, useRef } from 'react'
import {
  Box,
  TextField,
  Typography,
  Button,
  IconButton,
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
import Dialog from '@mui/material/Dialog'
import DialogContent from '@mui/material/DialogContent'
import MinimalCredentialViewer from '../../MinimalCredentialViewer'
import VerifiedCredentialsList from '../../common/VerifiedCredentialsList'

interface ProjectsProps {
  onAddFiles?: (itemIndex?: number) => void
  onDelete?: () => void
  onAddCredential?: (text: string) => void
  onFocus?: () => void
  evidence?: string[][]
  allFiles?: FileItem[]
  onRemoveFile?: (sectionId: string, itemIndex: number, fileIndex: number) => void
}

interface ProjectItem {
  name: string
  description: string
  url: string
  id: string
  verificationStatus: string
  credentialLink: string
  technologies: string[]
  selectedCredentials: SelectedCredential[]
}

interface SelectedCredential {
  id: string
  url: string
  name: string
  vc: any
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

export default function Projects({
  onAddFiles,
  onDelete,
  onAddCredential,
  onFocus,
  evidence = [],
  allFiles = [],
  onRemoveFile
}: Readonly<ProjectsProps>) {
  const dispatch = useDispatch()
  const resume = useSelector((state: RootState) => state.resume.resume)
  const initialLoadRef = useRef(true)
  const theme = useTheme()
  const isSmallMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const [showCredentialsOverlay, setShowCredentialsOverlay] = useState(false)
  const [activeSectionIndex, setActiveSectionIndex] = useState<number | null>(null)
  const vcs = useSelector((state: any) => state.vcReducer.vcs)
  // Remove credential dialog state and rendering from this section

  const [projects, setProjects] = useState<ProjectItem[]>([
    {
      name: '',
      description: '',
      url: '',
      id: '',
      verificationStatus: 'unverified',
      credentialLink: '',
      technologies: [],
      selectedCredentials: []
    }
  ])

  const [expandedItems, setExpandedItems] = useState<Record<number, boolean>>({
    0: true
  })

  const dispatchProjectsUpdate = useCallback(
    (items: ProjectItem[]) => {
      dispatch(
        updateSection({
          sectionId: 'projects',
          content: { items }
        })
      )
    },
    [dispatch]
  )

  const { scheduleUpdate: debouncedReduxUpdate } = useDebouncedSectionUpdate(
    dispatchProjectsUpdate,
    500
  )

  useEffect(() => {
    const items =
      resume && resume.projects && Array.isArray(resume.projects.items)
        ? resume.projects.items
        : []
    if (items.length > 0) {
      const typedItems = items.map((item: any) => ({
        name: item.name || '',
        description: item.description || '',
        url: item.url || '',
        id: item.id || '',
        verificationStatus: item.verificationStatus || 'unverified',
        credentialLink: item.credentialLink || '',
        technologies: item.technologies || [],
        selectedCredentials: item.selectedCredentials || [],
        ...item
      }))

      const shouldUpdate = initialLoadRef.current || typedItems.length !== projects.length

      if (shouldUpdate) {
        initialLoadRef.current = false

        setProjects(typedItems)
        if (typedItems.length !== Object.keys(expandedItems).length) {
          const initialExpanded: Record<number, boolean> = {}
          typedItems.forEach((_, index) => {
            initialExpanded[index] =
              index < Object.keys(expandedItems).length ? expandedItems[index] : true
          })
          setExpandedItems(initialExpanded)
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resume])

  const handleProjectChange = useCallback(
    (index: number, field: string, value: any) => {
      setProjects(prevProjects => {
        const updatedProjects = [...prevProjects]
        updatedProjects[index] = {
          ...updatedProjects[index],
          [field]: value
        }
        if (field !== 'description') {
          debouncedReduxUpdate(updatedProjects)
        }

        return updatedProjects
      })
    },
    [debouncedReduxUpdate]
  )

  const handleDescriptionChange = useCallback(
    (index: number, value: string) => {
      setProjects(prevProjects => {
        const updatedProjects = [...prevProjects]
        updatedProjects[index] = {
          ...updatedProjects[index],
          description: value
        }
        debouncedReduxUpdate(updatedProjects)

        return updatedProjects
      })
    },
    [debouncedReduxUpdate]
  )

  const handleAddAnotherItem = useCallback(() => {
    const emptyItem: ProjectItem = {
      name: '',
      description: '',
      url: '',
      id: '',
      verificationStatus: 'unverified',
      credentialLink: '',
      technologies: [],
      selectedCredentials: []
    }

    setProjects(prevProjects => {
      const updatedProjects = [...prevProjects, emptyItem]

      dispatch(
        updateSection({
          sectionId: 'projects',
          content: {
            items: updatedProjects
          }
        })
      )

      return updatedProjects
    })

    const newIndex = projects.length
    setExpandedItems(prev => ({
      ...prev,
      [newIndex]: true
    }))
  }, [projects.length, dispatch])

  const handleDeleteProject = useCallback(
    (index: number) => {
      if (projects.length <= 1) {
        if (onDelete) onDelete()
        return
      }

      setProjects(prevProjects => {
        const updatedProjects = prevProjects.filter((_, i) => i !== index)
        dispatch(
          updateSection({
            sectionId: 'projects',
            content: {
              items: updatedProjects
            }
          })
        )

        return updatedProjects
      })

      setExpandedItems(prev => {
        const newExpandedState: Record<number, boolean> = {}
        projects
          .filter((_, i) => i !== index)
          .forEach((_, i) => {
            if (i === 0 && projects.length - 1 === 1) {
              newExpandedState[i] = true
            } else if (i < index) {
              newExpandedState[i] = prev[i] || false
            } else {
              newExpandedState[i] = prev[i + 1] || false
            }
          })
        return newExpandedState
      })
    },
    [projects, dispatch, onDelete]
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
        setProjects(prev => {
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
              sectionId: 'projects',
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
    (projIndex: number, credIndex: number) => {
      setProjects(prev => {
        const updated = [...prev]
        const proj = { ...updated[projIndex] }
        const newCreds = proj.selectedCredentials.filter((_, i) => i !== credIndex)
        // Deduplicate by id
        proj.selectedCredentials = Array.from(
          new Map(newCreds.map(c => [c.id, c])).values()
        )
        if (!proj.selectedCredentials.length) {
          proj.verificationStatus = 'unverified'
          proj.credentialLink = ''
        } else {
          proj.credentialLink = proj.selectedCredentials[0]?.vc
            ? JSON.stringify(proj.selectedCredentials[0].vc)
            : ''
        }
        updated[projIndex] = proj
        dispatch(
          updateSection({
            sectionId: 'projects',
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
      if (sectionId === 'projects') {
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
  const handleRemoveFile = useCallback(
    (projectIndex: number, fileIndex: number) => {
      if (onRemoveFile) {
        onRemoveFile('Projects', projectIndex, fileIndex)
      }
    },
    [onRemoveFile]
  )

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

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {projects.map((project, index) => (
        <Box
          key={`project-${index}`}
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
                  <Typography variant='body1'>Project:</Typography>
                  <Typography variant='body1' sx={{ fontWeight: 'medium' }}>
                    {project.name || 'Untitled Project'}
                  </Typography>
                </>
              ) : (
                <Box display='flex' alignItems='center'>
                  <Typography variant='body1'>Project Details</Typography>
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
                label='Project Name'
                placeholder='Enter project name'
                value={project.name}
                onChange={e => handleProjectChange(index, 'name', e.target.value)}
                variant='outlined'
              />

              <TextField
                sx={{ bgcolor: '#FFF' }}
                size='small'
                fullWidth
                label='Project URL (optional)'
                placeholder='https://example.com'
                value={project.url}
                onChange={e => handleProjectChange(index, 'url', e.target.value)}
              />

              <Typography variant='body1'>Describe your project:</Typography>
              <TextEditor
                key={`editor-${index}`}
                value={project.description || ''}
                onChange={val => handleDescriptionChange(index, val)}
                onAddCredential={onAddCredential}
                onFocus={onFocus}
              />

              {Array.isArray(project.selectedCredentials) &&
                project.selectedCredentials.length > 0 && (
                  <VerifiedCredentialsList
                    credentials={project.selectedCredentials}
                    onRemove={credIndex => handleRemoveCredential(index, credIndex)}
                  />
                )}

              {Array.isArray(evidence?.[index]) && evidence[index].length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant='body2' sx={{ fontWeight: 'bold', mb: 1 }}>
                    Attached Files:
                  </Typography>
                  {(evidence[index] || []).map((fileId, fileIndex) => {
                    const file = allFiles.find(f => f.id === fileId)
                    return (
                      <Box
                        key={`file-${fileId || ''}-${fileIndex}`}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          mb: 0.5,
                          backgroundColor: '#e8f4f8',
                          p: 0.5,
                          borderRadius: 1
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <AttachFileIcon fontSize='small' color='primary' />
                          <Typography
                            variant='body2'
                            sx={{
                              color: 'primary.main',
                              cursor: 'pointer'
                            }}
                            onClick={() => {
                              if (file?.url) {
                                window.open(file.url, '_blank')
                              }
                            }}
                          >
                            {file?.name || `File ${fileIndex + 1}`}
                          </Typography>
                        </Box>
                        <IconButton
                          size='small'
                          onClick={e => {
                            e.stopPropagation()
                            handleRemoveFile(index, fileIndex)
                          }}
                          sx={{
                            p: 0.5,
                            color: 'grey.500',
                            '&:hover': {
                              color: 'error.main'
                            }
                          }}
                        >
                          <CloseIcon fontSize='small' />
                        </IconButton>
                      </Box>
                    )
                  })}
                </Box>
              )}

              <Box
                sx={{
                  display: 'flex',
                  flexDirection: { xs: 'column', sm: 'row' },
                  justifyContent: { xs: 'stretch', sm: 'space-between' },
                  alignItems: { xs: 'stretch', sm: 'stretch' },
                  marginTop: '20px',
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
                  startIcon={!isSmallMobile && <SVGDeleteSection />}
                  onClick={() => handleDeleteProject(index)}
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
        <Button
          variant='contained'
          color='primary'
          onClick={() => handleOpenCredentialsOverlay(projects.length - 1)}
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
          Add credential
        </Button>

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
            projects[activeSectionIndex] &&
            projects[activeSectionIndex].selectedCredentials
              ? projects[activeSectionIndex].selectedCredentials
              : []
          }
        />
      )}
    </Box>
  )
}
