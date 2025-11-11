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
import ChangeContactInformation from "./change-contact-information"
import { 
  verifyOtp, 
  signupFirst, 
  splitFullName,
  generateMobileOtpHash,
  generateEmailOtpHash,
  customerDetailsVerification,
  sendOtpEmail
} from "@/services/signupService"
import { useGoogleReCaptcha } from "react-google-recaptcha-v3"
import { useAppDispatch } from "@/store/store"
import { login as loginAction, type User } from "@/store/authSlice"
import { setCookie } from "@/services/commonMethods"
import type { SignupData, OtpStatus } from "@/interfaces/signupInterface"

interface OtpVerificationProps extends React.ComponentProps<"div"> {
  onBack?: () => void;
  signupData: SignupData;
  otpStatus: OtpStatus;
}

function OtpVerification({
  className,
  onBack,
  signupData,
  otpStatus,
  ...props
}: OtpVerificationProps) {
  const { executeRecaptcha } = useGoogleReCaptcha();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  
  const [mobileOtpValues, setMobileOtpValues] = useState(['', '', '', '', '', '']);
  const [emailOtpValues, setEmailOtpValues] = useState(['', '', '', '', '', '']);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mobileTimer, setMobileTimer] = useState(60);
  const [emailTimer, setEmailTimer] = useState(60);
  const [canResendMobile, setCanResendMobile] = useState(false);
  const [canResendEmail, setCanResendEmail] = useState(false);
  const [showChangeContact, setShowChangeContact] = useState(false);

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

  // Email OTP Timer countdown
  useEffect(() => {
    if (emailTimer > 0) {
      const interval = setInterval(() => {
        setEmailTimer((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setCanResendEmail(true);
    }
  }, [emailTimer]);

  const handleOtpChange = (
    index: number, 
    value: string, 
    values: string[],
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    prefix: string
  ) => {
    if (value.length > 1) return; // Only allow single digit
    const newValues = [...values];
    newValues[index] = value;
    setter(newValues);
    
    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`${prefix}-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    index: number,
    values: string[],
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    prefix: string
  ) => {
    if (e.key === "Backspace") {
      // If current input is empty, move to previous input
      if (!values[index] && index > 0) {
        const prevInput = document.getElementById(`${prefix}-${index - 1}`);
        prevInput?.focus();
      } else {
        // Clear current input
        const newValues = [...values];
        newValues[index] = '';
        setter(newValues);
      }
      return;
    }

    // Validate only numbers
    if (!/[0-9]/.test(e.key) && e.key !== "Tab" && e.key !== "ArrowLeft" && e.key !== "ArrowRight") {
      e.preventDefault();
    }
  };

  const handleResendMobile = async (type: 'sms' | 'voice' = 'sms') => {
    if (!executeRecaptcha) {
      toast.error("reCAPTCHA not ready");
      return;
    }

    try {
      const recaptchaToken = await executeRecaptcha("resend_otp");

      const payload: any = {
        email: signupData.email,
        mobile: signupData.phone,
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

  const handleResendEmail = async () => {
    try {
      // Resend email OTP
      await sendOtpEmail({
        email: signupData.email,
        mobile: signupData.phone,
        full_name: signupData.name,
        type: "signup",
        otp_msg: otpStatus.message,
        otp_status: otpStatus,
      });

      toast.success("Email OTP resent successfully");
      setEmailTimer(60);
      setCanResendEmail(false);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to resend email OTP");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const mobileOtp = mobileOtpValues.join('');
    const emailOtp = emailOtpValues.join('');

    if (mobileOtp.length !== 6) {
      toast.error("Please enter mobile OTP");
      return;
    }

    if (emailOtp.length !== 6) {
      toast.error("Please enter email OTP");
      return;
    }

    setIsSubmitting(true);

    try {
      // Step 3: Verify OTP
      const verifyResponse = await verifyOtp({
        email: signupData.email,
        mobile: signupData.phone,
        otp: mobileOtp,
        otpemail: emailOtp,
      });

      if (verifyResponse.code !== 200) {
        toast.error(verifyResponse.message || "OTP verification failed");
        return;
      }

      const verifyData = verifyResponse.data;

      // Check for errors
      if (verifyData.tries_completed) {
        toast.error("Maximum OTP attempts exceeded. Please try again later.");
        return;
      }

      if (verifyData.otp_expired) {
        toast.error("OTP has expired. Please request a new one.");
        return;
      }

      if (!verifyData.otp_verified) {
        toast.error(verifyData?.message || "Invalid OTP. Please try again.");
        return;
      }

      // Generate expected hashes
      const expectedMobileHash = generateMobileOtpHash(signupData.phone, signupData.email);
      const expectedEmailHash = generateEmailOtpHash(signupData.email);

      // Get actual hashes from response
      const actualMobileHash = verifyData.mobile_otp_verified_code;
      const actualEmailHash = verifyData.email_verify?.email_otp_verified_code || "";

      // Validate hashes (for security)
      if (actualMobileHash !== expectedMobileHash) {
        console.warn("Mobile OTP hash mismatch");
      }

      if (actualEmailHash !== expectedEmailHash) {
        console.warn("Email OTP hash mismatch");
      }

      // Split name
      const { first_name, last_name } = splitFullName(signupData.name);

      // Step 4: Complete signup
      const signupResponse = await signupFirst({
        first_name,
        last_name,
        password1: signupData.password,
        password2: signupData.password,
        email: signupData.email,
        phone: signupData.phone,
        mobile_otp_verified_code: actualMobileHash,
        email_otp_verified_code: actualEmailHash,
        emailis_verify: true,
      });

      if (signupResponse.code !== 200) {
        toast.error(signupResponse.message || "Signup failed");
        return;
      }

      // Extract user data from response
      const userData = signupResponse.data;
      const token = userData?.data?.auth?.[0]?.auth_token;
      const apiKey = userData?.data?.auth?.[0]?.apikey;

      if (token && apiKey) {
        // Create user object
        const user: User = {
          username: userData?.data?.user?.username || first_name,
          first_name: first_name,
          last_name: last_name,
          phone: signupData.phone,
          customer_country: userData?.data?.user?.customer_country || "",
          crn: userData?.data?.user?.crn || "",
          location: userData.user?.location || "",
          projectId: userData?.data?.project_id || "",
          email: signupData.email,
        };

        // Set cookies
        setCookie('token', token);
        setCookie('apikey', apiKey);

        // Dispatch login action
        dispatch(loginAction({ token, apiKey, user }));

        // Store user data in localStorage
        localStorage.setItem('currentUser', JSON.stringify(user));
        // localStorage.setItem('token', token);
        // localStorage.setItem('apiKey', apiKey);
        // localStorage.setItem('email', signupData.email);

        // Set CSRF token if available
        if (userData.csrf_token) {
          const expiryDate = new Date();
          expiryDate.setDate(expiryDate.getDate() + 10);
          document.cookie = `csrftoken=${userData.csrf_token}; expires=${expiryDate.toUTCString()}; path=/; SameSite=Strict`;
        }

        toast.success("Signup successful! Welcome to E2E Networks");
        
        // Navigate to dashboard
        setTimeout(() => {
          navigate("/");
        }, 500);
      } else {
        toast.error("Failed to retrieve authentication data");
      }

    } catch (error: any) {
      console.error("Signup error:", error);
      const errorMsg = error?.response?.data?.message || 
                      error?.response?.data?.error || 
                      error?.response?.data?.data?.message ||
                      "Signup failed. Please try again.";
      toast.error(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackFromContactChange = () => {
    setShowChangeContact(false);
  };

  // Show change contact form if state is true
  if (showChangeContact) {
    return <ChangeContactInformation onBack={handleBackFromContactChange} />;
  }

  return (
    <div className={cn("w-full max-w-md mx-auto", className)} {...props}>
      <Card className="border-gray-800/50 backdrop-blur-sm form-fade-in" style={{ backgroundColor: 'var(--signup-card-bg)' }}>
        <CardHeader className="text-left space-y-2">
          <div className="mb-2">
            <button
              type="button"
              onClick={onBack}
              className="text-gray-400 hover:text-white transition-colors mb-2"
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
          <form className="space-y-6 mt-8" onSubmit={handleSubmit}>
            {/* SMS Verification */}
            <div className="space-y-4">
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-white">Verification</h3>
                <p className="text-sm text-gray-400">SMS code sent on {signupData.phone}</p>
              </div>
              
              <div className="flex gap-3 items-center">
                <div className="flex gap-3 flex-1 items-center">
                  {mobileOtpValues.map((value, index) => (
                    <Input
                      key={index}
                      id={`mobile-otp-${index}`}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={value}
                      onChange={(e) => handleOtpChange(index, e.target.value, mobileOtpValues, setMobileOtpValues, 'mobile-otp')}
                      onKeyDown={(e) => handleKeyDown(e, index, mobileOtpValues, setMobileOtpValues, 'mobile-otp')}
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
                  onClick={() => setShowChangeContact(true)}
                >
                  Change phone number
                </button>
              </div>

              {/* Call me option - Commented out for now */}
              {/* {canResendMobile && (
                <div className="flex justify-center text-sm mt-2">
                  <button 
                    type="button" 
                    onClick={() => handleResendMobile('voice')}
                    className="text-cyan-400 hover:text-cyan-300"
                  >
                    Receive OTP via call
                  </button>
                </div>
              )} */}
            </div>

            {/* Email Verification */}
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm text-gray-400">Email code sent on {signupData.email}</p>
              </div>
              
              <div className="flex gap-3 items-center">
                <div className="flex gap-3 flex-1 items-center">
                  {emailOtpValues.map((value, index) => (
                    <Input
                      key={index}
                      id={`email-otp-${index}`}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={value}
                      onChange={(e) => handleOtpChange(index, e.target.value, emailOtpValues, setEmailOtpValues, 'email-otp')}
                      onKeyDown={(e) => handleKeyDown(e, index, emailOtpValues, setEmailOtpValues, 'email-otp')}
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
                {canResendEmail ? (
                  <button 
                    type="button" 
                    onClick={handleResendEmail}
                    className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Resend Code
                  </button>
                ) : (
                  <span className="text-gray-400 whitespace-nowrap">Resend in {emailTimer}s</span>
                )}
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
                disabled={isSubmitting}
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

export default OtpVerification;
