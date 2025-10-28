import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { useState } from "react"
import ChangeContactInformation from "./change-contact-information"

interface OtpVerificationProps extends React.ComponentProps<"div"> {
  onBack?: () => void
}

function OtpVerification({
  className,
  onBack,
  ...props
}: OtpVerificationProps) {
  const [otpValues, setOtpValues] = useState(['', '', '', '', '', ''])
  const [emailOtpValues, setEmailOtpValues] = useState(['', '', '', '', '', ''])
  const [showChangeContact, setShowChangeContact] = useState(false)

  const handleBackFromContactChange = () => {
    setShowChangeContact(false)
  }

  const handleOtpChange = (index: number, value: string, setter: React.Dispatch<React.SetStateAction<string[]>>) => {
    if (value.length > 1) return // Only allow single digit
    const newValues = [...otpValues]
    newValues[index] = value
    setter(newValues)
    
    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`)
      nextInput?.focus()
    }
  }

  const addInputValidation = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!/[0-9]/.test(e.key) && e.key !== "Backspace" && e.key !== "Tab" && e.key !== "ArrowLeft" && e.key !== "ArrowRight") {
      e.preventDefault();
    }
  }

  // Show change contact form if state is true
  if (showChangeContact) {
    return <ChangeContactInformation onBack={handleBackFromContactChange} />
  }

  return (
    <div className={cn("w-full max-w-md mx-auto", className)} {...props}>
      <Card className="border-gray-800/50 backdrop-blur-sm form-fade-in" style={{ backgroundColor: 'var(--signup-card-bg)' }}>
        <CardHeader className="text-left space-y-2">
          <div className="flex items-center gap-3 mb-2">
            <button
              type="button"
              onClick={onBack}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <CardTitle className="text-2xl font-bold text-white">
              Start your free trial
            </CardTitle>
          </div>
          <CardDescription className="text-gray-400">
            No credit card. Spin up in minutes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-6 mt-8">
            {/* SMS Verification */}
            <div className="space-y-4">
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-white">Verification</h3>
                <p className="text-sm text-gray-400">SMS code sent on +91 9876543211</p>
              </div>
              
              <div className="flex gap-3 justify-center">
                {otpValues.map((value, index) => (
                  <Input
                    key={index}
                    id={`otp-${index}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={value}
                    onChange={(e) => handleOtpChange(index, e.target.value, setOtpValues)}
                    onKeyDown={(e) => addInputValidation(e)}
                    variant="primary"
                    size="otp"
                    className="text-center text-lg font-semibold"
                  />
                ))}
              </div>
              
              <div className="flex justify-between items-center text-sm">
                <button type="button" className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Resend Code
                </button>
                <button 
                  type="button" 
                  className="text-cyan-400 hover:text-cyan-300"
                  onClick={() => setShowChangeContact(true)}
                >
                  Change phone number
                </button>
              </div>
            </div>

            {/* Email Verification */}
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm text-gray-400">Email code sent on q@gmail.com</p>
              </div>
              
              <div className="flex gap-3 justify-center">
                {emailOtpValues.map((value, index) => (
                  <Input
                    key={index}
                    id={`email-otp-${index}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={value}
                    onChange={(e) => handleOtpChange(index, e.target.value, setEmailOtpValues)}
                    onKeyDown={(e) => addInputValidation(e)}
                    variant="primary"
                    size="otp"
                    className="text-center text-lg font-semibold"
                  />
                ))}
              </div>
              
              <div className="flex justify-between items-center text-sm">
                <button type="button" className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Resend Code
                </button>
                <button 
                  type="button" 
                  className="text-cyan-400 hover:text-cyan-300"
                  onClick={() => setShowChangeContact(true)}
                >
                  Change email
                </button>
              </div>
            </div>

            {/* Terms and Privacy */}
            <div className="space-y-2">
              <div className="flex items-start gap-2 mt-6 mb-6">
                <input
                  type="checkbox"
                  id="terms-otp"
                  className="mt-1 w-4 h-4 text-cyan-600 bg-gray-800 border-gray-700 rounded focus:ring-cyan-500 focus:ring-2"
                  required
                />
                <label htmlFor="terms-otp" className="text-sm text-gray-400">
                  By continuing you agree to the{" "}
                  <a href="#" className="text-cyan-400 hover:text-cyan-300">
                    terms
                  </a>{" "}
                  and{" "}
                  <a href="#" className="text-cyan-400 hover:text-cyan-300">
                    privacy_policy
                  </a>
                  .
                </label>
              </div>
            </div>
            
            {/* Verify Button */}
            <div className="space-y-2">
              <Button 
                type="submit" 
                variant="signup" 
                size="xl"
              >
                Verify
              </Button>
            </div>
            
            {/* Separator */}
            <div className="relative mt-10 mb-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-gray-700" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-gray-900 px-2 text-gray-500">OR</span>
              </div>
            </div>
            
            {/* Social Login */}
            <div className="grid grid-cols-2 gap-3">
              <Button 
                variant="social" 
                type="button"
                size="xl"
              >
                <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Google
              </Button>
              <Button 
                variant="social" 
                type="button"
                size="xl"
              >
                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
                GitHub
              </Button>
            </div>
            
            {/* Sign In Link */}
            <p className="text-center text-gray-400 text-sm mt-8 mb-2">
              Already have an account?{" "}
              <a href="#" className="text-cyan-400 hover:text-cyan-300">
                Sign in
              </a>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default OtpVerification
