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
import { useState, useEffect, useRef } from "react"
import PhoneInput from 'react-phone-input-2'
import 'react-phone-input-2/lib/style.css'
import OtpVerification from './otp-verification'
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type SubmitHandler } from "react-hook-form";
import { z } from "zod";
import { Eye, EyeOff, Check, X } from "lucide-react";
import { useNavigate } from 'react-router-dom'
import { GoogleReCaptchaProvider, useGoogleReCaptcha } from "react-google-recaptcha-v3";
import { customerDetailsVerification, sendOtpEmail, googleCallback } from "@/services/signupService";
import { toast } from "sonner";
import type { SignupData, OtpStatus, SocialUser } from "@/interfaces/signupInterface";
import { getCookie, removeCookie, calculatePasswordStrength } from "@/services/commonMethods";
import CompleteSocialSignupForm from "./complete-social-signup";
import { Spinner } from '@/components/ui/shadcn-io/spinner';
import { MYACCOUNT_URL } from "@/constants/global.constants"

// Declare Google Identity Services types
declare global {
  interface Window {
    google: any;
  }
}

const schema = z.object({
  name: z.string().min(1, { message: "Name is required" }).refine((val: string) => val.trim().includes(" "), {
    message: "Please enter your full name.",
  }),
  email: z.string().email({ message: "Invalid email address" }),
  password: z.string().min(8, { message: "Password must be at least 8 characters long" }),
});

type FormFields = z.infer<typeof schema>;

function SignupForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const { executeRecaptcha } = useGoogleReCaptcha();
  const navigate = useNavigate();
  const { register, handleSubmit, watch, formState: {isSubmitting, errors} } = useForm<FormFields>({
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
    resolver: zodResolver(schema),
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [showOtpVerification, setShowOtpVerification] = useState(false);
  const [signupData, setSignupData] = useState<SignupData | null>(null);
  const [otpStatus, setOtpStatus] = useState<OtpStatus | null>(null);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [showEmailExistsError, setShowEmailExistsError] = useState(false);
  const [socialUser, setSocialUser] = useState<SocialUser | null>(null);
  const [showSocialSignup, setShowSocialSignup] = useState(false);
  const [showSpinnerOverlay, setShowSpinnerOverlay] = useState(false);
  
  // Use ref to prevent duplicate OAuth processing
  const hasProcessedOAuth = useRef(false);

  // Redirect to dashboard if user is already logged in (check cookies)
  useEffect(() => {
    const token = getCookie('token');
    const apikey = getCookie('apikey');
    const loginInProgress = localStorage.getItem('logininprogress');

    if (token && apikey) {
      if(loginInProgress === 'yes') {
        removeCookie('token');
        removeCookie('apikey');
        removeCookie('user');
        localStorage.removeItem("logininprogress");
      }
      else{
        // navigate('/');
        window.location.href = MYACCOUNT_URL;
        return;
      }
    }
  }, [navigate]);

  // Cleanup effect: Remove login progress flag if user exists
  useEffect(() => {
    const authLocalStorage = JSON.parse(localStorage.getItem("currentUser") || "null");
    
    if (!authLocalStorage && localStorage.getItem("logininprogress") === "yes") {
      localStorage.removeItem("logininprogress");
    }
  }, []);

  // Handle OAuth callbacks (Google and GitHub)
  useEffect(() => {
    const handleOAuthCallback = async () => {
      // Prevent duplicate processing using ref
      if (hasProcessedOAuth.current) {
        return;
      }

      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const scope = urlParams.get('scope');
      const state = urlParams.get('state');

      // Only process if we have OAuth params
      if (!code || (!scope && !state)) {
        return;
      }

      // Mark as processed immediately
      hasProcessedOAuth.current = true;

      // Handle Google OAuth callback
      if (code && scope && scope.includes('email')) {
        try {
          setIsGoogleLoading(true);
          setShowSpinnerOverlay(true);
          // Send full redirect URI to backend (must match what was used in OAuth initiation)
          const fullRedirectUri = `${window.location.origin}/accounts/signup`;
          const response = await googleCallback(code, fullRedirectUri);

          if (response.code === 200 && response.data) {
            const user: SocialUser = {
              name: response.data.name || "",
              email: response.data.email || "",
              access_token: response.data.access_token || "",
              id: response.data.id || "",
              provider: "Google",
            };

          // Store social user in state (not localStorage to keep on same page)
          setSocialUser(user);
          setShowSocialSignup(true);
          localStorage.removeItem('logininprogress');

          // Clean up URL parameters to prevent duplicate processing
          window.history.replaceState({}, document.title, '/accounts/signup');
          } else {
            toast.error("Failed to authenticate with Google");
            localStorage.removeItem('logininprogress');
          }
        } catch (error: any) {
          console.error("Google callback error:", error);
          toast.error(error?.response?.data?.message || "Google authentication failed");
          localStorage.removeItem('logininprogress');
        } finally {
          setIsGoogleLoading(false);
          setShowSpinnerOverlay(false);
        }
      }
      // Handle GitHub OAuth callback
      else if (code && state) {
        const storedState = localStorage.getItem('github_oauth_state');
        
        // CSRF validation
        if (state !== storedState) {
          toast.error("CSRF Error! Authentication Failed");
          localStorage.removeItem('logininprogress');
          localStorage.removeItem('github_oauth_state');
          return;
        }

        try {
          setIsGoogleLoading(true);
          setShowSpinnerOverlay(true);
          
          // Import GitHub callback service
          const { githubCallback } = await import("@/services/signupService");
          const response = await githubCallback(code);

          if (response.code === 200 && response.data) {
            const user: SocialUser = {
              name: response.data.name || "",
              email: response.data.email || "",
              access_token: response.data.access_token || "",
              id: response.data.id || "",
              provider: "GitHub",
            };

          // Store social user in state (not localStorage to keep on same page)
          setSocialUser(user);
          setShowSocialSignup(true);
          localStorage.removeItem('logininprogress');
          localStorage.removeItem('github_oauth_state');

          // Clean up URL parameters to prevent duplicate processing
          window.history.replaceState({}, document.title, '/accounts/signup');
          } else {
            toast.error("Failed to authenticate with GitHub");
            localStorage.removeItem('logininprogress');
            localStorage.removeItem('github_oauth_state');
          }
        } catch (error: any) {
          console.error("GitHub callback error:", error);
          toast.error(error?.response?.data?.message || "GitHub authentication failed");
          localStorage.removeItem('logininprogress');
          localStorage.removeItem('github_oauth_state');
        } finally {
          setIsGoogleLoading(false);
          setShowSpinnerOverlay(false);
        }
      }
    };

    handleOAuthCallback();
  }, [navigate]);
  
  const passwordStrength = calculatePasswordStrength(watch("password"), {
    minLength: 8,
    requireSpecialChars: true,
  });

  const onSubmit: SubmitHandler<FormFields> = async (data) => {
    if (!executeRecaptcha) {
      toast.error("reCAPTCHA not ready. Please refresh the page.");
      return;
    }
    
    // Validate phone number
    if (!phoneNumber || phoneNumber.length < 10) {
      toast.error("Please enter a valid phone number");
      return;
    }

    // Check if login already in progress
    // if (localStorage.getItem("logininprogress") === "yes") {
    //   toast.error("Signup already in progress. Please wait.");
    //   return;
    // }

    // Check if user already exists
    if (localStorage.getItem("currentUser")) {
      toast.error("You are already logged in");
      return;
    }

    try {
      // Set login in progress flag
      localStorage.setItem("logininprogress", "yes");

      // Get reCAPTCHA token
      const recaptchaToken = await executeRecaptcha("signup");

      // Format phone number with +
      const formattedPhone = phoneNumber.startsWith("+") ? phoneNumber : `+${phoneNumber}`;

      // Step 1: Customer details verification
      const verificationResponse = await customerDetailsVerification({
        email: data.email,
        mobile: formattedPhone,
        recaptcha: recaptchaToken,
        version: "v3",
      });

      if (verificationResponse.code !== 200) {
        toast.error(verificationResponse.message || "Verification failed");
        return;
      }

      const responseData = verificationResponse.data;

      // Check for errors
      if (responseData.phone_blocked) {
        toast.error("Phone number is blocked. Please contact sales.");
        return;
      }

      if (responseData.phone_no_restricted) {
        toast.error("Phone number is restricted. Please contact sales.");
        return;
      }

      if (responseData.email_exists) {
        setShowEmailExistsError(true);
        toast.error("A user is already registered with this e-mail address. Sign in");
        return;
      }

      // Step 2: Send OTP to email
      const emailOtpResponse = await sendOtpEmail({
        email: data.email,
        mobile: formattedPhone,
        full_name: data.name,
        type: "signup",
        otp_msg: responseData.message,
        otp_status: responseData,
      });

      if (emailOtpResponse.code !== 200) {
        toast.error("Failed to send email OTP");
        return;
      }

      // Store data for OTP verification step
      setSignupData({
        name: data.name,
        email: data.email,
        password: data.password,
        phone: formattedPhone,
      });
      setOtpStatus(responseData);

      // Show OTP verification screen
      setShowOtpVerification(true);
      toast.success("OTP sent to your mobile and email");

    } catch (error: any) {
      console.error("Signup error:", error);
      const errorMsg = error?.response?.data?.message || error?.response?.data?.error || "Signup failed. Please try again.";
      toast.error(errorMsg);
    } finally {
      localStorage.removeItem("logininprogress");
    }
  };

  const handleBackFromOtp = () => {
    setShowOtpVerification(false);
  };

  const handleBackFromSocialSignup = () => {
    setShowSocialSignup(false);
    setSocialUser(null);
  };

  const handleGoogleSignup = () => {
    try {
      // Check if user already exists
      const authLocalStorage = JSON.parse(localStorage.getItem("currentUser") || "null");
      if (authLocalStorage !== null) {
        toast.error("You are already logged in");
        window.location.href = import.meta.env.VITE_MYACCOUNT_URL || "http://localhost:62921";
        return;
      }

      // Check if login already in progress
      const loginInProgress = localStorage.getItem("logininprogress");
      if (loginInProgress === "yes") {
        toast.error("Signup already in progress. Please wait.");
        setTimeout(() => {
          return;
        }, 10000);
        return;
      }

      // Set login in progress
      localStorage.setItem("logininprogress", "yes");
      setShowSpinnerOverlay(true);

      // Check if Google API is loaded
      if (!window.google) {
        toast.error("Google Sign-In not loaded. Please refresh the page.");
        localStorage.removeItem("logininprogress");
        setShowSpinnerOverlay(false);
        return;
      }

      // Google OAuth Client ID
      const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || "849620625151-ufh4e6tl6ta3lkrshv3u4j1nrlh667v3.apps.googleusercontent.com";
      
      // Initialize Google OAuth2 Code Client
      const client = window.google.accounts.oauth2.initCodeClient({
        client_id: clientId,
        scope: 'openid email profile',
        ux_mode: 'redirect',
        redirect_uri: `${window.location.origin}/accounts/signup`,
        state: "/", // Can be used to restore app state after redirect
      });

      // Request authorization code
      client.requestCode();
    } catch (err) {
      console.error("Google sign-in error:", err);
      localStorage.removeItem("logininprogress");
      setShowSpinnerOverlay(false);
      toast.error("Failed to initiate Google sign-up. Try again.");
    }
  };

  const handleGithubSignup = () => {
    // Check if login already in progress
    // if (localStorage.getItem("logininprogress") === "yes") {
    //   toast.error("Signup already in progress. Please wait.");
    //   return;
    // }

    // Check if user already exists
    if (localStorage.getItem("currentUser")) {
      toast.error("You are already logged in");
      return;
    }

    // Set login in progress
    localStorage.setItem("logininprogress", "yes");
    setShowSpinnerOverlay(true);

    // Generate random state for CSRF validation
    const state = Math.random().toString(36).substring(7);
    localStorage.setItem('github_oauth_state', state);

    // Get current URL for redirect (must match OAuth app settings)
    // Using localhost:4200 to match Google/GitHub OAuth configuration
    const redirectUri = `http://localhost:4200/accounts/signup`;

    // GitHub OAuth Client ID
    const clientId = import.meta.env.VITE_GITHUB_CLIENT_ID || "c3a8b0fea19dbb91103f";

    // Build GitHub OAuth URL
    const githubAuthUrl = new URL("https://github.com/login/oauth/authorize");
    githubAuthUrl.searchParams.append("client_id", clientId);
    githubAuthUrl.searchParams.append("redirect_uri", redirectUri);
    githubAuthUrl.searchParams.append("scope", "user:email");
    githubAuthUrl.searchParams.append("state", state);
    githubAuthUrl.searchParams.append("allow_signup", "false");

    // Redirect to GitHub
    window.location.href = githubAuthUrl.toString();
  };

  // Show social signup completion if user came from OAuth
  if (showSocialSignup && socialUser) {
    return (
      <CompleteSocialSignupForm
        socialUser={socialUser}
        onBack={handleBackFromSocialSignup}
      />
    );
  }

  // Show OTP verification for standard signup
  if (showOtpVerification && signupData && otpStatus) {
    return (
      <OtpVerification
        onBack={handleBackFromOtp}
        signupData={signupData}
        otpStatus={otpStatus}
      />
    );
  }

  return (
    <div className={cn("w-full max-w-md mx-auto relative", className)} {...props}>
      {/* Spinner overlay - positioned relative to form */}
      {showSpinnerOverlay && (
        <div className="absolute inset-0 bg-gray-900/80 flex items-center justify-center z-50 rounded-lg">
          <Spinner className="text-blue-500" size={64} />
        </div>
      )}
      
      <Card className="border-gray-800/50 backdrop-blur-sm form-fade-in" style={{ backgroundColor: 'var(--signup-card-bg)' }}>
        <CardHeader className="text-left space-y-2">
          <CardTitle className="text-2xl font-bold text-white">
            Start your free trial
          </CardTitle>
          <CardDescription className="text-gray-400">
            No credit card. Sign up in minutes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4 mt-8" onSubmit={handleSubmit(onSubmit)} autoComplete="off">
            {/* Hidden fake fields to trick password managers */}
            <input type="text" style={{ display: 'none' }} />
            <input type="password" style={{ display: 'none' }} />
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Input
                  id="name"
                  type="text"
                  placeholder="Enter your full name"
                  variant="primary"
                  size="xl"
                  required
                  autoComplete="off"
                  className={errors.name ? "border-red-500 focus-visible:border-red-500 focus-visible:ring-red-500/20" : ""}
                  {...register("name")}
                />
                {errors.name && (
                  <p className="text-red-400 text-xs mt-1">{errors.name.message}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <PhoneInput
                  country={'in'}
                  value={phoneNumber}
                  onChange={(value) => setPhoneNumber(value)}
                  placeholder="Mobile No."
                  inputProps={{
                    autoComplete: 'off',
                  }}
                />
              </div>
              
              <div className="space-y-2">
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  variant="primary"
                  size="xl"
                  required
                  autoComplete="off"
                  className={errors.email ? "border-red-500 focus-visible:border-red-500 focus-visible:ring-red-500/20" : ""}
                  {...register("email")}
                />
                {errors.email && (
                  <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Create a password"
                    variant="primary"
                    size="xl"
                    className={errors.password ? "pr-10 border-red-500 focus-visible:border-red-500 focus-visible:ring-red-500/20" : "pr-10"}
                    required
                    autoComplete="new-password"
                    {...register("password")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>
                )}

                { watch("password") && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                        <div 
                          className={`h-full bg-gradient-to-r ${passwordStrength?.color} transition-all duration-300`}
                          style={{ width: `${passwordStrength?.score || 0}%` }}
                        />
                      </div>
                      <span className={`text-xs font-medium ${passwordStrength?.textColor}`}>
                        {passwordStrength?.strength}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-1 text-xs">
                      {passwordStrength && Object.entries(passwordStrength.checks).map(([check, passed]) => (
                        <div key={check} className={`flex items-center gap-1 ${passed ? 'text-emerald-400' : 'text-gray-500'}`}>
                          {passed ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                          <span className="capitalize">
                            {check === 'length' ? '8+ chars' : 
                            check === 'lowercase' ? 'lowercase' :
                            check === 'uppercase' ? 'uppercase' :
                            check === 'numbers' ? 'numbers' : 'special'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="space-y-2">
                <Button 
                  type="submit" 
                  variant="signup" 
                  size="xl"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Creating Account..." : "Create Account"}
                </Button>
              </div>
              
              <div className="relative mt-10 mb-6">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-gray-700" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-gray-900 px-2 text-gray-400">Or</span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <Button 
                  variant="social" 
                  type="button"
                  size="xl"
                  onClick={handleGoogleSignup}
                  disabled={isGoogleLoading}
                >
                  <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  {isGoogleLoading ? "Loading..." : "Google"}
                </Button>
                <Button 
                  variant="social" 
                  type="button"
                  size="xl"
                  onClick={handleGithubSignup}
                  disabled={isGoogleLoading}
                >
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                  </svg>
                  {isGoogleLoading ? "Loading..." : "GitHub"}
                </Button>
              </div>
              
              {!showEmailExistsError && (
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
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

// ReCaptcha Provider Wrapper
const Signup = (props: React.ComponentProps<"div">) => {
  const recaptchaSiteKey = "6LeJ7_4jAAAAAKqjyjQ2jEC4yJenDE6R8KyTu9Mt";
  
  if (!recaptchaSiteKey) {
    console.error("reCAPTCHA site key is not set");
    return (
      <div className="text-red-400 text-center p-4">
        reCAPTCHA configuration error. Please contact support.
      </div>
    );
  }

  return (
    <GoogleReCaptchaProvider reCaptchaKey={recaptchaSiteKey}>
      <SignupForm {...props} />
    </GoogleReCaptchaProvider>
  );
};

export default Signup;
