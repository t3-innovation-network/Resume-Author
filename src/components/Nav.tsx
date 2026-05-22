import Logo from '../assets/logo.png'
import {
  AppBar,
  Toolbar,
  Box,
  Typography,
  Stack,
  Button,
  IconButton,
  Drawer,
  List,
  ListItem,
  useMediaQuery,
  useTheme
} from '@mui/material'
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getLocalStorage } from '../tools/cookie'
import { useSelector, useDispatch } from 'react-redux'
import { clearAuth, setAuth } from '../redux/slices/auth'
import { clearVCs } from '../redux/slices/vc'
import { RootState } from '../redux/store'
import Notification from './common/Notification'
import MenuIcon from '@mui/icons-material/Menu'
import CloseIcon from '@mui/icons-material/Close'
import { login, logout } from '../tools/auth'

const navStyles = {
  color: 'white',
  textTransform: 'capitalize',
  fontWeight: 600,
  fontSize: '16px',
  fontFamily: 'Nunito Sans'
}

const mobileNavStyles = {
  color: '#4527A0',
  textTransform: 'capitalize',
  fontWeight: 600,
  fontSize: '18px',
  fontFamily: 'Nunito sans',
  padding: '12px 16px'
}

const Nav = () => {
  const dispatch = useDispatch()
  const isLogged = useSelector((state: RootState) => state.auth.isAuthenticated)
  const navigate = useNavigate()
  const [showNotification, setShowNotification] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))

  useEffect(() => {
    const token = getLocalStorage('auth')
    if (token) {
      dispatch(setAuth({ accessToken: token }))
    }
  }, [dispatch])

  const handleLogout = () => {
    logout()
    dispatch(clearAuth())
    dispatch(clearVCs())
    setShowNotification(true)
    navigate('/')
    setMobileMenuOpen(false)
  }

  const handleLogin = () => {
    if (!isLogged) {
      login('/resume/import')
    } else {
      navigate('/resume/import')
    }
  }

  const navItems = [
    { label: 'Why Resume Author?', action: () => setMobileMenuOpen(false) },
    { label: 'How it works', action: () => setMobileMenuOpen(false) },
    { label: 'Benefits', action: () => setMobileMenuOpen(false) },
    {
      label: 'Help & FAQ',
      action: () => {
        navigate('/faq')
        setMobileMenuOpen(false)
      }
    },
    { label: 'Learn More', action: () => setMobileMenuOpen(false) }
  ]

  return (
    <>
      <AppBar
        position='static'
        elevation={0}
        sx={{ bgcolor: '#4527A0', pt: 1, px: { xs: 2, sm: 3, md: 4 } }}
      >
        <Toolbar
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            padding: { xs: '0 4px', md: '0 16px' }
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
            <img
              src={Logo}
              alt='Résumé Author'
              style={{ height: isMobile ? '40px' : '50px' }}
            />
            <Typography
              sx={{
                fontFamily: 'Poppins',
                fontSize: { xs: '24px', md: '32px' },
                fontWeight: 700
              }}
            >
              Resume Author
            </Typography>
          </Box>

          {isMobile ? (
            <>
              <IconButton
                color='inherit'
                aria-label='open menu'
                onClick={() => setMobileMenuOpen(true)}
                edge='end'
              >
                <MenuIcon fontSize='large' />
              </IconButton>
              <Drawer
                anchor='right'
                open={mobileMenuOpen}
                onClose={() => setMobileMenuOpen(false)}
                PaperProps={{
                  sx: {
                    width: '70%',
                    maxWidth: '300px',
                    padding: '16px',
                    backgroundColor: '#FFFFFF'
                  }
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                  <IconButton onClick={() => setMobileMenuOpen(false)}>
                    <CloseIcon />
                  </IconButton>
                </Box>
                <List>
                  {/* Always show Help & FAQ */}
                  <ListItem disablePadding>
                    <Button
                      fullWidth
                      onClick={() => {
                        navigate('/faq')
                        setMobileMenuOpen(false)
                      }}
                      sx={mobileNavStyles}
                    >
                      Help & FAQ
                    </Button>
                  </ListItem>

                  {!isLogged ? (
                    <>
                      {navItems
                        .filter(item => item.label !== 'Help & FAQ')
                        .map((item, index) => (
                          <ListItem key={index} disablePadding>
                            <Button fullWidth onClick={item.action} sx={mobileNavStyles}>
                              {item.label}
                            </Button>
                          </ListItem>
                        ))}
                      <ListItem disablePadding>
                        <Button fullWidth onClick={handleLogin} sx={mobileNavStyles}>
                          Login
                        </Button>
                      </ListItem>
                    </>
                  ) : (
                    <ListItem disablePadding>
                      <Button fullWidth onClick={handleLogout} sx={mobileNavStyles}>
                        Logout
                      </Button>
                    </ListItem>
                  )}
                </List>
              </Drawer>
            </>
          ) : !isLogged ? (
            <Stack direction='row' spacing={{ sm: 2, md: 5 }}>
              {navItems
                .filter(item => item.label !== 'Help & FAQ')
                .map((item, index) => (
                  <Button
                    key={index}
                    color='inherit'
                    sx={navStyles}
                    onClick={item.action}
                  >
                    {item.label}
                  </Button>
                ))}
              <Button color='inherit' sx={navStyles} onClick={() => navigate('/faq')}>
                Help & FAQ
              </Button>
              <Button onClick={handleLogin} color='inherit' sx={navStyles}>
                Login
              </Button>
            </Stack>
          ) : (
            <Stack direction='row' spacing={{ sm: 2, md: 5 }}>
              <Button color='inherit' sx={navStyles} onClick={() => navigate('/faq')}>
                Help & FAQ
              </Button>
              <Button onClick={handleLogout} color='inherit' sx={navStyles}>
                Logout
              </Button>
            </Stack>
          )}
        </Toolbar>
      </AppBar>

      <Notification
        open={showNotification}
        message="You've been successfully logged out"
        severity='success'
        onClose={() => setShowNotification(false)}
      />
    </>
  )
}

export default Nav
