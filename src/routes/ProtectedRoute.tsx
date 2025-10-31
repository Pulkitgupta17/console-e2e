import { Outlet } from "react-router";
import { validateUser } from '../store/authSlice';
import { BASE_URL } from "@/constants/global.constants";

const ProtectedRoute = () => {
  const isAuthenticated = validateUser()

  if (isAuthenticated) {
    return <Outlet />

  } else {
    window.location.href = BASE_URL;
  }
};

export default ProtectedRoute;