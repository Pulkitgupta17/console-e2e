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
import SSOOrganizationForm from "./sso-organization-form";
import CompleteSocialSignupForm from "./complete-social-signup";
import { getCookie, removeCookie, setCookie, setSessionTimeCookie, setSessionFor60Days, postCrossDomainMessage, navigateWithQueryParams, captureUTMParameters, removeAllCookies } from "@/services/commonMethods";
import { googleCallback, verifySocialEmail, loginGoogle, loginGithub, githubCallback, getCustomerValidationStatus, verifyGATotp, verifyGABackupCode, reportLostGAKey, requestSSOLogin } from "@/services/signupService";
import type { SocialUser } from "@/interfaces/signupInterface";
import { Spinner } from '@/components/ui/shadcn-io/spinner';
import { MYACCOUNT_URL, MARKETPLACE_URL, NOTEBOOK_URL, BASE_URL } from "@/constants/global.constants";


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
  onSSOLogin: () => void;
  isSocialLoading: boolean;
}> = ({ onSubmit, isLoading, error, onGoogleLogin, onGithubLogin, onSSOLogin, isSocialLoading }) => {
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
    <div className="w-full min-w-md mx-auto max-w-md overflow-visible">
      <Card className="border-gray-800/50 backdrop-blur-sm form-fade-in overflow-visible" style={{ backgroundColor: 'var(--signup-card-bg)' }}>
        <CardHeader className="text-left space-y-2">
          <CardTitle className="text-2xl font-bold text-white">
            Welcome back
          </CardTitle>
          <CardDescription className="text-gray-400">
            Sign in to your E2E Networks account
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-visible">
          <form className="space-y-4 mt-8" onSubmit={handleSubmit(handleFormSubmit)}>
            <div className="space-y-4 w-full overflow-visible">
              <div className="space-y-2">
                <Input
                  id="email"
                  type="email"
                  placeholder="Email"
                  variant="primary"
                  size="xl"
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
                    variant="primary"
                    size="xl"
                    className="pr-10"
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
                <div className="text-red-400 text-sm text-center break-words overflow-wrap-anywhere max-w-full px-2 whitespace-normal">
                  {(() => {
                    if (typeof error === "string") {
                      return error;
                    }
                    if (error && typeof error === "object") {
                      const errorObj = error as any;
                      return errorObj.errors || errorObj.message || errorObj.error || JSON.stringify(error);
                    }
                    return String(error);
                  })()}
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
              
              <div className="grid grid-cols-2 gap-3 px-1">
                <Button 
                  variant="social" 
                  type="button"
                  size="xl"
                  onClick={onGoogleLogin}
                  disabled={isSocialLoading}
                  className="min-w-0"
                >
                  <svg className="w-4 h-4 mr-2 shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  <span className="truncate">{isSocialLoading ? "Loading..." : "Google"}</span>
                </Button>
                <Button 
                  variant="social" 
                  type="button"
                  size="xl"
                  onClick={onGithubLogin}
                  disabled={isSocialLoading}
                  className="min-w-0"
                >
                  <svg className="w-4 h-4 mr-2 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                  </svg>
                  <span className="truncate">{isSocialLoading ? "Loading..." : "GitHub"}</span>
                </Button>
              </div>
              
              <div className="mt-3 px-1">
                <Button 
                  variant="social" 
                  type="button"
                  size="xl"
                  onClick={onSSOLogin}
                  disabled={isSocialLoading}
                  className="w-full"
                >
                  <svg viewBox="0 0 25 25" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className="size-5 mr-2">
                    <path d="M10.1078 0.908018C9.10391 1.0213 8.00235 1.43927 7.17813 2.01739C6.76407 2.31036 6.10391 2.93927 5.81094 3.32599C5.25626 4.06036 4.89688 4.79083 4.67813 5.6463L4.61172 5.91583L4.22501 6.04083C3.42813 6.29474 2.84219 6.6463 2.27579 7.21271C1.52969 7.95489 1.10391 8.7713 0.928131 9.80255C0.830475 10.3651 0.830475 10.8182 0.928131 11.3807C1.10391 12.408 1.52579 13.2205 2.27579 13.9744C2.81094 14.5135 3.4086 14.8807 4.12344 15.1229C4.68985 15.3143 5.05704 15.3572 6.04922 15.3572H6.94376V14.576V13.7947H6.05313C5.29141 13.7947 5.11563 13.783 4.85001 13.7166C4.2211 13.5565 3.56094 13.1424 3.15469 12.6463C2.90469 12.3416 2.63516 11.826 2.52188 11.4276C2.4086 11.0252 2.39688 10.2361 2.50235 9.85333C2.68204 9.19708 2.90469 8.81036 3.36954 8.34552C4.01016 7.70489 4.59219 7.46271 5.70157 7.36896L6.00235 7.34161L6.02579 7.12286C6.16641 5.82599 6.41641 5.11505 7.01016 4.32599C7.74454 3.34942 8.78751 2.71661 10.0219 2.50567C12.0883 2.15021 14.1547 3.2088 15.0805 5.09552C15.4594 5.86896 15.5766 6.48614 15.5766 7.72443V8.55255L16.3695 8.56818C17.0961 8.5838 17.1859 8.59552 17.475 8.68927C18.2563 8.94708 18.9008 9.59161 19.1586 10.3729C19.2484 10.6463 19.2641 10.7518 19.2641 11.1776C19.2641 11.6033 19.2484 11.7088 19.1586 11.9822C18.9008 12.7635 18.2602 13.4041 17.475 13.6658C17.1625 13.7713 17.1391 13.7713 15.9594 13.7869L14.7563 13.8026V14.5799V15.3572H15.8617C17.0727 15.3572 17.4711 15.3143 17.9945 15.1346C19.9359 14.4705 21.1156 12.5213 20.7914 10.5174C20.5102 8.77911 19.1117 7.34943 17.4242 7.07208L17.143 7.02521L17.1234 6.76739C16.9828 5.18927 16.4086 3.90411 15.3461 2.80255C13.975 1.38849 12.0453 0.689268 10.1078 0.908018Z" fill="#99A1B3"/>
                    <path d="M10.1859 6.66583C8.56094 6.96271 7.2875 8.24396 7.00234 9.87286C6.77969 11.1619 7.29141 12.5994 8.2875 13.4549L8.50625 13.6424V16.2401V18.8377L9.47109 19.8494L10.4359 20.8651H10.8305H11.2211L12.2094 19.8533L13.1937 18.8416V16.2401V13.6424L13.4125 13.4549C14.4086 12.5994 14.9203 11.1619 14.6977 9.87286C14.4125 8.23224 13.1312 6.95099 11.4906 6.66583C11.0844 6.59552 10.5844 6.59552 10.1859 6.66583ZM11.3383 8.22833C12.2172 8.41193 12.9516 9.1463 13.1352 10.0252C13.3461 11.0408 12.893 12.0252 11.9672 12.5643L11.6352 12.7596L11.6312 15.4783V18.1971L11.2562 18.5916C11.0492 18.8104 10.8695 18.9901 10.8539 18.9901C10.8344 18.9901 10.6547 18.8182 10.4477 18.6111L10.0687 18.2283V17.6619L10.0648 17.0955L10.6039 16.5838L11.143 16.0682L10.6039 15.5018L10.0687 14.9354V13.8494L10.0648 12.7596L9.73281 12.5643C8.34609 11.7596 8.09219 9.98224 9.20547 8.86896C9.7875 8.28693 10.5414 8.06036 11.3383 8.22833Z" fill="#99A1B3"/>
                    <path d="M10.5844 8.99395C10.3969 9.04864 10.1586 9.30645 10.1039 9.50567C10.0141 9.85333 10.1508 10.2166 10.4477 10.4002C10.6703 10.5408 11.0492 10.533 11.268 10.3885C11.5102 10.2283 11.6117 10.0369 11.6117 9.73224C11.6117 9.43145 11.5102 9.23614 11.2797 9.0838C11.1117 8.97052 10.7914 8.93145 10.5844 8.99395Z" fill="#99A1B3"/>
                  </svg>
                  <span>{isSocialLoading ? "Loading..." : "Sign in with SSO"}</span>
                </Button>
              </div>
              
              <p className="text-center text-gray-400 text-sm mt-8 mb-2">
                Don&apos;t have an account?{" "}
                <button
                  type="button"
                  onClick={() => {
                    localStorage.clear();
                    removeAllCookies();
                    navigate(navigateWithQueryParams('/accounts/signup'))}
                  }
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
  const [showSSOForm, setShowSSOForm] = useState(false);
  const [ssoError, setSsoError] = useState<string | null>(null);
  const [isSSOLoading, setIsSSOLoading] = useState(false);
  const hasProcessedSSO = useRef(false);
  const [showSocialSignup, setShowSocialSignup] = useState(false);
  const [socialUser, setSocialUser] = useState<SocialUser | null>(null);

  useEffect(() => {
    captureUTMParameters();
  }, []);

  useEffect(() => {
    localStorage.setItem('password_expired', 'false');
  }, []);

  // Check if user is logged out (no currentUser in localStorage) - clear storage and cookies
  useEffect(() => {
    // Check if we're in the middle of an OAuth callback - preserve OAuth state
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    const scope = urlParams.get('scope');
    const isOAuthCallback = (code && state) || (code && scope);
    const githubOAuthState = localStorage.getItem('github_oauth_state');
    const googleOAuthState = localStorage.getItem('google_oauth_state');
    
    const currentUser = localStorage.getItem('currentUser');
    if (!currentUser) {
      localStorage.clear();
      removeCookie('token');
      removeCookie('apikey');
      removeCookie('user');
      removeCookie('yyy_xxx');
      localStorage.setItem('password_expired', 'false');
      if (isOAuthCallback) {
        if (githubOAuthState) {
          localStorage.setItem('github_oauth_state', githubOAuthState);
        }
        if (googleOAuthState) {
          localStorage.setItem('google_oauth_state', googleOAuthState);
        }
      }
    }
    if(!getCookie('token')){
      localStorage.clear();
      if (isOAuthCallback) {
        if (githubOAuthState) {
          localStorage.setItem('github_oauth_state', githubOAuthState);
        }
        if (googleOAuthState) {
          localStorage.setItem('google_oauth_state', googleOAuthState);
        }
      }
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
      // Prevent duplicate processing - check first
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

      // Set flag immediately to prevent duplicate calls (especially in React StrictMode)
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

          if (!emailVerifyResponse.data.email_exists) {
            const user: SocialUser = {
              name: callbackResponse.data.name || "",
              email: email,
              access_token: access_token,
              id: id,
              provider: "Google",
            };
            localStorage.setItem('socialuser', JSON.stringify(user));
            setSocialUser(user);
            setShowSocialSignup(true);
            toast.info("No account found. Please sign up first.");
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
            if (userKey.phone) {
              setUserPhone(userKey.phone);
            }
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

          if (!emailVerifyResponse.data.email_exists) {
            toast.info("No account found. Please sign up first.");
            const user: SocialUser = {
              name: callbackResponse.data.name || "",
              email: email,
              access_token: access_token,
              id: id,
              provider: "GitHub",
            };
            localStorage.setItem('socialuser', JSON.stringify(user));
            localStorage.removeItem('github_oauth_state');
            setSocialUser(user);
            setShowSocialSignup(true);
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
            if (userKey.phone) {
              setUserPhone(userKey.phone);
            }
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

  // Handle SSO callback
  useEffect(() => {
    const handleSSOCallback = async () => {
      // Prevent duplicate processing
      if (hasProcessedSSO.current) {
        return;
      }

      const urlParams = new URLSearchParams(window.location.search);
      const ssoCode = urlParams.get('sso_code');
      const dataParam = urlParams.get('data');
      const ssoError = urlParams.get('sso_error');

      // Only process if we have SSO params
      if (!ssoCode && !dataParam && !ssoError) {
        return;
      }

      hasProcessedSSO.current = true;

      try {
        setIsSSOLoading(true);
        setShowSpinnerOverlay(true);
        localStorage.setItem("logininprogress", "yes");
        // Handle SSO error
        if (ssoError === "True" || ssoError === "true") {
          let errorMessage = "SSO authentication failed. Please try again.";
          
          if (dataParam) {
            try {
              const decodedData = JSON.parse(decodeURIComponent(dataParam));
              errorMessage = decodedData.message || decodedData.errors || errorMessage;
            } catch (e) {
              // Use default error message
            }
          }
          
          toast.error(errorMessage);
          setSsoError(errorMessage);
          // Clean URL
          window.history.replaceState({}, document.title, '/accounts/signin');
          return;
        }

        // Handle SSO success
        if (ssoCode && dataParam) {
          // Decode the data parameter
          let authData;
          try {
            authData = JSON.parse(decodeURIComponent(dataParam));
          } catch (e) {
            toast.error("Failed to parse SSO authentication data");
            window.history.replaceState({}, document.title, '/accounts/signin');
            return;
          }

          // Check if response has error
          if (authData.message && authData.code !== 200) {
            toast.error(authData.message || "SSO authentication failed");
            window.history.replaceState({}, document.title, '/accounts/signin');
            return;
          }

          // Extract authentication data
          // Prioritize getting auth_token from cookies (as per requirements)
          const respData = authData.data || authData;
          const token = getCookie('token') || respData?.auth?.[0]?.auth_token;
          const apiKey = respData?.auth?.[0]?.apikey;
          const userKey = respData?.user;
          const sessionId = respData?.sessionId || authData.sessionId;
          const csrfCookie = authData?.CSRF_COOKIE;

          // Set CSRF cookie if available
          if (csrfCookie) {
            const expiryDate = new Date();
            expiryDate.setDate(expiryDate.getDate() + 10);
            document.cookie = `csrftoken=${csrfCookie}; expires=${expiryDate.toUTCString()}; path=/; SameSite=Strict`;
          }

          if (token && apiKey && userKey) {
            // Store phone number for 2FA display
            if (userKey.phone) {
              setUserPhone(userKey.phone);
            }

            // Check if GA is enabled before dispatching loginAction
            const isGaEnabled = respData?.is_ga_enabled;
            if (respData?.is_default_dashboard_tir) {
              localStorage.setItem('redirectToTIR', 'true');
            }

            if (!isGaEnabled) {
              // Only dispatch loginAction if GA is not enabled
              const user: User = {
                username: userKey.username || "",
                first_name: userKey.first_name || "",
                last_name: userKey.last_name || "",
                phone: userKey.phone || "",
                customer_country: userKey.customer_country || "",
                crn: userKey.crn || "",
                location: userKey.location || "",
                projectId: respData?.project_id || "",
                email: userKey.current_user_email || userKey.username || "",
              };

              dispatch(loginAction({ token, apiKey, user }));
            } else {
              // Store tokens temporarily for GA verification
              setCookie('token', token);
              setCookie('apikey', apiKey);
              if (respData?.contact_person_id) {
                setCookie('contact_person_id', respData.contact_person_id);
              }
            }

            // Prepare response data structure for 2FA check
            const responseData = {
              data: respData,
              sessionId: sessionId,
              CSRF_COOKIE: csrfCookie,
            };
            // Clean URL
            window.history.replaceState({}, document.title, '/accounts/signin');

            // Check for 2FA or navigate to dashboard
            await checkFor2faOrDashboard(responseData);
          } else {
            toast.error("Failed to retrieve authentication data from SSO");
            window.history.replaceState({}, document.title, '/accounts/signin');
          }
        }
      } catch (error: any) {
        toast.error(error?.response?.data?.message || error?.message || "SSO authentication failed. Please try again.");
        setSsoError("SSO authentication failed. Please try again.");
        window.history.replaceState({}, document.title, '/accounts/signin');
      } finally {
        setIsSSOLoading(false);
        setShowSpinnerOverlay(false);
        localStorage.removeItem('logininprogress');
      }
    };

    handleSSOCallback();
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
        const recaptchaToken = await executeRecaptcha("otp");
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
          const recaptchaToken = await executeRecaptcha("otp");
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
            navigate("/accounts/signin");
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
    navigate("/accounts/signin");
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
    navigate("/accounts/signin");
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
      const state = `${randomState}`;
      localStorage.setItem('github_oauth_state', state);

      // Get current URL for redirect
      const redirectUri = `${window.location.origin}/accounts/signin`;

      // GitHub OAuth Client ID
      const clientId = import.meta.env.VITE_GITHUB_CLIENT_ID;

      // Build GitHub OAuth URL
      const githubAuthUrl = new URL("https://github.com/login/oauth/authorize");
      githubAuthUrl.searchParams.append("client_id", clientId);
      githubAuthUrl.searchParams.append("redirect_uri", redirectUri);
      githubAuthUrl.searchParams.append("scope", "user:email");
      githubAuthUrl.searchParams.append("state", randomState);
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

  const handleSSOLogin = () => {
    setShowSSOForm(true);
    setSsoError(null);
  };

  const handleSSOOrganizationSubmit = async (organizationId: string) => {
    try {
      setIsSSOLoading(true);
      setSsoError(null);

      // Get return URL (absolute URL for login callback)
      // Using /accounts/login to match the expected callback URL format
      // const returnTo = `${window.location.origin}/accounts/login`;
      const returnTo = BASE_URL;
      
      // Request SSO login URL
      const response = await requestSSOLogin(organizationId, returnTo);
      if (response.redirect_url) {
        // Set login in progress
        localStorage.setItem("logininprogress", "yes");
        // const updatedUrl = response.redirect_url.replace(
        //   /^https:\/\/api-groot\.e2enetworks\.net/,
        //   "http://localhost:4200"
        // );
        // Redirect to SSO provider
        window.location.href = response.redirect_url;
      } else {
        setSsoError("SSO authentication failed. Please try again.");
        toast.error("SSO authentication failed. Please try again.");
      }
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || 
                          error?.response?.data?.error || 
                          "SSO authentication failed. Please try again.";
      setSsoError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsSSOLoading(false);
    }
  };

  const handleResendOTP = async (retry_type?: "sms" | "voice") => {
    if (!executeRecaptcha) {
      toast.error("reCAPTCHA not ready");
      return;
    }

    try {
      const recaptchaToken = await executeRecaptcha("otp");
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

  const handleBackFromSocialSignup = () => {
    localStorage.clear();
    removeAllCookies();
    navigate(window.location.pathname, { replace: true });
    setShowSocialSignup(false);
    setSocialUser(null);
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
      ) : showSSOForm ? (
        <SSOOrganizationForm
          onSubmit={handleSSOOrganizationSubmit}
          onCancel={() => {
            setShowSSOForm(false);
            setSsoError(null);
          }}
          isLoading={isSSOLoading}
          error={ssoError}
        />
      ) : showSocialSignup && socialUser ? (
        <CompleteSocialSignupForm
          socialUser={socialUser}
          onBack={handleBackFromSocialSignup}
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
            onSSOLogin={handleSSOLogin}
            isSocialLoading={isSocialLoading}
          />
        </>
      )}
    </div>
  );
}

// ReCaptcha Provider Wrapper
const SigninWithRecaptcha = (props: React.ComponentProps<"div">) => {
  const siteKey = "6LdJ4SYsAAAAAE6o7fGLD287tW__WDlCqX3Iuf3R";
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
