import { useState, useEffect } from 'react';
import { Cloud } from 'lucide-react';

export function LoadingScreen() {
  const [dots, setDots] = useState('');

  useEffect(() => {
    const dotsInterval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.');
    }, 500);

    return () => {
      clearInterval(dotsInterval);
    };
  }, []);

  return (
    <>
      <style>{`
        @keyframes glowPulse {
          0%, 100% {
            box-shadow: 0 0 20px rgba(255, 255, 255, 0.3), 0 0 40px rgba(255, 255, 255, 0.2);
          }
          50% {
            box-shadow: 0 0 30px rgba(255, 255, 255, 0.5), 0 0 60px rgba(255, 255, 255, 0.3);
          }
        }
        @keyframes bgGlowPulse {
          0%, 100% {
            background: rgba(255, 255, 255, 0.05);
          }
          50% {
            background: rgba(255, 255, 255, 0.1);
          }
        }
      `}</style>
      <div className="fixed inset-0 flex items-center justify-center z-[9999] bg-gray-950">
        {/* Background gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/20 via-emerald-500/10 to-cyan-500/20 pointer-events-none"></div>
        
        {/* Animated Triangle */}
        <div className="absolute inset-0 pointer-events-none">
          <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" className="triangle-animated">
            <defs>
              <linearGradient id="loadingTriangleGradient" x1="0%" y1="0%" x2="100%" y2="100%">
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
              
              <linearGradient id="loadingMovingGradient" x1="0%" y1="0%" x2="100%" y2="100%">
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
            <polygon points="100,50 0,100 100,100" fill="url(#loadingTriangleGradient)" />
            <polygon points="100,50 0,100 100,100" fill="url(#loadingMovingGradient)" opacity="0.6" />
          </svg>
        </div>

        {/* Content */}
        <div className="flex flex-col items-center space-y-8 px-4 relative z-10">
          {/* Animated logo/icon */}
          <div className="relative">
            <div className="absolute inset-0 bg-white rounded-full blur-lg opacity-5" style={{ animation: 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite' }}></div>
            <div className="relative rounded-full p-8 border-2 border-white" style={{ animation: 'glowPulse 4s ease-in-out infinite, bgGlowPulse 4s ease-in-out infinite' }}>
              <Cloud className="text-white" style={{ animation: 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite' }} size={64} strokeWidth={2} fill="none" />
            </div>
          </div>

          {/* Loading text */}
          <div className="text-center space-y-4">
            <h1 className="text-white text-2xl md:text-3xl tracking-wide">
              Please wait while we are preparing your profile{dots}
            </h1>
            <p className="text-gray-400 text-lg">
              Syncing with the cloud and initializing AI systems
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

