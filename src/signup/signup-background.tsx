import { Badge } from "@/components/ui/badge"
import { Outlet, useLocation } from "react-router-dom"
import e2eLogo from "@/assets/e2e_logo.svg"

function SignupBackground() {
  const location = useLocation()
  const isSignup = location.pathname.includes('/signup')
  return (
      <div className={`min-h-screen`}>
        <div className="min-h-screen bg-gray-950 relative overflow-hidden">
          {/* Background gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/20 via-emerald-500/10 to-cyan-500/20"></div>
          
          {/* Animated Triangle */}
          <div className="absolute inset-0 pointer-events-none">
            <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" className="triangle-animated">
              <defs>
                <linearGradient id="animatedTriangleGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopOpacity="0.4">
                    <animate attributeName="stop-color" values="#06B6D4;#10B981;#22D3EE;#06B6D4" dur="6s" repeatCount="indefinite" />
                    <animate attributeName="offset" values="0%;30%;0%" dur="8s" repeatCount="indefinite" />
                  </stop>
                  <stop offset="50%" stopOpacity="0.3">
                    <animate attributeName="stop-color" values="#10B981;#22D3EE;#06B6D4;#10B981" dur="6s" repeatCount="indefinite" />
                    <animate attributeName="offset" values="50%;70%;50%" dur="8s" repeatCount="indefinite" />
                  </stop>
                  <stop offset="100%" stopOpacity="0.4">
                    <animate attributeName="stop-color" values="#22D3EE;#06B6D4;#10B981;#22D3EE" dur="6s" repeatCount="indefinite" />
                    <animate attributeName="offset" values="100%;80%;100%" dur="8s" repeatCount="indefinite" />
                  </stop>
                </linearGradient>
                
                <linearGradient id="movingGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <animateTransform 
                    attributeName="gradientTransform" 
                    type="rotate" 
                    values="0 50 50;360 50 50;0 50 50" 
                    dur="12s" 
                    repeatCount="indefinite"
                  />
                  <stop offset="0%" stopColor="#06B6D4" stopOpacity="0.2">
                    <animate attributeName="stop-color" values="#06B6D4;#10B981;#22D3EE;#06B6D4" dur="4s" repeatCount="indefinite" />
                  </stop>
                  <stop offset="50%" stopColor="#10B981" stopOpacity="0.3">
                    <animate attributeName="stop-color" values="#10B981;#22D3EE;#06B6D4;#10B981" dur="4s" repeatCount="indefinite" />
                  </stop>
                  <stop offset="100%" stopColor="#22D3EE" stopOpacity="0.2">
                    <animate attributeName="stop-color" values="#22D3EE;#06B6D4;#10B981;#22D3EE" dur="4s" repeatCount="indefinite" />
                  </stop>
                </linearGradient>
              </defs>
              <polygon points="100,50 0,100 100,100" fill="url(#animatedTriangleGradient)" />
              <polygon points="100,50 0,100 100,100" fill="url(#movingGradient)" opacity="0.6" />
            </svg>
          </div>
          {/* Header */}
          <header className="relative z-10 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <img 
                  src={e2eLogo} 
                  alt="E2E Networks" 
                  className="h-6 w-auto"
                />
              </div>
            </div>
          </header>
  
          <div className="relative z-10 flex items-center justify-center min-h-[calc(100vh-120px)] px-4 sm:px-6 py-8">
            <div className={`w-full max-w-7xl ${isSignup ? 'grid lg:grid-cols-2 gap-8 lg:gap-16 items-center' : 'flex justify-center'}`}>
              {/* Left Content - Only for Signup */}
              {isSignup && (
                <div className="text-white space-y-3 order-2 lg:order-1">
                  <div className="space-y-2">
                    <h1 className="text-xl/tight font-medium tracking-tight text-white sm:text-2xl/tight lg:text-3xl/tight">
                      GPU cloud built for{' '}
                      <span className="bg-gradient-to-r from-cyan-400 to-emerald-400 bg-clip-text text-transparent">
                        AI teams
                      </span>
                    </h1>
                    <p className="text-sm text-gray-300 max-w-sm">
                      Spin up NVIDIA GPUs in seconds. Scale effortlessly. Pay only for what you use.
                    </p>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="bg-cyan-500/10 border-cyan-400/30 text-cyan-300 chip-glow-cyan py-1 px-2 text-xs">
                      Performance
                    </Badge>
                    <Badge variant="outline" className="bg-emerald-500/10 border-emerald-400/30 text-emerald-300 chip-glow-emerald py-1 px-2 text-xs">
                      Reliability
                    </Badge>
                    <Badge variant="outline" className="bg-cyan-500/10 border-cyan-400/30 text-cyan-300 chip-glow-cyan py-1 px-2 text-xs">
                      Innovation
                    </Badge>
                  </div>

                  {/* Features List */}
                  <div className="space-y-2 pt-2">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-gradient-to-r from-cyan-400 to-emerald-400 rounded-full"></div>
                      <span className="text-gray-300 text-sm">Deploy in under 60 seconds</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-gradient-to-r from-cyan-400 to-emerald-400 rounded-full"></div>
                      <span className="text-gray-300 text-sm">99.9% uptime guarantee</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-gradient-to-r from-cyan-400 to-emerald-400 rounded-full"></div>
                      <span className="text-gray-300 text-sm">24/7 expert support</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Right Content - Form */}
              <div className={isSignup ? "order-1 lg:order-2" : ""}>
                <Outlet />
              </div>
            </div>
          </div>
        </div>
      </div>
  )
}
 
export default SignupBackground