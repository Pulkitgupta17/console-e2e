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
import {
  processOtpPaste,
  createOtpPasteHandler,
  createOtpKeyDownHandler,
} from "@/services/commonMethods"

interface GoogleAuthenticatorProps {
  onSubmit?: (code: string, isBackupCode: boolean) => Promise<void>;
  onCancel?: () => void;
  onLostKey?: () => Promise<void>;
  isLoading?: boolean;
  error?: string | null;
  setServerError?: () => void;
  className?: string;
}

function GoogleAuthenticator({
  className,
  onSubmit,
  onCancel,
  onLostKey,
  isLoading = false,
  error = null,
  setServerError,
}: GoogleAuthenticatorProps) {
  const [otpValues, setOtpValues] = useState(['', '', '', '', '', ''])
  const [useBackupCode, setUseBackupCode] = useState(false)
  const [backupCode, setBackupCode] = useState("")
  const [backupCodeError, setBackupCodeError] = useState<string | null>(null)
  const [lostKeyLoading, setLostKeyLoading] = useState(false)

  const processPasteData = (pastedData: string) => {
    processOtpPaste({
      pastedData,
      otpLength: 6,
      setOtpValues,
      inputIdPrefix: 'ga-otp',
    })
  }

  const handleOtpChange = (index: number, value: string) => {
    // If value length is greater than 1, it's likely a paste operation
    if (value.length > 1) {
      processPasteData(value)
      return
    }
    
    // For single character input, only allow numeric characters
    if (value && !/^\d$/.test(value)) {
      return
    }
    
    const newValues = [...otpValues]
    newValues[index] = value
    setOtpValues(newValues)
    
    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`ga-otp-${index + 1}`)
      nextInput?.focus()
    }
  }

  const handlePaste = createOtpPasteHandler(processPasteData)

  const handleKeyDown = createOtpKeyDownHandler({
    otpValues,
    setOtpValues,
    inputIdPrefix: 'ga-otp',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onSubmit) return;
    
    if (useBackupCode) {
      // Validate backup code (8 digits)
      if (!backupCode.trim() || backupCode.trim().length !== 8) {
        setBackupCodeError("Backup code must be 8 digits");
        return;
      }
      if (!/^\d+$/.test(backupCode.trim())) {
        setBackupCodeError("Backup code must contain only numbers");
        return;
      }
      setBackupCodeError(null);
      await onSubmit(backupCode.trim(), true);
    } else {
      const otpCode = otpValues.join('');
      if (otpCode.length !== 6) {
        if (setServerError) {
          setServerError();
        }
        return;
      }
      await onSubmit(otpCode, false);
    }
  };

  const handleTryAnotherWay = () => {
    setUseBackupCode(!useBackupCode);
    setOtpValues(['', '', '', '', '', '']);
    setBackupCode("");
    setBackupCodeError(null);
  };

  const handleLostKey = async () => {
    if (!onLostKey) return;
    
    setLostKeyLoading(true);
    try {
      await onLostKey();
    } catch (error) {
      // Error handled by parent component
    } finally {
      setLostKeyLoading(false);
    }
  };

  return (
    <div className={cn("w-full max-w-md mx-auto", className)}>
      <Card className="border-gray-800/50 backdrop-blur-sm form-fade-in" style={{ backgroundColor: 'var(--signup-card-bg)' }}>
        <CardHeader className="text-left space-y-2">
          <div className="mb-2">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="text-gray-400 hover:text-white transition-colors mb-2"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            <CardTitle className="text-2xl font-bold text-white">
              Google Authenticator
            </CardTitle>
          </div>
          <CardDescription className="text-gray-400">
            {useBackupCode 
              ? "Please Enter one of your backup codes below to verify"
              : "Please Enter Google Authentication Code below to verify"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-6 mt-8" onSubmit={handleSubmit}>
            {!useBackupCode ? (
              <>
                {/* TOTP Code Input - 6 separate boxes */}
                <div className="space-y-4">
                  {error && (
                    <div className="text-red-400 text-xs text-center">
                      {error}
                    </div>
                  )}
                  
                  <div className="flex gap-3 justify-start">
                    {otpValues.map((value, index) => (
                      <Input
                        key={index}
                        id={`ga-otp-${index}`}
                        type="text"
                        inputMode="numeric"
                        value={value}
                        onChange={(e) => handleOtpChange(index, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, index)}
                        onPaste={handlePaste}
                        variant="primary"
                        size="otp"
                        className="text-center text-lg font-semibold"
                      />
                    ))}
                  </div>
                </div>

                {/* Try Another Way */}
                <div className="text-center">
                  <button
                    type="button"
                    onClick={handleTryAnotherWay}
                    className="text-cyan-400 hover:text-cyan-300 text-sm"
                  >
                    Try Another Way?
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* Backup Code Input */}
                <div className="space-y-2">
                  <Input
                    type="text"
                    inputMode="numeric"
                    placeholder="Enter Backup code"
                    value={backupCode}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '').slice(0, 8);
                      setBackupCode(value);
                      setBackupCodeError(null);
                    }}
                    variant="primary"
                    size="xl"
                    className={backupCodeError || error ? "border-red-500" : ""}
                  />
                  {backupCodeError && (
                    <p className="text-xs text-red-400">
                      {backupCodeError}
                    </p>
                  )}
                  {error && !backupCodeError && (
                    <p className="text-xs text-red-400">
                      {error}
                    </p>
                  )}
                </div>

                {/* Try Another Way */}
                <div className="text-center">
                  <button
                    type="button"
                    onClick={handleTryAnotherWay}
                    className="text-cyan-400 hover:text-cyan-300 text-sm"
                  >
                    Try using Google Authenticator code
                  </button>
                </div>
              </>
            )}

            {/* Lost Key Button */}
            {!useBackupCode && (
              <div className="text-center">
                <button
                  type="button"
                  onClick={handleLostKey}
                  disabled={lostKeyLoading}
                  className="text-gray-400 hover:text-white text-sm disabled:opacity-50"
                >
                  {lostKeyLoading ? "Loading..." : "Lost your Google Authenticator key?"}
                </button>
              </div>
            )}

            {/* Verify Button */}
            <Button
              type="submit"
              variant="signup"
              size="xl"
              disabled={isLoading || lostKeyLoading}
              className="w-full"
            >
              {isLoading ? "Verifying..." : "Verify"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default GoogleAuthenticator;

