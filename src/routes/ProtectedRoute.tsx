import { Navigate } from "react-router";
import { validateUser } from "@/store/authSlice";
import { MYACCOUNT_URL } from "@/constants/global.constants";

const ProtectedRoute = () => {
  const isAuthenticated = validateUser();
  const passwordExpired = localStorage.getItem('password_expired');

  // Redirect to password reset if password is expired
  if (passwordExpired === 'true') {
    return <Navigate to="/accounts/password-reset" replace />;
  }

  // Redirect authenticated users to MYACCOUNT_URL instead of internal dashboard
  if (isAuthenticated) {
    // return <Outlet />
    window.location.href = MYACCOUNT_URL;
    return null;
  } else {
    return <Navigate to="/accounts/signin" replace />;
  }
};

export default ProtectedRoute;