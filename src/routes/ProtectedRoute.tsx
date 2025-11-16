import { Outlet, Navigate } from "react-router";
import { validateUser } from "@/store/authSlice";

const ProtectedRoute = () => {
  const isAuthenticated = validateUser();
  const passwordExpired = localStorage.getItem('password_expired');

  // Redirect to password reset if password is expired
  if (passwordExpired === 'true') {
    return <Navigate to="/accounts/password-reset" replace />;
  }

  if (isAuthenticated) {
    return <Outlet />

  } else {
    return <Navigate to="/accounts/signin" replace />;
  }
};

export default ProtectedRoute;