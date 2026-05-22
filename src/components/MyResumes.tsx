import { Box, Typography, Button, useTheme, useMediaQuery } from '@mui/material'
import ResumeCard from './ResumeCard'
import { Link, useNavigate } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import { RootState, AppDispatch } from '../redux/store'
import { useEffect, useCallback, useState, useRef } from 'react'
import { fetchUserResumes } from '../redux/slices/myresumes'
import useDraftResume from '../hooks/useDraftResume'
import { logout } from '../tools/auth'
import AuthErrorDisplay from './common/AuthErrorDisplay'
import { clearAuth } from '../redux/slices/auth'
import { clearVCs } from '../redux/slices/vc'

const buttonStyles = {
  background: '#3A35A2',
  padding: '10px 31px',
  borderRadius: '100px',
  color: '#FFF',
  textAlign: 'center' as const,
  fontFamily: 'Nunito Sans',
  fontSize: '16px',
  fontStyle: 'normal',
  fontWeight: 700,
  lineHeight: '24px',
  border: '3px solid #3A35A2',
  textDecoration: 'none'
}

const ResumeScreen: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>()
  const navigate = useNavigate()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))

  const { signed, unsigned, status, error } = useSelector(
    (state: RootState) => state.myresumes
  )
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated)
  const [friendlyError, setFriendlyError] = useState<string | null>(null)
  const hasFetchedResumes = useRef(false)
  // Get all drafts from localStorage but don't change the UI
  const { getAllDrafts } = useDraftResume(null)
  // We'll keep track of which drafts have local changes
  const localDrafts = getAllDrafts()

  useEffect(() => {
    if (isAuthenticated && !hasFetchedResumes.current && status === 'idle') {
      dispatch(fetchUserResumes())
      hasFetchedResumes.current = true
    }
  }, [isAuthenticated, status, dispatch])

  const handleLogout = useCallback(() => {
    logout()
    dispatch(clearAuth())
    dispatch(clearVCs())
    navigate('/')
  }, [navigate, dispatch])

  useEffect(() => {
    if (status === 'loading') {
      setFriendlyError(null)
    } else if (status === 'failed') {
      // Handle specific error messages from fetchUserResumes
      if (
        error?.includes('No authentication token found') ||
        error?.includes('Authentication expired') ||
        error?.includes('Session expired')
      ) {
        setFriendlyError(error)
        if (isAuthenticated) {
          handleLogout()
        }
      } else if (error?.includes('Please refresh the page')) {
        // Auto-refresh after a short delay
        setTimeout(() => window.location.reload(), 1500)
        setFriendlyError('Refreshing authentication...')
      } else if (error?.includes('Unable to load resumes')) {
        setFriendlyError(error)
      } else if (error?.includes('Error refreshing access token')) {
        setFriendlyError('You need to sign in to view your resumes.')
        if (isAuthenticated) {
          handleLogout()
        }
      } else if (error?.includes('Access token not found') && !isAuthenticated) {
        setFriendlyError('Please log in to view your resumes.')
      } else {
        // For any other errors, show the error message if available
        setFriendlyError(error || 'An error occurred while loading your resumes.')
      }
    } else if (status === 'succeeded') {
      setFriendlyError(null)
    }
  }, [status, error, isAuthenticated, handleLogout])

  // Check if a resume has unsaved changes in localStorage (used internally)
  const hasLocalDraft = (resumeId: string) => {
    return Boolean(localDrafts[resumeId])
  }

  // Helper function to determine if an unsigned resume is a completed template or a draft
  const isCompletedUnsigned = (resume: any) => {
    return resume?.content?.isComplete === true
  }

  // Filter unsigned resumes into drafts (incomplete) and completed but unsigned
  const draftResumes = unsigned.filter(resume => !isCompletedUnsigned(resume))

  return (
    <Box
      sx={{
        mx: 'auto',
        p: { xs: 0, md: 3 },
        display: 'flex',
        flexDirection: 'column',
        marginInline: { xs: 1, md: 3 },
        gap: 2
      }}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', md: 'center' },
          mb: { xs: 2, md: 4 },
          mt: 2,
          gap: { xs: 2, md: 0 }
        }}
      >
        <Typography
          variant='h4'
          sx={{
            color: '#2E2E48',
            fontWeight: 700,
            fontSize: { xs: '24px', sm: '28px', md: '32px' }
          }}
        >
          My Resumes
        </Typography>
        <Box
          sx={{
            display: 'flex',
            gap: { xs: 1, md: 2 },
            flexDirection: { xs: 'column', sm: 'row' },
            width: { xs: '100%', sm: 'auto' }
          }}
        >
          {isAuthenticated && (
            <>
              <Link
                style={{
                  ...buttonStyles,
                  padding: isMobile ? '8px 20px' : '10px 31px',
                  fontSize: isMobile ? '14px' : '16px',
                  textAlign: 'center',
                  display: 'block'
                }}
                to='/resume/new'
              >
                Create new resume
              </Link>
              <Button
                onClick={handleLogout}
                sx={{
                  ...buttonStyles,
                  textTransform: 'capitalize',
                  padding: isMobile ? '8px 20px' : '10px 31px',
                  fontSize: isMobile ? '14px' : '16px',
                  width: { xs: '100%', sm: 'auto' },
                  '&:hover': {
                    background: '#322e8e',
                    border: '3px solid #322e8e'
                  }
                }}
              >
                Logout
              </Button>
            </>
          )}
        </Box>
      </Box>

      {/* Handle Loading & Error States */}
      {status === 'loading' && !friendlyError && (
        <Typography>Loading resumes...</Typography>
      )}
      {friendlyError && (
        <AuthErrorDisplay error={friendlyError} buttonStyles={buttonStyles} />
      )}

      {!friendlyError &&
        (status === 'succeeded' || status === 'idle') &&
        signed.length > 0 && (
          <>
            <Typography
              variant='h6'
              sx={{
                color: '#2E2E48',
                fontWeight: 600,
                mt: 2,
                fontSize: { xs: '18px', md: '20px' }
              }}
            >
              Signed Resumes
            </Typography>
            {signed.map(resume => (
              <ResumeCard
                key={resume?.id}
                id={resume?.id}
                title={resume?.content?.credentialSubject?.person?.name?.formattedName}
                date={new Date(resume?.content?.issuanceDate).toLocaleDateString()}
                credentials={0}
                isDraft={false}
                resume={resume}
              />
            ))}
          </>
        )}

      {!friendlyError &&
        (status === 'succeeded' || status === 'idle') &&
        draftResumes.length > 0 && (
          <>
            <Typography
              variant='h6'
              sx={{
                color: '#2E2E48',
                fontWeight: 600,
                mt: 2,
                fontSize: { xs: '18px', md: '20px' }
              }}
            >
              Draft Resumes
            </Typography>
            {draftResumes.map(resume => (
              <ResumeCard
                key={resume.id}
                id={resume.id}
                title={resume?.name?.split('.')[0]}
                date={new Date().toLocaleDateString()}
                credentials={0}
                isDraft={true}
                resume={resume}
                hasLocalChanges={hasLocalDraft(resume.id)}
                localDraftTime={localDrafts[resume.id]?.localStorageLastUpdated || null}
              />
            ))}
          </>
        )}

      {!friendlyError &&
        status === 'succeeded' &&
        signed.length + unsigned.length === 0 && (
          <Typography>You don't have any resumes.</Typography>
        )}
    </Box>
  )
}

export default ResumeScreen
