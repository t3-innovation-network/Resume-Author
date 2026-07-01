import React, { useState, useEffect, useCallback } from 'react'
import { Box, Typography } from '@mui/material'
import TextEditor from '../../TextEditor/Texteditor'
import { useDispatch, useSelector } from 'react-redux'
import { updateSection } from '../../../redux/slices/resume'
import { RootState } from '../../../redux/store'
import { useDebouncedSectionUpdate } from '../../../hooks/useDebouncedSectionUpdate'

interface ProfessionalSummaryProps {
  onAddFiles?: () => void
  onDelete?: () => void
  onAddCredential?: (text: string) => void
  onFocus?: () => void
  evidence?: string[][]
}

export default function ProfessionalSummary({
  onAddFiles,
  onDelete,
  onAddCredential,
  onFocus,
  evidence = []
}: Readonly<ProfessionalSummaryProps>) {
  const dispatch = useDispatch()
  const resume = useSelector((state: RootState) => state.resume.resume)

  const [description, setDescription] = useState('')

  const dispatchSummaryUpdate = useCallback(
    (val: string) => {
      dispatch(
        updateSection({
          sectionId: 'summary',
          content: val
        })
      )
    },
    [dispatch]
  )

  const { scheduleUpdate } = useDebouncedSectionUpdate(dispatchSummaryUpdate, 500)

  useEffect(() => {
    if (resume?.summary !== undefined) {
      if (resume.summary !== description) {
        setDescription(resume.summary || '')
      }
    }
  }, [resume?.summary])

  const handleDescriptionChange = (val: string) => {
    setDescription(val)
    scheduleUpdate(val)
  }

  return (
    <Box>
      <Typography sx={{ fontSize: '14px', fontWeight: '500' }}>
        Write a brief summary highlighting your skills, experience, and achievements.
        Focus on what makes you stand out, including specific expertise or career goals.
        Keep it quantitative, clear, professional, and tailored to your target role.
      </Typography>

      <TextEditor
        key="professional-summary-editor"
        value={description}
        onChange={handleDescriptionChange}
        onAddCredential={onAddCredential}
        onFocus={onFocus}
      />
    </Box>
  )
}
