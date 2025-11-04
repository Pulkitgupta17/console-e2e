import { Outlet, Navigate } from "react-router";
import { useEffect, useState } from "react";

const ProtectedRoute = () => {
  const [isChecking, setIsChecking] = useState(true);
  const [shouldRedirect, setShouldRedirect] = useState(false);

  useEffect(() => {
    // Check localStorage for token and apiKey
    console.log("Protexted Route Running")
    const token = localStorage.getItem('token');
    const apiKey = localStorage.getItem('apiKey');

    // Redirect to signup if no token or apiKey in localStorage
    if (!token || !apiKey) {
      setShouldRedirect(true);
    }

    setIsChecking(false);
  }, []);

  // Show loading while checking
  if (isChecking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }


  // Redirect to signup if credentials missing
  if (shouldRedirect) {
    return <Navigate to="/accounts/signin" replace />;
  }
  return <Outlet />;
};

export default ProtectedRoute;