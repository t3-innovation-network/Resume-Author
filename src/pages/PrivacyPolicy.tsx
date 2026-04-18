import React from 'react'
import {
  Box,
  Container,
  Typography,
  Link,
  List,
  ListItem,
  ListItemText
} from '@mui/material'

const PrivacyPolicy: React.FC = () => {
  return (
    <Box sx={{ backgroundColor: '#ffffff', color: '#0F172A', py: { xs: 4, md: 8 } }}>
      <Container maxWidth='md'>
        <Typography
          variant='h3'
          sx={{ fontFamily: 'Nunito Sans', fontWeight: 800, mb: 2 }}
        >
          Privacy Policy
        </Typography>
        <Typography sx={{ color: '#47516B', mb: 4 }}>
          Effective Date: October 17, 2025
        </Typography>

        <Typography
          variant='h5'
          sx={{ fontFamily: 'Nunito Sans', fontWeight: 700, mb: 1 }}
        >
          Overview
        </Typography>
        <Typography sx={{ mb: 3 }}>
          Resume Author is a web application that helps you create, manage, and share
          professional resumes and related verifiable credentials. This Privacy Policy
          explains what information we collect, how we use it, and your rights and
          choices. By using Resume Author, you agree to the practices described here.
        </Typography>

        <Typography
          variant='h5'
          sx={{ fontFamily: 'Nunito Sans', fontWeight: 700, mb: 1 }}
        >
          What We Collect
        </Typography>
        <List sx={{ mb: 3 }}>
          <ListItem alignItems='flex-start' disableGutters>
            <ListItemText
              primaryTypographyProps={{ fontWeight: 600 }}
              primary='Account and Authentication Information'
              secondary={
                <>
                  <Typography component='span' sx={{ color: '#47516B' }}>
                    We use authentication services such as Google Auth and digital wallet
                    sign-in. During login, identifiers (for example, your Google user ID),
                    access tokens, and refresh tokens may be stored securely in your
                    browser storage to maintain your session.
                  </Typography>
                </>
              }
            />
          </ListItem>
          <ListItem alignItems='flex-start' disableGutters>
            <ListItemText
              primaryTypographyProps={{ fontWeight: 600 }}
              primary='Resume Content You Provide'
              secondary={
                <>
                  <Typography component='span' sx={{ color: '#47516B' }}>
                    Text, sections, and media you add to your resume, including optional
                    links to credentials. You control what you add and share. Content can
                    be exported to PDF.
                  </Typography>
                </>
              }
            />
          </ListItem>
          <ListItem alignItems='flex-start' disableGutters>
            <ListItemText
              primaryTypographyProps={{ fontWeight: 600 }}
              primary='Verifiable Credentials (VCs)'
              secondary={
                <>
                  <Typography component='span' sx={{ color: '#47516B' }}>
                    You may import, view, and verify credentials. Where possible,
                    credentials remain local to your session or are retrieved from your
                    connected sources. Some flows allow linking to or retrieving
                    credentials from external services you authorize.
                  </Typography>
                </>
              }
            />
          </ListItem>
          <ListItem alignItems='flex-start' disableGutters>
            <ListItemText
              primaryTypographyProps={{ fontWeight: 600 }}
              primary='Cloud Storage Integrations'
              secondary={
                <>
                  <Typography component='span' sx={{ color: '#47516B' }}>
                    If you choose, you can connect Google Drive to save and manage resumes
                    and related files. Files stored in your Drive are subject to Google’s
                    terms and privacy policy. We access only the files and scopes you
                    approve.
                  </Typography>
                </>
              }
            />
          </ListItem>
          <ListItem alignItems='flex-start' disableGutters>
            <ListItemText
              primaryTypographyProps={{ fontWeight: 600 }}
              primary='Usage Information'
              secondary={
                <>
                  <Typography component='span' sx={{ color: '#47516B' }}>
                    We may collect basic technical information such as browser type,
                    device type, and interactions necessary to operate the app reliably
                    and securely. We do not sell your personal information.
                  </Typography>
                </>
              }
            />
          </ListItem>
        </List>

        <Typography
          variant='h5'
          sx={{ fontFamily: 'Nunito Sans', fontWeight: 700, mb: 1 }}
        >
          How We Use Information
        </Typography>
        <List sx={{ mb: 3 }}>
          <ListItem disableGutters>
            <ListItemText primary='- Authenticate you and maintain your session securely.' />
          </ListItem>
          <ListItem disableGutters>
            <ListItemText primary='- Provide resume creation, editing, and PDF export features.' />
          </ListItem>
          <ListItem disableGutters>
            <ListItemText primary='- Integrate with your authorized accounts (e.g., Google Drive) when you choose.' />
          </ListItem>
          <ListItem disableGutters>
            <ListItemText primary='- Display, verify, or link to your credentials when you request it.' />
          </ListItem>
          <ListItem disableGutters>
            <ListItemText primary='- Improve app reliability, security, and user experience.' />
          </ListItem>
        </List>

        <Typography
          variant='h5'
          sx={{ fontFamily: 'Nunito Sans', fontWeight: 700, mb: 1 }}
        >
          Cookies and Local Storage
        </Typography>
        <Typography sx={{ mb: 3 }}>
          We use cookies and/or local storage to keep you signed in and to remember your
          preferences. Access and refresh tokens may be stored locally for session
          continuity. You can clear these using your browser settings, but doing so may
          sign you out or remove saved preferences.
        </Typography>

        <Typography
          variant='h5'
          sx={{ fontFamily: 'Nunito Sans', fontWeight: 700, mb: 1 }}
        >
          Data Sharing
        </Typography>
        <Typography sx={{ mb: 3 }}>
          We do not sell your data. We share information only as needed to operate the app
          or when you explicitly authorize integrations (for example, storing files in
          your Google Drive). Third-party services such as Google, Firebase, or
          wallet providers process your data under their own terms and privacy policies.
        </Typography>

        <Typography
          variant='h5'
          sx={{ fontFamily: 'Nunito Sans', fontWeight: 700, mb: 1 }}
        >
          Data Security
        </Typography>
        <Typography sx={{ mb: 3 }}>
          We take reasonable measures to protect your information, including using
          reputable authentication providers, secure transport (HTTPS), and access
          controls. No method of transmission or storage is 100% secure; please use
          strong, unique credentials and keep your devices secure.
        </Typography>

        <Typography
          variant='h5'
          sx={{ fontFamily: 'Nunito Sans', fontWeight: 700, mb: 1 }}
        >
          Your Choices and Rights
        </Typography>
        <List sx={{ mb: 3 }}>
          <ListItem disableGutters>
            <ListItemText primary='- You can view, edit, or delete resume content you create.' />
          </ListItem>
          <ListItem disableGutters>
            <ListItemText primary='- You can disconnect third-party integrations at any time via their settings.' />
          </ListItem>
          <ListItem disableGutters>
            <ListItemText primary='- You can request support or account-related assistance from our team.' />
          </ListItem>
        </List>

        <Typography
          variant='h5'
          sx={{ fontFamily: 'Nunito Sans', fontWeight: 700, mb: 1 }}
        >
          Children’s Privacy
        </Typography>
        <Typography sx={{ mb: 3 }}>
          Resume Author is not intended for children under the age of 13. We do not
          knowingly collect personal information from children under 13. If you believe a
          child has provided us with personal information, please contact us so we can
          take appropriate action.
        </Typography>

        <Typography
          variant='h5'
          sx={{ fontFamily: 'Nunito Sans', fontWeight: 700, mb: 1 }}
        >
          Changes to This Policy
        </Typography>
        <Typography sx={{ mb: 3 }}>
          We may update this Privacy Policy to reflect changes to our practices or for
          legal, operational, or regulatory reasons. We will update the effective date
          above when changes are made.
        </Typography>

        <Typography
          variant='h5'
          sx={{ fontFamily: 'Nunito Sans', fontWeight: 700, mb: 1 }}
        >
          Contact Us
        </Typography>
        <Typography sx={{ mb: 6 }}>
          If you have questions or requests regarding this Privacy Policy, contact us at{' '}
          <Link href='mailto:resumeauthor.support@allskillscount.org'>
            resumeauthor.support@allskillscount.org
          </Link>
          .
        </Typography>
      </Container>
    </Box>
  )
}

export default PrivacyPolicy
