import { BrowserRouter } from 'react-router-dom'
import { AppRoutes } from './projectSetup/routeConfig'

function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  )
}

export default App