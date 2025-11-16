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
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { verifyPhoneOtp, finalizeContactPersonActivation, resendOtpForActivation } from "@/services/signupService"
import { useGoogleReCaptcha } from "react-google-recaptcha-v3"
import type { VerifyContactPersonResponse } from "@/interfaces/signupInterface"

interface MobileOtpActivationProps {
  payload: {
    first_name: string;
    last_name: string;
    password: string;
    confirm_password: string;
    email: string;
    phone: string;
    token: string;
    iam_type: string;
    mobile: string;
  };
  customerData: VerifyContactPersonResponse;
  onCancel?: () => void;
  onSuccess?: () => void;
  className?: string;
}

function MobileOtpActivation({
  payload,
  customerData,
  onCancel,
  onSuccess,
  className,
}: MobileOtpActivationProps) {
  const { executeRecaptcha } = useGoogleReCaptcha();
  const navigate = useNavigate();
  
  const [otpValues, setOtpValues] = useState(['', '', '', '', '', '']);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [resendAttempts, setResendAttempts] = useState(0);

  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setCanResend(true);
    }
  }, [timer]);

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) return; // Only allow single digit
    const newValues = [...otpValues];
    newValues[index] = value;
    setOtpValues(newValues);
    
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === "Backspace") {
      if (!otpValues[index] && index > 0) {
        const prevInput = document.getElementById(`otp-${index - 1}`);
        prevInput?.focus();
      } else {
        const newValues = [...otpValues];
        newValues[index] = '';
        setOtpValues(newValues);
      }
      return;
    }

    if (!/[0-9]/.test(e.key) && e.key !== "Tab" && e.key !== "ArrowLeft" && e.key !== "ArrowRight") {
      e.preventDefault();
    }
  };

  const handleResend = async (type: 'sms' | 'voice' = 'sms') => {
    if (timer > 0 || !executeRecaptcha) return;

    try {
      const recaptchaToken = await executeRecaptcha("resend_otp");

      const resendPayload: any = {
        mobile: payload.mobile,
        action: "updatePhone",
        primary_customer_name: customerData.primary_customer_name,
        contact_type: customerData.role,
        recaptcha: recaptchaToken,
        version: "v3",
      };

      if (type === 'voice') {
        resendPayload.retry = true;
        resendPayload.retry_type = "voice";
      }

      await resendOtpForActivation(resendPayload);
      
      setResendAttempts(prev => prev + 1);
      setTimer(60);
      setCanResend(false);
      setOtpValues(['', '', '', '', '', '']);
      
      toast.success(type === 'voice' ? "OTP will be sent via call" : "Code resent successfully");
    } catch (error: any) {
      toast.error(error?.response?.data?.errors || error?.response?.data?.message || "Failed to resend code");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const otpCode = otpValues.join('');
    if (otpCode.length !== 6) {
      toast.error("Please enter the 6-digit code");
      return;
    }

    setIsSubmitting(true);

    try {
      let verifyResponse = await verifyPhoneOtp({
        mobile: payload.mobile,
        otp: otpCode,
      });

      if (verifyResponse.code !== 200) {
        toast.error(verifyResponse.data?.message || "Invalid OTP code");
        setIsSubmitting(false);
        return;
      }

      if (!verifyResponse.data.otp_verified) {
        toast.error(verifyResponse.data?.message || "Invalid OTP code. Please try again.");
        setIsSubmitting(false);
        setOtpValues(['', '', '', '', '', '']);
        return;
      }

      const tokenParam = payload.token.startsWith('?token=')
      ? payload.token
      : `?token=${payload.token}`;

      const finalizePayload = {
        first_name: payload.first_name,
        last_name: payload.last_name,
        password: payload.password,
        confirm_password: payload.confirm_password,
        email: payload.email,
        phone: payload.phone,
        iam_type: payload.iam_type,
        mobile_otp_verified_code: verifyResponse.data.mobile_otp_verified_code,
      };

      const finalizeResponse = await finalizeContactPersonActivation(finalizePayload, tokenParam);

      if (finalizeResponse.code !== 200) {
        toast.error(finalizeResponse.message || finalizeResponse.errors || "Failed to create account");
        setIsSubmitting(false);
        return;
      }

      // Success
      toast.success("Account Created Successfully");
      
      if (onSuccess) {
        onSuccess();
      } else {
        setTimeout(() => {
          navigate('/accounts/signin');
        }, 1000);
      }
    } catch (error: any) {
      console.error("Activation error:", error);
      const errorMsg = error?.response?.data?.message || 
                      error?.response?.data?.errors || 
                      error?.response?.data?.error ||
                      "Failed to verify code. Please try again.";
      toast.error(errorMsg);
      setIsSubmitting(false);
      setOtpValues(['', '', '', '', '', '']);
    }
  };

const maskPhoneNumber = (phone: string): string => {
    if (!phone) return "";
    const cleaned = phone.replace(/\D/g, ''); 
    if (cleaned.length <= 4) return phone;
    return '*'.repeat(cleaned.length - 4) + cleaned.slice(-4);
  };

  return (
    <div className={cn("w-full max-w-md mx-auto", className)}>
      <Card className="border-gray-800/50 backdrop-blur-sm form-fade-in" style={{ backgroundColor: 'var(--signup-card-bg)' }}>
        <CardHeader className="text-left space-y-2">
          <CardTitle className="text-2xl font-bold text-white">
            OTP Verification
          </CardTitle>
          <CardDescription className="text-gray-400">
            Enter the code sent to your mobile number.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-6 mt-8" onSubmit={handleSubmit}>
            {/* SMS Code Info */}
            <div className="space-y-4">
              <p className="text-white text-sm">
                SMS code sent on {maskPhoneNumber(payload.mobile)}
              </p>
              
              <div className="flex gap-3 items-center">
                {otpValues.map((value, index) => (
                  <Input
                    key={index}
                    id={`otp-${index}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={value}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, index)}
                    variant="primary"
                    size="otp"
                    className="text-center text-lg font-semibold"
                  />
                ))}
              </div>
              
              <div className="flex items-center justify-between text-sm">
                {canResend ? (
                  <button 
                    type="button" 
                    onClick={() => handleResend('sms')}
                    className="text-gray-400 hover:text-white flex items-center gap-1"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Resend Code
                  </button>
                ) : (
                  <span className="text-gray-400">Resend Code {timer}s</span>
                )}
              </div>

              {resendAttempts >= 2 && (
                <div className="flex justify-end">
                  <button 
                    type="button" 
                    onClick={() => handleResend('voice')}
                    className="text-gray-400 hover:text-white text-sm"
                  >
                    Get a call instead
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-start gap-2 mt-6">
              <input
                type="checkbox"
                id="terms-otp-activation"
                required
                className="mt-1 w-4 h-4 text-cyan-600 bg-gray-800 border-gray-700 rounded focus:ring-cyan-500 focus:ring-2"
              />
              <label htmlFor="terms-otp-activation" className="text-sm text-gray-400">
                By continuing you agree to the{" "}
                <a href="#" className="text-cyan-400 hover:text-cyan-300">
                  terms
                </a>{" "}
                and{" "}
                <a href="#" className="text-cyan-400 hover:text-cyan-300">
                  privacy policy
                </a>
                .
              </label>
            </div>
            
            <Button 
              type="submit" 
              variant="signup" 
              size="xl"
              disabled={isSubmitting}
              className="w-full"
            >
              {isSubmitting ? "Verifying..." : "Verify"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default MobileOtpActivation;

