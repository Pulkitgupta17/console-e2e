import { Routes, Route, Navigate } from 'react-router-dom'
import SignupBackground from '../signup/signup-background'
import Signup from '../signup/signup'
import Signin from '../signup/signin'
import PasswordResetRequest from '../signup/password-reset-request'
import PasswordResetConfirm from '../signup/password-reset-confirm'
import PasswordExpiry from '../signup/password-expiry'
import AccountActivation from '../signup/account-activation'
import Dashboard from '../pages/dashboard/dashboard'
import ProtectedRoute from './ProtectedRoute'
import PageNotFound from '@/pages/pageNotFound'

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/accounts" element={<SignupBackground />}>
        <Route path="signup" element={<Signup />} />
        <Route path="signin" element={<Signin />} />
        <Route path="password/reset" element={<PasswordResetRequest />} />
        <Route path="password-reset/confirm" element={<PasswordResetConfirm />} />
        <Route path="password-reset" element={<PasswordExpiry />} />
        <Route path="account-activation" element={<AccountActivation />} />
        <Route index element={<Navigate to="/accounts/signin" replace />} />
        <Route path="*" element={<Navigate to="/accounts/signin" replace />} />
      </Route>
      
      {/* Protected Routes */}
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<Dashboard />} />
      </Route>
      
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  )
}
