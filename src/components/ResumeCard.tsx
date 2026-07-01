import React, { useRef, useState } from 'react'
import {
  Card,
  Typography,
  IconButton,
  Box,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  TextField,
  CircularProgress,
  Tooltip,
  Button,
  useMediaQuery,
  useTheme
} from '@mui/material'
import { styled } from '@mui/material/styles'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import DeleteIcon from '@mui/icons-material/Delete'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined'
import DownloadIcon from '@mui/icons-material/Download'
import { LinkIcon } from 'lucide-react'
import { GoogleDriveStorage, Resume } from '@cooperation/vc-storage'
import { getLocalStorage } from '../tools/cookie'
import Logo from '../assets/blue-logo.png'
import { useNavigate } from 'react-router-dom'
import DeleteConfirmationDialog from './DeleteConfirmDialog'
import { markOpenExistingResume } from '../utils/newResumeNavigation'
import { useDispatch } from 'react-redux'
import { AppDispatch } from '../redux/store'
import { deleteResume, duplicateResume, updateTitle } from '../redux/slices/myresumes'
import { SVGBadge } from '../assets/svgs'
import ResumePreviewDialog from './ResumePreviewDialog'

const ActionButton = styled(Button)(({ theme }) => ({
  textTransform: 'none',
  padding: '6px 12px',
  borderRadius: 8,
  color: '#3c4599',
  fontSize: '14px',
  '& .MuiButton-startIcon': {
    marginRight: 4
  },
  [theme.breakpoints.down('md')]: {
    padding: '4px 8px',
    fontSize: '12px',
    '& .MuiButton-startIcon': {
      marginRight: 2,
      '& > svg': {
        fontSize: '16px'
      }
    }
  }
}))

interface ResumeCardProps {
  id: string
  title: string
  date: string // ISO date string like "2025-02-26T13:37:25.520Z" for non-drafts
  credentials: number
  isDraft?: boolean
  resume: any
  // Props for local storage functionality (not visually used yet)
  hasLocalChanges?: boolean
  localDraftTime?: string | null
}

const StyledCard = styled(Card)(({ theme }) => ({
  border: `1px solid #001aff`,
  boxShadow: 'none',
  borderRadius: '12px',
  '&:hover': { backgroundColor: '#f9f9f9' },
  [theme.breakpoints.down('md')]: {
    borderRadius: '8px'
  }
}))

// Add a styled component for the resume title
const ResumeTitle = styled(Typography)(({ theme }) => ({
  fontWeight: 500,
  color: '#3c4599',
  cursor: 'pointer',
  textDecoration: 'underline',
  fontSize: '16px',
  '&:hover': {
    textDecoration: 'underline'
  },
  [theme.breakpoints.down('md')]: {
    fontSize: '14px'
  }
}))

// Helper function to format date as "Month Day, Year"
const formatDate = (dateString: string): string => {
  try {
    const date = new Date(dateString)
    // Check if date is valid
    if (isNaN(date.getTime())) {
      console.error('Invalid date string:', dateString)
      return 'Invalid date'
    }
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    })
  } catch (error) {
    console.error('Error formatting date:', error)
    return 'Invalid date'
  }
}

// Helper function to get time ago string (e.g., "2 days ago", "3 hours ago")
const getTimeAgo = (dateString: string): string => {
  try {
    const date = new Date(dateString)

    // Check if date is valid
    if (isNaN(date.getTime())) {
      console.error('Invalid date string in getTimeAgo:', dateString)
      return 'Recently'
    }

    const now = new Date()
    const diffMs = now.getTime() - date.getTime()

    // Sanity check - if date is in the future or too far in the past, return a generic message
    if (diffMs < 0) {
      return 'Just now'
    }

    // Convert to appropriate units
    const diffSecs = Math.floor(diffMs / 1000)
    const diffMins = Math.floor(diffSecs / 60)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)
    const diffMonths = Math.floor(diffDays / 30)
    const diffYears = Math.floor(diffDays / 365)

    if (diffYears > 0) {
      return `${diffYears} ${diffYears === 1 ? 'year' : 'years'} ago`
    } else if (diffMonths > 0) {
      return `${diffMonths} ${diffMonths === 1 ? 'month' : 'months'} ago`
    } else if (diffDays > 0) {
      return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`
    } else if (diffHours > 0) {
      return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`
    } else if (diffMins > 0) {
      return `${diffMins} ${diffMins === 1 ? 'minute' : 'minutes'} ago`
    } else {
      return `${diffSecs <= 0 ? 'Just now' : `${diffSecs} ${diffSecs === 1 ? 'second' : 'seconds'} ago`}`
    }
  } catch (error) {
    console.error('Error calculating time ago:', error)
    return 'Recently'
  }
}

