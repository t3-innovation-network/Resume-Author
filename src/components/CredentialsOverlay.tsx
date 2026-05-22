import React, { useEffect, useState } from 'react'
import { Box, Typography, Button, Checkbox, styled } from '@mui/material'
import { useDispatch, useSelector } from 'react-redux'
import { AppDispatch } from '../redux/store'
import { fetchVCs } from '../redux/slices/vc'

interface CredentialOverlayProps {
  onClose?: () => void
  onSelect: (selectedCredentials: string[]) => void
  initialSelectedCredentials?: Array<{ id: string; url?: string; name?: string }>
}

interface CredentialItem {
  originalItem?: {
    id: string
  }
  id: string
  credentialSubject?: {
    achievement: Array<{
      name: string
    }>
  }
}

const StyledScrollbar = styled(Box)({
  '&::-webkit-scrollbar': {
    width: '10px',
    Height: '114px'
  },
  '&::-webkit-scrollbar-track': {
    background: 'transparent'
  },
  '&::-webkit-scrollbar-thumb': {
    background: '#E1E2F5',
    borderRadius: '30px'
  }
})

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

const CredentialOverlay: React.FC<CredentialOverlayProps> = ({
  onClose,
  onSelect,
  initialSelectedCredentials = []
}) => {
  const initialSelectedIDs = initialSelectedCredentials.map(cred => cred.id)
  const [selectedCredentials, setSelectedCredentials] =
    useState<string[]>(initialSelectedIDs)

  const dispatch: AppDispatch = useDispatch()
  const { vcs } = useSelector((state: any) => state.vcReducer)

  // Filter out invalid VCs
  const validVCs = getValidVCs(vcs)

  useEffect(() => {
    // Dispatch the thunk to fetch VCs
    dispatch(fetchVCs())
  }, [dispatch])

  const handleSelectAll = () => {
    if (selectedCredentials.length === validVCs.length) {
      setSelectedCredentials([])
    } else {
      setSelectedCredentials(
        validVCs.map((cred: CredentialItem) => cred?.originalItem?.id || cred.id)
      )
    }
  }

  const handleToggleCredential = (credential: CredentialItem) => {
    const credentialId = credential?.originalItem?.id || credential.id
    
    
    setSelectedCredentials(prev => {
      const newSelection = prev.includes(credentialId)
        ? prev.filter(id => id !== credentialId)
        : [...prev, credentialId]
      
      return newSelection
    })
  }

  const handleClear = () => {
    setSelectedCredentials([])
  }

  const handleContinue = () => {
    console.log('CredentialsOverlay handleContinue clicked', {
      selectedCredentials,
      isArray: Array.isArray(selectedCredentials)
    })
    
    if (Array.isArray(selectedCredentials)) {
      // Deduplicate by ID before passing to onSelect
      const deduped = Array.from(new Set(selectedCredentials))
      
      onSelect(deduped)
    } else {
      
      onSelect([])
    }
    onClose?.()
  }

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'rgba(5, 2, 69, 0.70)'
      }}
    >
      <Box
        sx={{
          width: '45vw',
          maxWidth: '800px',
          maxHeight: '900px',
          height: '80vh',
          bgcolor: '#FFFFFF',
          borderRadius: '4px',
          boxShadow: '0px 2px 20px rgba(0, 0, 0, 0.1)',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <Box sx={{ px: '20px', py: '12px', flex: 1, overflow: 'auto' }}>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: 2
            }}
          >
            <Typography
              sx={{
                color: '#2E2E48',
                fontSize: '18px',
                fontWeight: 500,
                fontFamily: 'Nunito Sans'
              }}
            >
              Select one or more credentials to add or remove them:
            </Typography>
            <Button
              onClick={handleClear}
              sx={{
                color: '#6B79F6',
                fontSize: '18px',
                fontWeight: 700,
                fontFamily: 'Nunito Sans',
                minWidth: 'auto',
                p: 0
              }}
            >
              Clear
            </Button>
          </Box>
          <Box
            sx={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'auto' }}
          >
            <StyledScrollbar
              sx={{
                overflowY: 'auto'
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  mb: '12px'
                }}
              >
                <Checkbox
                  checked={
                    selectedCredentials.length === validVCs.length && validVCs.length > 0
                  }
                  onChange={handleSelectAll}
                  sx={{
                    '&.Mui-checked': {
                      color: '#3A35A2'
                    }
                  }}
                />
                <Typography
                  sx={{
                    color: '#2563EB',
                    fontSize: '18px',
                    fontWeight: 700,
                    fontFamily: 'Nunito Sans'
                  }}
                >
                  Select All
                </Typography>
              </Box>

              {validVCs.map((credential: CredentialItem, index: number) => {
                const credentialName = getCredentialName(credential)

                return (
                  <Box
                    key={credential.id || index}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      py: '10px',
                      mb: index === validVCs.length - 1 ? 0 : '12px'
                    }}
                  >
                    <Checkbox
                      checked={selectedCredentials.includes(
                        credential?.originalItem?.id || credential.id
                      )}
                      onChange={() => handleToggleCredential(credential)}
                      sx={{
                        '&.Mui-checked': {
                          color: '#3A35A2'
                        }
                      }}
                    />
                    <Typography
                      sx={{
                        color: '#2563EB',
                        fontSize: '18px',
                        fontWeight: 700,
                        fontFamily: 'Nunito Sans'
                      }}
                    >
                      {credentialName || 'Unnamed Credential'}
                    </Typography>
                  </Box>
                )
              })}
            </StyledScrollbar>
          </Box>
        </Box>

        <Box
          sx={{
            display: 'flex',
            gap: '15px',
            py: '24px',
            justifyContent: 'center',
            borderTop: '1px solid #E5E7EB',
            backgroundColor: '#38207E'
          }}
        >
          <Button
            onClick={onClose}
            variant='contained'
            sx={{
              bgcolor: 'white',
              color: '#6B79F6',
              fontSize: '18px',
              width: '172px',
              height: '53px',
              fontWeight: 700,
              lineHeight: '24px',
              fontFamily: 'Nunito Sans',
              textTransform: 'none',
              borderRadius: '100px',
              border: '3px solid #fff',
              '&:hover': {
                bgcolor: '#E9E6F8'
              }
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={() => {
              
              handleContinue()
            }}
            variant='contained'
            disabled={selectedCredentials.length === 0}
            sx={{
              color: '#fff',
              bgcolor: '#6B79F6',
              fontSize: '18px',
              width: '172px',
              height: '53px',
              fontWeight: 700,
              lineHeight: '24px',
              fontFamily: 'Nunito Sans',
              textTransform: 'none',
              borderRadius: '100px',
              border: '3px solid #6B79F6',
              '&:hover': {
                bgcolor: '#292489'
              },
              '&.Mui-disabled': {
                bgcolor: '#9EA3F3',
                color: '#fff',
                opacity: 0.7
              }
            }}
          >
            Continue
          </Button>
        </Box>
      </Box>
    </Box>
  )
}

export default CredentialOverlay
