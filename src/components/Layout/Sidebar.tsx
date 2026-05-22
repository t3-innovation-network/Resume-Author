import React, { useState, useEffect } from 'react'
import { Box, IconButton, Typography, useTheme, useMediaQuery } from '@mui/material'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import {
  SVGRightLine,
  SVGCopySidebar,
  SVGLineDown,
  SVGAddSidebar,
  SVGLogOut
} from '../../assets/svgs'
import logo from '../../assets/logo.png'
import { useDispatch, useSelector } from 'react-redux'
import Notification from '../common/Notification'
import { logout } from '../../tools/auth'
import { RootState } from '../../redux/store'
import { clearAuth } from '../../redux/slices/auth'
import { clearVCs } from '../../redux/slices/vc'
interface SidebarProps {
  onToggle: () => void
  isExpanded: boolean
}

const ui = {
  fontFamily: 'Poppins',
  fontSize: '14px',
  fontWeight: 700,
  lineHeight: '21px'
}

const Sidebar = ({ onToggle, isExpanded }: SidebarProps) => {
  const [selectedItem, setSelectedItem] = useState<string>('')
  const navigate = useNavigate()
  const location = useLocation()
  const [showNotification, setShowNotification] = useState(false)
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const dispatch = useDispatch() //NOSONAR
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated)

  // Add useEffect to check the current route path and set the selected item
  useEffect(() => {
    const path = location.pathname
    if (path.startsWith('/myresumes')) setSelectedItem('copy')
    else if (path.startsWith('/resume/new')) setSelectedItem('add')
    else if (path.startsWith('/faq')) setSelectedItem('faq')
    else setSelectedItem('')
  }, [location.pathname])

  const sidebarWidth = {
    collapsed: isMobile ? 30 : 48,
    expanded: isMobile ? 160 : 200
  }

  const boxStyles = {
    display: 'flex',
    alignItems: 'center',
    gap: isMobile ? '10px' : '20px',
    width: isExpanded ? sidebarWidth.expanded : sidebarWidth.collapsed,
    justifyContent: 'flex-start',
    borderRadius: '8px'
  }

  const handleMyResumesClick = () => {
    setSelectedItem('copy')
    navigate('/myresumes')
  }
  const handleNewResumeClick = () => {
    setSelectedItem('add')
    window.location.href = '/resume/new'
  }
  const handleFAQClick = () => {
    setSelectedItem('faq')
    navigate('/faq')
  }

  const handleLogoutClick = () => {
    setSelectedItem('logOut')
    logout()
    dispatch(clearAuth())
    dispatch(clearVCs())
    setShowNotification(true)
    navigate('/')

    setTimeout(() => window.location.reload(), 1500)
  }

  const handleLoginClick = () => {
    setSelectedItem('login')
    navigate('/')
  }

  const getIconStyles = (key: string) => ({
    '& svg path': { fill: selectedItem === key ? '#361F7D' : undefined }
  })

  const getTextStyles = (key: string) => ({
    ...ui,
    color: selectedItem === key ? '#361F7D' : '#FFF'
  })

  const getButtonStyles = (key: string) => ({
    backgroundColor: selectedItem === key ? '#F3F4F6' : 'transparent',
    borderRadius: '8px',
    ...getIconStyles(key),
    '&:hover': {
      backgroundColor: '#F3F4F6',
      '& svg path': { fill: '#361F7D' },
      '& .MuiTypography-root': { color: '#361F7D' }
    }
  })

  const items = [
    <Box sx={boxStyles} key='toggle'>
      <IconButton onClick={onToggle}>
        {isExpanded && (
          <Link to='/' style={{ display: 'flex', alignItems: 'center' }}>
            <img src={logo} alt='Résumé Author' style={{ height: '50px' }} />
            <Typography
              sx={{
                ...ui,
                fontSize: { xs: '14px', md: '20px' },
                mx: '10px',
                color: '#FFF'
              }}
            >
              Resume Author
            </Typography>
          </Link>
        )}
        <SVGRightLine />
      </IconButton>
    </Box>,

    <IconButton key='copy' onClick={handleMyResumesClick} sx={getButtonStyles('copy')}>
      <Box sx={boxStyles}>
        <SVGCopySidebar />
        {isExpanded && <Typography sx={getTextStyles('copy')}>My Resumes</Typography>}
      </Box>
    </IconButton>,

    <IconButton key='add' onClick={handleNewResumeClick} sx={getButtonStyles('add')}>
      <Box sx={boxStyles}>
        <SVGAddSidebar />
        {isExpanded && <Typography sx={getTextStyles('add')}>New Resume</Typography>}
      </Box>
    </IconButton>,

    isAuthenticated ? (
      <IconButton key='logOut' onClick={handleLogoutClick} sx={getButtonStyles('logOut')}>
        <Box sx={boxStyles}>
          <SVGLogOut />
          {isExpanded && <Typography sx={getTextStyles('logOut')}>Logout</Typography>}
        </Box>
      </IconButton>
    ) : (
      <IconButton key='login' onClick={handleLoginClick} sx={getButtonStyles('login')}>
        <Box sx={boxStyles}>
          <SVGLogOut />
          {isExpanded && <Typography sx={getTextStyles('login')}>Login</Typography>}
        </Box>
      </IconButton>
    ),

    <IconButton key='faq' onClick={handleFAQClick} sx={getButtonStyles('faq')}>
      <Box sx={boxStyles}>
        <SVGLineDown />
        {isExpanded && <Typography sx={getTextStyles('faq')}>FAQs</Typography>}
      </Box>
    </IconButton>
  ]

  return (
    <>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: isMobile ? '10px' : '15px',
          width: isExpanded ? sidebarWidth.expanded : sidebarWidth.collapsed,
          transition: 'width 0.3s ease'
        }}
      >
        {items}
      </Box>

      <Notification
        open={showNotification}
        message="You've been successfully logged out"
        severity='success'
        onClose={() => setShowNotification(false)}
      />
    </>
  )
}

export default Sidebar
