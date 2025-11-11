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

interface TwoFactorAuthProps {
  onSubmit?: (code: string, isMobileOTP: boolean) => Promise<void>;
  onCancel?: () => void;
  onResend?: (retry_type?: "sms" | "voice") => Promise<void>;
  isLoading?: boolean;
  error?: string | null;
  timer?: number;
  showCallOption?: boolean;
  setServerError?: () => void;
  className?: string;
}

function TwoFactorAuth({
  className,
  onSubmit,
  onCancel,
  onResend,
  isLoading = false,
  error = null,
  timer = 60,
  showCallOption = false,
  setServerError,
}: TwoFactorAuthProps) {
  const [otpValues, setOtpValues] = useState(['', '', '', '', '', ''])

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) return 
    const newValues = [...otpValues]
    newValues[index] = value
    setOtpValues(newValues)
    
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onSubmit) return;
    
    const otpCode = otpValues.join('');
    if (otpCode.length !== 6) {
      if (setServerError) {
        setServerError();
      }
      return;
    }

    await onSubmit(otpCode, true); // true for mobile OTP
  };

  const handleResendCode = async () => {
    if (timer > 0 || !onResend) return;
    await onResend("sms");
  };

  const handleResendCall = async () => {
    if (timer > 0 || !onResend) return;
    await onResend("voice");
  };

  const formatTimer = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={cn("w-full max-w-md mx-auto", className)}>
      <Card className="border-gray-800/50 backdrop-blur-sm form-fade-in" style={{ backgroundColor: 'var(--signup-card-bg)' }}>
        <CardHeader className="text-left space-y-2">
          <div className="mb-2">
            <button
              type="button"
              onClick={onCancel}
              className="text-gray-400 hover:text-white transition-colors mb-2"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <CardTitle className="text-2xl font-bold text-white">
              Two-Factor Authentication
            </CardTitle>
          </div>
          <CardDescription className="text-gray-400">
            Enter the verification code sent to your mobile
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-6 mt-8" onSubmit={handleSubmit}>
            {/* SMS Verification */}
            <div className="space-y-4">
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-white">Verification</h3>
                <p className="text-sm text-gray-400">SMS code sent</p>
              </div>
              
              {error && (
                <div className="text-red-400 text-sm text-center">
                  {typeof error === "string" ? error : JSON.stringify(error)}
                </div>
              )}
              
              <div className="flex gap-3 justify-center">
                {otpValues.map((value, index) => (
                  <Input
                    key={index}
                    id={`otp-${index}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={value}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => addInputValidation(e)}
                    variant="primary"
                    size="otp"
                    className="text-center text-lg font-semibold"
                    disabled={isLoading}
                  />
                ))}
              </div>
              
              <div className="flex justify-between items-center text-sm">
                <div className="flex gap-3">
                  <button 
                    type="button" 
                    onClick={handleResendCode}
                    disabled={timer > 0}
                    className={`flex items-center gap-1 ${timer > 0 ? 'text-gray-500 cursor-not-allowed' : 'text-cyan-400 hover:text-cyan-300'}`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    {timer > 0 ? formatTimer(timer) : "Resend Code"}
                  </button>
                  
                  {showCallOption && (
                    <button 
                      type="button"
                      onClick={handleResendCall}
                      disabled={timer > 0}
                      className={`text-sm ${timer > 0 ? 'text-gray-500 cursor-not-allowed' : 'text-cyan-400 hover:text-cyan-300'}`}
                    >
                      Receive via Call
                    </button>
                  )}
                </div>
              </div>
            </div>
            
            {/* Verify Button */}
            <div className="space-y-2">
              <Button 
                type="submit" 
                variant="signup" 
                size="xl"
                disabled={isLoading || otpValues.join('').length !== 6}
              >
                {isLoading ? "Verifying..." : "Verify"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default TwoFactorAuth
