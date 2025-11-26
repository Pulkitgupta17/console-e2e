import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { 
  verifyOtp, 
  signupGoogle,
  signupGithub,
  splitFullName,
  generateMobileOtpHash,
  generateEmailOtpHash,
  customerDetailsVerification,
} from "@/services/signupService"
import { useGoogleReCaptcha } from "react-google-recaptcha-v3"
import { useAppDispatch } from "@/store/store"
import { login as loginAction, type User } from "@/store/authSlice"
import type { SocialUser, OtpStatus } from "@/interfaces/signupInterface"
import { NOTEBOOK_URL } from "@/constants/global.constants"
import { postCrossDomainMessage, setSessionTimeCookie, processOtpPaste, createOtpPasteHandler, createOtpKeyDownHandler } from "@/services/commonMethods"

interface SocialOtpVerificationProps extends React.ComponentProps<"div"> {
  onBack?: () => void;
  socialUser: SocialUser & { phone: string };
  otpStatus: OtpStatus;
  nameEdited: boolean;
  editedName: string;
}

function SocialOtpVerification({
  className,
  onBack,
  socialUser,
  otpStatus,
  nameEdited,
  editedName,
  ...props
}: SocialOtpVerificationProps) {
  const { executeRecaptcha } = useGoogleReCaptcha();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  
  const [mobileOtpValues, setMobileOtpValues] = useState(['', '', '', '', '', '']);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [mobileTimer, setMobileTimer] = useState(60);
  const [canResendMobile, setCanResendMobile] = useState(false);

  // Mobile OTP Timer countdown
  useEffect(() => {
    if (mobileTimer > 0) {
      const interval = setInterval(() => {
        setMobileTimer((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setCanResendMobile(true);
    }
  }, [mobileTimer]);

  const processPasteData = (pastedData: string) => {
    processOtpPaste({
      pastedData,
      otpLength: 6,
      setOtpValues: setMobileOtpValues,
      inputIdPrefix: 'mobile-otp',
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
    
    const newValues = [...mobileOtpValues];
    newValues[index] = value;
    setMobileOtpValues(newValues);
    
    if (value && index < 5) {
      const nextInput = document.getElementById(`mobile-otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handlePaste = createOtpPasteHandler(processPasteData)

  const handleKeyDown = createOtpKeyDownHandler({
    otpValues: mobileOtpValues,
    setOtpValues: setMobileOtpValues,
    inputIdPrefix: 'mobile-otp',
  })

  const handleResendMobile = async (type: 'sms' | 'voice' = 'sms') => {
    if (!executeRecaptcha) {
      toast.error("reCAPTCHA not ready");
      return;
    }

    try {
      const recaptchaToken = await executeRecaptcha("resend_otp");

      const payload: any = {
        email: socialUser.email,
        mobile: socialUser.phone,
        recaptcha: recaptchaToken,
        version: "v3",
      };

      if (type === 'voice') {
        payload.retry = true;
        payload.retry_type = "voice";
      }

      await customerDetailsVerification(payload);

      toast.success(type === 'voice' ? "OTP will be sent via call" : "Mobile OTP resent successfully");
      setMobileTimer(60);
      setCanResendMobile(false);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to resend mobile OTP");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const mobileOtp = mobileOtpValues.join('');

    if (mobileOtp.length !== 6) {
      toast.error("Please enter mobile OTP");
      return;
    }

    setIsSubmitting(true);

    try {
      // Step 1: Verify OTP (mobile only for social signup)
      const verifyResponse = await verifyOtp({
        email: socialUser.email,
        mobile: socialUser.phone,
        otp: mobileOtp,
        otpemail: "", // Empty for social signup
      });

      if (verifyResponse.code !== 200) {
        toast.error(verifyResponse.message || "OTP verification failed");
        return;
      }

      const verifyData = verifyResponse.data;

      if (verifyData.tries_completed) {
        toast.error("Maximum OTP attempts exceeded. Please try again later.");
        return;
      }

      if (verifyData.otp_expired) {
        toast.error("OTP has expired. Please request a new one.");
        return;
      }

      if (!verifyData.otp_verified) {
        toast.error("Invalid OTP. Please try again.");
        return;
      }

      // Generate expected hashes
      const expectedMobileHash = generateMobileOtpHash(socialUser.phone, socialUser.email);
      const expectedEmailHash = generateEmailOtpHash(socialUser.email);

      // Get actual hash from response
      const actualMobileHash = verifyData.mobile_otp_verified_code;

      // Validate hash
      if (actualMobileHash !== expectedMobileHash) {
        console.warn("Mobile OTP hash mismatch");
      }

      // Prepare name details
      const nameDetails: any = {
        name_edit_allowed: nameEdited,
      };

      if (nameEdited) {
        const { first_name, last_name } = splitFullName(editedName);
        nameDetails.first_name = first_name;
        nameDetails.last_name = last_name;
      }

      // Step 2: Complete social signup (Google or GitHub)
      const signupPayload = {
        access_token: socialUser.access_token,
        code: socialUser.id,
        phone: socialUser.phone,
        email: socialUser.email,
        mobile_otp_verified_code: actualMobileHash,
        email_otp_verified_code: expectedEmailHash,
        emailis_verify: true,
        name_details: nameDetails,
      };

      const signupResponse = socialUser.provider === "Google" 
        ? await signupGoogle(signupPayload)
        : await signupGithub(signupPayload);

      if (signupResponse.code !== 200) {
        toast.error(signupResponse.message || "Signup failed");
        return;
      }

      // Extract user data from response
      const userData = signupResponse.data;
      const token = userData?.data.auth?.[0]?.auth_token;
      const apiKey = userData?.data.auth?.[0]?.apikey;

      if (token && apiKey) {
        const { first_name, last_name } = nameEdited 
          ? splitFullName(editedName)
          : splitFullName(socialUser.name);

        // Create user object
        const user: User = {
          username: userData?.data?.user?.username || first_name,
          first_name: first_name,
          last_name: last_name,
          phone: socialUser.phone,
          customer_country: userData?.data?.user?.customer_country || "",
          crn: userData.user?.crn || "",
          location: userData.user?.location || "",
          projectId: userData?.data?.project_id || "",
          email: socialUser.email,
        };

        // Dispatch login action (this will set cookies automatically)
        dispatch(loginAction({ token, apiKey, user }));

        // Store user data in localStorage
        localStorage.setItem('currentUser', JSON.stringify(user));
        // localStorage.setItem('token', token);
        // localStorage.setItem('apiKey', apiKey);
        // localStorage.setItem('email', socialUser.email);

        // Clear social user data
        localStorage.removeItem('socialuser');

        // Set CSRF token if available
        if (userData.csrf_token) {
          const expiryDate = new Date();
          expiryDate.setDate(expiryDate.getDate() + 10);
          document.cookie = `csrftoken=${userData.csrf_token}; expires=${expiryDate.toUTCString()}; path=/; SameSite=Strict`;
        }

        toast.success("Signup successful! Welcome to E2E Networks");
        localStorage.removeItem("logininprogress");

        // Navigate to TIR Dashboard
        setSessionTimeCookie();
        postCrossDomainMessage(NOTEBOOK_URL, 0);
      } else {
        toast.error("Failed to retrieve authentication data");
      }

    } catch (error: any) {
      console.error("Social signup error:", error);
      const errorMsg = error?.response?.data?.message || 
                      error?.response?.data?.error || 
                      error?.response?.data?.data?.message ||
                      "Signup failed. Please try again.";
      toast.error(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={cn("w-full max-w-md mx-auto", className)} {...props}>
      <Card className="border-gray-800/50 backdrop-blur-sm form-fade-in" style={{ backgroundColor: 'var(--signup-card-bg)' }}>
        <CardHeader className="text-left space-y-2">
          <div className="mb-2">
            <button
              type="button"
              onClick={onBack}
              className="text-gray-400 hover:text-white transition-colors mb-3"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <CardTitle className="text-2xl font-bold text-white">
              Verify Mobile Number
            </CardTitle>
          </div>
          <CardDescription className="text-gray-400">
            Complete signup with {socialUser.provider}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-6 mt-8" onSubmit={handleSubmit}>
            {/* SMS Verification */}
            <div className="space-y-4">
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-white">Mobile Verification</h3>
                <p className="text-sm text-gray-400">SMS code sent on {socialUser.phone}</p>
              </div>
              
              <div className="flex gap-3 items-center">
                <div className="flex gap-3 flex-1 items-center">
                  {mobileOtpValues.map((value, index) => (
                    <Input
                      key={index}
                      id={`mobile-otp-${index}`}
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
                <div className="text-sm shrink-0">
                </div>
              </div>
              
              <div className="flex justify-between text-sm">
                {canResendMobile ? (
                  <button 
                    type="button" 
                    onClick={() => handleResendMobile('sms')}
                    className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Resend Code
                  </button>
                ) : (
                  <span className="text-gray-400 whitespace-nowrap">Resend in {mobileTimer}s</span>
                )}
                <button 
                  type="button" 
                  className="text-cyan-400 hover:text-cyan-300"
                  onClick={onBack}
                >
                  Change phone number
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
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                />
                <label htmlFor="terms-otp" className="text-sm text-gray-400">
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
            </div>
            
            {/* Verify Button */}
            <div className="space-y-2">
              <Button 
                type="submit" 
                variant="signup" 
                size="xl"
                disabled={isSubmitting || !termsAccepted}
              >
                {isSubmitting ? "Verifying..." : "Verify & Sign Up"}
              </Button>
            </div>
            
            {/* Sign In Link */}
            <p className="text-center text-gray-400 text-sm mt-8 mb-2">
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => navigate('/accounts/signin')}
                className="text-cyan-400 hover:text-cyan-300"
              >
                Sign in
              </button>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default SocialOtpVerification;

