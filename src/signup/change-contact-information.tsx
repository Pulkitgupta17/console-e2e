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
import { parsePhoneNumber } from 'libphonenumber-js'
import type { SignupData, OtpStatus } from "@/interfaces/signupInterface"
import { toast } from "sonner"
import { customerDetailsVerification, sendOtpEmail } from "@/services/signupService"
import { useGoogleReCaptcha } from "react-google-recaptcha-v3"
import { useAppSelector } from "@/store/store"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"

interface ChangeContactInformationProps extends React.ComponentProps<"div"> {
  onBack?: () => void
  signupData: SignupData
  changeContactType: 'mobile' | 'email'
  otpStatus?: OtpStatus
  onUpdate?: (updatedData: SignupData) => void
}

const emailSchema = z.object({
  email: z.string().min(1, { message: "Email is required" }).email({ message: "Invalid email address" }),
});

type EmailFormFields = z.infer<typeof emailSchema>;

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
  const { countriesList, restrictedCountriesList, loading: countriesLoading } = useAppSelector((state) => state.countries);
  
  // Prepare countries props for PhoneInput - ensure ISO 3166-1 alpha-2 format (lowercase)
  // react-phone-input-2 expects lowercase ISO 3166-1 alpha-2 codes like ['us', 'ca', 'gb']
  const onlyCountriesProp = !countriesLoading && countriesList.length > 0 
    ? countriesList.filter((c: string) => c && c.length === 2).map((c: string) => c.toLowerCase()) // Ensure lowercase and valid 2-letter codes
    : undefined;
  const excludeCountriesProp = !countriesLoading && restrictedCountriesList.length > 0 
    ? restrictedCountriesList.filter((c: string) => c && c.length === 2).map((c: string) => c.toLowerCase()) // Ensure lowercase and valid 2-letter codes
    : undefined;
  
  // Key to force remount when countries data changes - changes when data loads or list updates
  const phoneInputKey = `phone-${countriesList.length}-${countriesLoading}-${onlyCountriesProp?.join(',') || 'empty'}`;
  
  // Form validation for email
  const { register, handleSubmit: handleFormSubmit, formState: { errors: emailErrors, isValid: isEmailValid }, watch } = useForm<EmailFormFields>({
    defaultValues: {
      email: signupData.email,
    },
    resolver: zodResolver(emailSchema),
    mode: "onChange", 
  });
  
  const watchedEmail = watch("email");
  
  const [phoneNumber, setPhoneNumber] = useState(signupData.phone)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [phoneError, setPhoneError] = useState<string | null>(null)
  const [selectedCountry, setSelectedCountry] = useState<string>('in')

  const handleBack = () => {
    if (onBack) {
      onBack()
    }
  }

  const isDisabled = () => {
    const phoneChanged = signupData.phone !== phoneNumber;
    const emailChanged = signupData.email !== watchedEmail;
    const emailError = changeContactType === 'email' && (!isEmailValid || !!emailErrors.email);
    return (!phoneChanged && !emailChanged) || isSubmitting || (changeContactType === 'mobile' && !!phoneError) || emailError;
  }

  const onSubmit = async (data: EmailFormFields) => {
    if (isDisabled()) {
      return;
    }

    // Validate phone number if mobile is being changed
    if (changeContactType === 'mobile' && phoneNumber) {
      try {
        const phoneNumberWithCountry = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;
        const parsedNumber = parsePhoneNumber(phoneNumberWithCountry, selectedCountry.toUpperCase() as any);
        
        if (!parsedNumber || !parsedNumber.isValid()) {
          setPhoneError("Please enter a valid phone number");
          toast.error("Please enter a valid phone number");
          return;
        }
        
        // Clear error if valid
        setPhoneError(null);
      } catch (error) {
        setPhoneError("Please enter a valid phone number");
        toast.error("Please enter a valid phone number");
        return;
      }
    }

    // Validate email if email is being changed
    if (changeContactType === 'email') {
      if (!data.email || !data.email.trim()) {
        toast.error("Email is required");
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const updatedSignupData: SignupData = {
        ...signupData,
        phone: phoneNumber,
        email: data.email,
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
          email: data.email,
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
            email: data.email,
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
          <div className="flex items-center gap-3">
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
          <CardDescription className="text-gray-400">
            Update your phone number or email address to receive new verification codes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-6 mt-4" onSubmit={handleFormSubmit(onSubmit)}>
            <div className="space-y-4">
              <div className="space-y-2">
                {/* <label className="text-sm font-medium text-white">Phone Number</label> */}
                <div className={cn(
                  "transition-opacity duration-200",
                  changeContactType === 'email' && "opacity-50 pointer-events-none cursor-not-allowed"
                )}>
                  <div className={cn(phoneError && changeContactType === 'mobile' && "react-tel-input-error")}>
                    <PhoneInput
                      key={phoneInputKey}
                      countryCodeEditable={false}
                      country={'in'}
                      value={phoneNumber}
                      {...(onlyCountriesProp && { onlyCountries: onlyCountriesProp })}
                      {...(excludeCountriesProp && { excludeCountries: excludeCountriesProp })}
                      preferredCountries={['us', 'in', 'uk']}
                      onChange={(value, countryData) => {
                        setPhoneNumber(value);
                        // Extract country code from countryData object
                        const countryCode = (countryData as any)?.countryCode?.toLowerCase() || 
                                           (countryData as any)?.iso2?.toLowerCase() || 
                                           'in';
                        setSelectedCountry(countryCode);
                        setPhoneError(null); // Clear error when user types
                      }}
                      onBlur={() => {
                        // Validate on blur only if mobile is being changed
                        if (changeContactType === 'mobile' && phoneNumber) {
                          try {
                            const phoneNumberWithCountry = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;
                            const parsedNumber = parsePhoneNumber(phoneNumberWithCountry, selectedCountry.toUpperCase() as any);
                            
                            if (!parsedNumber || !parsedNumber.isValid()) {
                              setPhoneError("Please enter a valid phone number");
                            } else {
                              setPhoneError(null);
                            }
                          } catch (error) {
                            setPhoneError("Please enter a valid phone number");
                          }
                        } else {
                          setPhoneError(null);
                        }
                      }}
                      placeholder="Mobile No."
                      disabled={changeContactType === 'email'}
                      containerClass={cn("phone-input-container", phoneError && changeContactType === 'mobile' && "phone-input-error")}
                    />
                  </div>
                </div>
                {phoneError && changeContactType === 'mobile' && (
                  <p className="text-red-400 text-xs mt-1">{phoneError}</p>
                )}
              </div>
            </div>

            <div className="space-y-4 mb-12">
              <div className="space-y-2">
                {/* <label className="text-sm font-medium text-white">Email Address</label> */}
                <Input
                  type="email"
                  placeholder="Email"
                  variant="primary"
                  size="xl"
                  disabled={changeContactType === 'mobile'}
                  className={emailErrors.email ? "border-red-500 focus-visible:border-red-500 focus-visible:ring-red-500/20" : ""}
                  {...register("email")}
                />
                {emailErrors.email && (
                  <p className="text-red-400 text-xs mt-1">{emailErrors.email.message}</p>
                )}
              </div>
            </div>

            <div className="bg-gray-800/50 border border-gray-700 rounded-md p-4">
              <div className="flex items-start gap-2">
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
