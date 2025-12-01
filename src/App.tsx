import { AppRoutes } from './routes/routeConfig'
import { Toaster } from 'sonner'
import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { setCookie } from './services/commonMethods'

function App() {
  const location = useLocation();
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const service = urlParams.get('service');
    
    if (service) {
      setCookie('source', service);
      urlParams.delete('service');
      
      const newUrl = window.location.pathname + (urlParams.toString() ? '?' + urlParams.toString() : '');
      window.history.replaceState({}, '', newUrl);
    }
  }, [location.search]);

  return (
    <>
    <AppRoutes />
    <Toaster 
          position="top-right"
          theme="dark"
          className="toaster group"
          toastOptions={{
            classNames: {
              toast: "group toast group-[.toaster]:bg-gray-800 group-[.toaster]:text-white group-[.toaster]:border-gray-700",
              description: "group-[.toast]:text-gray-400",
              actionButton: "group-[.toast]:bg-cyan-500 group-[.toast]:text-gray-900",
              cancelButton: "group-[.toast]:bg-gray-700 group-[.toast]:text-gray-300",
            },
          }}
        />
    </>
    
  )
}

export default App