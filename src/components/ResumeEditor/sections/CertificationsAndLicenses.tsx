import React, { useState, useCallback, useEffect, useRef } from 'react'
import {
  Box,
  TextField,
  Typography,
  Checkbox,
  FormControlLabel,
  Button,
  IconButton,
  Tooltip,
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
import { StyledButton } from './StyledButton'
import { useDispatch, useSelector } from 'react-redux'
import { updateSection } from '../../../redux/slices/resume'
import { RootState } from '../../../redux/store'
import { useDebouncedSectionUpdate } from '../../../hooks/useDebouncedSectionUpdate'
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline'
import VerifiedIcon from '@mui/icons-material/Verified'
import CloseIcon from '@mui/icons-material/Close'
import CredentialOverlay from '../../CredentialsOverlay'
import AttachFileIcon from '@mui/icons-material/AttachFile'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns'
import MinimalCredentialViewer from '../../MinimalCredentialViewer'
import VerifiedCredentialsList from '../../common/VerifiedCredentialsList'

interface FileItem {
  id: string
  file: File
  name: string
  url: string
  uploaded: boolean
  fileExtension: string
  googleId?: string
}

interface CertificationsAndLicensesProps {
  onAddFiles?: (itemIndex?: number) => void
  onDelete?: () => void
  onAddCredential?: (text: string) => void
  evidence?: string[][]
  allFiles?: FileItem[]
  onRemoveFile?: (sectionId: string, itemIndex: number, fileIndex: number) => void
}

interface CertificationItem {
  name: string
  issuer: string
  issueDate: string
  expiryDate: string
  credentialId: string
  noExpiration: boolean
  id: string
  verificationStatus: string
  credentialLink: string
  selectedCredentials: SelectedCredential[]
}

interface SelectedCredential {
  id: string
  url: string
  name: string
  isAttestation?: boolean
  vc?: any // full object
  fileId?: string // Added fileId to the interface
}

export default function CertificationsAndLicenses({
  onAddFiles,
  onDelete,
  onAddCredential,
  evidence = [],
  allFiles = [],
  onRemoveFile
}: Readonly<CertificationsAndLicensesProps>) {
  const dispatch = useDispatch()
  const resume = useSelector((state: RootState) => state.resume.resume)
  const initialLoadRef = useRef(true)
  const theme = useTheme()
  const isSmallMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const [showCredentialsOverlay, setShowCredentialsOverlay] = useState(false)
  const [activeSectionIndex, setActiveSectionIndex] = useState<number | null>(null)
  const vcs = useSelector((state: any) => state.vcReducer.vcs)
  // const [openCredDialog, setOpenCredDialog] = useState(false)
  // const [dialogCredObj, setDialogCredObj] = useState<any>(null)

  const [certifications, setCertifications] = useState<CertificationItem[]>([
    {
      name: '',
      issuer: '',
      issueDate: '',
      expiryDate: '',
      credentialId: '',
      noExpiration: false,
      id: '', // Do not prefill id, only use what user types
      verificationStatus: 'unverified',
      credentialLink: '', // Always a string, never null
      selectedCredentials: []
    }
  ])

  const [expandedItems, setExpandedItems] = useState<Record<number, boolean>>({
    0: true
  })

  const dispatchCertificationsUpdate = useCallback(
    (items: CertificationItem[]) => {
      dispatch(
        updateSection({
          sectionId: 'certifications',
          content: { items }
        })
      )
    },
    [dispatch]
  )

  const { scheduleUpdate: debouncedReduxUpdate } = useDebouncedSectionUpdate(
    dispatchCertificationsUpdate,
    500
  )

  useEffect(() => {
    const items =
      resume && resume.certifications && Array.isArray(resume.certifications.items)
        ? resume.certifications.items
        : []
    if (items.length > 0) {
      const typedItems = items.map((item: any) => ({
        name: item.name || '',
        issuer: item.issuer || '',
        issueDate: item.issueDate || '',
        expiryDate: item.expiryDate || '',
        credentialId: '', // always empty, never prefilled
        noExpiration: Boolean(item.noExpiration),
        id: item.id || '',
        verificationStatus: item.verificationStatus || 'unverified',
        credentialLink: item.credentialLink || '',
        selectedCredentials: item.selectedCredentials || [],
        ...item
      }))

      const shouldUpdate =
        initialLoadRef.current || typedItems.length !== certifications.length

      if (shouldUpdate) {
        initialLoadRef.current = false

        setCertifications(typedItems)
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

  const handleCertificationChange = useCallback(
    (index: number, field: string, value: any) => {
      setCertifications(prevCertifications => {
        const updatedCertifications = [...prevCertifications]
        updatedCertifications[index] = {
          ...updatedCertifications[index],
          [field]: value
        }

        if (field === 'noExpiration' && value === true) {
          updatedCertifications[index].expiryDate = ''
        }

        debouncedReduxUpdate(updatedCertifications)
        return updatedCertifications
      })
    },
    [debouncedReduxUpdate]
  )

  const handleAddAnotherItem = useCallback(() => {
    const emptyItem: CertificationItem = {
      name: '',
      issuer: '',
      issueDate: '',
      expiryDate: '',
      credentialId: '', // always empty
      noExpiration: false,
      id: '',
      verificationStatus: 'unverified',
      credentialLink: '',
      selectedCredentials: []
    }

    setCertifications(prevCertifications => {
      const updatedCertifications = [...prevCertifications, emptyItem]

      dispatch(
        updateSection({
          sectionId: 'certifications',
          content: {
            items: updatedCertifications
          }
        })
      )

      return updatedCertifications
    })

    const newIndex = certifications.length
    setExpandedItems(prev => ({
      ...prev,
      [newIndex]: true
    }))
  }, [certifications.length, dispatch])

  const handleDeleteCertification = useCallback(
    (index: number) => {
      if (certifications.length <= 1) {
        if (onDelete) onDelete()
        return
      }

      setCertifications(prevCertifications => {
        const updatedCertifications = prevCertifications.filter((_, i) => i !== index)
        dispatch(
          updateSection({
            sectionId: 'certifications',
            content: {
              items: updatedCertifications
            }
          })
        )

        return updatedCertifications
      })

      setExpandedItems(prev => {
        const newExpandedState: Record<number, boolean> = {}
        certifications
          .filter((_, i) => i !== index)
          .forEach((_, i) => {
            if (i === 0 && certifications.length - 1 === 1) {
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
    [certifications, dispatch, onDelete]
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
          // Extract fileId: prefer credential.originalItem.id if present and not a URN, else credential.id if not a URN, else fallback to id
          let fileId = ''
          if (
            credential?.originalItem?.id &&
            !credential.originalItem.id.startsWith('urn:')
          ) {
            fileId = credential.originalItem.id
          } else if (credential?.id && !credential.id.startsWith('urn:')) {
            fileId = credential.id
          } else {
            fileId = id
          }
          return {
            id: id,
            url: '', // not used, but required by interface
            name:
              credential?.credentialSubject?.achievement[0]?.name ||
              `Credential ${id.substring(0, 5)}...`,
            isAttestation: false,
            vc: credential, // full object
            fileId: fileId
          }
        })
        // Deduplicate by id
        const deduped: SelectedCredential[] = Array.from(
          new Map(selectedCredentials.map(c => [c.id, c])).values()
        )
        setCertifications(prev => {
          const updated = [...prev]
          // Build credentialLink as a JSON stringified array
          const credLinks = deduped
            .map(cred =>
              cred.fileId && cred.vc ? `${cred.fileId},${JSON.stringify(cred.vc)}` : ''
            )
            .filter(Boolean)
          updated[activeSectionIndex] = {
            ...updated[activeSectionIndex],
            verificationStatus: 'verified',
            credentialLink: credLinks.length ? JSON.stringify(credLinks) : '',
            selectedCredentials: deduped
          }
          dispatch(
            updateSection({
              sectionId: 'certifications',
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
    (certIndex: number, credIndex: number) => {
      setCertifications(prev => {
        const updated = [...prev]
        const cert = { ...updated[certIndex] }
        const newCreds = cert.selectedCredentials.filter((_, i) => i !== credIndex)
        // Deduplicate by id
        cert.selectedCredentials = Array.from(
          new Map(newCreds.map(c => [c.id, c])).values()
        )
        if (!cert.selectedCredentials.length) {
          cert.verificationStatus = 'unverified'
          cert.credentialLink = ''
        } else {
          cert.credentialLink = cert.selectedCredentials[0]?.vc
            ? JSON.stringify(cert.selectedCredentials[0].vc)
            : ''
        }
        updated[certIndex] = cert
        dispatch(
          updateSection({
            sectionId: 'certifications',
            content: { items: updated }
          })
        )
        return updated
      })
    },
    [dispatch]
  )

  const handleRemoveFile = (itemIndex: number, fileIndex: number) => {
    if (onRemoveFile) {
      onRemoveFile('certifications', itemIndex, fileIndex)
    }
  }

  // Helper to get credential name (restore previous working logic)
  function getCredentialName(claim: any): string {
    if (!claim) return ''
    if (claim.name) return claim.name
    if (
      claim.credentialSubject &&
      claim.credentialSubject.achievement &&
      claim.credentialSubject.achievement[0]?.name
    ) {
      return claim.credentialSubject.achievement[0].name
    }
    if (claim.credentialSubject && claim.credentialSubject.credentialName) {
      return claim.credentialSubject.credentialName
    }
    return ''
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <Typography sx={{ fontSize: '14px', fontWeight: '500' }}>
        Add certifications and licenses to showcase your professional qualifications.
        These can significantly enhance your resume, especially for roles requiring
        specific credentials.
      </Typography>

      {(Array.isArray(certifications) ? certifications : []).map(
        (certification, index) => (
          <Box
            key={`certification-${index}`}
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
                    <Typography variant='body1'>Certification:</Typography>
                    <Typography variant='body1' sx={{ fontWeight: 'medium' }}>
                      {certification.name || 'Untitled Certification'}
                    </Typography>
                    {certification.verificationStatus === 'verified' && (
                      <Tooltip title='Verified credential'>
                        <VerifiedIcon sx={{ color: '#34C759', fontSize: 18 }} />
                      </Tooltip>
                    )}
                  </>
                ) : (
                  <Box display='flex' alignItems='center'>
                    <Typography variant='body1'>Certification Details</Typography>
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
                  label='Certification/License Name'
                  placeholder='e.g., Professional Project Manager (PMP)'
                  value={certification.name}
                  onChange={e => handleCertificationChange(index, 'name', e.target.value)}
                  variant='outlined'
                />

                <TextField
                  sx={{ bgcolor: '#FFF' }}
                  size='small'
                  fullWidth
                  label='Issuing Organization'
                  placeholder='e.g., Project Management Institute'
                  value={certification.issuer}
                  onChange={e =>
                    handleCertificationChange(index, 'issuer', e.target.value)
                  }
                />

                <LocalizationProvider dateAdapter={AdapterDateFns}>
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <Box sx={{ width: '50%' }}>
                      <Typography variant='body2' sx={{ mb: 1 }}>
                        Issue Date
                      </Typography>
                      <TextField
                        sx={{
                          bgcolor: '#FFF',
                          '& .MuiInputLabel-root': {
                            transform: 'translate(14px, -9px) scale(0.75)'
                          }
                        }}
                        size='small'
                        fullWidth
                        type='date'
                        value={certification.issueDate}
                        onChange={e =>
                          handleCertificationChange(index, 'issueDate', e.target.value)
                        }
                        InputLabelProps={{ shrink: true }}
                      />
                    </Box>

                    <Box sx={{ width: '50%' }}>
                      <Typography variant='body2' sx={{ mb: 1 }}>
                        Expiry Date
                      </Typography>
                      <TextField
                        sx={{
                          bgcolor: '#FFF',
                          '& .MuiInputLabel-root': {
                            transform: 'translate(14px, -9px) scale(0.75)'
                          }
                        }}
                        size='small'
                        fullWidth
                        type='date'
                        value={certification.expiryDate}
                        onChange={e =>
                          handleCertificationChange(index, 'expiryDate', e.target.value)
                        }
                        InputLabelProps={{ shrink: true }}
                        disabled={certification.noExpiration}
                      />
                    </Box>
                  </Box>
                </LocalizationProvider>

                <FormControlLabel
                  control={
                    <Checkbox
                      checked={certification.noExpiration}
                      onChange={e =>
                        handleCertificationChange(index, 'noExpiration', e.target.checked)
                      }
                    />
                  }
                  label='This certification does not expire'
                />

                <TextField
                  sx={{ bgcolor: '#FFF' }}
                  size='small'
                  fullWidth
                  label='Credential ID (optional)'
                  placeholder='e.g., ABC123456'
                  value={certification.credentialId}
                  onChange={e =>
                    handleCertificationChange(index, 'credentialId', e.target.value)
                  }
                />

                {Array.isArray(certification.selectedCredentials) &&
                  certification.selectedCredentials.length > 0 && (
                    <VerifiedCredentialsList
                      credentials={certification.selectedCredentials}
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
                    onClick={() => handleDeleteCertification(index)}
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
        )
      )}

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
          onClick={() => handleOpenCredentialsOverlay(certifications.length - 1)}
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
            certifications[activeSectionIndex] &&
            certifications[activeSectionIndex].selectedCredentials
              ? certifications[activeSectionIndex].selectedCredentials
              : []
          }
        />
      )}
    </Box>
  )
}