const ResumeCard: React.FC<ResumeCardProps> = ({
  id,
  title,
  date,
  credentials,
  isDraft,
  resume,
  hasLocalChanges,
  localDraftTime
}) => {
  const dispatch: AppDispatch = useDispatch()
  const navigate = useNavigate()
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editedTitle, setEditedTitle] = useState(title)
  const [isLoading, setIsLoading] = useState(false)
  const [showCopiedTooltip, setShowCopiedTooltip] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false)
  const theme = useTheme()
  const fullScreen = useMediaQuery(theme.breakpoints.down('md'))
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

  // Format the date
  const formattedDate = formatDate(date)

  // Get time ago for the appropriate timestamp based on whether it's a draft or signed resume
  const getResumeDate = (): string => {
    // Add some helpful debug logging to understand the resume data structure

    if (isDraft) {
      // For drafts, we expect the date in content.lastUpdated
      if (resume?.content?.lastUpdated) {
        return resume.content.lastUpdated
      } else {
        return date // Use the date prop as fallback
      }
    } else {
      // For signed resumes, we expect the date in content.issuanceDate
      if (resume?.content?.issuanceDate) {
        return resume.content.issuanceDate
      } else {
        // Log potential issues with signed resume structure
        return date
      }
    }
  }

  const resumeDate = getResumeDate()
  const timeAgo = getTimeAgo(resumeDate)

  // Additional logging to debug time calculations

  const inputRef = useRef<HTMLInputElement | null>(null)

  const accessToken = getLocalStorage('auth')
  const storage = new GoogleDriveStorage(accessToken as string)
  const resumeManager = new Resume(storage)

  const handleEditTitle = () => {
    markOpenExistingResume()
    navigate(`/resume/new?id=${id}`)
  }

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditedTitle(e.target.value)
  }
  const handleBlurOrEnter = async (e?: React.KeyboardEvent<HTMLInputElement>) => {
    if (!e || e.key === 'Enter') {
      setIsEditing(false)

      if (editedTitle !== title) {
        try {
          // ✅ Dispatch Redux Action to Update File Name
          dispatch(
            updateTitle({
              id,
              newTitle: editedTitle,
              type: isDraft ? 'unsigned' : 'signed'
            })
          )

          const newFileName = `${editedTitle}.json`
          await storage.updateFileData(id, { fileName: newFileName })
        } catch (error) {
          console.error('❌ Error renaming file:', error)
        }
      }
    }
  }

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setMenuAnchor(event.currentTarget)
  }

  const handleMenuClose = () => {
    setMenuAnchor(null)
  }

  const handleDeleteResume = () => {
    setDeleteDialogOpen(true)
  }

  const handleDuplicateResume = async () => {
    try {
      setIsLoading(true)
      // Create a deep copy of the resume content
      const duplicatedContent = JSON.parse(
        JSON.stringify(resume?.content?.credentialSubject || resume?.content || resume)
      )

      // Remove any proof/signature data if it's a signed resume
      if (duplicatedContent.proof) {
        delete duplicatedContent.proof
      }

      // Ensure all required objects exist with safe defaults
      const person = duplicatedContent.person || {}
      const personName = person.name || {}
      const personContact = person.contact || {}
      const personLocation = personContact.location || {}
      const personSocialLinks = personContact.socialLinks || {}
      const narrative = duplicatedContent.narrative || {}

      const currentDate = new Date().toISOString()

      const newResume = {
        id: '',
        lastUpdated: currentDate,
        name: personName.formattedName || 'Untitled Resume',
        version: 1,
        contact: {
          fullName: personContact.fullName || '',
          email: personContact.email || '',
          phone: personContact.phone || '',
          location: {
            street: personLocation.street || '',
            city: personLocation.city || '',
            state: personLocation.state || '',
            country: personLocation.country || '',
            postalCode: personLocation.postalCode || ''
          },
          socialLinks: {
            linkedin: personSocialLinks.linkedin || '',
            github: personSocialLinks.github || '',
            portfolio: personSocialLinks.portfolio || '',
            instagram: personSocialLinks.twitter || '' // Map twitter to instagram
          }
        },
        summary: narrative.text || '',
        experience: {
          items: (duplicatedContent.employmentHistory || []).map((job: any) => ({
            title: job.title || '',
            company: job.organization?.tradeName || '',
            duration: job.duration || '',
            currentlyEmployed: job.stillEmployed || false,
            description: job.description || '',
            position: '',
            startDate: job.startDate || '',
            endDate: job.endDate || '',
            id: job.id || '',
            verificationStatus: job.verificationStatus || '',
            credentialLink: job.credentialLink || '',
            selectedCredentials: job.verifiedCredentials || []
          }))
        },
        education: {
          items: (duplicatedContent.educationAndLearning || []).map((edu: any) => ({
            type: 'Bachelors', // Default type
            programName: edu.fieldOfStudy || '',
            institution: edu.institution || '',
            duration: edu.duration || '',
            currentlyEnrolled: false,
            inProgress: false,
            awardEarned: false,
            description: '<p></p>',
            id: edu.id || '',
            verificationStatus: edu.verificationStatus || '',
            credentialLink: edu.credentialLink || '',
            selectedCredentials: edu.verifiedCredentials || [],
            degree: edu.degree || '',
            field: edu.fieldOfStudy || '',
            startDate: edu.startDate || '',
            endDate: edu.endDate || ''
          }))
        },
        skills: {
          items: (duplicatedContent.skills || []).map((skill: any) => ({
            skills: `<p>${skill.name || 'Skill'}</p>`,
            id: skill.id || '',
            verificationStatus: skill.verificationStatus || '',
            credentialLink: skill.credentialLink || '',
            selectedCredentials: skill.verifiedCredentials || []
          }))
        },
        awards: {
          items: []
        },
        publications: {
          items: []
        },
        certifications: {
          items: (duplicatedContent.certifications || []).map((cert: any) => ({
            name: cert.name || '',
            issuer: cert.issuer || '',
            issueDate: cert.date || '',
            expiryDate: '',
            credentialId: cert.url || '',
            noExpiration: false,
            id: cert.id || '',
            verificationStatus: cert.verificationStatus || '',
            credentialLink: cert.credentialLink || '',
            selectedCredentials: cert.verifiedCredentials || []
          }))
        },
        professionalAffiliations: {
          items: (duplicatedContent.professionalAffiliations || []).map((aff: any) => ({
            name: aff.name || '',
            organization: aff.organization || '',
            startDate: aff.startDate || '',
            endDate: aff.endDate || '',
            activeAffiliation: aff.activeAffiliation || false,
            id: aff.id || '',
            verificationStatus: aff.verificationStatus || '',
            credentialLink: aff.credentialLink || '',
            duration: aff.duration || '',
            selectedCredentials: aff.selectedCredentials || []
          }))
        },
        volunteerWork: {
          items: (duplicatedContent.volunteerWork || []).map((vol: any) => ({
            role: vol.role || '',
            organization: vol.organization || '',
            location: vol.location || '',
            startDate: vol.startDate || '',
            endDate: vol.endDate || '',
            currentlyVolunteering: vol.currentlyVolunteering || false,
            description: vol.description || '',
            duration: vol.duration || '',
            id: vol.id || '',
            verificationStatus: vol.verificationStatus || '',
            credentialLink: vol.credentialLink || '',
            selectedCredentials: vol.selectedCredentials || []
          }))
        },
        hobbiesAndInterests: duplicatedContent.hobbiesAndInterests || [],
        languages: {
          items: (duplicatedContent.languages || []).map((lang: any) => ({
            name: lang.name || ''
          }))
        },
        testimonials: {
          items: []
        },
        projects: {
          items: (duplicatedContent.projects || []).map((proj: any) => ({
            name: proj.name || '',
            description: proj.description || '',
            url: proj.url || '',
            id: proj.id || '',
            verificationStatus: proj.verificationStatus || '',
            credentialLink: proj.credentialLink || '',
            technologies: [],
            selectedCredentials: proj.verifiedCredentials || []
          }))
        }
      }

      // Save the duplicated resume to Google Drive
      const file = await resumeManager.saveResume({
        resume: newResume,
        type: 'unsigned'
      })

      if (file) {
        // Update Redux state with the new resume
        dispatch(
          duplicateResume({
            id: file.id,
            type: 'unsigned',
            resume: {
              ...duplicatedContent,
              id: file.id
            }
          })
        )

        // Navigate to the form editor with the duplicated resume
        markOpenExistingResume()
        navigate(`/resume/new?id=${file.id}`)
      }
    } catch (error) {
      console.error('Error duplicating resume:', error)
    } finally {
      setIsLoading(false)
      handleMenuClose()
    }
  }

  const handleCopyLink = () => {
    const resumeUrl = `https://resume.allskillscount.org/resume/view/${id}`
    navigator.clipboard.writeText(resumeUrl)
    setShowCopiedTooltip(true)
    setTimeout(() => setShowCopiedTooltip(false), 2000)
    handleMenuClose()
  }

  const handleConfirmDelete = async () => {
    dispatch(deleteResume({ id, type: isDraft ? 'unsigned' : 'signed' }))
    setDeleteDialogOpen(false)
    handleMenuClose()
    await storage.delete(id)
  }

  const handlePreviewResume = () => {
    if (isSigned()) {
      // For signed resumes, navigate to the view page
      navigate(`/resume/view/${id}`)
    } else {
      // For drafts or completed but unsigned, navigate to preview
      navigate(`/resume/view?id=${id}`)
    }
  }
  const exportResumeToPDF = (data: any) => {
    setPreviewDialogOpen(true)
  }

  // Helper function to determine if the resume is signed
  const isSigned = () => {
    return !isDraft && resume?.content?.proof
  }

  // Helper function to determine if the resume is completed but unsigned
  const isCompletedUnsigned = () => {
    return !isDraft && !resume?.content?.proof && resume?.content?.isComplete === true
  }

  // Handle click on the resume title
  const handleTitleClick = () => {
    if (isSigned()) {
      // For signed resumes, navigate to the view page
      navigate(`/resume/view/${id}`)
    } else {
      // For drafts or completed but unsigned, navigate to the edit page
      markOpenExistingResume()
      navigate(`/resume/new?id=${id}`)
    }
  }

  return (
    <>
      <StyledCard>
        <Box
          position='relative'
          sx={{
            p: { xs: 1.5, md: 2 },
            opacity: isLoading ? 0.5 : 1
          }}
        >
          {/* Loading Spinner */}
          {isLoading && (
            <Box
              position='absolute'
              top='50%'
              left='50%'
              sx={{ transform: 'translate(-50%, -50%)' }}
            >
              <CircularProgress size={24} />
            </Box>
          )}

          {/* Main Content */}
          <Box
            display='flex'
            flexDirection={{ xs: 'column', sm: 'row' }}
            justifyContent='space-between'
            alignItems={{ xs: 'flex-start', sm: 'center' }}
            gap={{ xs: 2, sm: 0 }}
          >
            {/* Left Side: Title and Metadata */}
            <Box display='flex' gap={{ xs: 1, md: 1.5 }}>
              {isSigned() ? (
                <Tooltip title='Signed Resume' placement='top'>
                  <Box>
                    <SVGBadge />
                  </Box>
                </Tooltip>
              ) : isCompletedUnsigned() ? (
                <Tooltip title='Completed but Unsigned Resume' placement='top'>
                  <Box
                    sx={{
                      height: 25,
                      width: 25,
                      backgroundColor: '#3c4599',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <Box
                      sx={{
                        height: 15,
                        width: 15,
                        backgroundColor: 'white',
                        borderRadius: '50%'
                      }}
                    />
                  </Box>
                </Tooltip>
              ) : (
                <Tooltip title='Draft Resume' placement='top'>
                  <Box>
                    <img src={Logo} alt='Résumé Author' style={{ height: 25 }} />
                  </Box>
                </Tooltip>
              )}
              <Box>
                {isEditing ? (
                  <TextField
                    type='text'
                    value={editedTitle}
                    onChange={handleTitleChange}
                    onBlur={() => handleBlurOrEnter()}
                    onKeyDown={e => e.key === 'Enter' && handleBlurOrEnter(e as any)}
                    inputRef={inputRef}
                    autoFocus
                    variant='standard'
                    sx={{
                      fontSize: '0.875rem',
                      '& .MuiInputBase-root': { padding: 0 },
                      '& .MuiInputBase-input': {
                        padding: 0,
                        margin: 0,
                        fontSize: 'inherit',
                        fontWeight: 500,
                        color: '#3c4599'
                      },
                      '& .MuiInput-underline:before': { borderBottom: 'none' },
                      '& .MuiInput-underline:after': { borderBottom: 'none' }
                    }}
                  />
                ) : (
                  <ResumeTitle onClick={handleTitleClick} variant='body1'>
                    {title} - {formattedDate}
                  </ResumeTitle>
                )}
                <Typography
                  variant='body2'
                  color='text.secondary'
                  sx={{ mt: 0.5, fontSize: '0.875rem' }}
                >
                  {isDraft
                    ? `DRAFT`
                    : isSigned()
                      ? `SIGNED - ${timeAgo}`
                      : `COMPLETED - ${timeAgo}`}
                </Typography>
              </Box>
            </Box>

            {/* Right Side: Action Buttons */}
            <Box
              display='flex'
              alignItems='center'
              color={'#3c4599'}
              gap={0.5}
              width={{ xs: '100%', sm: 'auto' }}
              justifyContent={{ xs: 'space-between', sm: 'flex-end' }}
            >
              <Box
                className='resume-card-actions'
                sx={{
                  display: 'flex',
                  gap: { xs: 0.5, md: 1 },
                  flexWrap: 'wrap'
                }}
              >
                {isDraft || isCompletedUnsigned() ? (
                  <>
                    <ActionButton
                      size='small'
                      startIcon={!isMobile && <EditOutlinedIcon />}
                      onClick={handleEditTitle}
                    >
                      Edit
                    </ActionButton>
                    <ActionButton
                      size='small'
                      startIcon={!isMobile && <VisibilityOutlinedIcon />}
                      onClick={handlePreviewResume}
                    >
                      Preview
                    </ActionButton>
                  </>
                ) : (
                  <>
                    <Tooltip title={showCopiedTooltip ? 'Copied!' : 'Copy Link'}>
                      <ActionButton
                        size='small'
                        startIcon={!isMobile && <LinkIcon size={16} />}
                        onClick={handleCopyLink}
                      >
                        {isMobile ? 'Link' : 'Copy Link'}
                      </ActionButton>
                    </Tooltip>
                    <ActionButton
                      onClick={() => setPreviewDialogOpen(true)}
                      size='small'
                      startIcon={!isMobile && <DownloadIcon />}
                    >
                      {isMobile ? 'PDF' : 'Download PDF'}
                    </ActionButton>
                    <ActionButton
                      size='small'
                      startIcon={!isMobile && <VisibilityOutlinedIcon />}
                      onClick={handlePreviewResume}
                    >
                      Preview
                    </ActionButton>
                  </>
                )}
              </Box>
              <StyledMoreButton size='small' onClick={handleMenuOpen}>
                <MoreVertIcon sx={{ fontSize: { xs: 16, md: 18 } }} />
              </StyledMoreButton>
            </Box>
          </Box>

          {/* Menu for Additional Actions */}
          <Menu
            anchorEl={menuAnchor}
            open={Boolean(menuAnchor)}
            onClose={handleMenuClose}
          >
            <MenuItem onClick={handleDeleteResume} disabled={isLoading}>
              <ListItemIcon>
                <DeleteIcon fontSize='small' />
              </ListItemIcon>
              <ListItemText primary='Delete' />
            </MenuItem>
            <MenuItem onClick={handleDuplicateResume} disabled={isLoading}>
              <ListItemIcon>
                <ContentCopyIcon fontSize='small' />
              </ListItemIcon>
              <ListItemText primary='Duplicate and Edit' />
            </MenuItem>
          </Menu>
        </Box>
      </StyledCard>
      <DeleteConfirmationDialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleConfirmDelete}
      />
      <ResumePreviewDialog
        open={previewDialogOpen}
        onClose={() => setPreviewDialogOpen(false)}
        id={id}
        onDownload={exportResumeToPDF}
        fullScreen={fullScreen}
      />
    </>
  )
}

const StyledMoreButton = styled(IconButton)(({ theme }) => ({
  padding: 8,
  borderRadius: 8,
  '&:hover': {
    backgroundColor: theme.palette.grey[100]
  }
}))

export default ResumeCard
