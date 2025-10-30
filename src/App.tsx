import { BrowserRouter } from 'react-router-dom'
import { AppRoutes } from './projectSetup/routeConfig'
import { Toaster } from 'sonner'

function App() {
  return (
    <>
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
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