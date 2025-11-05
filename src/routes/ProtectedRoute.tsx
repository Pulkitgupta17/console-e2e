import { Outlet, Navigate } from "react-router";
import { validateUser } from "@/store/authSlice";

const ProtectedRoute = () => {
  const isAuthenticated = validateUser() ;

  if (isAuthenticated) {
    return <Outlet />

  } else {
    return <Navigate to="/accounts/signin" replace />;
  }
};

export default ProtectedRoute;