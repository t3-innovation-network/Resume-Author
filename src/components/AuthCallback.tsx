import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { AppDispatch } from '../redux/store'
import { setAuth } from '../redux/slices/auth'
import { fetchVCs } from '../redux/slices/vc'
import { handleRedirect } from '../tools/auth'
import StorageService from '../storage-singlton'

const AuthCallback = () => {
  const navigate = useNavigate()
  const dispatch = useDispatch<AppDispatch>()

  useEffect(() => {
    handleRedirect({
      navigate,
      onAuthSuccess: (accessToken: string) => {
        dispatch(setAuth({ accessToken }))
        StorageService.getInstance().initialize(accessToken)
        dispatch(fetchVCs())
      }
    })
  }, [navigate, dispatch])

  return <div>Processing login...</div>
}

export default AuthCallback
