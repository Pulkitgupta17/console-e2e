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
import PhoneInput from 'react-phone-input-2'
import 'react-phone-input-2/lib/style.css'
import type { SignupData, OtpStatus } from "@/interfaces/signupInterface"
import { toast } from "sonner"
import { customerDetailsVerification, sendOtpEmail } from "@/services/signupService"
import { useGoogleReCaptcha } from "react-google-recaptcha-v3"

interface ChangeContactInformationProps extends React.ComponentProps<"div"> {
  onBack?: () => void
  signupData: SignupData
  changeContactType: 'mobile' | 'email'
  otpStatus?: OtpStatus
  onUpdate?: (updatedData: SignupData) => void
}

function ChangeContactInformation({
  className,
  onBack,
  signupData,
  changeContactType,
  otpStatus,
  onUpdate,
  ...props
}: ChangeContactInformationProps) {
  const { executeRecaptcha } = useGoogleReCaptcha();
  const [phoneNumber, setPhoneNumber] = useState(signupData.phone)
  const [email, setEmail] = useState(signupData.email)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleBack = () => {
    if (onBack) {
      onBack()
    }
  }

  const isDisabled = () => {
    const phoneChanged = signupData.phone !== phoneNumber;
    const emailChanged = signupData.email !== email;
    return (!phoneChanged && !emailChanged) || isSubmitting;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isDisabled()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const updatedSignupData: SignupData = {
        ...signupData,
        phone: phoneNumber,
        email: email,
      };

      // Always send OTPs to both updated phone number and email
      const promises: Promise<any>[] = [];

      // Send mobile OTP
      if (!executeRecaptcha) {
        toast.error("reCAPTCHA not ready");
        setIsSubmitting(false); 
        return;
      }

      const recaptchaToken = await executeRecaptcha("resend_otp");
      promises.push(
        customerDetailsVerification({
          email: email,
          mobile: phoneNumber,
          recaptcha: recaptchaToken,
          version: "v3",
        }).catch((error) => {
          console.error("Failed to send mobile OTP:", error);
          throw error;
        })
      );

      // Send email OTP (if otpStatus is available)
      if (otpStatus) {
        promises.push(
          sendOtpEmail({
            email: email,
            mobile: phoneNumber,
            full_name: signupData.name,
            type: "signup",
            otp_msg: otpStatus.message,
            otp_status: otpStatus,
          }).catch((error) => {
            console.error("Failed to send email OTP:", error);
            throw error;
          })
        );
      }

      // Wait for OTPs to be sent
      await Promise.all(promises);
      toast.success(otpStatus ? "OTPs sent to both phone and email" : "Mobile OTP sent successfully");

      // Call onUpdate callback with updated data
      if (onUpdate) {
        onUpdate(updatedSignupData);
      }

      // Navigate back
      if (onBack) {
        onBack();
      }

    } catch (error: any) {
      const errorMsg = error?.response?.data?.message || 
                      error?.response?.data?.error || 
                      "Failed to update contact information. Please try again.";
      toast.error(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className={cn("w-full max-w-md mx-auto", className)} {...props}>
      <Card className="border-gray-800/50 backdrop-blur-sm form-fade-in" style={{ backgroundColor: 'var(--signup-card-bg)' }}>
        <CardHeader className="text-left space-y-2">
          <div className="mb-2 flex items-center gap-3">
            <button
              type="button"
              onClick={handleBack}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <CardTitle className="text-2xl font-bold text-white">
              Change Contact Information
            </CardTitle>
          </div>
          <CardDescription className="text-gray-400 mt-4">
            Update your phone number or email address to receive new verification codes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-6 mt-4" onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-white">Phone Number</label>
                <PhoneInput
                  countryCodeEditable={false}
                  country={'in'}
                  value={phoneNumber}
                  onChange={setPhoneNumber}
                  placeholder="Mobile No."
                  disabled={changeContactType === 'email'}
                />
              </div>
            </div>

            <div className="space-y-4 mb-12">
              <div className="space-y-2">
                {/* <label className="text-sm font-medium text-white">Email Address</label> */}
                <Input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  variant="primary"
                  size="xl"
                  disabled={changeContactType === 'mobile'}
                />
              </div>
            </div>

            <div className="bg-gray-800/50 border border-gray-700 rounded-md p-4">
              <div className="flex items-start gap-2">
                <input
                  type="checkbox"
                  checked
                  readOnly
                  className="mt-1 w-4 h-4 text-cyan-600 bg-gray-800 border-gray-700 rounded focus:ring-cyan-500 focus:ring-2 pointer-events-none"
                />
                <p className="text-sm text-gray-300">
                  New verification codes will be sent to any contact information you change.
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              {/* <Button 
                variant="ghost" 
                size="xl"
                type="button"
                onClick={handleBack}
                className="flex-1"
              >
                Cancel
              </Button> */}
              <Button 
                variant="signup" 
                size="xl"
                type="submit"
                className="flex-1"
                disabled={isDisabled()}
              >
                {isSubmitting ? "Sending..." : "Update & Send Code"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default ChangeContactInformation
