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
import { useNavigate } from "react-router-dom"
import { Eye, EyeOff, Info } from "lucide-react"
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { login } from "@/services/loginService"
import { GoogleReCaptchaProvider, useGoogleReCaptcha } from "react-google-recaptcha-v3";
import { login as loginAction, logout, type User } from "@/store/authSlice";
import { useAppDispatch } from "@/store/store";
import CryptoJS from "crypto-js";
import API from "@/axios";
import TwoFactorAuth from "./twoFactorAuth";
import GoogleAuthenticator from "./google-authenticator";
import { getCookie, removeCookie, setCookie, setSessionTimeCookie, setSessionFor60Days, postCrossDomainMessage, navigateWithQueryParams } from "@/services/commonMethods";
import { googleCallback, verifySocialEmail, loginGoogle, loginGithub, githubCallback, getCustomerValidationStatus, verifyGATotp, verifyGABackupCode, reportLostGAKey } from "@/services/signupService";
import type { SocialUser } from "@/interfaces/signupInterface";
import { Spinner } from '@/components/ui/shadcn-io/spinner';
import { MYACCOUNT_URL, MARKETPLACE_URL, NOTEBOOK_URL } from "@/constants/global.constants";

declare global {
  interface Window {
    google: any;
  }
}

const schema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
  password: z.string().min(8, { message: "Password must be at least 8 characters long" }),
});
type FormFields = z.infer<typeof schema>;

// Constants for 2FA verification
const SUCCESS_TEXT = "success";
const SUCCESS_FAILED_TEXT = "failed";
const VERIFIED_FAILED_TEXT = "False";
const VERIFIED_SUCCESS_TEXT = "True";

// LoginForm component
const LoginForm: React.FC<{
  onSubmit: (data: FormFields, rememberMe: boolean) => Promise<void>;
  isLoading: boolean;
  error?: string | null;
  onGoogleLogin: () => void;
  onGithubLogin: () => void;
  isSocialLoading: boolean;
}> = ({ onSubmit, isLoading, error, onGoogleLogin, onGithubLogin, isSocialLoading }) => {
  const { register, handleSubmit, formState: { isSubmitting, isValid } } = useForm<FormFields>({
    defaultValues: { email: "", password: "" },
    resolver: zodResolver(schema),
  });
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const navigate = useNavigate();
  
  const handleFormSubmit = async (data: FormFields) => {
    await onSubmit(data, rememberMe);
  };

  const handleForgotPassword = () => {
    navigate('/accounts/password/reset');
  };

  return (
    <div className="w-full min-w-md mx-auto">
      <Card className="border-gray-800/50 backdrop-blur-sm form-fade-in" style={{ backgroundColor: 'var(--signup-card-bg)' }}>
        <CardHeader className="text-left space-y-2">
          <CardTitle className="text-2xl font-bold text-white">
            Welcome back
          </CardTitle>
          <CardDescription className="text-gray-400">
            Sign in to your E2E Networks account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4 mt-8" onSubmit={handleSubmit(handleFormSubmit)}>
            <div className="space-y-4">
              <div className="space-y-2">
                <Input
                  id="email"
                  type="email"
                  placeholder="Email"
                  className="bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-500 input-glow focus:border-cyan-500 h-14"
                  required
                  {...register("email")}
                />
              </div>
              
              <div className="space-y-2">
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Password"
                    className="bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-500 input-glow focus:border-cyan-500 pr-10 h-14"
                    required
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
              </div>
              
              {error && (
                <div className="text-red-400 text-sm text-center">
                  {typeof error === "string" ? error : JSON.stringify(error)}
                </div>
              )}

              <div className="flex items-center justify-between mt-6 mb-6">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="remember"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 text-cyan-600 bg-gray-800 border-gray-700 rounded focus:ring-cyan-500 focus:ring-2"
                  />
                  <label htmlFor="remember" className="text-sm text-gray-400 flex items-center gap-1">
                    Trust this device for 60 days?
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        window.open('https://docs.e2enetworks.com/docs/myaccount/GettingStarted/sign_in/#sign-in-with-trusting-the-device', '_blank', 'noopener,noreferrer');
                      }}
                      className="text-gray-400 hover:text-cyan-400 transition-colors inline-flex items-center"
                      aria-label="Learn more about trusting the device"
                      title="How to use trust this device?"
                    >
                      <Info className="w-4 h-4" />
                    </button>
                  </label>
                </div>
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-sm text-cyan-400 hover:text-cyan-300"
                >Forgot password?</button>
              </div>
              
              <div className="space-y-2">
                <Button 
                  type="submit" 
                  variant="signup" 
                  size="xl"
                  disabled={isSubmitting || !isValid || isLoading}
                >
                  {isSubmitting || isLoading ? "Signing In..." : "Sign In"}
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
                  onClick={onGoogleLogin}
                  disabled={isSocialLoading}
                >
                  <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  {isSocialLoading ? "Loading..." : "Google"}
                </Button>
                <Button 
                  variant="social" 
                  type="button"
                  size="xl"
                  onClick={onGithubLogin}
                  disabled={isSocialLoading}
                >
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                  </svg>
                  {isSocialLoading ? "Loading..." : "GitHub"}
                </Button>
              </div>
              
              <p className="text-center text-gray-400 text-sm mt-8 mb-2">
                Don&apos;t have an account?{" "}
                <button
                  type="button"
                  onClick={() => navigate(navigateWithQueryParams('/accounts/signup'))}
                  className="text-cyan-400 hover:text-cyan-300"
                >
                  Sign up
                </button>
              </p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

