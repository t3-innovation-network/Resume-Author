
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { getLocalStorage } from '../../tools/cookie'
import StorageService from '../../storage-singlton'

interface ResumeData {
  id: string
  name: string
  content: {
    resume: {
      id: string
      lastUpdated: string
      contact: {
        fullName: string
      }
    }
  }
}

interface VCState {
  accessToken: string | null
  vcs: any[] // Adjust the type based on your VC structure
  resumes: {
    signed: ResumeData[]
    unsigned: ResumeData[]
  }
  status: 'idle' | 'loading' | 'succeeded' | 'failed'
  error: string | null
}

const initialState: VCState = {
  accessToken: null,
  vcs: [],
  resumes: {
    signed: [],
    unsigned: []
  },
  status: 'idle',
  error: null
}

// Async thunk to fetch VCs
export const fetchVCs = createAsyncThunk('vc/fetchVCs', async () => {
  const accessToken = getLocalStorage('auth')
  if (!accessToken) {
    console.error('Access token not found')
    throw new Error('Access token not found')
  }

  const storageService = StorageService.getInstance()
  storageService.initialize(accessToken)

  const claimsData =
    (await storageService.handleApiCall(async () => {
      const storage = storageService.getStorage()
      return await storage.getAllFilesByType('VCs')
    })) ?? []

  if (!Array.isArray(claimsData)) {
    return []
  }

  const vcs = claimsData
    .map(item => {
      try {
        const body = item?.data?.body
        if (!body) return null
        const parsedBody = typeof body === 'string' ? JSON.parse(body) : body
        return {
          ...parsedBody,
          id: item.id, // Google Drive file ID (after spread so URN does not overwrite)
          credentialId: item.id,
          urnId: parsedBody.id,
          originalItem: item
        }
      } catch (e) {
        console.warn('Skipping VC file that failed to parse:', item?.id, e)
        return null
      }
    })
    .filter((vc): vc is NonNullable<typeof vc> => vc != null)

  return vcs
})

// Async thunk to fetch resumes
export const fetchUserResumes = createAsyncThunk('vc/fetchUserResumes', async () => {
  const accessToken = getLocalStorage('auth')
  if (!accessToken) {
    console.error('Access token not found')
    throw new Error('Access token not found')
  }

  const storageService = StorageService.getInstance()
  storageService.initialize(accessToken)

  const result = await storageService.handleApiCall(async () => {
    const resumeManager = storageService.getResumeManager()
    const resumeVCs = await resumeManager.getSignedResumes()
    const resumeSessions = await resumeManager.getNonSignedResumes()

    return {
      signed: resumeVCs,
      unsigned: resumeSessions
    }
  })

  return result
})

const vcSlice = createSlice({
  name: 'vc',
  initialState,
  reducers: {
    setAccessToken: (state, action) => {
      state.accessToken = action.payload
    },
    clearVCs: state => {
      state.vcs = []
    },
    clearResumes: state => {
      state.resumes = {
        signed: [],
        unsigned: []
      }
    }
  },
  extraReducers: builder => {
    builder
      .addCase(fetchVCs.pending, state => {
        state.status = 'loading'
      })
      .addCase(fetchVCs.fulfilled, (state, action) => {
        state.status = 'succeeded'
        state.vcs = action.payload
      })
      .addCase(fetchVCs.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.error.message || 'Failed to fetch VCs'
      })
      .addCase(fetchUserResumes.pending, state => {
        state.status = 'loading'
      })
      .addCase(fetchUserResumes.fulfilled, (state, action) => {
        state.status = 'succeeded'
        state.resumes = action.payload
      })
      .addCase(fetchUserResumes.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.error.message || 'Failed to fetch resumes'
      })
  }
})

export const { setAccessToken, clearVCs, clearResumes } = vcSlice.actions

export default vcSlice.reducer
