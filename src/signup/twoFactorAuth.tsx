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
import { useState, useEffect } from "react"

interface TwoFactorAuthProps {
  onSubmit?: (code: string, isMobileOTP: boolean) => Promise<void>;
  onCancel?: () => void;
  onResend?: (retry_type?: "sms" | "voice") => Promise<void>;
  onBackupCodeSubmit?: (backupCode: string, rememberMe: boolean) => Promise<void>;
  isLoading?: boolean;
  error?: string | null;
  timer?: number;
  phoneNumber?: string;
  rememberMe?: boolean;
  setServerError?: () => void;
  className?: string;
}

function TwoFactorAuth({
  className,
  onSubmit,
  onCancel,
  onResend,
  onBackupCodeSubmit,
  isLoading = false,
  error = null,
  phoneNumber = "",
  rememberMe = false,
  setServerError,
}: TwoFactorAuthProps) {
  const [otpValues, setOtpValues] = useState(['', '', '', '', '', ''])
  const [timer, setTimer] = useState(0)
  const [resendAttempts, setResendAttempts] = useState(0)
  const [showBackupCode, setShowBackupCode] = useState(false)
  const [backupCode, setBackupCode] = useState("")
  const [backupCodeError, setBackupCodeError] = useState<string | null>(null)

  // Timer countdown
  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [timer]);

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
    setResendAttempts(prev => prev + 1);
    setTimer(60); // Reset timer to 60 seconds
    await onResend("sms");
  };

  const handleResendCall = async () => {
    if (timer > 0 || !onResend) return;
    setTimer(60); // Reset timer to 60 seconds
    await onResend("voice");
  };

  const handleBackupCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBackupCodeError(null);
    
    if (!backupCode.trim()) {
      setBackupCodeError("Backup code is required");
      return;
    }

    if (!onBackupCodeSubmit) return;
    
    try {
      await onBackupCodeSubmit(backupCode.trim(), rememberMe);
    } catch (error: any) {
      // Error message is already shown via toast in handleBackupCodeSubmit
      // Set the error state to highlight the input field
      setBackupCodeError(error?.message || "Invalid backup code");
    }
  };

  const handleTryAnotherWay = () => {
    setShowBackupCode(true);
    setBackupCode("");
    setBackupCodeError(null);
  };

  const handleTryMobileOTP = async () => {
    setShowBackupCode(false);
    setBackupCode("");
    setBackupCodeError(null);
    
    // Generate and send OTP when switching back to OTP form
    if (onResend) {
      try {
        await onResend("sms");
        setTimer(60); // Reset timer to 60 seconds
      } catch (error) {
        // Error is already handled in the onResend callback (toast shown in signin.tsx)
        console.error("Failed to generate OTP:", error);
      }
    }
  };

  // Mask phone number - show last 4 digits
  const maskPhoneNumber = (phone: string): string => {
    if (!phone) return "";
    const cleaned = phone.replace(/\D/g, ''); // Remove non-digits
    if (cleaned.length <= 4) return phone;
    return '*'.repeat(cleaned.length - 4) + cleaned.slice(-4);
  };

  return (
    <div className={cn("w-full max-w-md mx-auto", className)}>
      <Card className="border-gray-800/50 backdrop-blur-sm form-fade-in" style={{ backgroundColor: 'var(--signup-card-bg)' }}>
        <CardHeader className="text-left space-y-2">
          <div className="mb-2">
            <button
              type="button"
              onClick={showBackupCode ? handleTryMobileOTP : onCancel}
              className="text-gray-400 hover:text-white transition-colors mb-2"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <CardTitle className="text-2xl font-bold text-white">
              2-Factor Authentication
            </CardTitle>
          </div>
          {!showBackupCode && (
            <CardDescription className="text-white">
              We've sent a code sent on {maskPhoneNumber(phoneNumber)}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          {showBackupCode ? (
            // Backup Code Form
            <form className="space-y-6 mt-8" onSubmit={handleBackupCodeSubmit}>
              <div className="space-y-4">
                {backupCodeError && (
                  <div className="text-red-400 text-sm">
                    {backupCodeError}
                  </div>
                )}
                
                <div className="space-y-2">
                  <Input
                    id="backupCode"
                    type="text"
                    placeholder="Enter one of your backup codes"
                    variant="primary"
                    size="xl"
                    required
                    value={backupCode}
                    onChange={(e) => {
                      setBackupCode(e.target.value);
                      setBackupCodeError(null);
                    }}
                    className={backupCodeError ? "border-red-500 focus-visible:border-red-500 focus-visible:ring-red-500/20" : ""}
                    disabled={isLoading}
                  />
                </div>
                
                {/* Try using mobile OTP */}
                <div className="justify-center mt-5 mb-8">
                  <button 
                    type="button"
                    onClick={handleTryMobileOTP}
                    className="text-sm text-cyan-400 hover:text-cyan-300"
                  >
                    Try using mobile OTP
                  </button>
                </div>
              </div>
              
              {/* Validate Code Button */}
              <div className="space-y-2">
                <Button 
                  type="submit" 
                  variant="signup" 
                  size="xl"
                  disabled={isLoading || !backupCode.trim()}
                >
                  {isLoading ? "Validating..." : "Validate Code"}
                </Button>
              </div>
            </form>
          ) : (
            // OTP Form
            <form className="space-y-6 mt-8" onSubmit={handleSubmit}>
              {/* OTP Input Fields */}
              <div className="space-y-4">
                {error && (
                  <div className="text-red-400 text-sm text-center">
                    {typeof error === "string" ? error : JSON.stringify(error)}
                  </div>
                )}
                
                <div className="flex gap-3 justify-start">
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
                
                {/* Resend verification code and Call option - Space between */}
                <div className="flex justify-between items-center">
                  <button 
                    type="button" 
                    onClick={handleResendCode}
                    disabled={timer > 0}
                    className={`flex items-center gap-2 text-sm ${timer > 0 ? 'text-gray-500 cursor-not-allowed' : 'text-cyan-400 hover:text-cyan-300'}`}
                  >
                    {timer > 0 ? `Didn't receive the code? Resend in ${timer}s` : "Resend OTP"}
                  </button>
                  
                  {/* Show call option after 2 resend attempts */}
                  {resendAttempts >= 2 && (
                    <button 
                      type="button"
                      onClick={handleResendCall}
                      disabled={timer > 0}
                      className={`text-sm ${timer > 0 ? 'text-gray-500 cursor-not-allowed' : 'text-cyan-400 hover:text-cyan-300'}`}
                    >
                      Get a call instead
                    </button>
                  )}
                </div>
              </div>
              
              {/* Verify Code Button */}
              <div className="space-y-2">
                <Button 
                  type="submit" 
                  variant="signup" 
                  size="xl"
                  disabled={isLoading || otpValues.join('').length !== 6}
                >
                  {isLoading ? "Verifying..." : "Verify Code"}
                </Button>
              </div>
              
              {/* OR Separator */}
              <div className="relative flex items-center justify-center my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-600"></div>
                </div>
                <div className="relative px-4" style={{ backgroundColor: 'var(--signup-card-bg)' }}>
                  <span className="text-sm text-gray-400">OR</span>
                </div>
              </div>
              
              {/* Try another way to verify */}
              <div className="text-center">
                <button 
                  type="button"
                  onClick={handleTryAnotherWay}
                  className="text-sm text-white hover:text-gray-200 underline"
                >
                  Verify using Backup Codes instead
                </button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default TwoFactorAuth