// Main Signin component
function Signin({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const { executeRecaptcha } = useGoogleReCaptcha();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [show2FA, setShow2FA] = useState(false);
  const [showGA, setShowGA] = useState(false);
  const [isSocialLoading, setIsSocialLoading] = useState(false);
  const [showSpinnerOverlay, setShowSpinnerOverlay] = useState(false);
  const [userPhone, setUserPhone] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [gaRecaptchaToken, setGaRecaptchaToken] = useState<string>("");
  const [gaRecaptchaVersion, setGaRecaptchaVersion] = useState<'v2' | 'v3'>('v3');
  const [loginResponseData, setLoginResponseData] = useState<any>(null);
  const hasProcessedOAuth = useRef(false);
  const hasRequestedOTP = useRef(false);

  useEffect(() => {
    localStorage.setItem('password_expired', 'false');
  }, []);

  // Check if user is logged out (no currentUser in localStorage) - clear storage and cookies
  useEffect(() => {
    const currentUser = localStorage.getItem('currentUser');
    if (!currentUser) {
      localStorage.clear();
      removeCookie('token');
      removeCookie('apikey');
      removeCookie('user');
      removeCookie('yyy_xxx');
      localStorage.setItem('password_expired', 'false');
    }
    if(!getCookie('token')){
      localStorage.clear();
    }
  }, []);

  // Redirect to dashboard if user is already logged in (check cookies)
  useEffect(() => {
    const token = getCookie('token');
    const apikey = getCookie('apikey');
    const loginInProgress = localStorage.getItem('logininprogress');

    // Only redirect if logged in AND not in the middle of signup/login process
    if (token && apikey) {
      if(loginInProgress === 'yes') {
        removeCookie('token');
        removeCookie('apikey');
        removeCookie('user');
        localStorage.removeItem("logininprogress");
      }
      else{
        window.location.href = MYACCOUNT_URL;
        return;
      }
    }
  }, [navigate]);

  // Handle OAuth callbacks (Google and GitHub)
  useEffect(() => {
    const handleOAuthCallback = async () => {
      // Prevent duplicate processing
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

      hasProcessedOAuth.current = true;

      try {
        setIsSocialLoading(true);
        setShowSpinnerOverlay(true);

        // Handle Google OAuth callback
        if (code && scope && scope.includes('email')) {
          // Step 1: Google callback
          const callbackResponse = await googleCallback(code, 'login');
          
          if (callbackResponse.code !== 200 || !callbackResponse.data) {
            toast.error("Failed to authenticate with Google");
            return;
          }

          const { email, access_token, id } = callbackResponse.data;

          // Step 2: Verify email exists
          const emailVerifyResponse = await verifySocialEmail(email);

          if (emailVerifyResponse.code !== 200) {
            toast.error("Failed to verify email");
            return;
          }

          // If email doesn't exist, redirect to signup
          if (!emailVerifyResponse.data.email_exists) {
            const user: SocialUser = {
              name: callbackResponse.data.name || "",
              email: email,
              access_token: access_token,
              id: id,
              provider: "Google",
            };
            localStorage.setItem('socialuser', JSON.stringify(user));
            toast.info("No account found. Please sign up first.");
            navigate(navigateWithQueryParams('/accounts/signup'));
            return;
          }

          // Step 3: Complete Google login
          const loginResponse = await loginGoogle(access_token, id);

          if (loginResponse.code !== 200 || !loginResponse.data) {
            toast.error("Failed to login with Google");
            return;
          }

          // Extract auth data and store in state
          const respData = loginResponse.data;
          const token = respData?.data?.auth?.[0]?.auth_token;
          const apiKey = respData?.data?.auth?.[0]?.apikey;
          const userKey = respData?.data?.user;

          if (token && apiKey && userKey) {
            const user: User = {
              username: userKey.username || "",
              first_name: userKey.first_name || "",
              last_name: userKey.last_name || "",
              phone: userKey.phone || "",
              customer_country: userKey.customer_country || "",
              crn: userKey.crn || "",
              location: userKey.location || "",
              projectId: respData?.data?.project_id || "",
              email: userKey.current_user_email || "",
            };

            // Dispatch to Redux (saves to cookies + localStorage)
            dispatch(loginAction({ token, apiKey, user }));

            // Clean URL
            window.history.replaceState({}, document.title, '/accounts/signin');

            // Check for 2FA or navigate to dashboard
            await checkFor2faOrDashboard(respData);
          } else {
            toast.error("Failed to retrieve authentication data");
          }
        }
        // Handle GitHub OAuth callback
        else if (code && state) {
          const storedState = localStorage.getItem('github_oauth_state');
          const [receivedState] = state.split(',');

          // CSRF validation
          if (receivedState !== storedState) {
            toast.error("CSRF Error! Authentication Failed");
            localStorage.removeItem('github_oauth_state');
            return;
          }

          // Step 1: GitHub callback
          const callbackResponse = await githubCallback(code);

          if (callbackResponse.code !== 200 || !callbackResponse.data) {
            toast.error("Failed to authenticate with GitHub");
            localStorage.removeItem('github_oauth_state');
            return;
          }

          const { email, access_token, id } = callbackResponse.data;

          // Step 2: Verify email exists
          const emailVerifyResponse = await verifySocialEmail(email);

          if (emailVerifyResponse.code !== 200) {
            toast.error("Failed to verify email");
            localStorage.removeItem('github_oauth_state');
            return;
          }

          // If email doesn't exist, redirect to signup
          if (!emailVerifyResponse.data.email_exists) {
            const user: SocialUser = {
              name: callbackResponse.data.name || "",
              email: email,
              access_token: access_token,
              id: id,
              provider: "GitHub",
            };
            localStorage.setItem('socialuser', JSON.stringify(user));
            localStorage.removeItem('github_oauth_state');
            toast.info("No account found. Please sign up first.");
            navigate(navigateWithQueryParams('/accounts/signup'));
            return;
          }

          // Step 3: Complete GitHub login
          const loginResponse = await loginGithub(access_token, id);

          if (loginResponse.code !== 200 || !loginResponse.data) {
            toast.error("Failed to login with GitHub");
            localStorage.removeItem('github_oauth_state');
            return;
          }

          // Extract auth data and store in state
          const respData = loginResponse.data;
          const token = respData?.data?.auth?.[0]?.auth_token;
          const apiKey = respData?.data?.auth?.[0]?.apikey;
          const userKey = respData?.data?.user;

          if (token && apiKey && userKey) {
            const user: User = {
              username: userKey.username || "",
              first_name: userKey.first_name || "",
              last_name: userKey.last_name || "",
              phone: userKey.phone || "",
              customer_country: userKey.customer_country || "",
              crn: userKey.crn || "",
              location: userKey.location || "",
              projectId: respData?.data?.project_id || "",
              email: userKey.current_user_email || "",
            };

            // Dispatch to Redux (saves to cookies + localStorage)
            dispatch(loginAction({ token, apiKey, user }));

            // Clean URL
            window.history.replaceState({}, document.title, '/accounts/signin');
            localStorage.removeItem('github_oauth_state');

            // Check for 2FA or navigate to dashboard
            await checkFor2faOrDashboard(respData);
          } else {
            toast.error("Failed to retrieve authentication data");
          }
        }
        } catch (error: any) {
          toast.error(error?.response?.data?.message || "OAuth login failed");
        } finally {
          setIsSocialLoading(false);
          setShowSpinnerOverlay(false);
          localStorage.removeItem('logininprogress');
        }
      };

      handleOAuthCallback();
    }, [navigate, dispatch]);

  // Auto-request OTP when 2FA screen is shown and reCAPTCHA becomes available
  useEffect(() => {
    const requestOTPWhenReady = async () => {
      // Only proceed if:
      // 1. 2FA screen is shown
      // 2. reCAPTCHA is ready
      // 3. OTP hasn't been requested yet
      if (!show2FA || !executeRecaptcha || hasRequestedOTP.current) {
        return;
      }

      try {
        hasRequestedOTP.current = true;
        const recaptchaToken = await executeRecaptcha("request_otp");
        await handleRequestOTP(recaptchaToken);
      } catch (error) {
        hasRequestedOTP.current = false; 
        toast.error("Failed to send OTP. Please refresh and try again.");
      }
    };

    requestOTPWhenReady();
  }, [show2FA, executeRecaptcha]);

  const checkFor2faOrDashboard = async (respData: any) => {
    // Create MD5 hashes for verification
    const successTwoFactorAllowed = CryptoJS.MD5(`${respData?.sessionId}:${SUCCESS_TEXT}`).toString();
    const failedTwoFactorAllowed = CryptoJS.MD5(`${respData?.sessionId}:${SUCCESS_FAILED_TEXT}`).toString();
    const failedTwoFactorDeviceVerified = CryptoJS.MD5(`${respData?.sessionId}:${VERIFIED_FAILED_TEXT}`).toString();
    const successTwoFactorDeviceVerified = CryptoJS.MD5(`${respData?.sessionId}:${VERIFIED_SUCCESS_TEXT}`).toString();

    // Access properties through respData.data
    const twoFactorAllowed = respData?.data?.is_two_factor_allowed;
    const twoFactorDeviceVerified = respData?.data?.is_two_factor_device_verified;
    const isGaEnabled = respData?.data?.is_ga_enabled;

    if (twoFactorAllowed !== successTwoFactorAllowed && twoFactorAllowed !== failedTwoFactorAllowed) {
      dispatch(logout());
      navigate("/accounts/signin");
      return;
    }

    if (twoFactorDeviceVerified !== successTwoFactorDeviceVerified && twoFactorDeviceVerified !== failedTwoFactorDeviceVerified ) {
      dispatch(logout());
      navigate("/accounts/signin");
      return;
    }

    if ( twoFactorAllowed === successTwoFactorAllowed && twoFactorDeviceVerified === failedTwoFactorDeviceVerified) {
      // Request OTP for 2FA (if reCAPTCHA is ready)
      if (executeRecaptcha) {
        try {
          hasRequestedOTP.current = true;
          const recaptchaToken = await executeRecaptcha("request_otp");
          await handleRequestOTP(recaptchaToken);
        } catch (error) {
          hasRequestedOTP.current = false; // Reset so useEffect can retry
        }
      } 
      setShow2FA(true);
      return;
    }
    else if (isGaEnabled) {
      // Store auth tokens temporarily for GA verification
      const token = respData?.data?.auth?.[0]?.auth_token;
      const apiKey = respData?.data?.auth?.[0]?.apikey;
      
      if (token && apiKey) {
        // Set cookies temporarily so API calls can authenticate
        setCookie('token', token);
        setCookie('apikey', apiKey);
        if (respData?.data?.contact_person_id) {
          setCookie('contact_person_id', respData.data.contact_person_id);
        }
        
        if (executeRecaptcha) {
          try {
            const recaptchaToken = await executeRecaptcha("GAAuthenticator");
            setGaRecaptchaToken(recaptchaToken);
            setGaRecaptchaVersion('v3');
            setLoginResponseData(respData);
            setShowGA(true);
          } catch (error) {
            toast.error("Failed to initialize reCAPTCHA. Please try again.");

            removeCookie('token');
            removeCookie('apikey');
            dispatch(logout());
            localStorage.removeItem("logininprogress");
          }
        } else {
          toast.error("reCAPTCHA not ready. Please reload the page.");
        }
      }
      return;
    } 
    else {
      // Check for password expiry before navigating
      const isPasswordExpired = respData?.data?.is_password_expired || respData?.is_password_expired;
      localStorage.setItem("password_expired", isPasswordExpired ? "true" : "false");

      if (isPasswordExpired) {
        localStorage.removeItem("logininprogress");
        navigate("/accounts/password-reset");
        return;
      }

      // No 2FA - Get customer validation status before navigating to dashboard
      try {
        await getCustomerValidationStatus();
      } catch (error) {
        console.warn("Failed to get customer validation status:", error);
      }
      
      // Remove login progress flag before navigating
      localStorage.removeItem("logininprogress");
      
      // Handle redirect based on conditions
      handleSignInRedirect(rememberMe);
      return;
    }
  };

  // Handle redirect logic based on returnUrl, source cookie, and redirectToTIR
  const handleSignInRedirect = (rememberMe: boolean = false) => {
    // Set session cookies based on remember me
    if (rememberMe) {
      setSessionFor60Days();
    } else {
      setSessionTimeCookie();
    }

    // Check for returnUrl query parameter
    const returnUrl = new URLSearchParams(window.location.search).get('returnUrl') || '/';
    
    if (returnUrl !== '/') {
      // Redirect to myaccount with returnUrl
      window.location.href = `${MYACCOUNT_URL}${returnUrl.startsWith('/') ? returnUrl : '/' + returnUrl}`;
      return;
    }

    // Source URL mapping
    const sourceUrlMap: Record<string, string> = {
      marketplace: MARKETPLACE_URL,
      gpu: NOTEBOOK_URL,
    };

    const source = getCookie('source');
    const targetUrl = sourceUrlMap[source];

    // Delete source cookie if it exists
    if (source) {
      removeCookie('source');
    }

    // Redirect to target URL if source is set
    if (targetUrl) {
      toast.info(source === 'marketplace' ? 'You will be redirected to Marketplace' : 'You will be redirected to TIR - AI Platform');
      postCrossDomainMessage(targetUrl, 0);
      return;
    }

    // Check for redirectToTIR flag
    const redirectToTIR = localStorage.getItem('redirectToTIR');
    if (redirectToTIR && NOTEBOOK_URL) {
      localStorage.removeItem('redirectToTIR');
      toast.info('You will be redirected to TIR - AI Platform');
      postCrossDomainMessage(NOTEBOOK_URL, 0);
      return;
    }

    // Default redirect to myaccount
    toast.success("Login successful!");
    window.location.href = MYACCOUNT_URL;
  };

  const handleRequestOTP = async (recaptcha: string) => {
    try {
      const payload = { recaptcha, version: "v3" };
      await API.post("two-factor/totp/create/", payload);
      toast.success("OTP sent to your registered mobile number");
    } catch (err) {
      toast.error("Failed to send OTP");
    }
  };

  const handleVerifyOTP = async (code: string, isMobileOTP: boolean): Promise<void> => {
    if (!executeRecaptcha) return;
    
    setIsLoading(true);
    const recaptchaToken = await executeRecaptcha("login");

    const url = isMobileOTP
      ? "two-factor/totp/login/"
      : "two-factor/static/login/";
      
    try {
      const res = await API.post(url, { 
        token: code, 
        remember_me: rememberMe,
        recaptcha: recaptchaToken,
        version: "v3"
      });

      if (res.data.code === 200 && res.data?.data?.status === true) {
        const isExpired = res.data?.data?.is_password_expired || res.data?.is_password_expired;
        localStorage.setItem("password_expired", isExpired ? "true" : "false");

        // Check for password expiry - redirect before other operations
        if (isExpired) {
          // Handle device cookies
          const deviceData = res.data?.data?.data;
          if (deviceData?.key && deviceData?.value && deviceData?.age) {
            // Delete old remember cookie if exists
            const allCookies = document.cookie.split(';');
            const rememberCookie = allCookies.find(cookie => cookie.trim().startsWith('remember-cookie_'));
            if (rememberCookie) {
              const cookieName = rememberCookie.split('=')[0].trim();
              const domain = import.meta.env.VITE_domainForCookie;
              let deleteCookieString = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
              if (domain && !window.location.hostname.includes('localhost')) {
                deleteCookieString += `; domain=${domain}`;
              }
              document.cookie = deleteCookieString;
            }
            
            // Set new device cookie
            const now = new Date();
            now.setMinutes(now.getMinutes() + deviceData.age);
            const cookieExpiry = new Date();
            cookieExpiry.setDate(cookieExpiry.getDate() + 400); // 400 days expiry for cookie
            const domain = import.meta.env.VITE_domainForCookie;
            let cookieString = `${deviceData.key}=${deviceData.value}; expires=${cookieExpiry.toUTCString()}; path=/; SameSite=Strict`;
            if (domain && !window.location.hostname.includes('localhost')) {
              cookieString += `; domain=${domain}`;
            }
            document.cookie = cookieString;
          }

          localStorage.removeItem("logininprogress");
          navigate("/accounts/password-reset");
          return;
        }

        // Handle device cookies
        const deviceData = res.data?.data?.data;
        if (deviceData?.key && deviceData?.value && deviceData?.age) {
          // Delete old remember cookie if exists
          const allCookies = document.cookie.split(';');
          const rememberCookie = allCookies.find(cookie => cookie.trim().startsWith('remember-cookie_'));
          if (rememberCookie) {
            const cookieName = rememberCookie.split('=')[0].trim();
            const domain = import.meta.env.VITE_domainForCookie;
            let deleteCookieString = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
            if (domain && !window.location.hostname.includes('localhost')) {
              deleteCookieString += `; domain=${domain}`;
            }
            document.cookie = deleteCookieString;
          }
          
          // Set new device cookie
          const now = new Date();
          now.setMinutes(now.getMinutes() + deviceData.age);
          const cookieExpiry = new Date();
          cookieExpiry.setDate(cookieExpiry.getDate() + 400); // 400 days expiry for cookie
          const domain = import.meta.env.VITE_domainForCookie;
          let cookieString = `${deviceData.key}=${deviceData.value}; expires=${cookieExpiry.toUTCString()}; path=/; SameSite=Strict`;
          if (domain && !window.location.hostname.includes('localhost')) {
            cookieString += `; domain=${domain}`;
          }
          document.cookie = cookieString;
        }

        // Get customer validation status after successful 2FA
        try {
          await getCustomerValidationStatus();
        } catch (error) {
          console.warn("Failed to get customer validation status:", error);
        }

        // Remove login progress flag before navigating
        localStorage.removeItem("logininprogress");

        // Handle redirect based on conditions
        handleSignInRedirect(rememberMe);
      } else {
        toast.error(res.data?.data?.message || "Invalid Code");
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.data?.message || "Verification failed! Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackupCodeSubmit = async (backupCode: string, rememberMeValue: boolean): Promise<void> => {
    if (!executeRecaptcha) {
      toast.error("reCAPTCHA not ready");
      return;
    }
    
    setIsLoading(true);
    
    try {
      const recaptchaToken = await executeRecaptcha("login");
      const res = await API.post("two-factor/static/login/", {
        token: backupCode,
        remember_me: rememberMeValue,
        recaptcha: recaptchaToken,
        version: "v3"
      });

      if (res.data.code === 200 && res.data?.data?.status === true) {
        const isExpired = res.data?.data?.is_password_expired || res.data?.is_password_expired;
        localStorage.setItem("password_expired", isExpired ? "true" : "false");

        // Check for password expiry - redirect before other operations
        if (isExpired) {
          // Handle device cookies
          const deviceData = res.data?.data?.data;
          if (deviceData?.key && deviceData?.value && deviceData?.age) {
            // Delete old remember cookie if exists
            const allCookies = document.cookie.split(';');
            const rememberCookie = allCookies.find(cookie => cookie.trim().startsWith('remember-cookie_'));
            if (rememberCookie) {
              const cookieName = rememberCookie.split('=')[0].trim();
              const domain = import.meta.env.VITE_domainForCookie;
              let deleteCookieString = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
              if (domain && !window.location.hostname.includes('localhost')) {
                deleteCookieString += `; domain=${domain}`;
              }
              document.cookie = deleteCookieString;
            }
            
            // Set new device cookie
            const now = new Date();
            now.setMinutes(now.getMinutes() + deviceData.age);
            const cookieExpiry = new Date();
            cookieExpiry.setDate(cookieExpiry.getDate() + 400); // 400 days expiry for cookie
            const domain = import.meta.env.VITE_domainForCookie;
            let cookieString = `${deviceData.key}=${deviceData.value}; expires=${cookieExpiry.toUTCString()}; path=/; SameSite=Strict`;
            if (domain && !window.location.hostname.includes('localhost')) {
              cookieString += `; domain=${domain}`;
            }
            document.cookie = cookieString;
          }

          // Remove login progress flag before navigating
          localStorage.removeItem("logininprogress");
          navigate("/accounts/password-reset");
          return;
        }

        // Handle device cookies
        const deviceData = res.data?.data?.data;
        if (deviceData?.key && deviceData?.value && deviceData?.age) {
          // Delete old remember cookie if exists
          const allCookies = document.cookie.split(';');
          const rememberCookie = allCookies.find(cookie => cookie.trim().startsWith('remember-cookie_'));
          if (rememberCookie) {
            const cookieName = rememberCookie.split('=')[0].trim();
            const domain = import.meta.env.VITE_domainForCookie;
            let deleteCookieString = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
            if (domain && !window.location.hostname.includes('localhost')) {
              deleteCookieString += `; domain=${domain}`;
            }
            document.cookie = deleteCookieString;
          }
          
          // Set new device cookie
          const now = new Date();
          now.setMinutes(now.getMinutes() + deviceData.age);
          const cookieExpiry = new Date();
          cookieExpiry.setDate(cookieExpiry.getDate() + 400); // 400 days expiry for cookie
          const domain = import.meta.env.VITE_domainForCookie;
          let cookieString = `${deviceData.key}=${deviceData.value}; expires=${cookieExpiry.toUTCString()}; path=/; SameSite=Strict`;
          if (domain && !window.location.hostname.includes('localhost')) {
            cookieString += `; domain=${domain}`;
          }
          document.cookie = cookieString;
        }

        // Get customer validation status after successful 2FA
        try {
          await getCustomerValidationStatus();
        } catch (error) {
          console.warn("Failed to get customer validation status:", error);
        }

        // Remove login progress flag before navigating
        localStorage.removeItem("logininprogress");

        toast.success("Login successful!");
        window.location.href = MYACCOUNT_URL;
      } else {
        const errorMessage = res.data?.data?.message || "Verification failed! Please try again";
        toast.error(errorMessage);
        throw new Error(errorMessage);
      }
    } catch (err: any) {
      const errorMessage = err?.response?.data?.data?.message || err?.response?.data?.message || "Verification failed! Please try again";
      toast.error(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (data: FormFields, rememberMeValue: boolean) => {
    if (!executeRecaptcha) {
      setError("Unable to execute reCAPTCHA. Please reload the page.");
      return;
    }

    // if (localStorage.getItem("logininprogress") === "yes") {
    //   return;
    // }

    setIsLoading(true);
    setError(null);
    setRememberMe(rememberMeValue);
    localStorage.setItem("logininprogress", "yes");

    try {
      const recaptchaToken = await executeRecaptcha("login");
      const response = await login(data.email, data.password, recaptchaToken, "v3");

      if (response.code === 200 && response.data) {
        // Check if response has session data for 2FA check
        if (response.data?.sessionId || response.data?.data?.is_two_factor_allowed) {
          const respData = response?.data;
          const token = respData?.data?.auth?.[0]?.auth_token;
          const apiKey = respData?.data?.auth?.[0]?.apikey;
          const userKey = respData?.data?.user;
          
          if (token && apiKey && userKey) {
            // Check for password expiry
            const isPasswordExpired = respData?.data?.is_password_expired || respData?.is_password_expired;
            localStorage.setItem("password_expired", isPasswordExpired ? "true" : "false");
            
            // Store phone number for 2FA display
            if (userKey.phone) {
              setUserPhone(userKey.phone);
            }
            
            // Check if GA is enabled before dispatching loginAction
            // GA verification needs tokens to be stored temporarily, not in cookies yet
            const isGaEnabled = respData?.data?.is_ga_enabled;
            if (respData?.data?.is_default_dashboard_tir) {
              localStorage.setItem('redirectToTIR', 'true');
            }
            
            if (!isGaEnabled) {
              // Only dispatch loginAction if GA is not enabled
              // If GA is enabled, tokens will be stored temporarily and dispatch happens after verification
              const user: User = {
                username: userKey.username || "",
                first_name: userKey.first_name || "",
                last_name: userKey.last_name || "",
                phone: userKey.phone || "",
                customer_country: userKey.customer_country || "",
                crn: userKey.crn || "",
                location: userKey.location || "",
                projectId: respData?.data?.project_id || "",
                email: userKey.current_user_email || "",
              };
              
              dispatch(loginAction({ token, apiKey, user }));
            }
            
            await checkFor2faOrDashboard(response.data);
            return;
          }
        }
        
        // Fallback: Simple login success without 2FA data - direct navigation
        if (response.data.token && response.data.apikey) {
          // Check for password expiry
          const isPasswordExpired = response.data?.is_password_expired;
          localStorage.setItem("password_expired", isPasswordExpired ? "true" : "false");

          const simpleUser: User = {
            username: response.data.username || "",
            first_name: response.data.first_name || "",
            last_name: response.data.last_name || "",
            phone: response.data.phone || "",
            customer_country: response.data.customer_country || "",
            crn: response.data.crn || "",
            location: response.data.location || "",
            projectId: response.data.project_id || "",
            email: data.email || "",
          };
          dispatch(loginAction({ 
            token: response.data.token, 
            apiKey: response.data.apikey, 
            user: simpleUser 
          }));
          
          if (isPasswordExpired) {
            // Remove login progress flag before navigating
            localStorage.removeItem("logininprogress");
            navigate("/accounts/password-reset");
            return;
          }
          
          // Remove login progress flag before navigating
          localStorage.removeItem("logininprogress");
          
          // Handle redirect based on conditions
          handleSignInRedirect(rememberMe);
        }
      }
    } catch (err: any) {
      setError(
        err?.response?.data?.error ||
          err?.response?.data?.non_field_errors?.[0] ||
          err?.response?.data ||
          "Error while Sign In!"
      );
      // Remove flag on error
      localStorage.removeItem("logininprogress");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel2FA = () => {
    dispatch(logout());
    setShow2FA(false);
    setError(null);
    hasRequestedOTP.current = false; // Reset OTP flag
    localStorage.removeItem("logininprogress"); // Remove flag when cancelling 2FA
  };

  const handleCancelGA = () => {
    // Clean up cookies and state
    removeCookie('token');
    removeCookie('apikey');
    localStorage.removeItem("logininprogress");
    dispatch(logout());
    setShowGA(false);
    setError(null);
    setGaRecaptchaToken("");
    setLoginResponseData(null);
  };

  const handleVerifyGA = async (code: string, isBackupCode: boolean): Promise<void> => {
    if (!executeRecaptcha || !gaRecaptchaToken) {
      toast.error("reCAPTCHA not ready");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      let response;
      if (isBackupCode) {
        response = await verifyGABackupCode({
          token: code,
          recaptcha: gaRecaptchaToken,
          version: gaRecaptchaVersion,
        });
      } else {
        response = await verifyGATotp({
          totp: code,
          recaptcha: gaRecaptchaToken,
          version: gaRecaptchaVersion,
        });
      }

      if (response.code === 200 && response.data) {
        if (!loginResponseData) {
          toast.error("Session expired. Please log in again.");
          handleCancelGA();
          return;
        }
        
        const respData = loginResponseData;
        
        // Store redirectToTIR flag if needed
        if (respData?.data?.is_default_dashboard_tir) {
          localStorage.setItem('redirectToTIR', 'true');
        }
        
        const isExpired = respData?.data?.is_password_expired || response.data?.is_password_expired;
        localStorage.setItem("password_expired", isExpired ? "true" : "false");

        if (isExpired) {
          localStorage.removeItem("logininprogress");
          navigate("/accounts/password-reset");
          return;
        }

        if (respData?.CSRF_COOKIE || response.data?.CSRF_COOKIE) {
          const csrfToken = respData?.CSRF_COOKIE || response.data?.CSRF_COOKIE;
          const expiryDate = new Date();
          expiryDate.setDate(expiryDate.getDate() + 10);
          document.cookie = `csrftoken=${csrfToken}; expires=${expiryDate.toUTCString()}; path=/; SameSite=Strict`;
        }

        // Get auth data from stored response (tokens are already in cookies)
        const token = respData?.data?.auth?.[0]?.auth_token;
        const apiKey = respData?.data?.auth?.[0]?.apikey;
        const userKey = respData?.data?.user || response.data?.user;

        if (token && apiKey && userKey) {
          const user: User = {
            username: userKey.username || "",
            first_name: userKey.first_name || "",
            last_name: userKey.last_name || "",
            phone: userKey.phone || "",
            customer_country: userKey.customer_country || "",
            crn: userKey.crn || "",
            location: userKey.location || "",
            projectId: respData?.data?.project_id || response.data?.project_id || "",
            email: userKey.current_user_email || "",
          };

          // Dispatch login action
          dispatch(loginAction({ token, apiKey, user }));

          // Store user data
          localStorage.setItem('currentUser', JSON.stringify(user));
          localStorage.setItem('email', user.email);

          // Get customer validation status
          try {
            await getCustomerValidationStatus();
          } catch (error) {
            console.warn("Failed to get customer validation status:", error);
          }

          // Handle session cookies (trust device)
          if (rememberMe) {
            // Set 60-day session
            const days = 60;
            const cookie_name = 'remember';
            const cookie_expiry_date = new Date();
            cookie_expiry_date.setDate(cookie_expiry_date.getDate() + 400);
            const expiryDate = new Date();
            expiryDate.setTime(expiryDate.getTime() + days * 24 * 60 * 60 * 1000);
            const cookie_value = expiryDate.toString();
            const domain = import.meta.env.VITE_domainForCookie;
            
            let cookieString = `${cookie_name}=${cookie_value}; expires=${cookie_expiry_date.toUTCString()}; path=/; SameSite=Strict`;
            if (domain && !window.location.hostname.includes('localhost')) {
              cookieString += `; domain=${domain}`;
            }
            document.cookie = cookieString;
          } else {
            // Set 15-minute session
            const minutes = 15;
            const cookie_name = 'session_expiry';
            const cookie_expiry = new Date();
            cookie_expiry.setDate(cookie_expiry.getDate() + 400);
            const expiryDate = new Date();
            expiryDate.setTime(expiryDate.getTime() + minutes * 60 * 1000);
            const cookie_value = expiryDate.toString();
            const domain = import.meta.env.VITE_domainForCookie;
            
            let cookieString = `${cookie_name}=${cookie_value}; expires=${cookie_expiry.toUTCString()}; path=/; SameSite=Strict`;
            if (domain && !window.location.hostname.includes('localhost')) {
              cookieString += `; domain=${domain}`;
            }
            document.cookie = cookieString;
          }

          // Clean up GA temporary state
          setLoginResponseData(null);
          setGaRecaptchaToken("");
          localStorage.removeItem("logininprogress");

          // Handle redirect based on conditions
          handleSignInRedirect(rememberMe);
        }
      } else {
        const errorMsg = response?.errors || response?.data?.errors || "Invalid code. Please try again.";
        setError(errorMsg);
        toast.error(errorMsg);
      }
    } catch (err: any) {
      // Handle reCAPTCHA errors
      if (err?.response?.data?.error?.[0] === "Error verifying reCAPTCHA, please try again.") {
        setGaRecaptchaToken("");
        toast.error("reCAPTCHA verification failed. Please try again.");
      } else {
        const errorMsg = err?.response?.data?.errors || err?.response?.data?.error || "Verification failed! Please try again.";
        setError(errorMsg);
        toast.error(errorMsg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleLostGAKey = async (): Promise<void> => {
    if (!executeRecaptcha) {
      toast.error("reCAPTCHA not ready");
      return;
    }

    try {
      setIsLoading(true);
      const response = await reportLostGAKey();
      
      if (response.code === 200) {
        toast.success(response.message || "Recovery instructions sent to your email");
      } else {
        toast.error(response.message || "Failed to report lost key");
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.errors || err?.response?.data?.message || "Failed to report lost key");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    try {
      // Check if user already logged in
      // const token = getCookie('token');
      // const apikey = getCookie('apikey');
      // const loginInProgress = localStorage.getItem('logininprogress');
      // if (token && apikey) {
      //   if(loginInProgress === 'yes') {
      //     removeCookie('token');
      //     removeCookie('apikey');
      //     removeCookie('user');
      //     localStorage.removeItem("logininprogress");
      //   }
      //   else{
      //     navigate("/");
      //     return;
      //   }
      // }

      // Check if login already in progress
      // if (localStorage.getItem("logininprogress") === "yes") {
      //   toast.error("Login already in progress. Please wait.");
      //   return;
      // }

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
        redirect_uri: `${window.location.origin}/accounts/signin`,
        state: "/",
      });

      // Request authorization code
      client.requestCode();
    } catch (err) {
      console.error("Google login error:", err);
      localStorage.removeItem("logininprogress");
      setShowSpinnerOverlay(false);
      toast.error("Failed to initiate Google login. Try again.");
    }
  };

  const handleGithubLogin = () => {
    try {
      // Check if user already logged in
      // const token = getCookie('token');
      // const apikey = getCookie('apikey');
      // const loginInProgress = localStorage.getItem('logininprogress');
      // if (token && apikey) {
      //   if(loginInProgress === 'yes') {
      //     removeCookie('token');
      //     removeCookie('apikey');
      //     removeCookie('user');
      //     localStorage.removeItem("logininprogress");
      //   }
      //   else{
      //     navigate("/");
      //     return;
      //   }
      // }

      // Check if login already in progress
      // if (localStorage.getItem("logininprogress") === "yes") {
      //   toast.error("Login already in progress. Please wait.");
      //   return;
      // }

      // Set login in progress
      localStorage.setItem("logininprogress", "yes");
      setShowSpinnerOverlay(true);

      // Generate random state for CSRF validation
      const randomState = Math.random().toString(36).substring(2);
      const returnUrl = "/";
      const state = `${randomState},${returnUrl}`;
      localStorage.setItem('github_oauth_state', randomState);

      // Get current URL for redirect
      const redirectUri = `${window.location.origin}/accounts/signin`;

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
    } catch (err) {
      console.error("GitHub login error:", err);
      localStorage.removeItem("logininprogress");
      setShowSpinnerOverlay(false);
      toast.error("Failed to initiate GitHub login. Try again.");
    }
  };

  const handleResendOTP = async (retry_type?: "sms" | "voice") => {
    if (!executeRecaptcha) {
      toast.error("reCAPTCHA not ready");
      return;
    }

    try {
      const recaptchaToken = await executeRecaptcha("resend_otp");
      const payload: any = {
        recaptcha: recaptchaToken,
        version: "v3",
      };

      if (retry_type === "voice") {
        payload.retry = true;
        payload.retry_type = "voice";
      }

      await API.post("two-factor/totp/create/", payload);
      toast.success(retry_type === 'voice' ? "OTP will be sent via call" : "OTP resent successfully");
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to resend OTP");
    }
  };

  return (
    <div className={cn("w-full min-w-md mx-auto relative", className)} {...props}>
      {show2FA ? (
        <TwoFactorAuth 
          onSubmit={handleVerifyOTP}
          onCancel={handleCancel2FA}
          onResend={handleResendOTP}
          onBackupCodeSubmit={handleBackupCodeSubmit}
          isLoading={isLoading}
          error={null}
          phoneNumber={userPhone}
          rememberMe={rememberMe}
        />
      ) : showGA ? (
        <GoogleAuthenticator
          onSubmit={handleVerifyGA}
          onCancel={handleCancelGA}
          onLostKey={handleLostGAKey}
          isLoading={isLoading}
          error={error}
        />
      ) : (
        <>
          {/* Spinner overlay - positioned relative to form */}
          {showSpinnerOverlay && (
            <div className="absolute inset-0 bg-gray-900/80 flex items-center justify-center z-50 rounded-lg">
              <Spinner className="text-blue-500" size={64} />
            </div>
          )}
          
          <LoginForm 
            onSubmit={handleLogin} 
            isLoading={isLoading} 
            error={error}
            onGoogleLogin={handleGoogleLogin}
            onGithubLogin={handleGithubLogin}
            isSocialLoading={isSocialLoading}
          />
        </>
      )}
    </div>
  );
}

// ReCaptcha Provider Wrapper
const SigninWithRecaptcha = (props: React.ComponentProps<"div">) => {
  const siteKey = "6LeJ7_4jAAAAAKqjyjQ2jEC4yJenDE6R8KyTu9Mt";
  
  if (!siteKey) {
    console.error("VITE_RECAPTCHA_V3_SITE_KEY is not set");
    return (
      <div className="text-red-400 text-center p-4">
        reCAPTCHA configuration error. Please contact support.
      </div>
    );
  }

  return (
    <GoogleReCaptchaProvider reCaptchaKey={siteKey}>
      <Signin {...props} />
    </GoogleReCaptchaProvider>
  );
};

export default SigninWithRecaptcha
