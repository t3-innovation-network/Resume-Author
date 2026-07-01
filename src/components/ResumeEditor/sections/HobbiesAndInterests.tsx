import React, { useState, useCallback, useEffect } from 'react'
import {
  Box,
  TextField,
  Typography,
  Button,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Divider
} from '@mui/material'
import DeleteIcon from '@mui/icons-material/Delete'
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline'
import { useDispatch, useSelector } from 'react-redux'
import { RootState } from '../../../redux/store'
import { updateSection } from '../../../redux/slices/resume'
import TextEditor from '../../TextEditor/Texteditor'
import { useDebouncedSectionUpdate } from '../../../hooks/useDebouncedSectionUpdate'

interface HobbiesAndInterestsProps {
  onAddFiles?: (itemIndex?: number) => void
  onDelete?: () => void
  onAddCredential?: (text: string) => void
  onFocus?: () => void
  evidence?: string[][]
}

export default function HobbiesAndInterests({
  onAddFiles,
  onDelete,
  onAddCredential,
  onFocus,
  evidence = []
}: Readonly<HobbiesAndInterestsProps>) {
  const dispatch = useDispatch()
  const resume = useSelector((state: RootState) => state.resume.resume)
  const [hobbies, setHobbies] = useState<string[]>([])
  const [newHobby, setNewHobby] = useState('')
  const [newHobbyDescription, setNewHobbyDescription] = useState('')

  const dispatchHobbiesUpdate = useCallback(
    (updatedHobbies: string[]) => {
      dispatch(
        updateSection({
          sectionId: 'hobbiesAndInterests',
          content: updatedHobbies
        })
      )
    },
    [dispatch]
  )

  const { scheduleUpdate: updateRedux } = useDebouncedSectionUpdate(
    dispatchHobbiesUpdate,
    500
  )

  useEffect(() => {
    if (resume?.hobbiesAndInterests && resume.hobbiesAndInterests.length > 0) {
      setHobbies(resume.hobbiesAndInterests)
    }
  }, [resume])

  const handleAddHobby = () => {
    if (!newHobby.trim()) return

    const hobbyEntry = newHobby + (newHobbyDescription ? `: ${newHobbyDescription}` : '')
    const updatedHobbies = [...hobbies, hobbyEntry]

    setHobbies(updatedHobbies)
    updateRedux(updatedHobbies)

    setNewHobby('')
    setNewHobbyDescription('')
  }

  const handleDeleteHobby = (index: number) => {
    const updatedHobbies = hobbies.filter((_, i) => i !== index)
    setHobbies(updatedHobbies)
    updateRedux(updatedHobbies)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddHobby()
    }
  }

  const handleDescriptionChange = (index: number, val: string) => {
    const updatedHobbies = hobbies.map((hobby, i) =>
      i === index ? hobby.split(': ').join(': ' + val) : hobby
    )
    setHobbies(updatedHobbies)
    updateRedux(updatedHobbies)
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <Typography sx={{ fontSize: '14px', fontWeight: '500' }}>
        Add your hobbies and interests to show your personality and make your resume more
        personable. Consider including hobbies that demonstrate skills relevant to the
        positions you're applying for.
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
          <TextField
            label='Hobby/Interest'
            variant='outlined'
            size='small'
            fullWidth
            value={newHobby}
            onChange={e => setNewHobby(e.target.value)}
            onKeyPress={handleKeyPress}
            sx={{ bgcolor: '#FFF' }}
          />

          <TextField
            label='Description (optional)'
            variant='outlined'
            size='small'
            fullWidth
            value={newHobbyDescription}
            onChange={e => setNewHobbyDescription(e.target.value)}
            onKeyPress={handleKeyPress}
            sx={{ bgcolor: '#FFF' }}
          />

          <Button
            variant='contained'
            onClick={handleAddHobby}
            startIcon={<AddCircleOutlineIcon />}
            sx={{
              bgcolor: '#F3F5F8',
              color: '#2E2E48',
              boxShadow: 'none',
              '&:hover': {
                bgcolor: '#E6E8EC',
                boxShadow: 'none'
              }
            }}
          >
            Add
          </Button>
        </Box>

        {hobbies.length > 0 && (
          <Box sx={{ bgcolor: '#F9F9FE', borderRadius: '4px', p: 2 }}>
            <Typography variant='subtitle1' sx={{ mb: 1, fontWeight: 600 }}>
              Your Hobbies & Interests
            </Typography>

            <List>
              {hobbies.map((hobby, index) => (
                <React.Fragment key={index}>
                  <ListItem
                    secondaryAction={
                      <IconButton edge='end' onClick={() => handleDeleteHobby(index)}>
                        <DeleteIcon />
                      </IconButton>
                    }
                  >
                    <ListItemText primary={hobby} />
                  </ListItem>
                  {index < hobbies.length - 1 && <Divider />}
                  <TextEditor
                    key={`editor-${index}`}
                    value={hobby.split(': ').slice(1).join(': ') || ''}
                    onChange={val => handleDescriptionChange(index, val)}
                    onAddCredential={onAddCredential}
                    onFocus={onFocus}
                  />
                </React.Fragment>
              ))}
            </List>
          </Box>
        )}
      </Box>
    </Box>
  )
}
