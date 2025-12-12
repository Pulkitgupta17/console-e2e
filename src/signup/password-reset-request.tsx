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
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, type SubmitHandler } from "react-hook-form"
import { z } from "zod"
import { toast } from "sonner"
import { Send, Mail, X } from "lucide-react"
import { GoogleReCaptchaProvider, useGoogleReCaptcha } from "react-google-recaptcha-v3"
import { getCookie } from "@/services/commonMethods"
import { requestPasswordReset } from "@/services/signupService"
import { MYACCOUNT_URL } from "@/constants/global.constants"

declare global {
  interface Window {
    grecaptcha: any;
  }
}

const schema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
});

type FormFields = z.infer<typeof schema>;

interface PasswordResetRequestFormProps {
  className?: string;
}

function PasswordResetRequestForm({ className }: PasswordResetRequestFormProps) {
  const { executeRecaptcha } = useGoogleReCaptcha();
  const navigate = useNavigate();
  
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormFields>({
    defaultValues: {
      email: "",
    },
    resolver: zodResolver(schema),
  });

  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [sentEmail, setSentEmail] = useState("");
  const [recaptchaToken, setRecaptchaToken] = useState("");
  const [recaptchaVersion, setRecaptchaVersion] = useState<'v2' | 'v3' | null>(null);
  const [recaptchaError, setRecaptchaError] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);
  const [isResending, setIsResending] = useState(false);

  const RECAPTCHA_V2_SITE_KEY = "6LdJ4SYsAAAAAE6o7fGLD287tW__WDlCqX3Iuf3R";

  // Redirect if already logged in
  useEffect(() => {
    const token = getCookie('token');
    const apikey = getCookie('apikey');

    if (token && apikey) {
      // navigate('/');
      window.location.href = MYACCOUNT_URL;
    }
  }, [navigate]);

  // Countdown timer for resend
  useEffect(() => {
    if (resendCountdown > 0) {
      const timer = setTimeout(() => {
        setResendCountdown(resendCountdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCountdown]);

  const onSubmit: SubmitHandler<FormFields> = async (data) => {
    // If reCAPTCHA v2 is visible and no token, show error
    if (recaptchaVersion === 'v2' && !recaptchaToken) {
      setRecaptchaError(true);
      return;
    }

    setIsLoading(true);
    setRecaptchaError(false);

    try {
      let token = recaptchaToken;
      let version = recaptchaVersion || 'v3';

      // Execute reCAPTCHA v3 if not already done
      if (!recaptchaToken && executeRecaptcha) {
        token = await executeRecaptcha('password');
        version = 'v3';
        setRecaptchaToken(token);
        setRecaptchaVersion('v3');
      }

      const projectId = localStorage.getItem('currentProject');

      const response = await requestPasswordReset({
        email: data.email,
        recaptcha: token,
        version: version,
      }, projectId || undefined);

      if (response.code === 200) {
        setEmailSent(true);
        setSentEmail(data.email);
        setRecaptchaToken('');
        setResendCountdown(60); // Start 60 second countdown
        toast.success("Password reset link sent! Please check your inbox.");
      }
    } catch (error: any) {
      console.error("Password reset error:", error);
      
      const errorData = error?.response?.data;
      const errorArray = errorData?.error;
      
      // Check if reCAPTCHA verification failed
      if (errorArray?.[0] === 'Error verifying reCAPTCHA, please try again.') {
        // Render reCAPTCHA v2
        setRecaptchaVersion('v2');
        setRecaptchaToken('');
        
        setTimeout(() => {
          if (window.grecaptcha && document.getElementById('password-reset-recaptcha')) {
            window.grecaptcha.render('password-reset-recaptcha', {
              sitekey: RECAPTCHA_V2_SITE_KEY,
              callback: (token: string) => {
                setRecaptchaToken(token);
                setRecaptchaError(false);
              }
            });
          }
        }, 100);
        
        toast.error("Please complete the reCAPTCHA verification");
      } else if (errorArray?.[0]) {
        toast.error(errorArray[0]);
      } else if (errorData?.error?.errors?.email?.[0]) {
        toast.error(errorData.error.errors.email[0]);
      } else if (errorData?.error?.errors) {
        toast.error(typeof errorData.error.errors === 'string' ? errorData.error.errors : "An error occurred");
      } else {
        toast.error("The email address you specified does not match our records.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendEmail = async () => {
    if (resendCountdown > 0 || !sentEmail || isResending) {
      return;
    }

    setIsResending(true);
    try {
      // Resubmit with the same email
      const formData = { email: sentEmail };
      await onSubmit(formData);
    } finally {
      setIsResending(false);
    }
  };

  if (emailSent) {
    return (
      <div className={cn("w-full max-w-md mx-auto", className)}>
        <Card className="border-gray-800/50 backdrop-blur-sm form-fade-in" style={{ backgroundColor: 'var(--signup-card-bg)' }}>
          <CardHeader className="text-left space-y-3 pb-6">
            <CardTitle className="text-2xl font-bold text-white">
              Check Your Email
            </CardTitle>
            <CardDescription className="text-gray-400 text-base">
              We've sent you instructions to reset your password.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Email Icon */}
            <div className="flex justify-center">
                <div className="w-16 h-16 bg-cyan-500/20 rounded-full flex items-center justify-center">
                  <Mail className="w-10 h-10 text-cyan-400" />
                </div>
              </div>

            {/* Confirmation Message */}
            <div className="text-center space-y-3">
              <h3 className="text-xl font-semibold text-white">Reset Link Sent!</h3>
              <p className="text-gray-400">
                We've sent a password reset link to <span className="text-white font-medium">{sentEmail}</span>
              </p>
            </div>

            {/* Troubleshooting Box */}
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
              <p className="text-xs text-amber-200 font-medium mb-1.5">Didn't receive the email?</p>
              <p className="text-xs text-amber-100/80">Check your spam, junk, or promotions folder</p>
            </div>

            {/* Action Links */}
            <div className="space-y-3 pt-4">
              <button
                type="button"
                onClick={handleResendEmail}
                disabled={resendCountdown > 0 || isResending}
                className={`w-full flex items-center justify-center gap-2 text-sm font-semibold transition-colors ${
                  resendCountdown > 0 || isResending
                    ? 'text-gray-500 cursor-not-allowed'
                    : 'text-cyan-400 hover:text-cyan-300'
                }`}
              >
                <Send className="w-4 h-4" />
                {isResending ? "Resending..." : resendCountdown > 0 ? `Resend in ${resendCountdown}s` : "Resend Reset Link"}
              </button>
            </div>
            <div className="text-center text-sm text-gray-400 pt-2">
              <button
                type="button"
                onClick={() => navigate('/accounts/signin')}
                className="w-full text-cyan-400 hover:text-cyan-400 transition-colors text-sm font-semibold"
              >
                Back to Sign In
              </button>
            </div>

          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={cn("w-full max-w-md mx-auto", className)}>
      <Card className="border-gray-800/50 backdrop-blur-sm form-fade-in" style={{ backgroundColor: 'var(--signup-card-bg)' }}>
        <CardHeader className="text-left space-y-2">
          <div className="mb-2">
            <button
              type="button"
              onClick={() => navigate('/accounts/signin')}
              className="text-gray-400 hover:text-white transition-colors mb-3"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <CardTitle className="text-2xl font-bold text-white">
              Reset Password
            </CardTitle>
          </div>
          <CardDescription className="text-gray-400">
            Enter your email to receive a password reset link
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-6 mt-8" onSubmit={handleSubmit(onSubmit)}>
            <div className="space-y-6">
              <div className="space-y-2">
                <Input
                  id="email"
                  type="email"
                  placeholder="Email"
                  variant="primary"
                  size="xl"
                  required
                  className={errors.email ? "border-red-500 focus-visible:border-red-500 focus-visible:ring-red-500/20" : ""}
                  {...register("email")}
                />
                {errors.email && (
                  <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
                    {errors.email.message}
                  </p>
                )}
              </div>

              {/* reCAPTCHA v2 Container */}
              {recaptchaVersion === 'v2' && (
                <div className="space-y-2">
                  <div id="password-reset-recaptcha"></div>
                  {recaptchaError && (
                    <p className="text-red-400 text-xs">Please complete the reCAPTCHA verification</p>
                  )}
                </div>
              )}

              <Button 
                type="submit" 
                variant="signup" 
                size="lg"
                disabled={isLoading || isSubmitting}
                className="w-full"
              >
                {isLoading ? "Sending..." : "Send Reset Link"}
              </Button>

              <p className="text-center text-gray-400 text-sm mt-6">
                Remember your password?{" "}
                <button
                  type="button"
                  onClick={() => navigate('/accounts/signin')}
                  className="text-cyan-400 hover:text-cyan-300"
                >
                  Sign in
                </button>
              </p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

// Wrapper with reCAPTCHA provider
const PasswordResetRequest = (props: React.ComponentProps<"div">) => {
  const recaptchaSiteKey = "6LdJ4SYsAAAAAE6o7fGLD287tW__WDlCqX3Iuf3R";
  
  return (
    <GoogleReCaptchaProvider reCaptchaKey={recaptchaSiteKey}>
      <PasswordResetRequestForm {...props} />
    </GoogleReCaptchaProvider>
  );
};

export default PasswordResetRequest;

