import { Box, Typography, Button, Divider, Stack, CircularProgress } from '@mui/material'
import { login } from '../../tools/auth'
import { useSelector, useDispatch } from 'react-redux'
import { useState, useEffect, useCallback } from 'react'
import { checkmarkBlueSVG, checkmarkgraySVG } from '../../assets/svgs'
import { useLocation } from 'react-router-dom'
import { fetchVCs } from '../../redux/slices/vc'
import { AppDispatch, RootState } from '../../redux/store'
import MediaUploadSection from '../../components/NewFileUpload/MediaUploadSection'
import useGoogleDrive, { DriveFileMeta } from '../../hooks/useGoogleDrive'
import StorageService from '../../storage-singlton'

export interface FileItem {
  id: string
  file: File
  name: string
  url: string
  uploaded: boolean
  fileExtension: string
  googleId?: string
}

interface RightSidebarProps {
  files: FileItem[]
  onFilesSelected: (files: FileItem[]) => void
  onFileDelete: (event: React.MouseEvent, id: string) => void
  onFileNameChange: (id: string, newName: string) => void
  onAllFilesUpdate: (allFiles: FileItem[]) => void
}

const RightSidebar = ({
  files,
  onFilesSelected,
  onFileDelete,
  onFileNameChange,
  onAllFilesUpdate
}: RightSidebarProps) => {
  const location = useLocation()
  const { accessToken, isAuthenticated } = useSelector((state: RootState) => state.auth)
  const dispatch: AppDispatch = useDispatch()
  const { vcs, status: vcStatus, error: vcError } = useSelector(
    (state: any) => state.vcReducer
  )
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const resume = useSelector((state: RootState) => state.resume?.resume)

  const { listFilesMetadata } = useGoogleDrive()
  const [remoteFiles, setRemoteFiles] = useState<DriveFileMeta[]>([])

  const reloadRemoteFiles = useCallback(async () => {
    if (!accessToken) return

    try {
      const storageService = StorageService.getInstance()
      storageService.initialize(accessToken)

      const files = await storageService.handleApiCall(async () => {
        const storage = storageService.getStorage()
        const folderId = await storage.getMediaFolderId()
        return await listFilesMetadata(folderId)
      })

      setRemoteFiles(files)
    } catch (error) {
      console.error('Error fetching remote files:', error)
      setRemoteFiles([])
    }
  }, [accessToken, listFilesMetadata])

  useEffect(() => {
    if (accessToken) {
      reloadRemoteFiles()
    }
  }, [accessToken, reloadRemoteFiles])

  useEffect(() => {
    if (remoteFiles.length > 0) {
      console.log('Access token debug:', {
        hasAccessToken: !!accessToken,
        accessTokenLength: accessToken?.length,
        accessTokenPreview: accessToken ? accessToken.substring(0, 20) + '...' : 'null',
        remoteFilesCount: remoteFiles.length,
        sampleFile: remoteFiles[0]
          ? {
              id: remoteFiles[0].id,
              name: remoteFiles[0].name,
              mimeType: remoteFiles[0].mimeType,
              hasThumbnailLink: !!remoteFiles[0].thumbnailLink
            }
          : null
      })
    }
  }, [remoteFiles, accessToken])

  const getDriveUrl = (id: string) => {
    const url =
      `https://drive.google.com/uc?export=view&id=${id}` ||
      `https://drive.google.com/thumbnail?authuser=0&sz=w320&id=${id}`

    console.log('getDriveUrl called:', {
      id,
      generatedUrl: url
    })

    return url
  }

  const getAllFiles = useCallback((): FileItem[] => {
    const localFiles = files
    const convertedRemoteFiles: FileItem[] = remoteFiles.map(rf => ({
      id: rf.id,
      file: new File([], rf.name),
      name: rf.name,

      url: getDriveUrl(rf.id),
      uploaded: true,
      fileExtension: rf.name.split('.').pop() ?? '',
      googleId: rf.id
    }))

    const allFiles = [...localFiles, ...convertedRemoteFiles]
    return allFiles
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files, remoteFiles]) // accessToken is not needed here

  useEffect(() => {
    const combinedFiles = getAllFiles()
    onAllFilesUpdate(combinedFiles)
  }, [getAllFiles, onAllFilesUpdate])

  useEffect(() => {
    if (!accessToken) {
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    dispatch(fetchVCs())
      .then(() => setIsLoading(false))
      .catch(() => setIsLoading(false))
  }, [dispatch, accessToken])

  const handleGoogleLogin = async () => {
    await login(location.pathname)
  }

  const handleFilesSelected = (newFiles: FileItem[]) => {
    onFilesSelected(newFiles)

    setTimeout(() => reloadRemoteFiles(), 500)
  }

  const handleDelete = (event: React.MouseEvent, id: string) => {
    onFileDelete(event, id)
  }

  const handleNameChange = (id: string, newName: string) => {
    onFileNameChange(id, newName)
  }

  const handleRefresh = () => {
    setIsLoading(true)
    dispatch(fetchVCs())
      .then(() => setIsLoading(false))
      .catch(() => setIsLoading(false))
  }

  const handleImport = () => {
    if (accessToken && isAuthenticated) {
      handleRefresh()
    } else {
      handleGoogleLogin()
    }
  }

  const getCredentialName = (vc: any): string => {
    try {
      if (!vc || typeof vc !== 'object') {
        return ''
      }

      const credentialSubject = vc.credentialSubject
      if (!credentialSubject || typeof credentialSubject !== 'object') {
        return ''
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

      // LinkedCreds SkillClaimCredential (e.g. "test resume author")
      if (credentialSubject.skill?.[0]?.name) {
        return credentialSubject.skill[0].name
      }
      if (credentialSubject.name) {
        return credentialSubject.name
      }

      if (
        Array.isArray(credentialSubject.achievement) &&
        credentialSubject.achievement.length > 0 &&
        credentialSubject.achievement[0]?.name
      ) {
        return credentialSubject.achievement[0].name
      }

      // Handle OpenBadge format where achievement is an object, not array
      if (
        credentialSubject.achievement &&
        typeof credentialSubject.achievement === 'object' &&
        !Array.isArray(credentialSubject.achievement) &&
        credentialSubject.achievement.name
      ) {
        return credentialSubject.achievement.name
      }

      // Check for credential name at root level (OpenBadge/external format)
      if (vc.name && typeof vc.name === 'string') {
        return vc.name
      }

      return ''
    } catch (error) {
      console.error('Error getting credential name:', error)
      return ''
    }
  }

  const getValidVCs = (vcs: any[]): any[] => {
    if (!Array.isArray(vcs)) return []

    return vcs.filter(vc => {
      try {
        if (!vc || typeof vc !== 'object') {
          return false
        }

        if (!vc.credentialSubject || typeof vc.credentialSubject !== 'object') {
          return false
        }

        const credentialName = getCredentialName(vc)
        if (!credentialName || credentialName.trim() === '') {
          return false
        }

        return true
      } catch (error) {
        console.error('Error validating VC:', error)
        return false
      }
    })
  }

  // Check if a credential is currently being used in the resume
  const isCredentialInUse = (vcId: string): boolean => {
    if (!resume || !vcId) return false

    // Check all sections that can have credentials
    const sections = [
      'experience',
      'education',
      'skills',
      'certifications',
      'projects',
      'professionalAffiliations',
      'volunteerWork'
    ]

    for (const sectionName of sections) {
      const section = resume[sectionName as keyof typeof resume]
      if (
        section &&
        typeof section === 'object' &&
        'items' in section &&
        Array.isArray(section.items)
      ) {
        for (const item of section.items) {
          // Check selectedCredentials array
          if (item.selectedCredentials && Array.isArray(item.selectedCredentials)) {
            if (
              item.selectedCredentials.some(
                (cred: any) => cred.id === vcId || cred.fileId === vcId
              )
            ) {
              return true
            }
          }
          // Also check credentialLink in case it contains the ID
          if (item.credentialLink && typeof item.credentialLink === 'string') {
            if (item.credentialLink.includes(vcId)) {
              return true
            }
          }
        }
      }
    }

    return false
  }

  const renderCredentialContent = (vc: any) => {
    const credentialName = getCredentialName(vc)

    return (
      <Typography
        sx={{
          fontSize: 16,
          fontWeight: 500,
          color: '#2563EB',
          textDecoration: 'underline',
          fontFamily: 'Nunito Sans',
          cursor: 'pointer'
        }}
        onClick={() => {
          /* No action needed - just for visual feedback */
        }}
      >
        {credentialName}
      </Typography>
    )
  }

  const renderCredentialsContent = () => {
    if (isLoading) {
      return (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100px'
          }}
        >
          <CircularProgress size={36} sx={{ color: '#3A35A2' }} />
        </Box>
      )
    }

    const validVCs = getValidVCs(vcs)

    if (validVCs && validVCs.length > 0) {
      return (
        <Stack spacing={2}>
          {validVCs.map((vc: any) => {
            const isInUse = isCredentialInUse(vc.id || vc.originalItem?.id)
            return (
              <Box sx={{ display: 'flex', alignItems: 'center' }} key={vc.id}>
                <Box sx={{ width: 24, height: 24, mr: '10px', display: 'flex' }}>
                  {isInUse ? checkmarkBlueSVG() : checkmarkgraySVG()}
                </Box>
                {renderCredentialContent(vc)}
              </Box>
            )
          })}
        </Stack>
      )
    }

    const loadedCount = Array.isArray(vcs) ? vcs.length : 0
    let message = 'No credentials found.'
    if (vcStatus === 'failed' && vcError) {
      message = `Could not load credentials: ${vcError}`
    } else if (loadedCount > 0) {
      message =
        `${loadedCount} credential(s) loaded from Drive but none could be displayed. Try Import Credentials from Google Drive.`
    } else if (!accessToken) {
      message = 'Sign in with Google to load credentials from your wallet.'
    } else {
      message +=
        ' Credentials are stored per Google OAuth app — use the same Client ID as LinkedCreds in .env.'
    }

    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 2, px: 1 }}>
        <Typography
          sx={{
            fontSize: 14,
            color: '#9CA3AF',
            fontFamily: 'Nunito Sans',
            textAlign: 'center'
          }}
        >
          {message}
        </Typography>
      </Box>
    )
  }

  return (
    <Box
      sx={{
        width: { xs: '90%', md: '29%' },
        display: 'flex',
        flexDirection: 'column',
        gap: '30px',
        bgcolor: 'white',
        pr: '40px'
      }}
    >
      {/* Section 1: Library Header and Buttons */}
      <Box
        sx={{
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          backgroundColor: '#FFF',
          padding: '20px',
          borderRadius: 2,
          boxShadow: '0px 2px 20px rgba(0,0,0,0.10)'
        }}
      >
        <Typography
          sx={{ fontSize: 18, fontWeight: 700, color: 'black', fontFamily: 'Poppins' }}
        >
          Library
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <Typography sx={{ fontSize: 16, color: '#47516B', fontFamily: 'Nunito Sans' }}>
            To access credentials from Google Drive, select the Import from Google Drive
            button.
          </Typography>
          <Button
            fullWidth
            variant='outlined'
            sx={{
              borderRadius: '100px',
              borderColor: '#3A35A2',
              color: '#3A35A2',
              fontSize: { xs: 16, md: 18 },
              textTransform: 'none',
              backgroundColor: 'transparent',
              fontFamily: 'Nunito Sans',
              py: { xs: 1.5, md: 2 },
              width: '100%'
            }}
            onClick={handleImport}
          >
            Import Credentials from Google Drive
          </Button>
        </Box>
        <Divider sx={{ borderColor: '#47516B' }} />

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <Typography sx={{ fontSize: 16, color: '#47516B' }}>
            To check for new credentials in your wallet, select the refresh button below:
          </Typography>
          <Button
            disabled={true}
            variant='outlined'
            fullWidth
            sx={{
              color: '#3A35A2',
              borderRadius: '100px',
              borderColor: '#3A35A2',
              fontSize: { xs: 16, md: 18 },
              textTransform: 'none',
              backgroundColor: 'transparent',
              py: { xs: 1.5, md: 2 },
              width: '100%'
            }}
          >
            Refresh Learner Credential Wallet
          </Button>
        </Box>
      </Box>

      {/* Section 2: Credentials */}
      <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <Typography
          sx={{
            fontSize: '16px',
            fontWeight: 700,
            color: '#47516B',
            fontFamily: 'Poppins'
          }}
        >
          Your Credentials
          {isLoading && (
            <Box component='span' sx={{ ml: 1, color: '#9CA3AF' }}>
              (Loading...)
            </Box>
          )}
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Box sx={{ width: 24, height: 24, mr: '12px', display: 'flex' }}>
            {checkmarkBlueSVG()}
          </Box>
          <Typography
            sx={{
              fontSize: 14,
              color: '#2D2D47',
              fontWeight: 500,
              fontFamily: 'Nunito Sans'
            }}
          >
            Items with a filled-in checkmark are included in your resume.
          </Typography>
        </Box>

        <Divider sx={{ borderColor: '#47516B', mt: '3px' }} />

        <Box
          sx={{
            maxHeight: vcs?.length > 10 ? 531 : 'auto',
            overflowY: vcs?.length > 10 ? 'auto' : 'visible',
            paddingRight: 1,
            minHeight: '100px'
          }}
        >
          {renderCredentialsContent()}
        </Box>
      </Box>

      {/* Section 3: Your Files */}
      <Box
        sx={{
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          gap: '15px',
          backgroundColor: '#FFF',
          padding: '20px',
          borderRadius: 2,
          boxShadow: '0px 2px 20px rgba(0,0,0,0.10)'
        }}
      >
        <Typography
          sx={{
            fontSize: 16,
            color: '#47516B',
            fontWeight: 700,
            fontFamily: 'Poppins'
          }}
        >
          Your Files
        </Typography>
        <Divider sx={{ borderColor: '#47516B' }} />
        <MediaUploadSection
          files={files}
          onFilesSelected={handleFilesSelected}
          onDelete={handleDelete}
          onNameChange={handleNameChange}
          maxFiles={10}
          maxSizeMB={50}
          accessToken={accessToken ?? undefined}
        />
      </Box>
    </Box>
  )
}

export default RightSidebar
