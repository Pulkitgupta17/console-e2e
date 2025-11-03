import { Button } from '@/components/ui/button'
import { useNavigate } from 'react-router'

const PageNotFound = () => {
  const navigate = useNavigate();
  return (
    <div className='flex justify-center items-center flex-col gap-5 bg-primary-gradient h-screen'>
      <div className='flex flex-col gap-2'>
        <h2 className='flex justify-center'>Whoops!</h2>
        <h5 className='flex justify-center'>404 Page Not Found</h5>
      </div>
      <Button className='normal-case' onClick={() => navigate('/')}>Take me home</Button>
    </div>
  )
}

export default PageNotFound