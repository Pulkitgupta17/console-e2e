import { Routes, Route, Navigate } from 'react-router-dom'
import SignupBackground from '../signup/signup-background'
import Signup from '../signup/signup'
import Signin from '../signup/signin'
import CompleteSocialSignup from '../signup/complete-social-signup'
import Dashboard from '../pages/dashboard/dashboard'
import ProtectedRoute from './ProtectedRoute'
import PageNotFound from '@/pages/pageNotFound'

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/accounts" element={<SignupBackground />}>
        <Route path="signup" element={<Signup />} />
        <Route path="signin" element={<Signin />} />
        <Route path="complete_social_signup" element={<CompleteSocialSignup />} />
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
